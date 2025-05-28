import { HttpStatusCode } from "axios";
import { format } from "date-fns";
import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { VehicleInputForm } from "@/forms/vehicle";
import { ErrorType } from "@/types";
import { ApiResult } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { VehicleInfo } from "@/types/strapi";
import { graphQLPost, post } from "@/utils/api";
import { ensureString, trim } from "@/utils/string";

/**
 * Fetch vehicle information based on specified parameters from the GraphQL API.
 *
 * @param {[string, Partial<VehicleInfo>]} params - A tuple containing a string (unused) and parameters for filtering vehicle types.
 * @returns {Promise<VehicleInfo | null>} A promise that resolves to the fetched vehicle information or null if not found.
 */
export const vehicleFetcher = async ([_, params]: [string, Partial<VehicleInfo>]) => {
  const { data } = await graphQLPost<VehicleInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        vehicles(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              subcontractorId
              vehicleNumber
              idNumber
              ownerType
              type {
                data {
                  id
                  attributes {
                    name
                    description
                  }
                }
              }
              trailer {
                data {
                  id
                  attributes {
                    trailerNumber
                    idNumber
                  }
                }
              }
              brand
              model
              yearOfManufacture
              color
              fuelType
              startUsageDate
              maxLength
              maxWidth
              maxHeight
              cubicMeterCapacity
              tonPayloadCapacity
              palletCapacity
              driver {
                data {
                  id
                  attributes {
                    firstName
                    lastName
                    email
                    phoneNumber
                    publishedAt
                  }
                }
              }
              images {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              registrationCertificate {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              technicalSafetyCertificate {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              liabilityInsuranceCertificate {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              registrationDate
              registrationExpirationDate
              technicalSafetyRegistrationDate
              technicalSafetyExpirationDate
              liabilityInsuranceExpirationDate
              liabilityInsuranceRegistrationDate
              description
              isActive
              fuelConsumption
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
                          lastName
                          firstName
                        }
                      }
                    }
                  }
                }
              }
              meta
            }
          }
        }
      }
    `,
    params,
  });

  return data?.vehicles[0];
};

/**
 * Fetches a list of vehicles based on specified parameters from the GraphQL API.
 *
 * @param {string} params - An object containing various filter parameters for vehicles.
 * @returns {Promise<{ data: VehicleInfo[], meta: VehicleMeta } | null>} A promise that resolves to the fetched list of vehicles and their metadata, or null if there was an error.
 */
export const vehiclesFetcher = async ([_, params]: [string, FilterRequest<VehicleInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    subcontractorId,
    organizationId,
    vehicleNumber,
    trailerNumber,
    isActiveOptions,
    ownerType,
    cubicMeterCapacityMin,
    cubicMeterCapacityMax,
    tonPayloadCapacityMin,
    tonPayloadCapacityMax,
    palletCapacityMin,
    palletCapacityMax,
    driverName,
  } = trim(params);

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams = {};
  if (keywords && vehicleNumber) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
                            { vehicleNumber: { containsi: $keywords } }
                            { vehicleNumber: { containsi: $vehicleNumber } }
                          ]`;
    searchParams = { keywords, vehicleNumber };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = "vehicleNumber: { containsi: $keywords }";
    searchParams = { keywords };
  } else if (vehicleNumber) {
    searchCondition = "vehicleNumber: { containsi: $vehicleNumber }";
    searchParams = { vehicleNumber };
  }

  const { data, meta } = await graphQLPost<VehicleInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${subcontractorId ? "$subcontractorId: Int" : ""}
          ${graphQLParams}
          ${vehicleNumber ? "$vehicleNumber: String" : ""}
          ${trailerNumber ? "$trailerNumber: String" : ""}
          ${isArray(ownerType) && ownerType.length > 0 ? "$ownerType: [String]" : ""}
          ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "$isActive: [Boolean]" : ""}
          ${cubicMeterCapacityMin ? "$cubicMeterCapacityMin: Float" : ""}
          ${cubicMeterCapacityMax ? "$cubicMeterCapacityMax: Float" : ""}
          ${tonPayloadCapacityMin ? "$tonPayloadCapacityMin: Float" : ""}
          ${tonPayloadCapacityMax ? "$tonPayloadCapacityMax: Float" : ""}
          ${palletCapacityMin ? " $palletCapacityMin: Int" : ""}
          ${palletCapacityMax ? " $palletCapacityMax: Int" : ""}
          ${driverName ? "$driverName: String" : ""}
        ) {
          vehicles(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              ${subcontractorId ? "subcontractorId: { eq: $subcontractorId }" : ""}
              ${searchCondition}
              ${trailerNumber ? "trailer: { trailerNumber: { containsi : $trailerNumber } }" : ""}
              ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "isActive: { in: $isActive }" : ""}
              ${isArray(ownerType) && ownerType.length > 0 ? "ownerType: { in: $ownerType }" : ""}
              ${
                cubicMeterCapacityMin && !cubicMeterCapacityMax
                  ? "cubicMeterCapacity: { gte : $cubicMeterCapacityMin }"
                  : ""
              }
              ${
                cubicMeterCapacityMax && !cubicMeterCapacityMin
                  ? "cubicMeterCapacity: { lte: $cubicMeterCapacityMax }"
                  : ""
              }
              ${
                cubicMeterCapacityMin && cubicMeterCapacityMax
                  ? "cubicMeterCapacity: { gte: $cubicMeterCapacityMin, lte: $cubicMeterCapacityMax }"
                  : ""
              }
              ${
                tonPayloadCapacityMin && !tonPayloadCapacityMax
                  ? "tonPayloadCapacity: { gte : $tonPayloadCapacityMin }"
                  : ""
              }
              ${
                tonPayloadCapacityMax && !tonPayloadCapacityMax
                  ? "tonPayloadCapacity: { lte: $tonPayloadCapacityMax }"
                  : ""
              }
              ${
                tonPayloadCapacityMin && tonPayloadCapacityMax
                  ? "tonPayloadCapacity: { gte: $tonPayloadCapacityMin, lte: $tonPayloadCapacityMax }"
                  : ""
              }
              ${palletCapacityMin && !palletCapacityMax ? "palletCapacity: { gte : $palletCapacityMin }" : ""}
              ${palletCapacityMax && !palletCapacityMin ? "palletCapacity: { lte: $palletCapacityMax }" : ""}
              ${
                palletCapacityMin && palletCapacityMax
                  ? "palletCapacity: { gte: $palletCapacityMin, lte: $palletCapacityMax }"
                  : ""
              }
              ${
                driverName
                  ? `driver: {
                    publishedAt: { ne: null }
                    or: [
                      { lastName: { contains: $driverName } }
                      { firstName: { contains: $driverName } }
                    ]
                  }`
                  : ""
              }
            }
          ) {
            data {
              id
              attributes {
                subcontractorId
                vehicleNumber
                idNumber
                ownerType
                cubicMeterCapacity
                tonPayloadCapacity
                palletCapacity
                isActive
                createdAt
                createdByUser {
                  data {
                    id
                  }
                }
                updatedAt
                type {
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
                      lastName
                      firstName
                      publishedAt
                    }
                  }
                }
                trailer {
                  data {
                    id
                    attributes {
                      trailerNumber
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
      ...(subcontractorId && { subcontractorId }),
      ...(searchParams && { ...searchParams }),
      ...(trailerNumber && { trailerNumber }),
      ...(isArray(ownerType) && ownerType.length > 0 && { ownerType }),
      ...(isArray(isActiveOptions) &&
        isActiveOptions.length > 0 && { isActive: isActiveOptions.map((item) => item === "true") }),
      ...(cubicMeterCapacityMin && { cubicMeterCapacityMin: Number(cubicMeterCapacityMin) }),
      ...(cubicMeterCapacityMax && { cubicMeterCapacityMax: Number(cubicMeterCapacityMax) }),
      ...(tonPayloadCapacityMin && { tonPayloadCapacityMin: Number(tonPayloadCapacityMin) }),
      ...(tonPayloadCapacityMax && { tonPayloadCapacityMax: Number(tonPayloadCapacityMax) }),
      ...(palletCapacityMin && { palletCapacityMin: Number(palletCapacityMin) }),
      ...(palletCapacityMax && { palletCapacityMax: Number(palletCapacityMax) }),
      ...(driverName && { driverName }),
    },
  });

  return { data: data?.vehicles ?? [], meta };
};

/**
 * Fetch vehicle information based on organization ID and vehicle ID from the GraphQL API.
 *
 * @param {number} organizationId - The ID of the organization.
 * @param {number} id - The ID of the vehicle.
 * @returns {Promise<VehicleInfo | undefined>} A promise that resolves to the fetched vehicle information or undefined if not found.
 */
export const getVehicle = async (organizationId: number, id: number): Promise<VehicleInfo | undefined> => {
  const { data } = await graphQLPost<VehicleInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        vehicles(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              subcontractorId
              ownerType
              vehicleNumber
              idNumber
              type {
                data {
                  id
                  attributes {
                    name
                  }
                }
              }
              trailer {
                data {
                  id
                  attributes {
                    trailerNumber
                  }
                }
              }
              brand
              model
              yearOfManufacture
              color
              fuelType
              startUsageDate
              images {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              maxLength
              maxWidth
              maxHeight
              cubicMeterCapacity
              tonPayloadCapacity
              palletCapacity
              registrationCertificate {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              registrationDate
              registrationExpirationDate
              technicalSafetyCertificate {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              technicalSafetyRegistrationDate
              technicalSafetyExpirationDate
              liabilityInsuranceCertificate {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              liabilityInsuranceExpirationDate
              liabilityInsuranceRegistrationDate
              driver {
                data {
                  id
                  attributes {
                    firstName
                    lastName
                  }
                }
              }
              isActive
              description
              updatedAt
              createdByUser {
                data {
                  id
                }
              }
              fuelConsumption
              meta
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

  return data?.vehicles[0];
};

/**
 * Deletes a vehicle entity based on provided parameters from the GraphQL API.
 *
 * @param {Pick<VehicleInfo, "organizationId" | "id" | "updatedById">} entity - An object containing organizationId, id, and updatedById properties.
 * @param {Date | string} lastUpdatedAt - An optional parameter specifying the last updated timestamp for exclusivity checking.
 * @returns {Promise<MutationResult<VehicleInfo>>} A promise that resolves to the result of the delete operation, including any error status.
 */
export const deleteVehicle = async (
  entity: Pick<VehicleInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<VehicleInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkVehiclesExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<VehicleInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateVehicle(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateVehicle };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Checks if a vehicle with the specified organizationId and id was updated after a given timestamp.
 *
 * @param {number} organizationId - The organization ID associated with the vehicle.
 * @param {number} id - The ID of the vehicle to be checked.
 * @param {Date | string} lastUpdatedAt - The timestamp to check against for exclusivity.
 * @returns {Promise<boolean>} A promise that resolves to `true` if the vehicle was updated after the given timestamp, `false` otherwise.
 */
export const checkVehiclesExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<VehicleInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        vehicles(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.vehicles[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Fetches a list of vehicles associated with a specific subcontractor for a given organization.
 *
 * @param params - An object containing pagination details, organization ID, and subcontractor ID.
 * @returns An array of vehicles with detailed information, along with pagination metadata.
 */
export const vehicleListBySubcontractorIdFetcher = async ([_, params]: [string, FilterRequest<VehicleInfo>]) => {
  const { page, pageSize, organizationId, subcontractorId } = trim(params);

  const { data, meta } = await graphQLPost<VehicleInfo[]>({
    query: gql`
      query ($page: Int, $pageSize: Int, $organizationId: Int!, $subcontractorId: Int) {
        vehicles(
          pagination: { page: $page, pageSize: $pageSize }
          filters: {
            organizationId: { eq: $organizationId }
            subcontractorId: { eq: $subcontractorId }
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
            attributes {
              vehicleNumber
              idNumber
              driver {
                data {
                  id
                  attributes {
                    lastName
                    firstName
                  }
                }
              }
              isActive
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
      page: page,
      pageSize: pageSize,
      organizationId: organizationId,
      subcontractorId: subcontractorId,
    },
  });

  return { data: data?.vehicles ?? [], meta };
};

/**
 * Fetch a list of active vehicle options for a specific organization.
 *
 * @param {object} params - An object containing organizationId.
 * @returns {Promise<VehicleInfo[]>} - An array of active vehicle options.
 */
export const vehicleOptionsFetcher = async ([_, params]: [string, FilterRequest<VehicleInfo>]) => {
  const { organizationId, isFetchType, isFetchDriver, isFetchSubcontractorId, isFetchOwnerType } = params;

  const { data } = await graphQLPost<VehicleInfo[]>({
    query: gql`
      query (
        $organizationId: Int!
        $isFetchType: Boolean!
        $isFetchDriver: Boolean!
        $isFetchSubcontractorId: Boolean!
        $isFetchOwnerType: Boolean!
      ) {
        vehicles(
          filters: { publishedAt: { ne: null }, organizationId: { eq: $organizationId }, isActive: { eq: true } }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              vehicleNumber
              fuelType
              subcontractorId @include(if: $isFetchSubcontractorId)
              ownerType @include(if: $isFetchOwnerType)
              type @include(if: $isFetchType) {
                data {
                  id
                  attributes {
                    name
                    driverExpenseRate
                  }
                }
              }
              driver @include(if: $isFetchDriver) {
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
    `,
    params: {
      organizationId,
      isFetchType: isFetchType ?? false,
      isFetchDriver: isFetchDriver ?? true,
      isFetchSubcontractorId: isFetchSubcontractorId ?? false,
      isFetchOwnerType: isFetchOwnerType ?? false,
    },
  });

  return data?.vehicles ?? [];
};

/**
 * Fetches information about vehicles associated with trailers for a specific organization.
 *
 * @param {string} _ - Placeholder for the unused parameter.
 * @param {Partial<VehicleInfo>} params - Parameters containing organizationId and optional trailerId.
 * @returns {Promise<VehicleInfo[]>} - A promise that resolves to an array of VehicleInfo.
 */
export const vehiclesForTrailerFetcher = async ([_, params]: [string, Partial<VehicleInfo>]) => {
  const { data } = await graphQLPost<VehicleInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        vehicles(
          filters: { publishedAt: { ne: null }, organizationId: { eq: $organizationId }, isActive: { eq: true } }
          pagination: { limit: -1 }
        ) {
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
              trailer {
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
      organizationId: params.organizationId,
      ...(params.trailerId && { trailerId: params.trailerId }),
    },
  });

  return data?.vehicles ?? [];
};

/**
 * Fetch a list of active vehicle options for a specific organization.
 *
 * @param {object} params - An object containing organizationId.
 * @returns {Promise<VehicleInfo[]>} - An array of active vehicle options.
 */
export const availableVehiclesForDispatchingFetcher = async ([_, params]: [string, FilterRequest<VehicleInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    vehicleNumber,
    driverName,
    vehicleType,
    payloadCapacity,
    ownerType,
    isManaged,
    userId,
  } = trim(params);

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams;
  if (keywords && vehicleNumber) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
      { vehicleNumber: { containsi: $keywords } }
      { vehicleNumber: { containsi: $vehicleNumber } }
      { idNumber: { containsi: $keywords } }
      { idNumber: { containsi: $vehicleNumber } }
    ]`;
    searchParams = { keywords, vehicleNumber };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
      { vehicleNumber: { containsi: $keywords } }
      { idNumber: { containsi: $keywords } }
    ]`;
    searchParams = { keywords };
  } else if (vehicleNumber) {
    searchCondition = `or: [
      { vehicleNumber: { containsi: $vehicleNumber } }
      { idNumber: { containsi: $vehicleNumber } }
    ]`;
    searchParams = { vehicleNumber };
  }

  const { data, meta } = await graphQLPost<VehicleInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${graphQLParams}
          ${vehicleNumber ? "$vehicleNumber: String" : ""}
          ${driverName ? "$driverName: String" : ""}
          ${vehicleType ? "$vehicleType: String" : ""}
          ${payloadCapacity ? "$payloadCapacity: Float" : ""}
          ${isArray(ownerType) && ownerType.length > 0 ? "$ownerType: [String]" : ""}
          ${isManaged ? "$userId: ID" : ""}
        ) {
          vehicles(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              organizationId: { eq: $organizationId }
              publishedAt: { ne: null }
              isActive: { eq: true }
              ${searchCondition}
              ${
                driverName
                  ? `driver: {
                    publishedAt: { ne: null }
                    or: [
                      { lastName: { contains: $driverName } }
                      { firstName: { contains: $driverName } }
                    ]
                  }`
                  : ""
              }
              ${vehicleType ? "type: { name: { contains: $vehicleType } }" : ""}
              ${payloadCapacity ? "tonPayloadCapacity: { eq: $payloadCapacity }" : ""}
              ${isArray(ownerType) && ownerType.length > 0 ? "ownerType: { in: $ownerType }" : ""}
              ${
                isManaged
                  ? "vehicleGroups: { id: { ne: null }, isActive: { eq: true }, publishedAt: { ne: null }, manager: { member: { id: { eq: $userId } } } }"
                  : ""
              }
            }
          ) {
            data {
              id
              attributes {
                subcontractorId
                vehicleNumber
                idNumber
                ownerType
                tonPayloadCapacity
                palletCapacity
                cubicMeterCapacity
                maxLength
                maxWidth
                maxHeight
                type {
                  data {
                    id
                    attributes {
                      name
                      driverExpenseRate
                    }
                  }
                }
                driver {
                  data {
                    id
                    attributes {
                      lastName
                      firstName
                      phoneNumber
                      email
                      publishedAt
                    }
                  }
                }
                type {
                  data {
                    id
                    attributes {
                      name
                    }
                  }
                }
                trailer {
                  data {
                    id
                    attributes {
                      tonPayloadCapacity
                      palletCapacity
                      cubicMeterCapacity
                      maxLength
                      maxWidth
                      maxHeight
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
      ...(vehicleNumber && { vehicleNumber: ensureString(vehicleNumber) }),
      ...(driverName && { driverName }),
      ...(vehicleType && { vehicleType }),
      ...(payloadCapacity && { payloadCapacity }),
      ...(isArray(ownerType) && ownerType.length > 0 && { ownerType }),
      ...(isManaged && { userId }),
    },
  });

  return { data: data?.vehicles ?? [], meta };
};

/**
 * Fetches information about a specific vehicle by its ID within an organization.
 * @param {number} organizationId - The ID of the organization.
 * @param {number} id - The ID of the vehicle.
 * @returns {Promise<VehicleInfo | undefined>} - A promise that resolves to the information about the vehicle, or undefined if no data is available.
 */
export const getVehicleFuelConsumption = async (
  organizationId: number,
  id: number
): Promise<VehicleInfo | undefined> => {
  const { data } = await graphQLPost<VehicleInfo[]>({
    query: gql`
      query ($id: ID!, $organizationId: Int!) {
        vehicles(filters: { id: { eq: $id }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              fuelConsumption
            }
          }
        }
      }
    `,
    params: {
      id,
      organizationId,
    },
  });

  return data?.vehicles[0];
};

/**
 * Fetch a list of active vehicle options for a specific organization.
 *
 * @param {object} params - An object containing organizationId.
 * @returns {Promise<VehicleInfo[]>} - An array of active vehicle options.
 */
export const availableVehiclesForGroupFetcher = async ([_, params]: [string, FilterRequest<VehicleInfo>]) => {
  const { page, pageSize, sort, organizationId, keywords, vehicleNumber, driverName, ownerType } = trim(params);

  const isFindOwnerType = isArray(ownerType) && ownerType.length > 0;
  let searchCondition = "";
  let graphQLParams = "";
  let searchParams;

  if (keywords && vehicleNumber) {
    graphQLParams = "$keywords: String";
    searchCondition = `or:
      [
        { vehicleNumber: { containsi: $keywords } }
        { idNumber: { containsi: $keywords } }
        { vehicleNumber: { containsi: $vehicleNumber } }
        { idNumber: { containsi: $vehicleNumber } }
      ]`;
    searchParams = { keywords, vehicleNumber };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = `or:
      [
        { vehicleNumber: { containsi: $keywords } }
        { idNumber: { containsi: $keywords } }
      ]`;
    searchParams = { keywords };
  } else if (vehicleNumber) {
    searchCondition = `or:
      [
        { vehicleNumber: { containsi: $vehicleNumber } }
        { idNumber: { containsi: $vehicleNumber } }
      ]`;
    searchParams = { vehicleNumber };
  }

  const { data, meta } = await graphQLPost<VehicleInfo[]>({
    query: gql`
      query (
        $page: Int,
        $pageSize: Int,
        $sort: [String],
        $organizationId: Int!
        ${vehicleNumber ? "$vehicleNumber: String" : ""}
        ${graphQLParams}
        ${driverName ? "$driverName: String" : ""}
        ${isFindOwnerType ? "$ownerType: [String]" : ""}
        ) {
        vehicles(
          sort: $sort,
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            isActive: { eq: true }
            ${searchCondition}
            ${
              driverName
                ? `driver: {
                  or: [
                    { lastName: { contains: $driverName } }
                    { firstName: { contains: $driverName } }
                  ]
                }`
                : ""
            }
            ${isFindOwnerType ? "ownerType: { in: $ownerType }" : ""}
          }
          pagination: { page: $page, pageSize: $pageSize }
        ) {
          data {
            id
            attributes {
              vehicleNumber
              idNumber
              ownerType
              subcontractorId
              driver {
                data {
                  id
                  attributes {
                    firstName
                    lastName
                    phoneNumber
                  }
                }
              }
              vehicleGroups {
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
      sort: isArray(sort) ? sort : [sort],
      organizationId,
      ...(searchParams && { ...searchParams }),
      ...(vehicleNumber && { vehicleNumber: ensureString(vehicleNumber) }),
      ...(driverName && { driverName }),
      ...(isFindOwnerType && { ownerType }),
    },
  });

  return { vehicles: data?.vehicles ?? [], pagination: meta?.pagination };
};

/**
 * Fetch a list of active vehicle  for a specific organization.
 *
 * @param {object} params - An object containing organizationId.
 * @returns {Promise<OrderTripInfo[]>} - An array of active vehicle options.
 */
export const vehiclesForTimelineFetcher = async ([_, params]: [string, FilterRequest<VehicleInfo>]) => {
  // Calculate the start and end dates for the query
  const { vehicleId, organizationId, page, pageSize } = params;
  const query = gql`
    query (
      ${vehicleId ? "$vehicleId:  ID!" : ""}
      $organizationId: Int!
      $page: Int
      $pageSize: Int
    ) {
      vehicles(
        pagination: { page: $page, pageSize: $pageSize }
        sort: ["vehicleNumber:asc"]
        filters: {
          ${vehicleId ? "id: { eq: $vehicleId }" : ""}
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            organizationId
            vehicleNumber
            driver {
              data {
                id
                attributes {
                  lastName
                  firstName
                }
              }
            }
          }
        }
        meta {
          pagination {
            total
            page
            pageSize
            pageCount
          }
        }
      }
    }
  `;
  const { data, meta } = await graphQLPost<VehicleInfo[]>({
    query,
    params: {
      ...(vehicleId && { vehicleId }),
      page,
      pageSize,
      organizationId,
    },
  });

  return {
    data: data?.vehicles ?? [],
    meta,
  };
};

/**
 * Creates a new vehicle via API.
 * @param {string} orgLink - The organization link for the vehicle.
 * @param {VehicleInfo} requestData - The data of the vehicle being sent.
 * @returns {Promise<ApiResult<VehicleInfo>>} - The result returned from the API after creating the vehicle.
 */
export const createVehicle = async (
  orgLink: string,
  requestData: VehicleInputForm
): Promise<ApiResult<VehicleInfo>> => {
  const {
    startUsageDate,
    registrationDate,
    registrationExpirationDate,
    technicalSafetyRegistrationDate,
    technicalSafetyExpirationDate,
    liabilityInsuranceRegistrationDate,
    liabilityInsuranceExpirationDate,
  } = requestData;

  const result = await post<ApiResult<VehicleInfo>>(`/api${orgLink}/vehicles/new`, {
    ...requestData,
    ...(startUsageDate && { startUsageDate: format(startUsageDate, "yyyy-MM-dd") }),
    ...(registrationDate && { registrationDate: format(registrationDate, "yyyy-MM-dd") }),
    ...(registrationExpirationDate && {
      registrationExpirationDate: format(registrationExpirationDate, "yyyy-MM-dd"),
    }),
    ...(technicalSafetyRegistrationDate && {
      technicalSafetyRegistrationDate: format(technicalSafetyRegistrationDate, "yyyy-MM-dd"),
    }),
    ...(technicalSafetyExpirationDate && {
      technicalSafetyExpirationDate: format(technicalSafetyExpirationDate, "yyyy-MM-dd"),
    }),
    ...(liabilityInsuranceRegistrationDate && {
      liabilityInsuranceRegistrationDate: format(liabilityInsuranceRegistrationDate, "yyyy-MM-dd"),
    }),
    ...(liabilityInsuranceExpirationDate && {
      liabilityInsuranceExpirationDate: format(liabilityInsuranceExpirationDate, "yyyy-MM-dd"),
    }),
  });
  return result;
};

/**
 * Updates an existing vehicle via API.
 * @param {string} orgLink - The organization link for the vehicle.
 * @param {VehicleInfo} requestData - The updated data of the vehicle being sent.
 * @param {string | null | undefined} encryptedId - (Optional) The encrypted ID of the vehicle to be updated.
 * @returns {Promise<ApiResult<VehicleInfo>>} - The result returned from the API after updating the vehicle.
 */
export const updateVehicle = async (
  orgLink: string,
  requestData: VehicleInputForm,
  encryptedId?: string | null
): Promise<ApiResult<VehicleInfo>> => {
  const {
    startUsageDate,
    registrationDate,
    registrationExpirationDate,
    technicalSafetyRegistrationDate,
    technicalSafetyExpirationDate,
    liabilityInsuranceRegistrationDate,
    liabilityInsuranceExpirationDate,
  } = requestData;

  const result = await post<ApiResult<VehicleInfo>>(`/api${orgLink}/vehicles/${encryptedId}/edit`, {
    ...requestData,
    ...(startUsageDate && { startUsageDate: format(startUsageDate, "yyyy-MM-dd") }),
    ...(registrationDate && { registrationDate: format(registrationDate, "yyyy-MM-dd") }),
    ...(registrationExpirationDate && {
      registrationExpirationDate: format(registrationExpirationDate, "yyyy-MM-dd"),
    }),
    ...(technicalSafetyRegistrationDate && {
      technicalSafetyRegistrationDate: format(technicalSafetyRegistrationDate, "yyyy-MM-dd"),
    }),
    ...(technicalSafetyExpirationDate && {
      technicalSafetyExpirationDate: format(technicalSafetyExpirationDate, "yyyy-MM-dd"),
    }),
    ...(liabilityInsuranceRegistrationDate && {
      liabilityInsuranceRegistrationDate: format(liabilityInsuranceRegistrationDate, "yyyy-MM-dd"),
    }),
    ...(liabilityInsuranceExpirationDate && {
      liabilityInsuranceExpirationDate: format(liabilityInsuranceExpirationDate, "yyyy-MM-dd"),
    }),
  });
  return result;
};

/**
 * Fetches a list of vehicles based on specified parameters from the GraphQL API.
 * @param param0 - A tuple containing a string (unused) and parameters for filtering vehicle types.
 * @returns A promise that resolves to the fetched list of vehicles and their metadata, or null if there was an error.
 */
export const vehicleForTrackingFetcher = async ([_, params]: [string, Pick<VehicleInfo, "organizationId">]) => {
  const { data } = await graphQLPost<VehicleInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        vehicles(
          filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              vehicleNumber
              driver {
                data {
                  id
                  attributes {
                    lastName
                    firstName
                  }
                }
              }
              vehicleTracking {
                data {
                  id
                  attributes {
                    carStatus
                    speed
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

  return data?.vehicles ?? [];
};
