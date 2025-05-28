"use server";
import { fromZonedTime } from "date-fns-tz";
import { gql } from "graphql-request";
import moment from "moment";

import { deleteDriverReportByWorkflowId } from "@/actions/driverReport";
import { prisma } from "@/configs/prisma";
import { WorkflowInputForm } from "@/forms/workflow";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { GraphQLResult } from "@/types/graphql";
import { DriverReportDetailInfo, DriverReportInfo, WorkflowInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { createTranslator } from "@/utils/locale";
import { withActionExceptionHandler } from "@/utils/server";
import { ensureString, isTrue, trim } from "@/utils/string";

/**
 * Checks if a workflow name already exists within a specific organization.
 *
 * This function sends a GraphQL query to check if a workflow with the given name exists
 * in the specified organization. Optionally, it can exclude a workflow by its ID from the check.
 *
 * @param jwt - The JSON Web Token (JWT) used for authentication.
 * @param organizationId - The ID of the organization to search within.
 * @param name - The name of the workflow to check for existence.
 * @param excludeId - (Optional) The ID of a workflow to exclude from the check.
 * @returns A promise that resolves to `true` if a workflow with the given name exists, otherwise `false`.
 */
export const checkWorkFlowNameExists = withActionExceptionHandler<{ name: string; excludeId?: number }, boolean>(
  async (token, params) => {
    const { name, excludeId } = params;
    const query = gql`
    query (
      $organizationId: Int!
      $name: String!
      ${excludeId ? "$excludeId: ID" : ""}
    ) {
      workflows(
        filters: {
          organizationId: { eq: $organizationId }
          name: { eq: $name }
          ${excludeId ? "id: { ne: $excludeId }" : ""}
        }
      ) {
        data {
          id
        }
      }
    }
  `;
    const { data } = await fetcher<WorkflowInfo[]>(token.jwt, query, {
      ...(excludeId && { excludeId }),
      name,
      organizationId: Number(token.user.orgId),
    });

    return {
      status: HttpStatusCode.Ok,
      data: data.workflows.length > 0,
    };
  }
);

/**
 * Checks if a workflow's exclusivity has changed by comparing its last updated timestamp.
 *
 * @param organizationId - The ID of the organization to which the workflow belongs.
 * @param id - The unique identifier of the workflow.
 * @param lastUpdatedAt - The last known updated timestamp of the workflow, as a Date or string.
 * @returns A promise that resolves to `true` if the workflow's exclusivity has changed, or `false` otherwise.
 */
export const checkWorkFlowExclusives = withActionExceptionHandler<
  { id: number; lastUpdatedAt: Date | string },
  boolean
>(async (token, params) => {
  const { id, lastUpdatedAt } = params;
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      workflows(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;
  const { data } = await fetcher<WorkflowInfo[]>(token.jwt, query, {
    organizationId: Number(token.user.orgId),
    id,
  });

  const isExclusives = !moment(data?.workflows[0]?.updatedAt).isSame(lastUpdatedAt);

  return {
    status: isExclusives ? HttpStatusCode.Exclusive : HttpStatusCode.Ok,
    data: isExclusives,
  };
});

/**
 * Creates a new workflow for the organization.
 *
 * @param entity - The workflow input form containing the details of the workflow to be created.
 * @returns A promise that resolves to the result of the creation operation, including the created workflow data.
 */
export const createWorkFlow = withActionExceptionHandler<WorkflowInputForm, WorkflowInfo>(async (token, params) => {
  const t = await createTranslator();
  const { user } = token;
  const { name, description, isActive, driverReports, createdAt, clientTimeZone } = trim(params);

  // Convert the provided creation date to UTC based on the client's time zone
  const currentDate = fromZonedTime(createdAt!, clientTimeZone);

  // Check if the first workflow in the organization
  const count = await prisma.workflow.count({
    where: {
      organizationId: Number(user.orgId),
      publishedAt: { not: null },
    },
  });

  if (!count) {
    const driverReportIds = await prisma.driverReport.findMany({
      where: { organizationId: Number(user.orgId), isActive: true, publishedAt: { not: null } },
      select: { id: true },
    });

    if (driverReportIds.length > 0) {
      await prisma.workflow.create({
        data: {
          organizationId: Number(user.orgId),
          name: t("workflow.default_object.name"),
          description: t("workflow.default_object.description"),
          isActive: true,
          isDefault: true,
          isSystem: true,
          DriverReportsWorkflowLinks: {
            create: driverReportIds.map((driverReportId) => ({
              driverReportId: driverReportId.id,
            })),
          },
          createdAt: currentDate,
          updatedAt: currentDate,
          publishedAt: currentDate,
          WorkflowCreatedByUserLinks: { create: { userId: Number(user.id) } },
          WorkflowUpdatedByUserLinks: { create: { userId: Number(user.id) } },
        },
      });
    }
  }

  // Check if a workflow with the same name already exists in the organization
  const { data: isWorkFlowNameExists } = await checkWorkFlowNameExists({
    name: ensureString(name),
  });

  if (isWorkFlowNameExists) {
    return { status: HttpStatusCode.Existed };
  }

  const result = await prisma.$transaction(async (prisma) => {
    const response = await prisma.workflow.create({
      data: {
        organizationId: Number(user.orgId),
        name: ensureString(name),
        description,
        isActive,
        createdAt: currentDate,
        updatedAt: currentDate,
        publishedAt: currentDate,

        // Link the workflow to the user who created and updated it
        WorkflowCreatedByUserLinks: { create: { userId: Number(user.id) } },
        WorkflowUpdatedByUserLinks: { create: { userId: Number(user.id) } },

        // Create the associated driver reports and their details
        DriverReportsWorkflowLinks: {
          create: (driverReports || []).map((driverReport) => ({
            driverReport: {
              create: {
                organizationId: Number(user.orgId),
                name: ensureString(driverReport.name),
                ...(driverReport.type && { type: driverReport.type }),
                ...(driverReport.isRequired !== undefined && { isRequired: driverReport.isRequired }),
                ...(driverReport.photoRequired !== undefined && { photoRequired: driverReport.photoRequired }),
                ...(driverReport.displayOrder && { displayOrder: driverReport.displayOrder }),
                ...(driverReport.isSystem !== undefined && { isSystem: driverReport.isSystem }),
                ...(driverReport.billOfLadingRequired !== undefined && {
                  billOfLadingRequired: driverReport.billOfLadingRequired,
                }),
                ...(driverReport.description && { description: driverReport.description }),
                ...(driverReport.isActive !== undefined && { isActive: driverReport.isActive }),
                createdAt: currentDate,
                updatedAt: currentDate,
                publishedAt: currentDate,

                // Link the driver report to the user who created and updated it
                ...(user.id && {
                  DriverReportsCreatedByUserLinks: {
                    create: { userId: Number(user.id) },
                  },
                  DriverReportsUpdatedByUserLinks: {
                    create: { userId: Number(user.id) },
                  },
                }),

                // Create the associated report details for the driver report
                DriverReportsReportDetailsLinks: {
                  create: (driverReport.reportDetails || []).map((reportDetail, detailIndex) => ({
                    driverReportDetailOrder: detailIndex + 1,
                    driverReportDetail: {
                      create: {
                        organizationId: Number(user.orgId),
                        name: ensureString(reportDetail.name),
                        ...(reportDetail.description && { description: reportDetail.description }),
                        ...(reportDetail.displayOrder && { displayOrder: reportDetail.displayOrder }),
                        createdAt: currentDate,
                        updatedAt: currentDate,
                        publishedAt: currentDate,
                      },
                    },
                  })),
                },
              },
            },
          })),
        },
      },
      select: { id: true },
    });

    return response as WorkflowInfo;
  });

  return { status: HttpStatusCode.Ok, data: result };
});

/**
 * Updates a workflow entity in the database with the provided input data.
 *
 * @param entity - The workflow input form containing the data to update the workflow.
 * @returns A promise that resolves to an object containing the status code and either the updated workflow data or an error code.
 */
export const updateWorkFlow = withActionExceptionHandler<WorkflowInputForm, WorkflowInfo>(async (token, params) => {
  const { user } = token;
  const {
    id: workflowId,
    name,
    description,
    isActive,
    driverReports,
    createdAt,
    updatedAt,
    clientTimeZone,
  } = trim(params);

  // Convert the provided creation date to UTC based on the client's time zone
  const currentDate = fromZonedTime(createdAt!, clientTimeZone);

  // Checks if there are exclusive errors in the workflow for the given organization and workflow ID.
  const { data: isErrorExclusives } = await checkWorkFlowExclusives({
    id: Number(workflowId),
    lastUpdatedAt: ensureString(updatedAt),
  });

  if (isErrorExclusives) {
    return { status: HttpStatusCode.Exclusive };
  }

  // Check if a workflow with the same name already exists in the organization
  const { data: isWorkFlowNameExists } = await checkWorkFlowNameExists({
    name: ensureString(name),
    excludeId: Number(workflowId),
  });

  if (isWorkFlowNameExists) {
    return { status: HttpStatusCode.Existed };
  }

  const driverReportIds: number[] = driverReports?.length
    ? driverReports
        .filter((report) => report.id !== undefined)
        .map((report: Partial<DriverReportInfo>) => Number(report.id))
    : [];

  const reportDetailIds: number[] = driverReports?.length
    ? driverReports
        .flatMap((report: Partial<DriverReportInfo>) => report.reportDetails ?? [])
        .filter((detail) => detail.id !== undefined)
        .map((detail: Partial<DriverReportDetailInfo>) => Number(detail.id))
    : [];

  const result = await prisma.$transaction(async (prisma) => {
    // Unpublish driver reports if user removes them from the workflow
    const driverReportUpdated = await prisma.driverReport.findMany({
      where: {
        organizationId: Number(user.orgId),
        DriverReportsWorkflowLinks: {
          is: { workflowId: Number(workflowId) },
        },
        id: {
          notIn: driverReportIds,
        },
      },
      select: { id: true },
    });

    const idsDriverReportToUpdate = driverReportUpdated.map((item) => item.id);

    if (idsDriverReportToUpdate.length > 0) {
      await prisma.driverReport.updateMany({
        where: {
          id: { in: idsDriverReportToUpdate },
        },
        data: {
          publishedAt: null,
        },
      });
    }

    // Unpublish driver report details if user removes them from the driver report
    const reportDetailsToUpdate = await prisma.driverReportDetail.findMany({
      where: {
        organizationId: Number(user.orgId),
        DriverReportsReportDetailsLinks: {
          some: { driverReportId: { in: driverReportIds } },
        },
        id: { notIn: reportDetailIds },
      },
      select: { id: true },
    });

    const detailIdsToUpdate = reportDetailsToUpdate.map((item) => item.id);

    if (detailIdsToUpdate.length > 0) {
      await prisma.driverReportDetail.updateMany({
        where: {
          id: { in: detailIdsToUpdate },
        },
        data: {
          publishedAt: null,
        },
      });
    }

    // Update the workflow with the new data
    const response = await prisma.workflow.update({
      where: { id: Number(workflowId) },
      data: {
        name: ensureString(name),
        description: description,
        isActive: isActive,
        updatedAt: currentDate,
        WorkflowUpdatedByUserLinks: {
          upsert: {
            where: { workflowId: Number(workflowId) },
            update: { userId: Number(user.id) },
            create: { userId: Number(user.id) },
          },
        },

        DriverReportsWorkflowLinks: {
          upsert: (driverReports || []).map((driverReport) => ({
            where: {
              workflowId: Number(workflowId),
              driverReportId: Number(driverReport.id) || 0,
            },
            update: {
              driverReport: {
                update: {
                  name: ensureString(driverReport.name),
                  isRequired: driverReport.isRequired,
                  photoRequired: driverReport.photoRequired,
                  displayOrder: driverReport.displayOrder,
                  isSystem: driverReport.isSystem,
                  billOfLadingRequired: driverReport.billOfLadingRequired,
                  description: driverReport.description,
                  isActive: driverReport.isActive,
                  updatedAt: currentDate,
                  DriverReportsUpdatedByUserLinks: {
                    upsert: {
                      where: { driverReportId: Number(driverReport.id) || 0 },
                      update: { userId: Number(user.id) },
                      create: { userId: Number(user.id) },
                    },
                  },
                  DriverReportsReportDetailsLinks: {
                    upsert: (driverReport.reportDetails || []).map((reportDetail, detailIndex) => ({
                      where: {
                        driverReportId: Number(driverReport.id) || 0,
                        driverReportDetailId: Number(reportDetail.id) || 0,
                      },
                      update: {
                        driverReportDetail: {
                          update: {
                            name: ensureString(reportDetail.name),
                            description: reportDetail.description || "",
                            displayOrder: reportDetail.displayOrder,
                            updatedAt: currentDate,
                          },
                        },
                      },
                      create: {
                        driverReportDetailOrder: detailIndex + 1,
                        driverReportDetail: {
                          create: {
                            organizationId: Number(user.orgId),
                            name: ensureString(reportDetail.name),
                            description: reportDetail.description || "",
                            displayOrder: reportDetail.displayOrder,
                            createdAt: currentDate,
                            updatedAt: currentDate,
                            publishedAt: currentDate,
                          },
                        },
                      },
                    })),
                  },
                },
              },
            },
            create: {
              driverReport: {
                create: {
                  organizationId: Number(user.orgId),
                  name: ensureString(driverReport.name),
                  isRequired: driverReport.isRequired,
                  photoRequired: driverReport.photoRequired,
                  displayOrder: driverReport.displayOrder,
                  isSystem: driverReport.isSystem,
                  billOfLadingRequired: driverReport.billOfLadingRequired,
                  description: driverReport.description,
                  isActive: driverReport.isActive,
                  createdAt: currentDate,
                  updatedAt: currentDate,
                  publishedAt: currentDate,
                  DriverReportsCreatedByUserLinks: {
                    create: { userId: Number(user.id) },
                  },
                  DriverReportsUpdatedByUserLinks: {
                    create: { userId: Number(user.id) },
                  },
                  DriverReportsReportDetailsLinks: {
                    create: (driverReport.reportDetails || []).map((reportDetail, detailIndex) => ({
                      driverReportDetailOrder: detailIndex + 1,
                      driverReportDetail: {
                        create: {
                          organizationId: Number(user.orgId),
                          name: ensureString(reportDetail.name),
                          description: reportDetail.description,
                          displayOrder: reportDetail.displayOrder,
                          createdAt: currentDate,
                          updatedAt: currentDate,
                          publishedAt: currentDate,
                        },
                      },
                    })),
                  },
                },
              },
            },
          })),
        },
      },
      select: { id: true },
    });
    return response as WorkflowInfo;
  });

  return { status: HttpStatusCode.Ok, data: result };
});

/**
 * Fetches workflows from the server with pagination and filtering options.
 *
 * @param params - The filter request parameters containing pagination details.
 * @param params.page - The current page number for pagination.
 * @param params.pageSize - The number of items per page for pagination.
 *
 * @returns A promise that resolves to an object containing:
 * - `data`: An array of workflows with their attributes and associated details.
 * - `meta`: Metadata about the pagination, including page count and total items.
 */
export const workflowsFetcher = withActionExceptionHandler<
  [string, FilterRequest<WorkflowInfo>],
  GraphQLResult<WorkflowInfo[]>
>(async (token, params) => {
  const { jwt, user } = token;
  const [_, filters] = params;

  const {
    page,
    pageSize,
    sort,
    keywords,
    name,
    isActive,
    createdByUser,
    updatedByUser,
    createdAtFrom,
    createdAtTo,
    updatedAtFrom,
    updatedAtTo,
  } = filters;

  const query = gql`
    query (
      $organizationId: Int!
      $page: Int
      $pageSize: Int
      $sort: [String]
      $keywords: String
      $name: String
      $status: [Boolean]
      $createdByUser: String
      $updatedByUser: String
      $createdAtFrom: DateTime
      $createdAtTo: DateTime
      $updatedAtFrom: DateTime
      $updatedAtTo: DateTime
    ) {
      workflows(
        pagination: { page: $page, pageSize: $pageSize }
        sort: $sort
        filters: {
          or: [
            { name: { containsi: $keywords } }
            { name: { containsi: $name } }
            { createdByUser: { detail: { firstName: { containsi: $createdByUser } } } }
            { createdByUser: { detail: { lastName: { containsi: $createdByUser } } } }
            { updatedByUser: { detail: { firstName: { containsi: $updatedByUser } } } }
            { updatedByUser: { detail: { lastName: { containsi: $updatedByUser } } } }
            { createdAt: { gte: $createdAtFrom, lte: $createdAtTo } }
            { updatedAt: { gte: $updatedAtFrom, lte: $updatedAtTo } }
          ]
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
          isActive: { in: $status }
        }
      ) {
        data {
          id
          attributes {
            name
            description
            isActive
            isSystem
            createdAt
            updatedAt
            createdByUser {
              data {
                id
                attributes {
                  username
                  detail {
                    data {
                      attributes {
                        lastName
                        firstName
                      }
                    }
                  }
                }
              }
            }
            updatedByUser {
              data {
                id
                attributes {
                  username
                  detail {
                    data {
                      attributes {
                        lastName
                        firstName
                      }
                    }
                  }
                }
              }
            }
            driverReports(pagination: { limit: -1 }, sort: "displayOrder:asc", filters: { publishedAt: { ne: null } }) {
              data {
                id
                attributes {
                  name
                  isRequired
                  photoRequired
                  billOfLadingRequired
                  displayOrder
                  isSystem
                  description
                  isActive
                  reportDetails(
                    pagination: { limit: -1 }
                    sort: "displayOrder:asc"
                    filters: { publishedAt: { ne: null } }
                  ) {
                    data {
                      id
                      attributes {
                        name
                        description
                        displayOrder
                      }
                    }
                  }
                }
              }
            }
          }
        }
        meta {
          pagination {
            page
            pageSize
            pageCount
            total
          }
        }
      }
    }
  `;

  const { data, meta } = await fetcher<WorkflowInfo[]>(jwt, query, {
    organizationId: user.orgId,
    page,
    pageSize,
    sort: Array.isArray(sort) ? sort : [sort],
    ...(keywords && { keywords }),
    ...(name && { name }),
    ...(isActive && {
      status: Array.isArray(isActive) ? isActive.map((option: string) => isTrue(option)) : [isTrue(isActive)],
    }),
    ...(createdByUser && { createdByUser }),
    ...(updatedByUser && { updatedByUser }),
    ...(createdAtFrom && { createdAtFrom }),
    ...(createdAtTo && { createdAtTo }),
    ...(updatedAtFrom && { updatedAtFrom }),
    ...(updatedAtTo && { updatedAtTo }),
  });

  return {
    status: HttpStatusCode.Ok,
    data: { data: data?.workflows ?? [], meta },
  };
});

/**
 * Fetches workflow information based on the provided parameters.
 *
 * @param [_, params] - A tuple where the first element is ignored, and the second element is an object containing partial workflow information.
 * @param params.organizationId - The ID of the organization to filter workflows.
 * @param params.id - The ID of the workflow to fetch.
 * @returns A promise that resolves to a `WorkflowInfo` object containing detailed information about the workflow.
 */
export const workflowFetcher = withActionExceptionHandler<[string, Partial<WorkflowInfo>], GraphQLResult<WorkflowInfo>>(
  async (token, params) => {
    const [_, filters] = params;
    const { organizationId, id } = filters;

    const query = gql`
      query ($organizationId: Int!, $id: ID!) {
        workflows(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
          pagination: { limit: 1 }
        ) {
          data {
            id
            attributes {
              name
              description
              isActive
              isSystem
              createdAt
              updatedAt
              createdByUser {
                data {
                  id
                  attributes {
                    username
                    detail {
                      data {
                        attributes {
                          lastName
                          firstName
                        }
                      }
                    }
                  }
                }
              }
              updatedByUser {
                data {
                  id
                  attributes {
                    username
                    detail {
                      data {
                        attributes {
                          lastName
                          firstName
                        }
                      }
                    }
                  }
                }
              }
              driverReports(
                pagination: { limit: -1 }
                sort: "displayOrder:asc"
                filters: { publishedAt: { ne: null } }
              ) {
                data {
                  id
                  attributes {
                    name
                    isRequired
                    photoRequired
                    billOfLadingRequired
                    displayOrder
                    isSystem
                    description
                    isActive
                    createdAt
                    updatedAt
                    createdByUser {
                      data {
                        id
                        attributes {
                          username
                          detail {
                            data {
                              attributes {
                                lastName
                                firstName
                              }
                            }
                          }
                        }
                      }
                    }
                    updatedByUser {
                      data {
                        id
                        attributes {
                          username
                          detail {
                            data {
                              attributes {
                                lastName
                                firstName
                              }
                            }
                          }
                        }
                      }
                    }
                    reportDetails(
                      pagination: { limit: -1 }
                      sort: "displayOrder:asc"
                      filters: { publishedAt: { ne: null } }
                    ) {
                      data {
                        id
                        attributes {
                          name
                          description
                          displayOrder
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const { data } = await fetcher<WorkflowInfo[]>(token.jwt, query, {
      organizationId,
      id,
    });

    return {
      status: HttpStatusCode.Ok,
      data: {
        data: data?.workflows[0],
      },
    };
  }
);

/**
 * Fetches a workflow by its ID.
 * @param id - The unique identifier of the workflow to fetch.
 * @returns A promise that resolves to the `WorkflowInfo` object containing
 *          the workflow details.
 */
export const getWorkflow = withActionExceptionHandler<number, GraphQLResult<WorkflowInfo>>(async (token, params) => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      workflows(
        filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        pagination: { limit: 1 }
      ) {
        data {
          id
          attributes {
            name
            description
            isActive
            createdAt
            updatedAt
            createdByUser {
              data {
                id
                attributes {
                  username
                  detail {
                    data {
                      attributes {
                        lastName
                        firstName
                      }
                    }
                  }
                }
              }
            }
            updatedByUser {
              data {
                id
                attributes {
                  username
                  detail {
                    data {
                      attributes {
                        lastName
                        firstName
                      }
                    }
                  }
                }
              }
            }
            driverReports(pagination: { limit: -1 }, sort: "displayOrder:asc", filters: { publishedAt: { ne: null } }) {
              data {
                id
                attributes {
                  name
                  isRequired
                  photoRequired
                  billOfLadingRequired
                  displayOrder
                  isSystem
                  description
                  isActive
                  createdAt
                  updatedAt
                  createdByUser {
                    data {
                      id
                      attributes {
                        username
                        detail {
                          data {
                            attributes {
                              lastName
                              firstName
                            }
                          }
                        }
                      }
                    }
                  }
                  updatedByUser {
                    data {
                      id
                      attributes {
                        username
                        detail {
                          data {
                            attributes {
                              lastName
                              firstName
                            }
                          }
                        }
                      }
                    }
                  }
                  reportDetails(
                    pagination: { limit: -1 }
                    sort: "displayOrder:asc"
                    filters: { publishedAt: { ne: null } }
                  ) {
                    data {
                      id
                      attributes {
                        name
                        description
                        displayOrder
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<WorkflowInfo[]>(token.jwt, query, {
    organizationId: token.user.orgId,
    id: params,
  });

  return {
    status: HttpStatusCode.Ok,
    data: {
      data: data?.workflows[0],
    },
  };
});

/**
 * Deletes a workflow entity after performing necessary validations.
 *
 * @param entity - An object containing the workflow's `organizationId`, `id`, and `updatedById`.
 * @param lastUpdatedAt - (Optional) A `Date` or `string` representing the last update timestamp for exclusivity checks.
 * @returns A promise that resolves to a `MutationResult<WorkflowInfo>` object containing either the updated workflow data or an error.
 */
export const deleteWorkflow = withActionExceptionHandler<
  { entity: Pick<WorkflowInfo, "id" | "updatedById">; lastUpdatedAt?: Date | string },
  WorkflowInfo
>(async (token, params) => {
  const { entity, lastUpdatedAt } = params;
  const { id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const { data: isErrorExclusives } = await checkWorkFlowExclusives({
      id,
      lastUpdatedAt,
    });

    if (isErrorExclusives) {
      return { status: HttpStatusCode.Exclusive };
    }
  }

  const query = gql`
    mutation ($id: ID!, $updatedById: ID!) {
      updateWorkflow(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<WorkflowInfo>(token.jwt, query, {
    id,
    updatedById,
  });

  await deleteDriverReportByWorkflowId({ id, updatedById });

  return { status: HttpStatusCode.Ok, data: data.updateWorkflow };
});
