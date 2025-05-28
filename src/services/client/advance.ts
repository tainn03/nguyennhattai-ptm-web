import { AdvanceAdvanceType, AdvanceStatus } from "@prisma/client";
import { gql } from "graphql-request";
import isArray from "lodash/isArray";

import { AdvanceInputForm } from "@/forms/advance";
import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { AdvanceInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { convertEndOfDayString, convertStartOfDayString, formatGraphQLDate } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 *
 * Fetches advance information based on the specified parameters.
 *
 * @param {string} _ - Placeholder parameter.
 * @param {Partial<AdvanceInfo>} params - The parameters used to partial the advance information.
 * @returns {Promise<AdvanceInfo>} A promise that resolves to the fetched advance information.
 */
export const advanceFetcher = async ([_, params]: [string, Partial<AdvanceInfo>]): Promise<AdvanceInfo | undefined> => {
  const query = gql`
    query ($id: ID!, $organizationId: Int) {
      advances(filters: { id: { eq: $id }, publishedAt: { ne: null }, organizationId: { eq: $organizationId } }) {
        data {
          id
          attributes {
            organizationId
            type
            advanceType
            amount
            approvedAmount
            status
            reason
            rejectionReason
            rejectionDate
            description
            createdByUser {
              data {
                id
                attributes {
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
            createdAt
            updatedByUser {
              data {
                attributes {
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
            paymentDate
            paymentBy {
              data {
                attributes {
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
            orderTrip {
              data {
                id
                attributes {
                  code
                }
              }
            }
            order {
              data {
                id
                attributes {
                  code
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
            subcontractor {
              data {
                id
                attributes {
                  name
                  phoneNumber
                  email
                }
              }
            }
          }
        }
      }
    }
  `;
  const { data } = await graphQLPost<AdvanceInfo[]>({
    query,
    params,
  });
  return data?.advances[0];
};

/**
 * Fetches advance information based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Object containing the filter parameters for the advance information.
 * @returns Object containing the fetched advance data and meta information.
 */
export const advancesFetcher = async ([_, params]: [string, FilterRequest<AdvanceInfo>]) => {
  const { page, pageSize, sort, driverId, subcontractorId, organizationId, statusOptions, startDate, endDate } =
    trim(params);

  const isFindStatus = isArray(statusOptions) && statusOptions.length > 0;
  let paymentDateCondition = "";
  if (startDate || endDate) {
    paymentDateCondition = `createdAt: {
      ${startDate ? "gte: $startDate" : ""}
      ${endDate ? "lte: $endDate" : ""}
    }`;
  }

  const searchCondition = `or: [
    ${driverId ? "{ driver: { id: { eq: $driverId } } }" : ""}
    ${subcontractorId ? "{ subcontractor: { id: { eq: $subcontractorId } } }" : ""}
  ]`;

  const query = gql`
    query (
      $page: Int
      $pageSize: Int
      $organizationId: Int
      $sort: [String]
      ${driverId ? "$driverId: ID" : ""}
      ${subcontractorId ? "$subcontractorId: ID" : ""}
      ${isFindStatus ? "$statusOptions: [String]" : ""}
      ${startDate ? "$startDate: DateTime" : ""}
      ${endDate ? "$endDate: DateTime" : ""}
      ) {
      advances(
        pagination: { page: $page, pageSize: $pageSize }
        sort: $sort
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          ${driverId || subcontractorId ? searchCondition : ""}
          ${isFindStatus ? "status: { in: $statusOptions }" : ""}
          ${paymentDateCondition}
        }) {
        data {
          id
          attributes {
            type
            advanceType
            amount
            approvedAmount
            status
            reason
            paymentDate
            paymentBy {
              data {
                attributes {
                  phoneNumber
                  detail {
                    data {
                      attributes {
                        lastName
                        firstName
                        avatar {
                          data {
                            attributes {
                              url
                              previewUrl
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            driver {
              data {
                attributes {
                  firstName
                  lastName
                  phoneNumber
                  email
                }
              }
            }
            subcontractor {
              data {
                attributes {
                  name
                  phoneNumber
                  email
                }
              }
            }
            createdByUser {
              data {
                id
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
  `;

  const { data, meta } = await graphQLPost<AdvanceInfo[]>({
    query,
    params: {
      organizationId,
      page,
      pageSize,
      sort: isArray(sort) ? sort : [sort],
      ...(driverId && { driverId }),
      ...(subcontractorId && { subcontractorId }),
      ...(isFindStatus && { statusOptions }),
      ...(startDate && { startDate: convertStartOfDayString(startDate) }),
      ...(endDate && { endDate: convertEndOfDayString(endDate) }),
    },
  });

  return { data: data?.advances ?? [], meta };
};

/**
 *
 * Retrieves the details of an advance with the specified ID.
 *
 * @param {number} id - The ID of the advance to retrieve.
 * @param {number} organizationId - The organization ID of the advance to retrieve.
 * @returns {Promise<AdvanceInfo>} A promise that resolves to the retrieved advance information.
 */
export const getAdvance = async (id: number, organizationId: number): Promise<AdvanceInfo | undefined> => {
  const query = gql`
    query ($id: ID!, $organizationId: Int) {
      advances(filters: { id: { eq: $id }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            type
            advanceType
            amount
            status
            reason
            description
            rejectionReason
            paymentDate
            updatedAt
            createdByUser {
              data {
                id
              }
            }
            orderTrip {
              data {
                id
                attributes {
                  code
                  pickupDate
                }
              }
            }
            order {
              data {
                id
              }
            }
            driver {
              data {
                id
                attributes {
                  firstName
                  lastName
                }
              }
            }
            subcontractor {
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
    }
  `;

  const { data } = await graphQLPost<AdvanceInfo[]>({
    query,
    params: { id, organizationId },
  });

  return data?.advances[0];
};

/**
 *
 * Creates an advance based on the provided parameters.
 *
 * @param {AdvanceInputForm} entity - The parameters for creating the advance.
 * @returns {Promise<AdvanceInfo>} A promise that resolves to the created advance.
 */
export const createAdvance = async (entity: AdvanceInputForm): Promise<MutationResult<AdvanceInfo>> => {
  const { paymentById, paymentDate, ...otherEntities } = trim(entity);
  const query = gql`
    mutation (
      $organizationId: Int
      $type: ENUM_ADVANCE_TYPE
      $subcontractorId: ID
      $driverId: ID
      $advanceType: ENUM_ADVANCE_ADVANCETYPE
      $orderId: ID
      $orderTripId: ID
      $amount: Float
      $reason: String
      $status: ENUM_ADVANCE_STATUS
      $rejectionDate: Date
      $rejectionReason: String
      $paymentDate: Date
      $paymentById: ID
      $description: String
      $createdById: ID
      $publishedAt: DateTime
    ) {
      createAdvance(
        data: {
          organizationId: $organizationId
          type: $type
          subcontractor: $subcontractorId
          driver: $driverId
          advanceType: $advanceType
          order: $orderId
          orderTrip: $orderTripId
          amount: $amount
          reason: $reason
          status: $status
          rejectionDate: $rejectionDate
          rejectionReason: $rejectionReason
          paymentDate: $paymentDate
          paymentBy: $paymentById
          description: $description
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
  `;

  const { status, data } = await graphQLPost<AdvanceInfo>({
    query,
    params: {
      ...otherEntities,
      ...(entity.advanceType === AdvanceAdvanceType.SALARY && { orderId: null, orderTripId: null }),
      ...(entity.status === AdvanceStatus.PAYMENT && { paymentById, paymentDate: formatGraphQLDate(paymentDate) }),
      ...(entity.status !== AdvanceStatus.PAYMENT && { paymentById: null, paymentDate: null }),
      ...(entity.status === AdvanceStatus.REJECTED && { rejectionDate: formatGraphQLDate(new Date()) }),
      ...(entity.status !== AdvanceStatus.REJECTED && { rejectionReason: null, rejectionDate: null }),
      publishedAt: new Date(),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.createAdvance };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 *
 * Updates an advance based on the provided parameters.
 *
 * @param {AdvanceInputForm} entity - The parameters for updating the advance.
 * @returns {Promise<AdvanceInfo>} A promise that resolves to the updated advance.
 */
export const updateAdvance = async (
  entity: AdvanceInputForm,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<AdvanceInfo>> => {
  const { organizationId, paymentById, paymentDate, ...otherEntities } = trim(entity);
  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkAdvanceExclusives(Number(organizationId), Number(entity.id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const query = gql`
    mutation (
      $id: ID!
      $type: ENUM_ADVANCE_TYPE
      $driverId: ID
      $subcontractorId: ID
      $advanceType: ENUM_ADVANCE_ADVANCETYPE
      $orderId: ID
      $orderTripId: ID
      $amount: Float
      $approvedAmount: Float
      $reason: String
      $status: ENUM_ADVANCE_STATUS
      $paymentDate: Date
      $paymentById: ID
      $rejectionReason: String
      $rejectionDate: Date
      $description: String
      $updatedById: ID
    ) {
      updateAdvance(
        id: $id
        data: {
          type: $type
          driver: $driverId
          subcontractor: $subcontractorId
          advanceType: $advanceType
          order: $orderId
          orderTrip: $orderTripId
          amount: $amount
          approvedAmount: $approvedAmount
          reason: $reason
          status: $status
          paymentDate: $paymentDate
          paymentBy: $paymentById
          rejectionReason: $rejectionReason
          rejectionDate: $rejectionDate
          description: $description
          updatedByUser: $updatedById
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { status: statusCode, data } = await graphQLPost<AdvanceInfo>({
    query,
    params: {
      ...otherEntities,
      ...(entity.advanceType === AdvanceAdvanceType.SALARY && { orderId: null, orderTripId: null }),
      ...(entity.status === AdvanceStatus.PAYMENT && { paymentById, paymentDate: formatGraphQLDate(paymentDate) }),
      ...(entity.status !== AdvanceStatus.PAYMENT && { paymentById: null, paymentDate: null }),
      ...(entity.status === AdvanceStatus.REJECTED && { rejectionDate: formatGraphQLDate(new Date()) }),
      ...(entity.status !== AdvanceStatus.REJECTED && { rejectionReason: null, rejectionDate: null }),
    },
  });

  if (statusCode === HttpStatusCode.Ok && data) {
    return { data: data.updateAdvance };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Check if an advance has been exclusively updated by another user based on its last updated timestamp.
 *
 * @param {number} organizationId - The ID of the organization associated with the advance.
 * @param {number} id - The ID of the advance to check.
 * @param {Date | string} lastUpdatedAt - The last known update time of the advance (can be a Date object or a string).
 * @returns {Promise<boolean>} A promise that resolves to true if the advance has been exclusively updated, false otherwise.
 */
export const checkAdvanceExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<AdvanceInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        advances(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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
  return data?.advances[0].updatedAt !== lastUpdatedAt;
};

/**
 * Deletes an existing advance.
 *
 * @param {Pick<AdvanceInfo, "organizationId" | "id" | "updatedById">} entity - The advance entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<AdvanceInfo | ErrorType>} A promise that resolves to the deleted advance or an error type.
 */
export const deleteAdvance = async (
  entity: Pick<AdvanceInfo, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
) => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkAdvanceExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<AdvanceInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateAdvance(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateAdvance };
  }

  return { error: ErrorType.UNKNOWN };
};
