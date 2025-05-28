import { HttpStatusCode } from "axios";
import { endOfDay, startOfDay } from "date-fns";
import { gql } from "graphql-request";

import { FuelLogInputForm } from "@/forms/fuelLog";
import { ErrorType } from "@/types";
import { ApiResult } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { LocaleType } from "@/types/locale";
import { FuelLogInfo } from "@/types/strapi";
import { graphQLPost, post, put } from "@/utils/api";
import { trim } from "@/utils/string";

/**
 * Fetch driver salary information based on various parameters from the GraphQL API.
 *
 * @param {Array} _ - An array where the first element is a string (not used in this function), and the second element is a FilterRequest object containing various parameters.
 * @returns {Promise<{data: OrderTripInfo[], meta: any}>} A promise that resolves to an object containing an array of OrderTripInfo objects and some metadata.
 */
export const fuelLogsFetcher = async ([_, params]: [string, FilterRequest<FuelLogInfo>]) => {
  const { page, pageSize, organizationId, startDate, endDate, driverId, vehicleId, gasStationId } = trim(params);

  const { data, meta } = await graphQLPost<FuelLogInfo[]>({
    query: gql`
      query (
        $page: Int
        $pageSize: Int
        $organizationId: Int!
        $sort: [String]
        $driverId: ID
        $vehicleId: ID
        $gasStationId: ID
        $startDate: DateTime
        $endDate: DateTime
      ) {
        fuelLogs(
          pagination: { page: $page, pageSize: $pageSize }
          sort: $sort
          filters: {
            organizationId: { eq: $organizationId }
            driver: { id: { eq: $driverId } }
            vehicle: { id: { eq: $vehicleId } }
            gasStation: { id: { eq: $gasStationId } }
            date: { gte: $startDate, lte: $endDate }
          }
        ) {
          data {
            id
            attributes {
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
                    idNumber
                    fuelConsumption
                  }
                }
              }
              gasStation {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              driver {
                data {
                  id
                  attributes {
                    firstName
                    lastName
                    email
                    phoneNumber
                  }
                }
              }
              date
              liters
              fuelCost
              odometerReading
              averageConsumption
              confirmationAt
              confirmationBy {
                data {
                  id
                  attributes {
                    username
                    detail {
                      data {
                        id
                        attributes {
                          firstName
                          lastName
                          avatar {
                            data {
                              id
                              attributes {
                                name
                                url
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
              createdByUser {
                data {
                  id
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
      page,
      pageSize,
      organizationId,
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
      ...(driverId && { driverId }),
      ...(vehicleId && { vehicleId }),
      ...(gasStationId && { gasStationId }),
      sort: ["date:desc"],
    },
  });
  return { data: data?.fuelLogs ?? [], meta };
};

/**
 * Fetch driver salary information based on various parameters from the GraphQL API.
 *
 * @param {Array} _ - An array where the first element is a string (not used in this function), and the second element is a FilterRequest object containing various parameters.
 * @returns {Promise<{data: OrderTripInfo[], meta: any}>} A promise that resolves to an object containing an array of OrderTripInfo objects and some metadata.
 */
export const fuelLogsGasStationChartFetcher = async ([_, params]: [
  string,
  Pick<FuelLogInfo, "organizationId"> & { startDate: Date; endDate: Date },
]) => {
  const { organizationId, startDate, endDate } = trim(params);

  const { data } = await graphQLPost<FuelLogInfo[]>({
    query: gql`
      query ($organizationId: Int!, $startDate: DateTime, $endDate: DateTime) {
        fuelLogs(
          pagination: { limit: -1 }
          filters: { organizationId: { eq: $organizationId }, date: { gte: $startDate, lte: $endDate } }
        ) {
          data {
            id
            attributes {
              gasStation {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              liters
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
    },
  });
  return data?.fuelLogs ?? [];
};

/**
 * Retrieves a fuel log from the server.
 *
 * @param organizationId - The ID of the organization associated with the fuel log.
 * @param id - The ID of the fuel log to retrieve.
 * @returns A promise that resolves to the requested fuel log if found, or undefined if not found.
 */
export const fuelLogFetcher = async ([_, params]: [string, Partial<FuelLogInfo>]) => {
  const { organizationId, id } = params;
  const { data } = await graphQLPost<FuelLogInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        fuelLogs(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              date
              notes
              fuelType
              liters
              fuelCost
              fuelMeterImage {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              odometerReading
              odometerImage {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              latitude
              longitude
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
                    idNumber
                  }
                }
              }
              driver {
                data {
                  id
                  attributes {
                    firstName
                    lastName
                    phoneNumber
                    email
                  }
                }
              }
              gasStation {
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
              confirmationBy {
                data {
                  id
                  attributes {
                    username
                    detail {
                      data {
                        id
                        attributes {
                          firstName
                          lastName
                          avatar {
                            data {
                              id
                              attributes {
                                name
                                url
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
              confirmationAt
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

  return data?.fuelLogs[0];
};

/**
 * Retrieves a fuel log from the server.
 *
 * @param organizationId - The ID of the organization associated with the fuel log.
 * @param id - The ID of the fuel log to retrieve.
 * @returns A promise that resolves to the requested fuel log if found, or undefined if not found.
 */
export const getFuelLog = async (organizationId: number, id: number): Promise<FuelLogInfo | undefined> => {
  const { data } = await graphQLPost<FuelLogInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        fuelLogs(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
                  }
                }
              }
              gasStation {
                data {
                  id
                }
              }
              driver {
                data {
                  id
                }
              }
              date
              notes
              latitude
              longitude
              liters
              fuelCost
              fuelType
              odometerReading
              odometerImage {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              fuelMeterImage {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              updatedAt
              createdByUser {
                data {
                  id
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

  return data?.fuelLogs[0];
};

/**
 * Checks if a gas has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the gas belongs.
 * @param {number} id - The ID of the gas to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the gas's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the gas has been updated, otherwise false.
 */
export const checkFuelLogExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<FuelLogInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        fuelLogs(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.fuelLogs[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Creates a new fuel log.
 *
 * @param {FuelLogInputForm} entity - The fuel log to create.
 * @param {LocaleType} locale - The locale code for the desired language.
 * @returns The ID of the newly created fuel log.
 */
export const createFuelLog = async (entity: FuelLogInputForm, locale: LocaleType): Promise<ApiResult<number>> => {
  const param = trim({ ...entity, locale: locale });
  return await post<ApiResult<number>>(`/api/orgs/${entity.organizationId}/reports/fuel-logs/new`, param);
};

/**
 * Update a fuel log.
 *
 * @param {FuelLogInputForm} entity - The fuel log to update.
 * @returns The ID of the newly updated fuel log.
 */
export const updateFuelLog = async (entity: FuelLogInputForm): Promise<ApiResult<number>> => {
  return await put<ApiResult<number>>(
    `/api/orgs/${entity.organizationId}/reports/fuel-logs/${entity.id}/edit`,
    trim(entity)
  );
};

/**
 * Deletes an existing fuel log.
 *
 * @param {Pick<FuelLogInfo, "organizationId" | "id" | "updatedById">} entity - The fuel log entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<FuelLogInfo | ErrorType>} A promise that resolves to the deleted fuel log or an error type.
 */
export const deleteFuelLog = async (
  entity: Pick<FuelLogInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<FuelLogInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkFuelLogExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<FuelLogInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateFuelLog(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateFuelLog };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Deletes an existing fuel log.
 *
 * @param {Pick<FuelLogInfo, "organizationId" | "id" | "updatedById">} entity - The fuel log entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<FuelLogInfo | ErrorType>} A promise that resolves to the deleted fuel log or an error type.
 */
export const confirmFuelLog = async (
  entity: Pick<FuelLogInfo, "id" | "updatedById">
): Promise<MutationResult<FuelLogInfo>> => {
  const { id, updatedById } = entity;

  const { status, data } = await graphQLPost<FuelLogInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!, $date: DateTime) {
        updateFuelLog(id: $id, data: { confirmationBy: $updatedById, confirmationAt: $date }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById,
      date: new Date(),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateFuelLog };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches fuel log data for a specific vehicle within a date range.
 * @param {number} organizationId - The ID of the organization.
 * @param {number} vehicleId - The ID of the vehicle.
 * @param {Date} startDate - The start date of the date range.
 * @param {Date} endDate - The end date of the date range.
 * @returns {Promise<FuelLogInfo[]>} - A promise that resolves to an array of FuelLogInfo objects.
 */
export const getFuelLogDataChart = async (
  organizationId: number,
  vehicleId: number,
  startDate: Date,
  endDate: Date
): Promise<FuelLogInfo[]> => {
  const { data } = await graphQLPost<FuelLogInfo[]>({
    query: gql`
      query ($vehicleId: ID, $organizationId: Int, $startDate: DateTime!, $endDate: DateTime!) {
        fuelLogs(
          filters: {
            organizationId: { eq: $organizationId }
            vehicle: { id: { eq: $vehicleId } }
            publishedAt: { ne: null }
            date: { gte: $startDate, lte: $endDate }
          }
          pagination: { limit: -1 }
          sort: "date:asc"
        ) {
          data {
            id
            attributes {
              date
              liters
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      vehicleId,
      startDate: startOfDay(startDate),
      endDate: endOfDay(endDate),
    },
  });
  return data?.fuelLogs || [];
};
