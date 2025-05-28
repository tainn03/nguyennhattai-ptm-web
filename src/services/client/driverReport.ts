import { gql } from "graphql-request";
import moment from "moment";

import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { DriverReportInfo } from "@/types/strapi";
import { graphQLPost, put } from "@/utils/api";
import { trim } from "@/utils/string";

/**
 * A function to fetch driver report data from a GraphQL endpoint.
 * @param [_, params] - A tuple containing a string (not used) and params for the query.
 * @returns A Promise that resolves to the driver report data.
 */
export const driverReportFetcher = async ([_, params]: [string, Partial<DriverReportInfo>]) => {
  const processedParams = trim(params);

  const { data } = await graphQLPost<DriverReportInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        driverReports(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              type
              name
              isRequired
              photoRequired
              billOfLadingRequired
              displayOrder
              isSystem
              description
              isActive
              reportDetails(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    name
                    description
                    displayOrder
                  }
                }
              }
              createdAt
              createdByUser {
                data {
                  id
                  attributes {
                    username
                    email
                    detail {
                      data {
                        attributes {
                          avatar {
                            data {
                              attributes {
                                url
                                previewUrl
                              }
                            }
                          }
                          lastName
                          firstName
                        }
                      }
                    }
                  }
                }
              }
              updatedAt
              updatedByUser {
                data {
                  id
                  attributes {
                    username
                    email
                    detail {
                      data {
                        attributes {
                          avatar {
                            data {
                              attributes {
                                url
                                previewUrl
                              }
                            }
                          }
                          lastName
                          firstName
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
    `,
    params: processedParams,
  });

  return data?.driverReports[0];
};

/**
 * A function to fetch a list of driver reports from a GraphQL endpoint.
 * @param [_, params] - A tuple containing a string (not used) and params for the query.
 * @returns A Promise that resolves to a list of driver report data.
 */
export const driverReportsFetcher = async ([_, params]: [string, FilterRequest<DriverReportInfo>]): Promise<
  DriverReportInfo[] | undefined
> => {
  const { organizationId, keywords } = trim(params);

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams;

  if (keywords) {
    if (isNaN(keywords)) {
      // Search by name
      graphQLParams = "$keywords: String";
      searchCondition = "name: { containsi: $keywords }";
      searchParams = { keywords };
    } else {
      // Search by ID
      graphQLParams = `$keywordId: ID
                       $keywordName: String`;
      searchCondition = `or: [
                            { name: { containsi: $keywordName } }
                            { id: { eq: $keywordId } }
                          ]`;
      searchParams = { keywordId: Number(keywords), keywordName: keywords };
    }
  }

  const { data } = await graphQLPost<DriverReportInfo[]>({
    query: gql`
        query (
          $organizationId: Int!
          ${graphQLParams}
        ) {
          driverReports(
            pagination: { limit: -1 }
            sort: "displayOrder"
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              ${searchCondition}
            }
          ) {
            data {
              id
              attributes {
                name
                isActive
                isRequired
                isSystem
                displayOrder
                billOfLadingRequired
                photoRequired
                description
                createdAt
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
                updatedAt
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
                reportDetails(pagination: { limit: -1 }) {
                  data {
                    id
                    attributes {
                      name
                      description
                    }
                  }
                }
              }
            }
          }
        }
      `,
    params: {
      organizationId,
      ...(searchParams && { ...searchParams }),
    },
  });

  return data?.driverReports ?? [];
};

/**
 * A function to fetch a single driver report by organizationId and id from a GraphQL endpoint.
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the driver report to fetch.
 * @returns A Promise that resolves to the driver report data.
 */
export const getDriverReport = async (organizationId: number, id: number): Promise<DriverReportInfo | undefined> => {
  const { data } = await graphQLPost<DriverReportInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        driverReports(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              type
              name
              isRequired
              photoRequired
              billOfLadingRequired
              description
              displayOrder
              isSystem
              isActive
              reportDetails(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    name
                    description
                    displayOrder
                    createdAt
                    updatedAt
                  }
                }
              }
              createdAt
              createdByUser {
                data {
                  id
                }
              }
              updatedAt
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      id,
    },
  });

  return data?.driverReports[0];
};

/**
 * A function to check if a driver report has been updated by comparing its last update timestamp.
 * @param organizationId - The ID of the organization.
 * @param id - The ID of the driver report to check.
 * @param lastUpdatedAt - The timestamp of the last update for comparison.
 * @returns A Promise that resolves to true if the driver report has been updated, or false otherwise.
 */
export const checkDriverReportExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<DriverReportInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        driverReports(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              updatedAt
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      id,
    },
  });

  if (data?.driverReports) {
    return !moment(data.driverReports[0]?.updatedAt).isSame(lastUpdatedAt);
  }

  return true;
};

/**
 * Delete a driver report based on the provided entity data.
 *
 * @param entity - The entity containing organizationId, id, and updatedById.
 * @param lastUpdatedAt - An optional parameter to check for exclusivity based on the last updated timestamp.
 * @returns A Promise that resolves to a MutationResult containing the result of the deletion operation.
 */
export const deleteDriverReport = async (
  entity: Pick<DriverReportInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<DriverReportInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkDriverReportExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<DriverReportInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateDriverReport(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateDriverReport };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * A function to fetch driver report data from a GraphQL endpoint.
 * @param [_, params] - A tuple containing a string (not used) and params for the query.
 * @returns A Promise that resolves to the driver report data.
 */
export const driverReportsTripStatusFetcher = async ([_, params]: [string, FilterRequest<DriverReportInfo>]) => {
  const { organizationId, excludedTypes } = trim(params);

  const { data } = await graphQLPost<DriverReportInfo[]>({
    query: gql`
      query ($organizationId: Int!, $excludedTypes: [String]) {
        driverReports(
          pagination: { limit: -1 }
          sort: "displayOrder"
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            isActive: { eq: true }
            type: { notIn: $excludedTypes }
          }
        ) {
          data {
            id
            attributes {
              type
              name
              displayOrder
              isSystem
              isRequired
              photoRequired
              billOfLadingRequired
              reportDetails(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    displayOrder
                    name
                    description
                  }
                }
              }
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      ...(excludedTypes && { excludedTypes }),
    },
  });

  return data?.driverReports ?? [];
};

/**
 * A function to fetch driver report data from a GraphQL endpoint.
 * @param organizationId - The ID of the organization.
 * @returns Information about the driver reports, including its type and name.
 */
export const driverReportsTripStatusWithTypeAndNameFetcher = async ([_, params]: [
  string,
  FilterRequest<DriverReportInfo>,
]) => {
  const { organizationId, excludedTypes } = trim(params);

  const { data } = await graphQLPost<DriverReportInfo[]>({
    query: gql`
      query ($organizationId: Int!, $excludedTypes: [String]) {
        driverReports(
          sort: "displayOrder:asc"
          filters: {
            organizationId: { eq: $organizationId }
            type: { notIn: $excludedTypes }
            publishedAt: { ne: null }
            isActive: { eq: true }
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              type
              name
              displayOrder
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      ...(excludedTypes && { excludedTypes }),
    },
  });

  return data?.driverReports;
};

/**
 * A function to fetch driver reports associated with a specific workflow.
 * @param [_, params] - A tuple containing a string (not used) and filter params.
 * @returns A Promise that resolves to driver report data filtered by workflow.
 */
export const driverReportsTripStatusByWorkflowFetcher = async ([_, params]: [
  string,
  FilterRequest<DriverReportInfo>,
]) => {
  const { organizationId, workflowId } = trim(params);

  const { data } = await graphQLPost<DriverReportInfo[]>({
    query: gql`
      query ($organizationId: Int!, $workflowId: ID) {
        driverReports(
          sort: "displayOrder:asc"
          filters: {
            organizationId: { eq: $organizationId }
            workflow: { id: { eq: $workflowId } }
            publishedAt: { ne: null }
            isActive: { eq: true }
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              type
              name
              displayOrder
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      ...(workflowId && { workflowId }),
    },
  });

  return data?.driverReports;
};

/**
 * A function to update the display order of driver reports.
 * @param orgLink - The organization link.
 * @param updatedList - An array of updated driver report information.
 * @returns The status of the update operation.
 */
export const updateDisplayOrderDriverReport = async (orgLink: string, updatedList: DriverReportInfo[]) => {
  const result = await put<ApiResult>(`/api${orgLink}/settings/driver-reports`, {
    driverReports: updatedList.map((item) => ({
      id: Number(item.id),
      displayOrder: item.displayOrder,
    })),
  });

  return result?.status ?? null;
};
