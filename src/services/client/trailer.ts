import { HttpStatusCode } from "axios";
import { format } from "date-fns";
import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { TrailerInputForm } from "@/forms/trailer";
import { ErrorType } from "@/types";
import { ApiResult } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { TrailerInfo } from "@/types/strapi";
import { graphQLPost, post, put } from "@/utils/api";
import { trim } from "@/utils/string";

/**
 * Fetch a list of active trailers for a specific organization.
 *
 * @param {number} organizationId - The unique identifier of the organization.
 * @returns {Promise<Trailer[] | undefined>} A list of active trailers or undefined if there's an error.
 */
export const trailerOptionsFetcher = async ([_, params]: [string, Partial<TrailerInfo>]) => {
  const { data } = await graphQLPost<TrailerInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        trailers(
          filters: { organizationId: { eq: $organizationId }, isActive: { eq: true }, publishedAt: { ne: null } }
          pagination: { limit: -1 }
        ) {
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
    `,
    params: {
      organizationId: params.organizationId,
    },
  });

  return data?.trailers ?? [];
};

/**
 * Retrieve trailer information based on the organization ID and trailer ID.
 *
 * @param {number} organizationId - The ID of the organization to which the trailer belongs.
 * @param {number} id - The ID of the trailer to retrieve.
 * @returns {Promise<TrailerInfo | undefined>} - A Promise that resolves to the TrailerInfo or undefined if the trailer is not found.
 */
export const getTrailer = async (organizationId: number, id: number): Promise<TrailerInfo | undefined> => {
  const { data } = await graphQLPost<TrailerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        trailers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              subcontractorId
              ownerType
              trailerNumber
              idNumber
              type {
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
                }
              }
              brand
              yearOfManufacture
              color
              startUsageDate
              images(pagination: { limit: -1 }) {
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
              isActive
              description
              updatedAt
              createdByUser {
                data {
                  id
                }
              }
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

  return data?.trailers[0];
};

/**
 * Fetch trailer information from the server.
 *
 * @param {string} jwt - JSON Web Token for authentication.
 * @param {Partial<TrailerInfo>} params - Parameters for the trailer query.
 * @returns {TrailerInfo | undefined} - Trailer information or undefined if not found.
 */
export const trailerFetcher = async ([_, params]: [string, Partial<TrailerInfo>]) => {
  const { data } = await graphQLPost<TrailerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        trailers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              organizationId
              subcontractorId
              trailerNumber
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
              brand
              yearOfManufacture
              color
              startUsageDate
              maxLength
              maxWidth
              maxHeight
              cubicMeterCapacity
              tonPayloadCapacity
              palletCapacity
              vehicle {
                data {
                  id
                  attributes {
                    ownerType
                    vehicleNumber
                    idNumber
                    brand
                    model
                    color
                    startUsageDate
                    yearOfManufacture
                    type {
                      data {
                        id
                        attributes {
                          name
                        }
                      }
                    }
                  }
                }
              }
              images(pagination: { limit: -1 }) {
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

  return data?.trailers[0];
};

/**
 * Fetch trailers based on search and filter criteria from the server.
 *
 * @param {[string, FilterRequest<TrailerInfo>]} params - An array containing JWT token and filter parameters.
 * @returns {Promise<{ data: TrailerInfo[], meta: any }>} - An object with trailers data and metadata.
 */
export const trailersFetcher = async ([_, params]: [string, FilterRequest<TrailerInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    keywords,
    organizationId,
    trailerNumber,
    idNumber,
    isActiveOptions,
    ownerType,
    cubicMeterCapacityMin,
    cubicMeterCapacityMax,
    tonPayloadCapacityMin,
    tonPayloadCapacityMax,
    palletCapacityMin,
    palletCapacityMax,
    driverName,
    vehicle,
  } = trim(params);

  let searchCondition = "";
  let graphQLParams = "";
  let searchParams = {};
  if (keywords && trailerNumber) {
    graphQLParams = "$keywords: String";
    searchCondition = `or: [
                            { trailerNumber: { containsi: $keywords } }
                            { trailerNumber: { containsi: $trailerNumber } }
                          ]`;
    searchParams = { keywords, trailerNumber };
  } else if (keywords) {
    graphQLParams = "$keywords: String";
    searchCondition = "trailerNumber: { containsi: $keywords }";
    searchParams = { keywords };
  } else if (trailerNumber) {
    searchCondition = "trailerNumber: { containsi: $trailerNumber }";
    searchParams = { trailerNumber };
  }

  const { data, meta } = await graphQLPost<TrailerInfo[]>({
    query: gql`
        query (
          $page: Int
          $pageSize: Int
          $organizationId: Int!
          $sort: [String]
          ${graphQLParams}
          ${trailerNumber ? "$trailerNumber: String" : ""}
          ${vehicle ? "$vehicle: String" : ""}
          ${idNumber ? "$idNumber: String" : ""}
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
          trailers(
            pagination: { page: $page, pageSize: $pageSize }
            sort: $sort
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              ${searchCondition}
              ${idNumber ? "idNumber: { containsi : $idNumber }" : ""}
              ${isArray(isActiveOptions) && isActiveOptions.length > 0 ? "isActive: { in: $isActive }" : ""}
              ${isArray(ownerType) && ownerType.length > 0 ? "ownerType: { in: $ownerType }" : ""}
              ${
                cubicMeterCapacityMin && !cubicMeterCapacityMax
                  ? "cubicMeterCapacity: { gte: $cubicMeterCapacityMin }"
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
                  ? "tonPayloadCapacity: { gte: $tonPayloadCapacityMin }"
                  : ""
              }
              ${
                tonPayloadCapacityMax && !tonPayloadCapacityMin
                  ? "tonPayloadCapacity: { lte: $tonPayloadCapacityMax }"
                  : ""
              }
              ${
                tonPayloadCapacityMin && tonPayloadCapacityMax
                  ? "tonPayloadCapacity: { gte: $tonPayloadCapacityMin, lte: $tonPayloadCapacityMax }"
                  : ""
              }
              ${palletCapacityMin && !palletCapacityMax ? "palletCapacity: { lte: $palletCapacityMin }" : ""}
              ${palletCapacityMax && !palletCapacityMin ? "palletCapacity: { gte: $palletCapacityMax }" : ""}
              ${
                palletCapacityMin && palletCapacityMax
                  ? "palletCapacity: { gte: $palletCapacityMin, lte: $palletCapacityMax }"
                  : ""
              }
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
              ${
                vehicle
                  ? `vehicle: {
                    vehicleNumber: { contains: $vehicle }
                  }`
                  : ""
              }
            }
          ) {
            data {
              id
              attributes {
                subcontractorId
                trailerNumber
                idNumber
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
                vehicle {
                  data {
                    id
                    attributes {
                      vehicleNumber
                      idNumber
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
      ...(idNumber && { idNumber }),
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
      ...(vehicle && { vehicle }),
    },
  });

  return { data: data?.trailers ?? [], meta };
};

/**
 * Check if a trailer's information has been updated since a given timestamp.
 *
 * @param {number} organizationId - The ID of the organization.
 * @param {number} id - The ID of the trailer.
 * @param {Date | string} lastUpdatedAt - The timestamp of the last update.
 * @returns {Promise<boolean>} - A boolean indicating whether the trailer's information has been updated.
 */
export const checkTrailerExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<TrailerInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        trailers(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.trailers[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Delete a trailer based on its ID and organization, while checking for exclusivity.
 *
 * @param {object} entity - An object containing organizationId, id, and updatedById.
 * @param {Date | string} lastUpdatedAt - The timestamp of the last update (optional).
 * @returns {Promise<MutationResult<TrailerInfo>>} - A result indicating success or failure of the deletion.
 */
export const deleteTrailer = async (
  entity: Pick<TrailerInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<TrailerInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkTrailerExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<TrailerInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateTrailer(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateTrailer };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Creates a new trailer via API.
 * @param {string} orgLink - The organization link for the trailer.
 * @param {TrailerInfo} requestData - The data of the trailer being sent.
 * @returns {Promise<ApiResult<TrailerInfo>>} - The result returned from the API after creating the trailer.
 */
export const createTrailer = async (
  orgLink: string,
  requestData: TrailerInputForm
): Promise<ApiResult<TrailerInfo>> => {
  const {
    startUsageDate,
    registrationDate,
    registrationExpirationDate,
    technicalSafetyRegistrationDate,
    technicalSafetyExpirationDate,
    liabilityInsuranceRegistrationDate,
    liabilityInsuranceExpirationDate,
  } = requestData;
  const result = await post<ApiResult<TrailerInfo>>(`/api${orgLink}/trailers/new`, {
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
 * Updates an existing trailer via API.
 * @param {string} orgLink - The organization link for the trailer.
 * @param {TrailerInfo} requestData - The updated data of the trailer being sent.
 * @param {string | null | undefined} encryptedId - (Optional) The encrypted ID of the trailer to be updated.
 * @returns {Promise<ApiResult<TrailerInfo>>} - The result returned from the API after updating the trailer.
 */
export const updateTrailer = async (
  orgLink: string,
  requestData: TrailerInputForm,
  encryptedId?: string | null
): Promise<ApiResult<TrailerInfo>> => {
  const {
    startUsageDate,
    registrationDate,
    registrationExpirationDate,
    technicalSafetyRegistrationDate,
    technicalSafetyExpirationDate,
    liabilityInsuranceRegistrationDate,
    liabilityInsuranceExpirationDate,
  } = requestData;

  const result = await put<ApiResult<TrailerInfo>>(`/api${orgLink}/trailers/${encryptedId}/edit`, {
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
