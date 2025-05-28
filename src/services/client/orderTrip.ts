import { OrderTripStatusType } from "@prisma/client";
import endOfMonth from "date-fns/endOfMonth";
import startOfMonth from "date-fns/startOfMonth";
import { gql } from "graphql-request";
import omit from "lodash/omit";

import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { INTERNAL_MESSAGE_PAGE_SIZE } from "@/constants/internalMessage";
import { OrganizationSettingExtendedKey, ReportCalculationDateFlag } from "@/constants/organizationSettingExtended";
import { AdvanceInputForm } from "@/forms/advance";
import { OrderStatusChangeForm } from "@/forms/order";
import {
  OrderTripInputForm,
  UpdateBillOfLadingForm,
  UpdateOrderTripInputForm,
  UpdateStatusInputForm,
} from "@/forms/orderTrip";
import { TripDriverExpenseResetForm } from "@/forms/tripDriverExpense";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { OrderInfo, OrderTripInfo, TripDriverExpenseInfo } from "@/types/strapi";
import { graphQLPost, post, put } from "@/utils/api";
import {
  convertEndOfDayString,
  convertStartOfDayString,
  endOfMonthToISOString,
  startOfMonthToISOString,
} from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Fetches order trip options based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order trip object containing the filter parameters.
 * @returns Array of order trip data matching the specified parameters.
 */
export const orderTripOptionsFetcher = async ([_, params]: [
  string,
  Pick<AdvanceInputForm, "organizationId" | "monthOfTrip">,
]) => {
  const { organizationId, monthOfTrip } = params;

  let dateFilter = "";
  let queryParams = "";
  // Retrieve the report calculation date flag from the organization settings
  const reportCalculationDateFlag = await getOrganizationSettingExtended<string>({
    organizationId,
    key: OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
  });

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.STATUS_CREATED_AT:
      dateFilter = `or: [
            { lastStatusType: { in: $prePickupStatuses }, pickupDate: { between: [$startDate, $endDate] } }
            {
              lastStatusType: { notIn: $prePickupStatuses }
              statuses: { and: [{ type: { eq: $pickupType } }, { createdAt: { between: [$startDate, $endDate] } }] }
            }
          ]`;
      queryParams = `
        $prePickupStatuses: [String]
        $pickupType: String
      `;
      break;
    default:
      dateFilter = "pickupDate: { between: [$startDate, $endDate] }";
  }

  // Construct the GraphQL query with the appropriate condition
  const query = gql`
    query (
      $organizationId: Int
      $excludeStatus: String
      $startDate: DateTime
      $endDate: DateTime
      $driverId: ID
      ${queryParams}
    ) {
      orderTrips(
        pagination: { limit: 20 }
        filters: {
          driver: { id: { eq: $driverId } }
          organizationId: { eq: $organizationId }
          order: { publishedAt: { ne: null }, lastStatusType: { ne: $excludeStatus } }
          lastStatusType: { ne: $excludeStatus }
          ${dateFilter}
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            code
            driver {
              data {
                id
              }
            }
          }
        }
      }
    }
  `;

  // Execute the GraphQL query and fetch the data
  const { data } = await graphQLPost<OrderTripInfo[]>({
    query,
    params: {
      organizationId,
      excludeStatus: OrderTripStatusType.CANCELED,
      ...(monthOfTrip && {
        startDate: startOfMonth(monthOfTrip).toISOString(),
        endDate: endOfMonth(monthOfTrip).toISOString(),
      }),
      prePickupStatuses: [
        OrderTripStatusType.NEW,
        OrderTripStatusType.PENDING_CONFIRMATION,
        OrderTripStatusType.CONFIRMED,
      ],
      pickupType: OrderTripStatusType.WAITING_FOR_PICKUP,
    },
  });

  // Return the fetched order trip data or an empty array if none is found
  return data?.orderTrips ?? [];
};

/**
 * Checks if a order trip has been updated since a specified date.
 *
 * @param organizationId - The ID of the organization to which the order trip belongs.
 * @param id - The ID of the order trip to check.
 * @param lastUpdatedAt - The date to compare against the order trip's last updated timestamp.
 * @returns A promise that resolves to true if the order trip has been updated, otherwise false.
 */
export const checkOrderTripExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const query = gql`
    query ($organizationId: Int!, $id: ID!) {
      orderTrips(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            updatedAt
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query,
    params: {
      id,
      organizationId,
    },
  });

  return data?.orderTrips[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Deletes an existing order trip.
 *
 * @param {Pick<OrderTripInfo, "organizationId" | "id" | "updatedById">} entity - The order trip entity to delete.
 * @param {Date | string | undefined} lastUpdatedAt - (Optional) The last updated timestamp of the entity.
 * @returns {Promise<OrderTripInfo | ErrorType>} A promise that resolves to the deleted order trip or an error type.
 */
export const deleteOrderTrip = async (
  entity: Pick<Partial<OrderTripInfo>, "organizationId" | "id" | "updatedById">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrderTripInfo>> => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrderTripExclusives(Number(organizationId), Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrderTripInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateOrderTrip(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
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
    return { data: data.updateOrderTrip };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Get order trip with list message based on the specified parameters.
 *
 * @param entity - Partial order trip object containing the filter parameters.
 * @returns Order trip data matching the specified parameters.
 */
export const getInitOrderTripMessage = async (entity: Partial<OrderTripInfo>) => {
  const { organizationId, id } = entity;
  const query = gql`
    query ($organizationId: Int!, $orderTripId: ID, $limit: Int) {
      orderTrips(
        filters: { organizationId: { eq: $organizationId }, id: { eq: $orderTripId }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            order {
              data {
                id
                attributes {
                  code
                  orderDate
                  statuses(pagination: { limit: -1 }) {
                    data {
                      attributes {
                        type
                      }
                    }
                  }
                }
              }
            }
            code
            vehicle {
              data {
                id
                attributes {
                  vehicleNumber
                }
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
            statuses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  type
                  notes
                  driverReport {
                    data {
                      id
                      attributes {
                        name
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
                }
              }
            }
            messages(sort: "createdAt:desc", pagination: { limit: $limit }, filters: { publishedAt: { ne: null } }) {
              data {
                id
                attributes {
                  type
                  message
                  latitude
                  longitude
                  attachments(pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        name
                        url
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
                  readByUsers(pagination: { limit: -1 }) {
                    data {
                      id
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

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query,
    params: {
      organizationId,
      orderTripId: Number(id),
      limit: INTERNAL_MESSAGE_PAGE_SIZE,
    },
  });

  return data?.orderTrips[0];
};

/**
 * Get order trip with list message based on the specified parameters.
 *
 * @param entity - Partial order trip object containing the filter parameters.
 * @param page - Page of messages to get.
 * @param date - Date to get messages have created at after that date.
 * @returns Order trip data matching the specified parameters.
 */
export const getOrderTripMessageWithPage = async (entity: Partial<OrderTripInfo>, page: number, date: Date) => {
  const { organizationId, id } = entity;
  const query = gql`
    query ($organizationId: Int!, $orderTripId: ID, $page: Int, $pageSize: Int, $date: DateTime) {
      orderTrips(
        filters: { organizationId: { eq: $organizationId }, id: { eq: $orderTripId }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            messages(
              sort: "createdAt:desc"
              pagination: { page: $page, pageSize: $pageSize }
              filters: { publishedAt: { ne: null }, createdAt: { lte: $date } }
            ) {
              data {
                id
                attributes {
                  type
                  message
                  latitude
                  longitude
                  attachments(pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        name
                        url
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
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query,
    params: {
      organizationId,
      orderTripId: Number(id),
      page,
      pageSize: INTERNAL_MESSAGE_PAGE_SIZE,
      date,
    },
  });

  return data?.orderTrips[0];
};

/**
 * Get order trip with list message based on the specified parameters.
 *
 * @param entity - Partial order trip object containing the filter parameters.
 * @param date - Date to get messages have created at after that date.
 * @returns Order trip data matching the specified parameters.
 */
export const getNewOrderTripMessage = async (entity: Partial<OrderTripInfo>, date: Date) => {
  const { organizationId, id } = entity;
  const query = gql`
    query ($organizationId: Int!, $orderTripId: ID, $date: DateTime) {
      orderTrips(
        filters: { organizationId: { eq: $organizationId }, id: { eq: $orderTripId }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            messages(
              sort: "createdAt:asc"
              pagination: { limit: -1 }
              filters: { publishedAt: { ne: null }, createdAt: { gt: $date } }
            ) {
              data {
                id
                attributes {
                  type
                  message
                  latitude
                  longitude
                  attachments(pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        name
                        url
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
                  readByUsers(pagination: { limit: -1 }) {
                    data {
                      id
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

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query,
    params: {
      organizationId,
      orderTripId: Number(id),
      date,
    },
  });

  return data?.orderTrips[0];
};

/**
 * Fetch bill of lading information based on organization ID and order trip ID from the GraphQL API.
 *
 * @param {number} organizationId - The ID of the organization.
 * @param {number} id - The ID of the bill of lading.
 * @returns {Promise<OrderTripInfo | undefined>} A promise that resolves to the fetched bill of lading information or undefined if not found.
 */
export const getBillOfLading = async (organizationId: number, tripId: number): Promise<OrderTripInfo | undefined> => {
  const { data } = await graphQLPost<OrderTripInfo[]>({
    query: gql`
      query ($organizationId: Int!, $tripId: ID!) {
        orderTrips(
          filters: { organizationId: { eq: $organizationId }, id: { eq: $tripId }, publishedAt: { ne: null } }
        ) {
          data {
            id
            attributes {
              notes
              billOfLading
              billOfLadingReceived
              billOfLadingImages {
                data {
                  id
                  attributes {
                    name
                    url
                  }
                }
              }
              statuses(sort: "id:desc", pagination: { limit: 1 }) {
                data {
                  id
                  attributes {
                    notes
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
      tripId,
    },
  });

  return data?.orderTrips[0];
};

/**
 * Resets trip driver expenses for specified order trips.
 * @param {Object} params - The parameters containing organization code and order code.
 * @param {TripDriverExpenseResetForm} route - The data containing route ID and order trip IDs.
 * @returns {Promise<ApiResult<number>>} The result of the operation.
 */
export const resetTripDriverExpenses = async (
  params: { organizationCode: string; orderCode: string },
  route: TripDriverExpenseResetForm
) => {
  const { organizationCode, orderCode } = params;
  const result = await put<ApiResult<number>>(
    `/api/orgs/${organizationCode}/orders/${orderCode}/trips/reset-driver-expenses`,
    {
      ...route,
    }
  );
  return result;
};

/**
 * Fetch the trips information of a order.
 * It sends a GraphQL query to the server with the filter parameters and returns the fetched data.
 *
 * @param {Array} _ - An array where the first element is a string and the second element is a FilterRequest object.
 * @returns {Promise} A promise that resolves to the fetched data.
 */
export const orderTripsInfoFetcher = async ([_, params]: [string, FilterRequest<OrderTripInfo>]) => {
  const { organizationId, id } = params;

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        orderTrips(
          pagination: { limit: -1 }
          filters: { organizationId: { eq: $organizationId }, order: { id: { eq: $id } } }
        ) {
          data {
            id
            attributes {
              code
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
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
                  }
                }
              }
              weight
              lastStatusType
              statuses(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    createdAt
                    type
                    driverReport {
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
              billOfLading
              billOfLadingReceived
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

  return { data: data?.orderTrips ?? [] };
};

/**
 * Fetch order trips data for chart.
 * @param params - The filter parameters including organization ID, pickup date, and vehicle ID.
 * @returns An array of order trip data.
 */
export const orderTripsForChartFetcher = async ([_, params]: [string, FilterRequest<OrderTripInfo>]) => {
  const { organizationId, selectedMonth, vehicleId, isDispatcher, userIdOwner } = params;

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query: gql`
      query (
        $organizationId: Int!
        $fromDate: DateTime!
        $toDate: DateTime!
        ${vehicleId ? "$vehicleId:  ID!" : ""}
        ${isDispatcher ? "$userIdOwner: ID" : ""}
        ) {
        orderTrips(
          pagination: { limit: -1 }
          sort: "updatedAt:desc"
          filters: {
            order: {
              publishedAt: { ne: null }
              ${isDispatcher ? "participants: {publishedAt: { ne: null } , user: {id: { eq: $userIdOwner }}}" : ""}
            }
            organizationId: { eq: $organizationId }
            ${vehicleId ? "vehicle: { id: { eq: $vehicleId } }" : ""}
            pickupDate: { between: [$fromDate, $toDate] }
          }
        ) {
          data {
            id
            attributes {
              code
              lastStatusType
              pickupDate
              updatedAt
              statuses(sort: "createdAt:desc", pagination: { limit: 1 }) {
                data {
                  attributes {
                    createdAt
                    driverReport {
                      data {
                        attributes {
                          name
                          type
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
      ...(isDispatcher && { userIdOwner }),
      ...(vehicleId && { vehicleId }),
      fromDate: startOfMonthToISOString(selectedMonth),
      toDate: endOfMonthToISOString(selectedMonth),
    },
  });

  return data?.orderTrips ?? [];
};

/**
 * Fetch base order trips data.
 * @param params - The filter parameters including organization ID, pickup date, and vehicle IDs.
 * @returns An array of order trip data.
 */
export const baseOrderTripsFetcher = async ([_, params]: [string, FilterRequest<OrderTripInfo>]) => {
  const { organizationId, selectedMonth, vehicleIds, isDispatcher, userIdOwner } = params;

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query: gql`
      query (
        $organizationId: Int!
        $vehicleIds: [ID]!
        $fromDate: DateTime!
        $toDate: DateTime!
        ${isDispatcher ? "$userIdOwner: ID" : ""}
      ) {
        orderTrips(
          pagination: { limit: -1 }
          sort: "updatedAt:desc"
          filters: {
            order: {
              publishedAt: { ne: null }
              ${isDispatcher ? "participants: {publishedAt: { ne: null } , user: {id: { eq: $userIdOwner }}}" : ""}
            }
            organizationId: { eq: $organizationId }
            vehicle: { id: { in: $vehicleIds } }
            pickupDate: { between: [$fromDate, $toDate] }
          }
        ) {
          data {
            id
            attributes {
              code
              lastStatusType
              pickupDate
              updatedAt
              statuses(sort: "createdAt:desc", pagination: { limit: 1 }) {
                data {
                  attributes {
                    createdAt
                    type
                  }
                }
              }
              vehicle {
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
      vehicleIds,
      ...(isDispatcher && { userIdOwner }),
      fromDate: startOfMonthToISOString(selectedMonth),
      toDate: endOfMonthToISOString(selectedMonth),
    },
  });

  return data?.orderTrips ?? [];
};

/**
 * Fetch detail order trips data.
 * @param params - The filter parameters including organization ID, pickup date, and vehicle IDs.
 * @returns An array of order trip data.
 */
export const detailOrderTripsFetcher = async ([_, params]: [string, FilterRequest<OrderTripInfo>]) => {
  const { organizationId, orderTripIds } = trim(params);

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query: gql`
      query ($organizationId: Int!, $orderTripIds: [ID]!) {
        orderTrips(
          pagination: { limit: -1 }
          filters: { organizationId: { eq: $organizationId }, id: { in: $orderTripIds } }
        ) {
          data {
            id
            attributes {
              code
              lastStatusType
              pickupDate
              updatedAt
              weight
              order {
                data {
                  id
                  attributes {
                    customer {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    unit {
                      data {
                        id
                        attributes {
                          code
                        }
                      }
                    }
                    route {
                      data {
                        id
                        attributes {
                          code
                          name
                          type
                        }
                      }
                    }
                  }
                }
              }
              statuses(sort: "createdAt:desc", pagination: { limit: -1 }) {
                data {
                  attributes {
                    createdAt
                    type
                    driverReport {
                      data {
                        attributes {
                          name
                          type
                        }
                      }
                    }
                  }
                }
              }
              vehicle {
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
      orderTripIds,
    },
  });

  return data?.orderTrips ?? [];
};

/**
 * Fetch order trips by vehicle.
 * @param params - The filter parameters including organization ID and order trip IDs.
 * @returns An array of order trip data.
 */
export const orderTripsByVehicleFetcher = async ([_, params]: [string, FilterRequest<OrderTripInfo>]) => {
  const { organizationId, page, pageSize, orderTripIds } = trim(params);

  const { data, meta } = await graphQLPost<OrderTripInfo[]>({
    query: gql`
      query ($organizationId: Int!, $orderTripIds: [ID]!, $page: Int, $pageSize: Int) {
        orderTrips(
          pagination: { page: $page, pageSize: $pageSize }
          filters: { organizationId: { eq: $organizationId }, id: { in: $orderTripIds } }
        ) {
          data {
            id
            attributes {
              code
              pickupDate
              deliveryDate
              billOfLading
              weight
              statuses(sort: "createdAt:desc", pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    type
                    createdAt
                    driverReport {
                      data {
                        id
                        attributes {
                          type
                          name
                        }
                      }
                    }
                  }
                }
              }
              order {
                data {
                  id
                  attributes {
                    code
                    customer {
                      data {
                        id
                        attributes {
                          code
                          name
                        }
                      }
                    }
                    unit {
                      data {
                        id
                        attributes {
                          code
                        }
                      }
                    }
                    route {
                      data {
                        id
                        attributes {
                          code
                          name
                          type
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
              total
              page
              pageSize
              pageCount
            }
          }
        }
      }
    `,
    params: {
      page,
      pageSize,
      organizationId,
      orderTripIds,
    },
  });

  return { data: data?.orderTrips ?? [], meta };
};

/**
 * Updates the Bill of Lading for a specific order trip.
 *
 * @param {string} orgLink - The organization link.
 * @param {UpdateBillOfLadingForm} entity - The form data for updating the Bill of Lading.
 * @returns {Promise<ApiResult<OrderTripInfo>>} The result of the update operation.
 */
export const updateBillOfLading = async (orgLink: string, entity: UpdateBillOfLadingForm) => {
  const { code, order } = entity;
  const result = await put<ApiResult<OrderTripInfo>>(
    `/api${orgLink}/orders/${order?.code}/trips/${code}/bill-of-ladings`,
    {
      ...entity,
    }
  );
  return result;
};

/**
 * Sends a request to the server to receive an order.
 *
 * @param {string} orgLink - The organization's link.
 * @param {OrderStatusChangeForm} entity - The order to be received.
 * @returns {Promise<ApiResult<OrderTripInfo>>} - Returns a promise that resolves to the result of the API call.
 */
export const receiveOrder = async (orgLink: string, entity: OrderStatusChangeForm) => {
  const { order } = entity;
  const result = await put<ApiResult<OrderTripInfo>>(`/api${orgLink}/orders/${order?.code}/receive`, {
    ...entity,
  });

  return result;
};

/**
 * Fetches order based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order object containing the filter parameters.
 * @returns Array of order data matching the specified parameters.
 */
export const customerOrderTripInfoFetcher = async ([_, params]: [
  string,
  FilterRequest<OrderInfo & { orderTripStatus?: string[] }>,
]) => {
  const { organizationId, startDate, endDate, customerId, orderTripStatus } = trim(params);

  const isDelivered = orderTripStatus?.some((status) => status === OrderTripStatusType.DELIVERED);

  const isUnDelivered = orderTripStatus?.some((status) => status === "UNDELIVERED");

  const isCanceled = orderTripStatus?.some((status) => status === OrderTripStatusType.CANCELED);

  const { data, meta } = await graphQLPost<OrderTripInfo[]>({
    query: gql`
      query(
        $organizationId: Int!
        $startDate: DateTime
        $endDate: DateTime
        $customerId: ID
        ${isDelivered ? "$deliveredTripStatus: [String]" : ""}
        ${isUnDelivered ? "$unDeliveredTripStatus: [String]" : ""}
        ${isCanceled ? "$canceledTripStatus: String" : ""}
      ) {
        orderTrips(
          pagination: { limit: -1 }
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            id: { gt: 0 }
            or: [

              ${isDelivered ? "{ lastStatusType: { in: $deliveredTripStatus } } " : ""}
              ${isUnDelivered ? "{ lastStatusType: { notIn: $unDeliveredTripStatus } } " : ""}
              ${isCanceled ? "{ lastStatusType: { eq: $canceledTripStatus } } " : ""}
            ]
            order: {
              publishedAt: { ne: null }
              orderDate: { between: [$startDate, $endDate] }
              customer: { id: { eq: $customerId } }
            }
          }
        ) {
          data {
            id
            attributes {
              code
              weight
              pickupDate
              deliveryDate
              subcontractorCost
              driverCost
              bridgeToll
              otherCost
              billOfLading
              billOfLadingReceived
              billOfLadingReceivedDate
              lastStatusType
              notes
              statuses(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    type
                    driverReport {
                      data {
                        id
                        attributes {
                          name
                        }
                      }
                    }
                    createdAt
                  }
                }
              }
              order {
                data {
                  id
                  attributes {
                    code
                    totalAmount
                    isDraft
                    lastStatusType
                    orderDate
                  }
                }
              }
            }
          }
          meta {
            pagination {
              total
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      startDate: convertStartOfDayString(startDate),
      endDate: convertEndOfDayString(endDate),
      ...(customerId && { customerId }),
      ...(isDelivered && {
        deliveredTripStatus: [OrderTripStatusType.DELIVERED, OrderTripStatusType.COMPLETED],
      }),
      ...(isUnDelivered && {
        unDeliveredTripStatus: [
          OrderTripStatusType.DELIVERED,
          OrderTripStatusType.COMPLETED,
          OrderTripStatusType.CANCELED,
        ],
      }),
      ...(isCanceled && { canceledTripStatus: OrderTripStatusType.CANCELED }),
    },
  });

  return { data: data?.orderTrips ?? [], total: meta?.pagination?.total };
};

/**
 * Gets trip driver expenses for a specific order trip.
 *
 * @param params - The parameters for the request.
 * @returns {Promise<OrderTripInfo>} A promise that resolves with the trip driver expenses.
 */
export const getTripDriverExpenses = async (params: Partial<TripDriverExpenseInfo>): Promise<OrderTripInfo | null> => {
  const { trip } = params;
  const { data } = await graphQLPost<OrderTripInfo>({
    query: gql`
      query ($tripId: ID!) {
        orderTrip(id: $tripId) {
          data {
            id
            attributes {
              code
              weight
              driverCost
              subcontractorCost
              bridgeToll
              otherCost
              notes
              vehicle {
                data {
                  id
                  attributes {
                    vehicleNumber
                    idNumber
                    type {
                      data {
                        id
                        attributes {
                          name
                          driverExpenseRate
                        }
                      }
                    }
                  }
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
              driverExpenses {
                data {
                  id
                  attributes {
                    amount
                    driverExpense {
                      data {
                        id
                        attributes {
                          key
                        }
                      }
                    }
                  }
                }
              }
              order {
                data {
                  id
                  attributes {
                    code
                    customer {
                      data {
                        id
                        attributes {
                          code
                          name
                          type
                        }
                      }
                    }
                    route {
                      data {
                        id
                        attributes {
                          type
                          code
                          name
                          driverCost
                          bridgeToll
                          subcontractorCost
                          otherCost
                          driverExpenses {
                            data {
                              id
                              attributes {
                                amount
                                driverExpense {
                                  data {
                                    id
                                    attributes {
                                      key
                                      type
                                      name
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                    unit {
                      data {
                        id
                        attributes {
                          code
                          name
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
      tripId: trip?.id,
    },
  });

  return data?.orderTrip ?? null;
};

/**
 * Updates the status of an order trip.
 *
 * @param {string} orgLink - The organization link.
 * @param {UpdateStatusInputForm} entity - The entity containing the order and status update information.
 * @returns {Promise<ApiResult<OrderTripInfo>>} - The result of the status update operation.
 */
export const updateOrderTripStatus = async (orgLink: string, entity: UpdateStatusInputForm) => {
  const { code, orderCode } = entity;
  const result = await post<ApiResult<OrderTripInfo>>(
    `/api${orgLink}/orders/${orderCode}/trips/${code}/status/edit`,
    entity
  );

  return result;
};

/**
 * Deletes the driver notification schedule for the specified order trip.
 *
 * @param number - The ID of the order trip.
 * @returns {Promise<number | null>} - The ID of the order trip if the operation is successful, otherwise null.
 */
export const deleteOrderTripDriverNotificationSchedule = async (tripId: number): Promise<number | null> => {
  const { data } = await graphQLPost<OrderTripInfo>({
    query: gql`
      mutation ($tripId: ID!) {
        updateOrderTrip(id: $tripId, data: { driverNotificationScheduledAt: null }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      tripId,
    },
  });

  return data?.updateOrderTrip?.id ?? null;
};

/**
 * Creates a new order trip.
 *
 * @param {string} orgLink - The organization link.
 * @param {OrderTripInputForm} entity - The order trip input form containing trip details.
 * @returns {Promise<ApiResult<OrderTripInfo>>} - The result of the API call containing the order trip information.
 */
export const createOrderTrip = async (orgLink: string, entity: OrderTripInputForm) => {
  const { driverCost, subcontractorCost, bridgeToll, otherCost, ...otherEntities } = entity;

  const result = await post<ApiResult<OrderTripInfo>>(`/api${orgLink}/orders/${otherEntities.order?.code}/trips/new`, {
    ...omit(otherEntities, "id"),
    driverCost: driverCost ?? null,
    subcontractorCost: subcontractorCost ?? null,
    bridgeToll: bridgeToll ?? null,
    otherCost: otherCost ?? null,
  });

  return result;
};

/**
 * Creates a new order trip.
 *
 * @param {string} orgLink - The organization link.
 * @param {OrderTripInputForm} entity - The order trip input form containing trip details.
 * @returns {Promise<ApiResult<OrderTripInfo>>} - The result of the API call containing the order trip information.
 */
export const updateOrderTrip = async (orgLink: string, orderCode: string, entity: UpdateOrderTripInputForm) => {
  const result = await put<ApiResult<OrderTripInfo>>(
    `/api${orgLink}/orders/${orderCode}/trips/${entity.id}/edit`,
    entity
  );

  return result;
};

/**
 * Retrieves order trips with related driver info and expenses based on order code and organization ID.
 *
 * @param {[string, Partial<OrderInfo>]} params - Tuple containing a key and order info with organizationId and code.
 * @returns {Promise<OrderTripInfo[]>} - A promise resolving to a list of order trips or an empty array.
 */
export const getOrderTripsWithExpensesByOrderId = async ([_, params]: [string, Partial<OrderInfo>]) => {
  const query = gql`
    query ($organizationId: Int!, $code: String!) {
      orderTrips(
        filters: { organizationId: { eq: $organizationId }, order: { code: { eq: $code } }, publishedAt: { ne: null } }
        pagination: { limit: -1 }
      ) {
        data {
          id
          attributes {
            code
            driver {
              data {
                id
                attributes {
                  firstName
                  lastName
                }
              }
            }
            expenses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  amount
                  expenseType {
                    data {
                      id
                      attributes {
                        name
                      }
                    }
                  }
                  trip {
                    data {
                      id
                      attributes {
                        code
                      }
                    }
                  }
                  documents(pagination: { limit: -1 }) {
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
            createdByUser {
              data {
                id
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query,
    params,
  });

  return data?.orderTrips ?? [];
};
