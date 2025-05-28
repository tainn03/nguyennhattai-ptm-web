import { endOfDay, startOfDay } from "date-fns";
import { gql } from "graphql-request";
import { isArray } from "lodash";

import { GasStationInputForm } from "@/forms/gasStation";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { GasStationInfo } from "@/types/strapi";
import { graphQLPost, post, put } from "@/utils/api";
import { trim } from "@/utils/string";

/**
 * Fetch gass from the server based on the provided filter parameters.
 *
 * @param params - An object containing filter parameters for the query.
 * @returns An object containing the fetched gass and pagination meta information.
 */
export const gasStationsFetcher = async ([_, params]: [string, FilterRequest<GasStationInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    name,
    fuelCapacity,
    isActiveOptions,
    createdByUser,
    createdAtFrom,
    createdAtTo,
    updatedByUser,
    updatedAtFrom,
    updatedAtTo,
    fuelCapacityMin,
    fuelCapacityMax,
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

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams;

  if (keywords && name) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
                              { name: { containsi: $keywords } }
                              { name: { containsi: $name } }
                            ]`;
    searchParams = { keywords, name };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = "name: { containsi: $keywords }";
    searchParams = { keywords };
  } else if (name) {
    searchCondition = "name: { containsi: $name }";
    searchParams = { name };
  }

  const { data, meta } = await graphQLPost<GasStationInfo[]>({
    query: gql`
          query (
            $page: Int
            $pageSize: Int
            $organizationId: Int!
            $sort: [String]
            ${graphQLParams}
            ${name ? " $name: String" : ""}
            ${fuelCapacity ? " $name: String" : ""}
            ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "$isActive: [Boolean]" : ""}
            ${createdByUser ? "$createdByUser: String" : ""}
            ${createdAtFrom ? "$createdAtFrom: DateTime" : ""}
            ${createdAtTo ? "$createdAtTo: DateTime" : ""}
            ${updatedByUser ? "$updatedByUser: String" : ""}
            ${updatedAtFrom ? "$updatedAtFrom: DateTime" : ""}
            ${updatedAtTo ? "$updatedAtTo: DateTime" : ""}
            ${fuelCapacityMin ? " $fuelCapacityMin: Float" : ""}
            ${fuelCapacityMax ? " $fuelCapacityMax: Float" : ""}
          ) {
            gasStations(
              pagination: { page: $page, pageSize: $pageSize }
              sort: $sort
              filters: {
                organizationId: { eq: $organizationId }
                ${searchCondition}
                ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "isActive: { in: $isActive }" : ""}
                ${createdByUser ? "createdByUser: { username: { containsi: $createdByUser } }" : ""}
                ${createdAtCondition}
                ${updatedByUser ? "updatedByUser: { username: { containsi: $updatedByUser } }" : ""}
                ${updatedAtCondition}
                ${fuelCapacityMin && !fuelCapacityMax ? "fuelCapacity: { gte : $fuelCapacityMin }" : ""}
                ${fuelCapacityMax && !fuelCapacityMin ? "fuelCapacity: { lte: $fuelCapacityMax }" : ""}
                ${
                  fuelCapacityMin && fuelCapacityMax
                    ? "fuelCapacity: { gte: $fuelCapacityMin, lte: $fuelCapacityMax }"
                    : ""
                }
                publishedAt: { ne: null }
              }
            ) {
              data {
                id
                attributes {
                  name
                  fuelCapacity
                  isActive
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
      ...(isArray(isActiveOptions) &&
        isActiveOptions.length > 0 && { isActive: isActiveOptions.map((item) => item === "true") }),
      ...(createdByUser && { createdByUser }),
      ...(createdAtFrom && { createdAtFrom: startOfDay(createdAtFrom) }),
      ...(createdAtTo && { createdAtTo: endOfDay(createdAtTo) }),
      ...(updatedByUser && { updatedByUser }),
      ...(updatedAtFrom && { updatedAtFrom: startOfDay(updatedAtFrom) }),
      ...(updatedAtTo && { updatedAtTo: endOfDay(updatedAtTo) }),
      ...(fuelCapacityMin && { fuelCapacityMin: Number(fuelCapacityMin) }),
      ...(fuelCapacityMax && { fuelCapacityMax: Number(fuelCapacityMax) }),
    },
  });

  return { data: data?.gasStations ?? [], meta };
};

/**
 * Retrieves a gas station from the server.
 *
 * @param organizationId - The ID of the organization associated with the gas station.
 * @param id - The ID of the gas station to retrieve.
 * @returns A promise that resolves to the requested gas station if found, or undefined if not found.
 */
export const gasStationFetcher = async ([_, params]: [string, Partial<GasStationInfo>]) => {
  const { organizationId, id } = params;
  const { data } = await graphQLPost<GasStationInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        gasStations(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              name
              fuelCapacity
              description
              isActive
              address {
                data {
                  id
                  attributes {
                    country {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    city {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    district {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    ward {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    addressLine1
                  }
                }
              }
              createdAt
              createdByUser {
                data {
                  id
                  attributes {
                    detail {
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
              updatedAt
              updatedByUser {
                data {
                  id
                  attributes {
                    detail {
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

  return data?.gasStations[0];
};

/**
 * Retrieves a gas station from the server.
 *
 * @param organizationId - The ID of the organization associated with the gas station.
 * @param id - The ID of the gas station to retrieve.
 * @returns A promise that resolves to the requested gas station if found, or undefined if not found.
 */
export const getGasStation = async (organizationId: number, id: number): Promise<GasStationInfo | undefined> => {
  const { data } = await graphQLPost<GasStationInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        gasStations(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              name
              fuelCapacity
              description
              isActive
              address {
                data {
                  id
                  attributes {
                    country {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    city {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    district {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    ward {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    addressLine1
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

  return data?.gasStations[0];
};

/**
 * Checks if a gas has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the gas belongs.
 * @param {number} id - The ID of the gas to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the gas's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the gas has been updated, otherwise false.
 */
export const checkGasStationExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<GasStationInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        gasStations(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.gasStations[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Creates a new gas station.
 *
 * @param {GasStationInputForm} entity - The gas station to create.
 * @returns The ID of the newly created gas station.
 */
export const createGasStation = async (entity: GasStationInputForm): Promise<ApiResult<number>> => {
  return await post<ApiResult<number>>(`/api/orgs/${entity.organizationId}/settings/gas-stations/new`, trim(entity));
};

/**
 * Update a gas station.
 *
 * @param {GasStationInputForm} entity - The gas station to update.
 * @returns The ID of the newly updated gas station.
 */
export const updateGasStation = async (entity: GasStationInputForm): Promise<ApiResult<number>> => {
  return await put<ApiResult<number>>(
    `/api/orgs/${entity.organizationId}/settings/gas-stations/${entity.id}/edit`,
    trim(entity)
  );
};

/**
 * Deletes an existing gas station.
 *
 * @param {Pick<GasStationInfo, "organizationId" | "id" | "updatedById">} entity - The gas station entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<GasStationInfo | ErrorType>} A promise that resolves to the deleted gas station or an error type.
 */
export const deleteGasStation = async (
  entity: Pick<GasStationInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<GasStationInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkGasStationExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<GasStationInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateGasStation(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateGasStation };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetch a list of active gas station options for a specific organization.
 *
 * @param {object} params - An object containing organizationId.
 * @returns {Promise<GasStationInfo[]>} - An array of active gas station options.
 */
export const gasStationOptionsFetcher = async ([_, params]: [string, Partial<GasStationInfo>]) => {
  const { data } = await graphQLPost<GasStationInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        gasStations(
          filters: { publishedAt: { ne: null }, organizationId: { eq: $organizationId }, isActive: { eq: true } }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              name
              address {
                data {
                  id
                  attributes {
                    country {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    city {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    district {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    ward {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    postalCode
                    addressLine1
                  }
                }
              }
            }
          }
        }
      }
    `,
    params: {
      organizationId: params.organizationId,
    },
  });

  return data?.gasStations ?? [];
};
