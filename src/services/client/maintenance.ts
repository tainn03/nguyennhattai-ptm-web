import { Maintenance, MaintenanceTypeType } from "@prisma/client";
import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { MaintenanceInputForm } from "@/forms/maintenance";
import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { MaintenanceInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { endOfDay, formatGraphQLDate, startOfDay } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Fetches maintenance information based on specified parameters from the GraphQL API.
 *
 * @param {Partial<MaintenanceInfo>} params - Parameters for filtering maintenances.
 * @returns {Promise<MaintenanceInfo | null>} A promise that resolves to the fetched maintenance or null if not found.
 */
export const maintenanceFetcher = async ([_, params]: [string, Partial<MaintenanceInfo>]): Promise<
  MaintenanceInfo | undefined
> => {
  const { data } = await graphQLPost<MaintenanceInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        maintenances(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              type
              isOtherType
              otherMaintenanceType
              maintenanceDate
              estimateCost
              actualCost
              description
              isRepeat
              repeatDate
              createdAt
              updatedAt
              trailer {
                data {
                  id
                  attributes {
                    trailerNumber
                  }
                }
              }
              maintenanceType {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
                  }
                }
              }
              costBearer {
                data {
                  id
                  attributes {
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
              createdByUser {
                data {
                  id
                  attributes {
                    username
                    email
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
                    email
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
            }
          }
        }
      }
    `,
    params,
  });

  return data?.maintenances[0];
};

/**
 * Fetch maintenances from the server based on the provided filter parameters.
 *
 * @param params - An object containing filter parameters for the query.
 * @returns An object containing the fetched maintenances and pagination meta information.
 */
export const maintenancesFetcher = async ([_, params]: [string, FilterRequest<MaintenanceInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    license,
    createdByUser,
    typeOptions,
    createdAtFrom,
    createdAtTo,
    updatedByUser,
    updatedAtFrom,
    estimateCostFrom,
    estimateCostTo,
    actualCostFrom,
    actualCostTo,
    updatedAtTo,
  } = trim(params);
  let createdAtCondition = "";
  if (createdAtFrom || createdAtTo) {
    createdAtCondition = `createdAt: {
                            ${createdAtFrom ? "gte: $createdAtFrom" : ""}
                            ${createdAtTo ? "lte: $createdAtTo" : ""}
                          }`;
  }

  let updatedAtCondition = "";
  if (updatedAtFrom || updatedAtTo) {
    updatedAtCondition = `updatedAt: {
                            ${updatedAtFrom ? "gte: $updatedAtFrom" : ""}
                            ${updatedAtTo ? "lte: $updatedAtTo" : ""}
                          }`;
  }
  let estimateCostCondition = "";
  if (estimateCostFrom || estimateCostTo) {
    estimateCostCondition = `estimateCost: {
                            ${estimateCostFrom ? "gte: $estimateCostFrom" : ""}
                            ${estimateCostTo ? "lte: $estimateCostTo" : ""}
                          }`;
  }
  let actualCostCondition = "";
  if (actualCostFrom || actualCostTo) {
    actualCostCondition = ` actualCost: {
                            ${actualCostFrom ? "gte: $actualCostFrom" : ""}
                            ${actualCostTo ? "lte: $actualCostTo" : ""}
                          }`;
  }

  const licenseCondition = "";
  if (license) {
    `"trailer: { trailerNumber: { contains: $license } }"
    "vehicle: { vehicleNumber: { contains: $license } }"`;
  }

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams;

  if (keywords && license) {
    if (isNaN(keywords)) {
      // Search by license
      graphQLParams = "$keywords: String";
      searchCondition = `or: [
                            { trailer: { trailerNumber: { containsi: $keywords } } }
                            { vehicle: { vehicleNumber: { containsi: $keywords } } }
                          ]`;
      searchParams = { keywords, license };
    } else {
      // Search by ID
      graphQLParams = `$keywordId: ID
                       $keywordLicense: String`;
      searchCondition = `or: [
                            { trailer: { trailerNumber: { containsi: $keywordLicense } } }
                            { vehicle: { vehicleNumber: { containsi: $keywordLicense } } }
                            { id: { eq: $keywordId } }
                          ]`;
      searchParams = { keywordId: Number(keywords), keywordLicense: keywords };
    }
  } else if (keywords) {
    if (isNaN(keywords)) {
      // Search by license
      graphQLParams = "$keywords: String";
      searchCondition = `or: [
                              { trailer: { trailerNumber: { containsi: $keywords } } }
                              { vehicle: { vehicleNumber: { containsi: $keywords } } }
                            ]`;
      searchParams = { keywords };
    } else {
      // Search by ID
      graphQLParams = `$keywordId: ID
                       $keywordLicense: String`;
      searchCondition = `or: [
                            { trailer: { trailerNumber: { containsi: $keywordLicense } } }
                            { vehicle: { vehicleNumber: { containsi: $keywordLicense } } }
                            { id: { eq: $keywordId } }
                          ]`;
      searchParams = { keywordId: Number(keywords), keywordLicense: keywords };
    }
  } else if (license) {
    searchCondition = `or: [
      { trailer: { trailerNumber: { containsi: $license } } }
      { vehicle: { vehicleNumber: { containsi: $license } } }
    ]`;
    searchParams = { license };
  }

  const { data, meta } = await graphQLPost<MaintenanceInfo[]>({
    query: gql`
      query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${graphQLParams}
          ${license ? " $license: String" : ""}
          ${isArray(typeOptions) && typeOptions.length > 0 ? "$type: [String]" : ""}
          ${createdByUser ? "$createdByUser: String" : ""}
          ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
          ${createdAtTo ? "$createdAtTo: DateTime" : ""}
          ${updatedByUser ? "$updatedByUser: String" : ""}
          ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
          ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
          ${estimateCostFrom ? "$estimateCostFrom: Float" : ""}
          ${estimateCostTo ? "$estimateCostTo: Float" : ""}
          ${actualCostFrom ? "$actualCostFrom: Float" : ""}
          ${actualCostTo ? "$actualCostTo: Float" : ""}
        ) {
          maintenances(
          pagination: { page: $page, pageSize: $pageSize }
          sort: $sort
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            ${searchCondition}
            ${isArray(typeOptions) && typeOptions.length > 0 ? "type: { in: $type }" : ""}
            ${createdByUser ? "createdByUser: { username: { containsi: $createdByUser } }" : ""}
            ${createdAtCondition}
            ${updatedByUser ? "updatedByUser: { username: { containsi: $updatedByUser } }" : ""}
            ${updatedAtCondition}
            ${estimateCostCondition}
            ${actualCostCondition}
            ${licenseCondition}
          }
        ) {
          data {
            id
            attributes {
              type
              estimateCost
              actualCost
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
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
                    driver {
                      data {
                        id
                        attributes {
                          firstName
                          lastName
                        }
                      }
                    }
                  }
                }
              }
              trailer {
                data {
                  id
                  attributes {
                    trailerNumber
                    vehicle {
                      data {
                        id
                        attributes {
                          vehicleNumber
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
    `,
    params: {
      organizationId,
      page,
      pageSize,
      sort: isArray(sort) ? sort : [sort],
      ...(searchParams && { ...searchParams }),
      ...(createdByUser && { createdByUser }),
      ...(createdAtFrom && { createdAtFrom: startOfDay(createdAtFrom) }),
      ...(createdAtTo && { createdAtTo: endOfDay(createdAtTo) }),
      ...(updatedByUser && { updatedByUser }),
      ...(updatedAtFrom && { updatedAtFrom: startOfDay(updatedAtFrom) }),
      ...(updatedAtTo && { updatedAtTo: endOfDay(updatedAtTo) }),
      ...(isArray(typeOptions) && typeOptions.length > 0 && { type: typeOptions }),
      ...(estimateCostFrom && { estimateCostFrom: Number(estimateCostFrom) }),
      ...(estimateCostTo && { estimateCostTo: Number(estimateCostTo) }),
      ...(actualCostFrom && { actualCostFrom: Number(actualCostFrom) }),
      ...(actualCostTo && { actualCostTo: Number(actualCostTo) }),
      ...(license && { license }),
    },
  });

  return { data: data?.maintenances ?? [], meta };
};

/**
 * Retrieves a maintenance from the server.
 *
 * @param organizationId - The ID of the organization associated with the maintenance.
 * @param id - The ID of the maintenance to retrieve.
 * @returns A promise that resolves to the requested maintenance if found, or undefined if not found.
 */
export const getMaintenance = async (organizationId: number, id: number): Promise<MaintenanceInfo | undefined> => {
  const { data } = await graphQLPost<MaintenanceInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        maintenances(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              type
              isOtherType
              otherMaintenanceType
              maintenanceDate
              estimateCost
              actualCost
              isRepeat
              repeatDate
              maintenanceType {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              createdByUser {
                data {
                  id
                }
              }
              costBearer {
                data {
                  id
                  attributes {
                    username
                  }
                }
              }
              description
              trailer {
                data {
                  id
                  attributes {
                    trailerNumber
                  }
                }
              }
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
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
      id,
    },
  });

  return data?.maintenances[0];
};

/**
 * Checks if a maintenance has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the maintenance belongs.
 * @param {number} id - The ID of the maintenance to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the maintenance's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the maintenance has been updated, otherwise false.
 */
export const checkMaintenanceExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<MaintenanceInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        maintenances(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.maintenances[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Creates a new maintenance.
 *
 * @param entity - The maintenance to create.
 * @returns The ID of the newly created maintenance.
 */
export const createMaintenance = async (entity: MaintenanceInputForm): Promise<MutationResult<MaintenanceInfo>> => {
  const {
    organizationId,
    type,
    vehicleId,
    trailerId,
    maintenanceTypeId,
    isOtherType,
    otherMaintenanceType,
    maintenanceDate,
    estimateCost,
    actualCost,
    costBearerId,
    createdById,
    description,
    isRepeat,
    repeatDate,
  } = trim(entity);

  const { status, data } = await graphQLPost<MaintenanceInfo>({
    query: gql`
      mutation (
        $organizationId: Int!
        $type: ENUM_MAINTENANCE_TYPE
        $vehicleId: ID
        $trailerId: ID
        $maintenanceTypeId: ID
        $isOtherType: Boolean
        $otherMaintenanceType: String
        $maintenanceDate: Date
        $estimateCost: Float
        $actualCost: Float
        $costBearerId: ID
        $description: String
        $isRepeat: Boolean
        $repeatDate: Date
        $createdById: ID
        $publishedAt: DateTime
      ) {
        createMaintenance(
          data: {
            organizationId: $organizationId
            type: $type
            vehicle: $vehicleId
            trailer: $trailerId
            maintenanceType: $maintenanceTypeId
            otherMaintenanceType: $otherMaintenanceType
            isOtherType: $isOtherType
            maintenanceDate: $maintenanceDate
            estimateCost: $estimateCost
            actualCost: $actualCost
            costBearer: $costBearerId
            description: $description
            isRepeat: $isRepeat
            repeatDate: $repeatDate
            createdByUser: $createdById
            updatedByUser: $createdById
            publishedAt: $publishedAt
          }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      organizationId,
      type,
      vehicleId: (type === MaintenanceTypeType.VEHICLE && vehicleId) || null,
      trailerId: (type === MaintenanceTypeType.TRAILER && trailerId) || null,
      maintenanceTypeId: Number(maintenanceTypeId) || null,
      isOtherType,
      otherMaintenanceType,
      maintenanceDate: formatGraphQLDate(maintenanceDate),
      estimateCost: Number(estimateCost),
      actualCost: Number(actualCost),
      costBearerId: costBearerId || null,
      description,
      isRepeat,
      repeatDate: isRepeat ? formatGraphQLDate(repeatDate) : null,
      createdById,
      publishedAt: new Date(),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createMerchandiseType };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Updates a maintenance's attributes within the organization.
 *
 * @param {Maintenance} entity - The maintenance entity to update.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<MaintenanceInfo | ErrorType>} A promise that resolves to the updated maintenance or an error type.
 */
export const updateMaintenance = async (
  entity: MaintenanceInputForm,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<MaintenanceInfo>> => {
  const {
    organizationId,
    id,
    type,
    vehicleId,
    trailerId,
    maintenanceTypeId,
    isOtherType,
    otherMaintenanceType,
    maintenanceDate,
    estimateCost,
    actualCost,
    costBearerId,
    description,
    isRepeat,
    repeatDate,
    updatedById,
  } = trim(entity);
  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkMaintenanceExclusives(Number(organizationId), Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<MaintenanceInfo>({
    query: gql`
      mutation (
        $id: ID!
        $organizationId: Int!
        $type: ENUM_MAINTENANCE_TYPE
        $vehicleId: ID
        $trailerId: ID
        $maintenanceTypeId: ID
        $isOtherType: Boolean
        $otherMaintenanceType: String
        $maintenanceDate: Date
        $estimateCost: Float
        $actualCost: Float
        $costBearerId: ID
        $description: String
        $isRepeat: Boolean
        $repeatDate: Date
        $updatedById: ID
      ) {
        updateMaintenance(
          id: $id
          data: {
            organizationId: $organizationId
            type: $type
            vehicle: $vehicleId
            trailer: $trailerId
            maintenanceType: $maintenanceTypeId
            isOtherType: $isOtherType
            otherMaintenanceType: $otherMaintenanceType
            maintenanceDate: $maintenanceDate
            estimateCost: $estimateCost
            actualCost: $actualCost
            costBearer: $costBearerId
            description: $description
            isRepeat: $isRepeat
            repeatDate: $repeatDate
            updatedByUser: $updatedById
          }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      organizationId,
      type,
      vehicleId: (type === MaintenanceTypeType.VEHICLE && vehicleId) || null,
      trailerId: (type === MaintenanceTypeType.TRAILER && trailerId) || null,
      maintenanceTypeId: Number(maintenanceTypeId) || null,
      isOtherType,
      otherMaintenanceType,
      maintenanceDate: formatGraphQLDate(maintenanceDate),
      estimateCost: Number(estimateCost),
      actualCost: Number(actualCost),
      costBearerId: costBearerId || null,
      description,
      isRepeat,
      repeatDate: isRepeat ? formatGraphQLDate(repeatDate) : null,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateMaintenance };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Deletes an existing maintenance.
 *
 * @param {Pick<Maintenance, "organizationId" | "id" | "updatedById">} entity - The maintenance entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<MaintenanceInfo | ErrorType>} A promise that resolves to the deleted maintenance or an error type.
 */
export const deleteMaintenance = async (
  entity: Pick<Maintenance, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<MaintenanceInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkMaintenanceExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<MaintenanceInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateMaintenance(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateMaintenance };
  }

  return { error: ErrorType.UNKNOWN };
};
