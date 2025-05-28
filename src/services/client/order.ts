import { OrderStatusType, OrderTripStatusType } from "@prisma/client";
import { format } from "date-fns";
import { gql } from "graphql-request";
import { isArray } from "lodash";
import moment from "moment";

import { NAM_PHONG_ORGANIZATION_ID } from "@/constants/organization";
import { OrderDetailModalInputForm, OrderInputForm, UpdateOrderInputForm } from "@/forms/order";
import { OrderExpenseForm } from "@/forms/orderExpense";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { MutationResult } from "@/types/graphql";
import { OrderInfo, OrderTripInfo } from "@/types/strapi";
import { graphQLPost, post, put } from "@/utils/api";
import { convertEndOfDayString, convertStartOfDayString, endOfDay, formatGraphQLDate, startOfDay } from "@/utils/date";
import { equalId } from "@/utils/number";
import { trim } from "@/utils/string";

/**
 * Fetches order based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order object containing the filter parameters.
 * @returns Array of order data matching the specified parameters.
 */
export const ordersFetcher = async ([_, params]: [string, FilterRequest<OrderInfo>]) => {
  const {
    page,
    pageSize,
    mode,
    organizationId,
    orderDateFromFilter,
    orderDateToFilter,
    unitOfMeasureName,
    merchandiseName,
    customerName,
    keywords,
    sort,
    orderDate,
    orderStatus,
    isManaged,
    userId,
    userIdOwner,
    isDispatcher,
  } = params;

  const isFindStatus = isArray(orderStatus) && orderStatus.length > 0;
  const isFindDraft = isFindStatus && orderStatus.find((item) => item === "isDraft");
  let searchConditionDate = "";
  let graphQLParamsDate = "";
  let searchParamsDate = {};
  if (orderDateFromFilter && orderDateToFilter) {
    graphQLParamsDate = `$orderDateFromFilter: DateTime!
                         $orderDateToFilter: DateTime!`;
    searchConditionDate = "orderDate: { gte: $orderDateFromFilter, lte: $orderDateToFilter }";
    searchParamsDate = {
      orderDateFromFilter: startOfDay(orderDateFromFilter),
      orderDateToFilter: endOfDay(orderDateToFilter),
    };
  } else {
    graphQLParamsDate = `$orderDateFrom: DateTime!
                         $orderDateTo: DateTime!`;
    searchConditionDate = "orderDate: { gte: $orderDateFrom, lte: $orderDateTo }";
    searchParamsDate = orderDate
      ? { orderDateFrom: startOfDay(orderDate), orderDateTo: endOfDay(orderDate) }
      : { orderDateFrom: startOfDay(new Date()), orderDateTo: endOfDay(new Date()) };
  }

  const query = gql`
    query (
      $page: Int
      $pageSize: Int
      $organizationId: Int!
      $sort: [String]
      ${keywords ? "$keywords: String" : ""}
      ${unitOfMeasureName ? "$unitOfMeasureName: String" : ""}
      ${merchandiseName ? "$merchandise: String" : ""}
      ${customerName ? "$customer: String" : ""}
      ${graphQLParamsDate ? graphQLParamsDate : ""}
      ${isFindStatus ? "$statuses: [String]" : ""}
      ${isFindDraft ? "$isDraft: Boolean" : ""}
      ${isDispatcher ? "$userIdOwner: ID" : ""}
      ${isManaged ? "$userId: ID" : ""}
      ) {
      orders(
        pagination: { page: $page, pageSize: $pageSize }
        sort: $sort
        filters: {
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          ${unitOfMeasureName ? "unit: { name: { containsi: $unitOfMeasureName } }" : ""}
          ${merchandiseName ? "merchandiseTypes: { name: { containsi: $merchandise } }" : ""}
          ${
            customerName
              ? `customer: {
                    or: [
                      { code: { containsi: $customer } }
                      { name: { containsi: $customer } }
                    ]
                  }`
              : ""
          }
          ${searchConditionDate ? searchConditionDate : ""}
          or: [
            ${
              keywords
                ? `{ code: { containsi: $keywords } }
                   { customer: { name : {containsi: $keywords } } }
                `
                : ""
            }
              ${isFindStatus ? "{ lastStatusType: { in: $statuses } }" : ""}
              ${isFindDraft ? "{ isDraft: { eq: $isDraft } }" : ""}
          ]
          ${
            isManaged
              ? "customer: { customerGroups: { id: { ne: null }, isActive: { eq: true }, publishedAt: { ne: null }, manager: { member: { id: { eq: $userId } } } } }"
              : ""
          }
          ${isDispatcher ? "participants: {publishedAt: { ne: null } , user: {id: { eq: $userIdOwner }}}" : ""}

        }) {
        data {
          id
          attributes {
            ${equalId(organizationId, NAM_PHONG_ORGANIZATION_ID) ? "meta" : ""}
            code
            weight
            customer {
              data {
                id
                attributes {
                  code
                  name
                  phoneNumber
                }
              }
            }
            orderDate
            totalAmount
            participants(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  role
                  user {
                    data {
                      id
                      attributes {
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
                }
              }
            }
            trips( sort: "createdAt:asc", pagination: { limit: -1 } ) {
              data {
                id
                attributes {
                  weight
                }
              }
            }
            isDraft
            statuses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  type
                  createdAt
                }
              }
            }
            ${
              mode === "list"
                ? `
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
              `
                : `
                createdByUser {
                  data {
                    id
                  }
                }
                route {
                  data {
                    id
                    attributes {
                      type
                      code
                      name
                    }
                  }
                }
            `
            }
            updatedAt
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

  const { data, meta } = await graphQLPost<OrderInfo[]>({
    query,
    params: {
      page,
      pageSize,
      sort,
      organizationId,
      userIdOwner,
      ...(searchParamsDate && { ...searchParamsDate }),
      ...(keywords && { keywords }),
      ...(unitOfMeasureName && { unitOfMeasureName }),
      ...(merchandiseName && { merchandise: merchandiseName }),
      ...(customerName && { customer: customerName }),
      ...(isFindStatus && { statuses: orderStatus }),
      ...(isFindDraft && { isDraft: true }),
      ...(isManaged && { userId }),
    },
  });

  return { data: data?.orders ?? [], meta };
};

/**
 * Fetches related order information based on the provided parameters.
 * @param _ - Ignored parameter
 * @param params - FilterRequest object containing the organizationId, code, and mode for the order
 * @returns The first order from the response data, or undefined if the data is not available.
 */
export const relatedOrderInfoFetcher = async ([_, params]: [string, FilterRequest<OrderInfo>]) => {
  const { organizationId, code, mode } = trim(params);

  const gridModeQuery = `
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
  `;

  const listModeQuery = `
    merchandiseTypes(pagination: { limit: -1 }) {
      data {
        id
        attributes {
          name
        }
      }
    }
    `;

  const additionalQuery = mode === "grid" ? gridModeQuery : listModeQuery;

  const query = gql`
    query ($organizationId: Int!, $code: String!) {
      orders(filters: { organizationId: { eq: $organizationId }, code: { eq: $code }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            notes
            customer {
              data {
                id
                attributes {
                  businessAddress
                }
              }
            }
            trips(
              sort: "vehicle.vehicleNumber:asc"
              pagination: { limit: -1 }
              filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
            ) {
              data {
                id
                attributes {
                  weight
                  code
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
                  statuses(pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        type
                        createdAt
                        updatedAt
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
                  type
                  code
                  name
                  pickupPoints(sort: "displayOrder:asc", pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        name
                        contactName
                        contactPhoneNumber
                        contactEmail
                        notes
                        displayOrder
                        address {
                          data {
                            id
                            attributes {
                              country {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              city {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              district {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              ward {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              addressLine1
                            }
                          }
                        }
                      }
                    }
                  }
                  deliveryPoints(sort: "displayOrder:asc", pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        name
                        contactName
                        contactPhoneNumber
                        contactEmail
                        notes
                        displayOrder
                        address {
                          data {
                            id
                            attributes {
                              country {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              city {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              district {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              ward {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              addressLine1
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            ${additionalQuery}
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<OrderInfo[]>({
    query,
    params: {
      organizationId,
      code,
    },
  });

  return data?.orders[0];
};

/**
 * Fetches order based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order object containing the filter parameters.
 * @returns Array of order data matching the specified parameters.
 */
export const orderFetcher = async ([_, params]: [string, Partial<OrderInfo>]) => {
  const query = gql`
    query ($organizationId: Int!, $code: String!) {
      orders(filters: { code: { eq: $code }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            customer {
              data {
                id
                attributes {
                  type
                  name
                  code
                  email
                  taxCode
                  description
                  phoneNumber
                  businessAddress
                  contactName
                  contactEmail
                  contactPhoneNumber
                  updatedAt
                }
              }
            }
            code
            route {
              data {
                id
                attributes {
                  type
                  code
                  name
                  customerId
                  minBOLSubmitDays
                  updatedAt
                  pickupPoints(sort: "displayOrder:asc", pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        name
                        contactName
                        code
                        notes
                        contactEmail
                        contactPhoneNumber
                        displayOrder
                        updatedAt
                        address {
                          data {
                            id
                            attributes {
                              country {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              city {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              district {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              ward {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              addressLine1
                            }
                          }
                        }
                      }
                    }
                  }
                  deliveryPoints(sort: "displayOrder:asc", pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        name
                        contactName
                        code
                        notes
                        contactEmail
                        contactPhoneNumber
                        displayOrder
                        updatedAt
                        address {
                          data {
                            id
                            attributes {
                              country {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              city {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              district {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              ward {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              addressLine1
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            routeStatuses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  organizationId
                  routePoint {
                    data {
                      id
                    }
                  }
                  meta
                }
              }
            }
            orderDate
            deliveryDate
            paymentDueDate
            unit {
              data {
                id
                attributes {
                  code
                  name
                }
              }
            }
            weight
            cbm
            totalAmount
            notes
            merchandiseTypes(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  name
                }
              }
            }
            participants(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  role
                  updatedAt
                  user {
                    data {
                      id
                      attributes {
                        phoneNumber
                        email
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
                }
              }
            }
            merchandiseNote
            items(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  name
                  merchandiseType {
                    data {
                      id
                      attributes {
                        name
                      }
                    }
                  }
                  packageWeight
                  packageLength
                  packageWidth
                  packageHeight
                  quantity
                  unit
                  notes
                }
              }
            }
            statuses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  type
                }
              }
            }
            isDraft
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
            trips(sort: "createdAt:asc", pagination: { limit: -1 }) {
              data {
                attributes {
                  weight
                }
              }
            }
            meta
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<OrderInfo[]>({
    query,
    params,
  });

  return data?.orders[0];
};

/**
 * Fetches order based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order object containing the filter parameters.
 * @returns Array of order data matching the specified parameters.
 */
export const orderDispatchVehicleInfoFetcher = async ([_, params]: [string, Partial<OrderInfo>]) => {
  const query = gql`
    query ($organizationId: Int!, $code: String!) {
      orders(
        pagination: { limit: -1 }
        filters: { code: { eq: $code }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            code
            createdByUser {
              data {
                id
              }
            }
            participants(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  role
                  user {
                    data {
                      id
                    }
                  }
                }
              }
            }
            customer {
              data {
                id
                attributes {
                  type
                  code
                  createdByUser {
                    data {
                      id
                    }
                  }
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
                  minBOLSubmitDays
                  driverExpenses(pagination: { limit: -1 }) {
                    data {
                      attributes {
                        amount
                        driverExpense {
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
            unit {
              data {
                id
                attributes {
                  code
                  type
                  name
                }
              }
            }
            weight
            totalAmount
            merchandiseTypes(
              pagination: { limit: -1 }
              filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
            ) {
              data {
                id
                attributes {
                  name
                }
              }
            }
            trips(
              sort: "createdAt:asc"
              pagination: { limit: -1 }
              filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null } }
            ) {
              data {
                id
                attributes {
                  organizationId
                  code
                  weight
                  pickupDate
                  deliveryDate
                  driverCost
                  subcontractorCost
                  bridgeToll
                  otherCost
                  notes
                  billOfLading
                  billOfLadingImages {
                    data {
                      id
                      attributes {
                        name
                        url
                      }
                    }
                  }
                  vehicle {
                    data {
                      id
                      attributes {
                        vehicleNumber
                        idNumber
                        model
                        ownerType
                        type {
                          data {
                            id
                            attributes {
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
                        phoneNumber
                        email
                        user {
                          data {
                            id
                          }
                        }
                      }
                    }
                  }
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
                              displayOrder
                              name
                              description
                              reportDetails(pagination: { limit: -1 }, filters: { publishedAt: { ne: null } }) {
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
                  messages(sort: "createdAt:desc", pagination: { limit: 1 }, filters: { publishedAt: { ne: null } }) {
                    data {
                      id
                      attributes {
                        readByUsers(pagination: { limit: -1 }) {
                          data {
                            id
                          }
                        }
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
                            attributes {
                              name
                            }
                          }
                        }
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
                  lastStatusType
                  driverNotificationScheduledAt
                  meta
                }
              }
            }
            statuses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  type
                }
              }
            }
            updatedAt
            orderDate
            deliveryDate
            lastStatusType
            participants(pagination: { limit: -1 }) {
              data {
                attributes {
                  user {
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

  const { data } = await graphQLPost<OrderInfo[]>({
    query,
    params,
  });

  return data?.orders[0];
};

/**
 * Fetches order based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order object containing the filter parameters.
 * @returns Array of order data matching the specified parameters.
 */
export const getOrder = async (
  organizationId: number,
  code: string,
  isEditMode: boolean
): Promise<OrderInfo | undefined> => {
  const query = gql`
    query ($organizationId: Int!, $code: String!, $isEditMode: Boolean!) {
      orders(filters: { code: { eq: $code }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            customer {
              data {
                id
                attributes {
                  type
                  name
                  code
                  email
                  taxCode
                  description
                  phoneNumber
                  businessAddress
                }
              }
            }
            code
            route {
              data {
                id
                attributes {
                  code
                  name
                  type
                  pickupPoints(sort: "displayOrder:asc", pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        code
                        name
                        contactName
                        contactEmail
                        contactPhoneNumber
                        notes
                        displayOrder
                        address {
                          data {
                            id @include(if: $isEditMode)
                            attributes {
                              country {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              city {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              district {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              ward {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              addressLine1
                            }
                          }
                        }
                      }
                    }
                  }
                  deliveryPoints(sort: "displayOrder:asc", pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        code
                        name
                        contactName
                        contactEmail
                        contactPhoneNumber
                        notes
                        displayOrder
                        address {
                          data {
                            id @include(if: $isEditMode)
                            attributes {
                              country {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              city {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              district {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              ward {
                                data {
                                  id
                                  attributes {
                                    name
                                    code
                                  }
                                }
                              }
                              addressLine1
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            routeStatuses(pagination: { limit: -1 }) {
              data {
                id @include(if: $isEditMode)
                attributes {
                  routePoint {
                    data {
                      id
                    }
                  }
                  meta
                }
              }
            }
            orderDate
            deliveryDate
            paymentDueDate
            unit {
              data {
                id
                attributes {
                  code
                  name
                }
              }
            }
            weight
            cbm
            totalAmount
            notes
            participants(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  role
                  user {
                    data {
                      id
                      attributes {
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
                }
              }
            }
            merchandiseTypes(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  name
                }
              }
            }
            merchandiseNote
            items(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  name
                  merchandiseType {
                    data {
                      id
                      attributes {
                        name
                      }
                    }
                  }
                  packageWeight
                  packageLength
                  packageWidth
                  packageHeight
                  quantity
                  unit
                  notes
                }
              }
            }
            updatedAt
            isDraft
            meta
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
  const { data } = await graphQLPost<OrderInfo[]>({
    query,
    params: {
      organizationId,
      code,
      isEditMode,
    },
  });

  return data?.orders[0];
};

/**
 * Fetches order options based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order object containing the filter parameters.
 * @returns Array of order data matching the specified parameters.
 */
export const orderOptionsFetcher = async ([_, params]: [string, Partial<OrderInfo>]) => {
  const query = gql`
    query ($organizationId: Int) {
      orders(
        pagination: { limit: -1 }
        filters: { organizationId: { eq: $organizationId }, isDraft: { eq: false }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            code
          }
        }
      }
    }
  `;

  const { data } = await graphQLPost<OrderInfo[]>({
    query,
    params,
  });

  return data?.orders ?? [];
};

/**
 * Checks if a order has been updated since a specified date.
 *
 * @param {number} organizationId - The ID of the organization to which the order belongs.
 * @param {number} id - The ID of the order to check.
 * @param {Date | string} lastUpdatedAt - The date to compare against the order's last updated timestamp.
 * @returns {Promise<boolean>} A promise that resolves to true if the order has been updated, otherwise false.
 */
export const checkOrderExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<OrderInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        orders(filters: { organizationId: { eq: $organizationId }, id: { eq: $id }, publishedAt: { ne: null } }) {
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

  return data?.orders[0]?.updatedAt !== lastUpdatedAt;
};

/**
 * Update the maintenance types of an order.
 *
 * @param order - Information about the order to be updated.
 * @param maintenanceTypesId - An array containing a list of new maintenance type IDs.
 * @param lastUpdatedAt - Last updated date (used for checking exclusivity).
 * @returns - The result of the order update.
 */
export const updateMaintenanceTypeOrder = async (
  order: Pick<OrderInfo, "id" | "organizationId" | "updatedById">,
  maintenanceTypesId: Array<number | undefined>,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrderInfo>> => {
  const { id, organizationId, updatedById } = order;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrderExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrderInfo>({
    query: gql`
      mutation ($id: ID!, $maintenanceType: [ID], $updatedById: ID) {
        updateOrder(id: $id, data: { merchandiseTypes: $maintenanceType, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      maintenanceType: maintenanceTypesId,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrder };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Update the merchandise notes of an order.
 *
 * @param order - Information about the order to be updated, including the order's ID, organization ID, merchandise note, and the ID of the user making the update.
 * @param lastUpdatedAt - Last updated date (used for checking exclusivity).
 * @returns - The result of the order update.
 */
export const updateMaintenanceOrder = async (
  order: Pick<OrderInfo, "id" | "organizationId" | "updatedById" | "merchandiseNote" | "merchandiseTypes">,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrderInfo>> => {
  const { id, organizationId, merchandiseNote, merchandiseTypes, updatedById } = trim(order);

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrderExclusives(organizationId, id, lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const merchandiseTypesId: number[] = [];
  if (merchandiseTypes.length > 0) {
    merchandiseTypes.map((item) => {
      merchandiseTypesId.push(Number(item.id));
    });
  }

  const { status, data } = await graphQLPost<OrderInfo>({
    query: gql`
      mutation ($id: ID!, $merchandiseNote: String, $merchandiseTypes: [ID], $updatedById: ID) {
        updateOrder(
          id: $id
          data: { merchandiseNote: $merchandiseNote, merchandiseTypes: $merchandiseTypes, updatedByUser: $updatedById }
        ) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      merchandiseNote,
      merchandiseTypes: merchandiseTypesId,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrder };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches orders by date.
 *
 * @param params - The parameters for fetching orders.
 * @returns {Promise<{ data: OrderInfo[], meta: PaginationMeta }>} - The fetched orders and pagination metadata.
 */
export const ordersByDateFetcher = async ([_, params]: [string, FilterRequest<OrderInfo>]) => {
  const { orderDate, organizationId, keyword, page, pageSize, isManaged, userId, isDispatcher, userIdOwner } =
    trim(params);

  const { data, meta } = await graphQLPost<OrderInfo[]>({
    query: gql`
      query (
        $page: Int
        $pageSize: Int
        $orderDateFrom: DateTime
        $orderDateTo: DateTime $organizationId: Int
        ${keyword ? "$keyword: String" : ""}
        ${isManaged ? "$userId: ID" : ""}
        ${isDispatcher ? "$userIdOwner: ID" : ""}
      ) {
        orders(
          pagination: { page: $page, pageSize: $pageSize }
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            orderDate: { gte: $orderDateFrom, lte: $orderDateTo }
            ${
              keyword
                ? `or: [
                    { code: { containsi: $keyword } }
                    { customer: { or: [{ code: { containsi: $keyword } }, { name: { containsi: $keyword } }] } }
                  ]`
                : ""
            }
            ${
              isManaged
                ? "customer: { customerGroups: { id: { ne: null }, isActive: { eq: true }, publishedAt: { ne: null }, manager: { member: { id: { eq: $userId } } } } }"
                : ""
            }
            ${isDispatcher ? "participants: {publishedAt: { ne: null } , user: {id: { eq: $userIdOwner }}}" : ""}
          }
        ) {
          data {
            id
            attributes {
              ${equalId(organizationId, NAM_PHONG_ORGANIZATION_ID) ? "meta" : ""}
              createdByUser {
                data {
                  id
                }
              }
              customer {
                data {
                  id
                  attributes {
                    type
                    code
                    name
                    email
                    phoneNumber
                  }
                }
              }
              route {
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
              code
              weight
              isDraft
              updatedAt
              statuses(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    type
                  }
                }
              }
              participants(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    role
                    user {
                      data {
                        id
                        attributes {
                          detail {
                            data {
                              id
                              # attributes {
                              #   firstName
                              #   lastName
                              #   avatar {
                              #     data {
                              #       id
                              #       attributes {
                              #         url
                              #         previewUrl
                              #       }
                              #     }
                              #   }
                              # }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
              trips( sort: "createdAt:asc", pagination: { limit: -1 } ) {
                data {
                  id
                }
              }
              updatedAt
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
      orderDateFrom: startOfDay(orderDate),
      orderDateTo: endOfDay(orderDate),
      organizationId,
      userIdOwner,
      ...(keyword && { keyword }),
      ...(isManaged && { userId }),
    },
  });

  return { data: data?.orders ?? [], meta };
};

/**
 * Fetches orders based on the provided parameters.
 *
 * @param params - The parameters for fetching orders.
 * @returns {Promise<OrderInfo[]>} - The fetched orders.
 */
export const orderPlansFetcher = async ([_, params]: [string, Partial<OrderInfo> & { orderIds: number[] }]) => {
  const { organizationId, orderIds } = trim(params);

  const { data } = await graphQLPost<OrderInfo[]>({
    query: gql`
      query ($organizationId: Int, $orderIds: [ID]) {
        orders(
          filters: { organizationId: { eq: $organizationId }, publishedAt: { ne: null }, id: { in: $orderIds } }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              isDraft
              orderDate
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
              route {
                data {
                  id
                  attributes {
                    type
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
              weight
              statuses(sort: "createdAt:desc", pagination: { limit: 1 }) {
                data {
                  id
                  attributes {
                    type
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
      orderIds,
    },
  });

  return data?.orders ?? [];
};

/**
 * Fetches orders with simple data based on the provided parameters.
 *
 * @param params - The parameters for fetching orders.
 * @returns {Promise<OrderInfo[]>} - The fetched orders.
 */
export const orderPlansBaseFetcher = async ([_, params]: [string, FilterRequest<OrderInfo>]) => {
  const { organizationId, orderDate, keyword, isManaged, userId, userIdOwner, isDispatcher } = trim(params);

  // Calculate the start and end dates for the query
  const fromDate = moment(orderDate).startOf("week").toISOString();
  const toDate = moment(orderDate).add(1, "months").endOf("week").toISOString();

  const { data } = await graphQLPost<OrderInfo[]>({
    query: gql`
      query (
        $organizationId: Int
        $fromDate: DateTime
        $toDate: DateTime
        ${keyword ? "$keyword: String" : ""}
        ${isManaged ? "$userId: ID" : ""}
        ${isDispatcher ? "$userIdOwner: ID" : ""}
      ) {
        orders(
          filters: {
            organizationId: { eq: $organizationId }
            orderDate: { lte: $toDate, gte: $fromDate }
            publishedAt: { ne: null }
            ${
              keyword
                ? `or: [
                    { code: { containsi: $keyword } }
                    { customer: { or: [{ code: { containsi: $keyword } }, { name: { containsi: $keyword } }] } }
                  ]`
                : ""
            }
            ${
              isManaged
                ? "customer: { customerGroups: { id: { ne: null }, isActive: { eq: true }, publishedAt: { ne: null }, manager: { member: { id: { eq: $userId } } } } }"
                : ""
            }
            ${isDispatcher ? "participants: {publishedAt: { ne: null } , user: {id: { eq: $userIdOwner }}}" : ""}
          }
          pagination: { limit: -1 }
        ) {
          data {
            id
            attributes {
              code
              orderDate
              statuses(sort: "createdAt:desc", pagination: { limit: 1 }) {
                data {
                  id
                  attributes {
                    type
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
      fromDate,
      toDate,
      userIdOwner,
      ...(keyword && { keyword }),
      ...(isManaged && { userId }),
    },
  });

  return data?.orders ?? [];
};

/**
 * Update the details of an order in a modal, including order date, delivery date, unit of measure, weight, total amount, payment due date, notes, and other attributes.
 *
 * @param order - Information about the order to be updated, including its ID, order date, delivery date, unit of measure ID, and other details.
 * @param lastUpdatedAt - Last updated date (used for checking exclusivity).
 * @returns - The result of the order update.
 */
export const updateOrderModal = async (
  orgLink: string,
  order: OrderDetailModalInputForm,
  lastUpdatedAt?: Date | string
): Promise<MutationResult<OrderInfo>> => {
  const { id, code, deliveryDate, paymentDueDate, organizationId, ...otherEntities } = trim(order);

  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrderExclusives(Number(organizationId), Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrderInfo>({
    query: gql`
      mutation (
        $id: ID!
        $orderDate: DateTime
        $deliveryDate: DateTime
        $unitOfMeasureId: ID
        $weight: Float
        $cbm: Float
        $totalAmount: Float
        $paymentDueDate: Date
        $notes: String
        $updatedById: ID
      ) {
        updateOrder(
          id: $id
          data: {
            orderDate: $orderDate
            deliveryDate: $deliveryDate
            unit: $unitOfMeasureId
            weight: $weight
            cbm: $cbm
            totalAmount: $totalAmount
            paymentDueDate: $paymentDueDate
            notes: $notes
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
      deliveryDate,
      ...otherEntities,
      paymentDueDate: formatGraphQLDate(paymentDueDate),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    put<ApiResult>(`/api${orgLink}/orders/${code}/auto-dispatch`, {
      order: {
        id: Number(id),
        code,
        deliveryDate,
      },
    });

    return { data: data.updateOrder };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Retrieve an order by its unique code using GraphQL.
 *
 * @param organizationId - The ID of the organization to which the order belongs.
 * @param code - The unique code identifying the order.
 * @returns - Information about the order, including its ID and last updated timestamp, or undefined if no order is found.
 */
export const getOrderByCode = async (organizationId: number, code: string): Promise<OrderInfo | undefined> => {
  const { data } = await graphQLPost<OrderInfo[]>({
    query: gql`
      query ($organizationId: Int!, $code: String!) {
        orders(filters: { organizationId: { eq: $organizationId }, code: { eq: $code }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              updatedAt
              route {
                data {
                  id
                  attributes {
                    pickupPoints {
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
      organizationId,
      code,
    },
  });

  return data?.orders[0];
};

/**
 * Retrieve an order by its unique code using GraphQL.
 *
 * @param organizationId - The ID of the organization to which the order belongs.
 * @param code - The unique code identifying the order.
 * @returns - Information about the order, including its ID, unit, driver, statuses and vehicle, or undefined if no order is found.
 */
export const orderTripStatusFetcher = async ([_, params]: [string, Partial<OrderInfo>]) => {
  const { organizationId, code } = params;
  const { data } = await graphQLPost<OrderInfo[]>({
    query: gql`
      query ($organizationId: Int, $code: String) {
        orders(filters: { publishedAt: { ne: null }, organizationId: { eq: $organizationId }, code: { eq: $code } }) {
          data {
            id
            attributes {
              unit {
                data {
                  id
                  attributes {
                    code
                  }
                }
              }
              trips(sort: "createdAt:asc", pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    billOfLading
                    deliveryDate
                    pickupDate
                    code
                    vehicle {
                      data {
                        id
                        attributes {
                          vehicleNumber
                          model
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
                    weight
                    statuses(pagination: { limit: -1 }) {
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
      code,
    },
  });

  return data?.orders[0];
};

/**
 * Retrieve an order by its unique code using GraphQL.
 *
 * @param organizationId - The ID of the organization to which the order belongs.
 * @param code - The unique code identifying the order.
 * @returns - Information about the order, including its ID, unit, driver, statuses and vehicle, or undefined if no order is found.
 */
export const orderMonitoringFetcher = async ([_, params]: [string, FilterRequest<OrderInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    organizationId,
    startDate,
    endDate,
    customerId,
    orderCode,
    orderStatus,
    driverId,
    isDispatcher,
    userIdOwner,
  } = trim(params);

  const isFindStatus = orderStatus && orderStatus !== "isDraft";
  const isFindDraft = orderStatus && orderStatus === "isDraft";

  const { data, meta } = await graphQLPost<OrderInfo[]>({
    query: gql`
      query (
        $organizationId: Int!
        $page: Int
        $pageSize: Int
        $sort: [String]
        $startDate: DateTime
        $endDate: DateTime
        ${customerId ? "$customerId: ID" : ""}
        ${orderCode ? "$orderCode: String" : ""}
        ${isFindStatus ? "$orderStatus: String" : ""}
        ${isFindDraft ? "$isDraft: Boolean" : ""}
        ${driverId ? "$driverId: ID" : ""}
        ${isDispatcher ? "$userIdOwner: ID" : ""}
      ) {
        orders(
          pagination: { page: $page, pageSize: $pageSize }
          sort: $sort
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            orderDate: { gte: $startDate, lte: $endDate }
            ${customerId ? "customer: { id: { eq: $customerId } }" : ""}
            ${orderCode ? "code: { containsi: $orderCode }" : ""}
            ${isFindStatus ? "lastStatusType: { eq: $orderStatus }" : ""}
            ${isFindDraft ? "isDraft: {eq: $isDraft}" : ""}
            ${driverId ? "trips: { driver: { id: { eq: $driverId } }, publishedAt: { ne: null } }" : ""}
            ${isDispatcher ? "participants: {publishedAt: { ne: null } , user: {id: { eq: $userIdOwner }}}" : ""}
          }
        ) {
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
              orderDate
              deliveryDate
              weight
              isDraft
              unit {
                data {
                  id
                  attributes {
                    code
                  }
                }
              }
              lastStatusType
              trips( sort: "createdAt:asc", pagination: { limit: -1 } ) {
                data {
                  id
                  attributes {
                    lastStatusType
                    billOfLading
                    weight
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
      sort,
      organizationId,
      userIdOwner,
      startDate: convertStartOfDayString(startDate),
      endDate: convertEndOfDayString(endDate),
      ...(customerId && { customerId }),
      ...(orderCode && { orderCode }),
      ...(orderStatus && { orderStatus }),
      ...(driverId && { driverId }),
      ...(isFindDraft && { isDraft: isFindDraft }),
    },
  });

  return { data: data?.orders ?? [], meta };
};

/**
 * Export the salary information of a driver.
 * It sends a POST request to the server with the filter parameters, calculates the driver salaries from the fetched data,
 * and returns the calculated salaries or an error.
 *
 * @param {FilterRequest<OrderInfo>} params - The request data, containing the filter parameters.
 * @returns {Promise<{data: OrderMonitoringChart[]}|{error: ErrorType}>} A promise that resolves to an object containing the calculated salaries or an error.
 */
export const getDataChartOrderMonitoring = async ([_, params]: [string, FilterRequest<OrderInfo>]) => {
  const {
    organizationId,
    startDate,
    endDate,
    customerId,
    orderCode,
    orderStatus,
    driverId,
    routeId,
    isDispatcher,
    userIdOwner,
  } = trim(params);

  const isFindStatus = orderStatus && orderStatus !== "isDraft";
  const isFindDraft = orderStatus && orderStatus === "isDraft";

  const { data } = await graphQLPost<OrderInfo[]>({
    query: gql`
        query (
          $organizationId: Int!
          $startDate: DateTime
          $endDate: DateTime
          ${customerId ? "$customerId: ID" : ""}
          ${orderCode ? "$orderCode: String" : ""}
          ${isFindStatus ? "$orderStatus: String" : ""}
          ${isFindDraft ? "$isDraft: Boolean" : ""}
          ${driverId ? "$driverId: ID" : ""}
          ${isDispatcher ? "$userIdOwner: ID" : ""}

        ) {
          orders(
            pagination: { limit : -1}
            filters: {
              publishedAt: { ne: null }
              organizationId: { eq: $organizationId }
              orderDate: { gte: $startDate, lte: $endDate }
              ${customerId ? "customer: { id: { eq: $customerId } }" : ""}
              ${orderCode ? "code: { containsi: $orderCode }" : ""}
              ${isFindStatus ? "lastStatusType: { eq: $orderStatus }" : ""}
              ${isFindDraft ? "isDraft: {eq: $isDraft}" : ""}
              ${driverId ? "trips: { driver: { id: { eq: $driverId } }, publishedAt: { ne: null } }" : ""}
              ${routeId ? "route: { id: { eq: $routeId } , publishedAt: { ne: null }}" : ""}
              ${isDispatcher ? "participants: {publishedAt: { ne: null } , user: {id: { eq: $userIdOwner }}}" : ""}

            }
          ) {
            data {
              id
              attributes {
                isDraft
                lastStatusType
              }
            }
          }
        }
      `,
    params: {
      organizationId,
      userIdOwner,
      startDate: convertStartOfDayString(startDate),
      endDate: convertEndOfDayString(endDate),
      ...(customerId && { customerId }),
      ...(orderCode && { orderCode }),
      ...(orderStatus && { orderStatus }),
      ...(driverId && { driverId }),
      ...(isFindDraft && { isDraft: isFindDraft }),
    },
  });

  return data?.orders ?? [];
};

/**
 * Get order by organization if and order code to check that order is deleted or not.
 *
 * @param entity - Partial order object containing the filter parameters.
 * @returns Array of order data matching the specified parameters.
 */
export const checkOrderIsDeleted = async (entity: Pick<OrderInfo, "organizationId" | "code">) => {
  const { code, organizationId } = entity;

  const query = gql`
    query ($organizationId: Int, $code: String) {
      orders(filters: { organizationId: { eq: $organizationId }, code: { eq: $code } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await graphQLPost<OrderInfo[]>({
    query,
    params: {
      organizationId,
      code,
    },
  });

  return (data?.orders || []).length === 0;
};

/**
 * Create a new order via API.
 * @param {string} orgLink - The organization link for the order.
 * @param {OrderInputForm} requestData - The data of the order being sent.
 * @returns {Promise<ApiResult<string>>} - The result returned from the API after creating the order.
 */
export const createOrder = async (orgLink: string, requestData: OrderInputForm): Promise<ApiResult<string>> => {
  const result = await post<ApiResult<string>>(`/api${orgLink}/orders/new`, {
    ...requestData,
    paymentDueDate: requestData.paymentDueDate ? format(requestData.paymentDueDate, "yyyy-MM-dd") : null,
  });
  return result;
};

/**
 * Update a new order via API.
 * @param {string} orgLink - The organization link for the order.
 * @param {UpdateOrderInputForm} requestData - The data of the order being sent.
 * @returns {Promise<ApiResult<string>>} - The result returned from the API after creating the order.
 */
export const updateOrder = async (orgLink: string, requestData: UpdateOrderInputForm): Promise<ApiResult<string>> => {
  const result = put<ApiResult<string>>(`/api${orgLink}/orders/${requestData.code}/edit`, {
    ...requestData,
    paymentDueDate: requestData.paymentDueDate ? format(requestData.paymentDueDate, "yyyy-MM-dd") : null,
  });
  return result;
};

/**
 * Update the details of an order in a modal, including order date, delivery date, unit of measure, weight, total amount, payment due date, notes, and other attributes.
 *
 * @param order - Information about the order to be updated, including its ID, order date, delivery date, unit of measure ID, and other details.
 * @param lastUpdatedAt - Last updated date (used for checking exclusivity).
 * @returns - The result of the order update.
 */
export const updateOrderExpenseModal = async (
  order: OrderExpenseForm &
    Partial<{
      organizationId?: number;
      updatedById?: number;
      lastUpdatedAt?: Date | string;
    }>
): Promise<MutationResult<OrderInfo>> => {
  const { id, paymentDueDate, lastUpdatedAt, organizationId, updatedById, ...otherEntities } = trim(order);

  if (lastUpdatedAt) {
    const isErrorExclusives = await checkOrderExclusives(Number(organizationId), Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrderInfo>({
    query: gql`
      mutation ($id: ID!, $totalAmount: Float, $paymentDueDate: Date, $notes: String, $updatedById: ID) {
        updateOrder(
          id: $id
          data: {
            totalAmount: $totalAmount
            paymentDueDate: $paymentDueDate
            notes: $notes
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
      ...otherEntities,
      updatedById,
      paymentDueDate: formatGraphQLDate(paymentDueDate),
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrder };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches total amount of orders by customer based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order object containing the filter parameters.
 * @returns Array of total amount of orders by customers data matching the specified parameters.
 */
export const customersTotalAmountOrderFetcher = async ([_, params]: [
  string,
  FilterRequest<OrderInfo & { customerIds: number[]; orderTripStatus?: string[] }>,
]) => {
  const { organizationId, startDate, endDate, customerIds, orderTripStatus } = trim(params);

  const isDelivered = orderTripStatus?.some((status) => status === OrderTripStatusType.DELIVERED);

  const isUnDelivered = orderTripStatus?.some((status) => status === "UNDELIVERED");

  const isCanceled = orderTripStatus?.some((status) => status === OrderTripStatusType.CANCELED);

  const { data } = await graphQLPost<OrderTripInfo[]>({
    query: gql`
      query (
          $organizationId: Int!
          $startDate: DateTime
          $endDate: DateTime
          $customerIds: [ID]
          ${isDelivered ? "$deliveredTripStatus: [String]" : ""}
          ${isUnDelivered ? "$unDeliveredTripStatus: [String]" : ""}
          ${isCanceled ? "$canceledTripStatus: String" : ""}
        ) {
        orderTrips(
          pagination: { limit: -1 }
          filters: {
            publishedAt: { ne: null }
            organizationId: { eq: $organizationId }
            or: [
              ${isDelivered ? "{ lastStatusType: { in: $deliveredTripStatus } } " : ""}
              ${isUnDelivered ? "{ lastStatusType: { notIn: $unDeliveredTripStatus } } " : ""}
              ${isCanceled ? "{ lastStatusType: { eq: $canceledTripStatus } } " : ""}
            ]
            order: {
              publishedAt: { ne: null }
              orderDate: { between: [$startDate, $endDate] }
              customer: { id: { in: $customerIds } }
            }
          }
        ) {
          data {
            id
            attributes {
              order {
                data {
                  id
                  attributes {
                    totalAmount
                    customer {
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
    `,
    params: {
      organizationId,
      startDate: convertStartOfDayString(startDate),
      endDate: convertEndOfDayString(endDate),
      ...(customerIds && { customerIds }),
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

  return { data: data?.orderTrips ?? [] };
};

/**
 * Fetch order from the server based on the provided filter parameters.
 *
 * @param params - An object containing filter parameters for the query.
 * @returns An object containing the fetched route points and pagination meta information.
 */
export const getOrderById = async (orderId: number) => {
  const { data } = await graphQLPost<OrderInfo[]>({
    query: gql`
      query ($orderId: ID!) {
        orders(filters: { id: { eq: $orderId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              routeStatuses(pagination: { limit: -1 }) {
                data {
                  attributes {
                    routePoint {
                      data {
                        id
                      }
                    }
                    meta
                  }
                }
              }
              route {
                data {
                  attributes {
                    deliveryPoints(pagination: { limit: -1 }, sort: "displayOrder:asc") {
                      data {
                        id
                        attributes {
                          displayOrder
                          code
                          name
                          address {
                            data {
                              id
                              attributes {
                                country {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                city {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                district {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                ward {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                addressLine1
                                addressLine2
                              }
                            }
                          }
                          contactName
                          contactPhoneNumber
                          contactEmail
                          notes
                        }
                      }
                    }
                    pickupPoints(pagination: { limit: -1 }, sort: "displayOrder:asc") {
                      data {
                        id
                        attributes {
                          displayOrder
                          code
                          name
                          address {
                            data {
                              id
                              attributes {
                                country {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                city {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                district {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                ward {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                addressLine1
                                addressLine2
                              }
                            }
                          }
                          contactName
                          contactPhoneNumber
                          contactEmail
                          notes
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
    params: { orderId },
  });

  return data?.orders?.[0];
};

export const getProcessByOrder = async (orderId: number) => {
  const { data } = await graphQLPost<OrderInfo[]>({
    query: gql`
      query ($orderId: ID!) {
        orders(filters: { id: { eq: $orderId }, publishedAt: { ne: null } }) {
          data {
            id
            attributes {
              code
              weight
              cbm
              unit {
                data {
                  id
                  attributes {
                    code
                  }
                }
              }
              group {
                data {
                  id
                  attributes {
                    code
                  }
                }
              }
              trips(pagination: { limit: -1 }) {
                data {
                  id
                  attributes {
                    code
                    weight
                    pickupDate
                    pickupTimeNotes
                    deliveryDate
                    deliveryTimeNotes
                    lastStatusType
                    updatedAt
                    statuses(sort: ["createdAt:desc"], pagination: { limit: 1 }) {
                      data {
                        id
                        attributes {
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
                    driver {
                      data {
                        id
                        attributes {
                          firstName
                          lastName
                          phoneNumber
                          user {
                            data {
                              id
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
                  }
                }
              }
              route {
                data {
                  id
                  attributes {
                    deliveryPoints(pagination: { limit: 1 }) {
                      data {
                        id
                        attributes {
                          code
                          name
                          pickupTimes
                          deliveryTimes
                          address {
                            data {
                              id
                              attributes {
                                addressLine1
                                addressLine2
                                ward {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                district {
                                  data {
                                    id
                                    attributes {
                                      name
                                    }
                                  }
                                }
                                city {
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
    params: { orderId },
  });

  return data?.orders?.[0];
};

/**
 * Updates the meta information of an order.
 *
 * @param {OrderInputForm} entity - The entity containing the order information to be updated.
 * @returns {Promise<MutationResult<OrderInfo>>} - A promise that resolves to the mutation result of the order update.
 */
export const updateOrderMeta = async (entity: OrderInputForm): Promise<MutationResult<OrderInfo>> => {
  const { id, meta, updatedById } = entity;

  const { status, data } = await graphQLPost<OrderInfo>({
    query: gql`
      mutation ($id: ID!, $meta: JSON, $updatedById: ID!) {
        updateOrder(id: $id, data: { meta: $meta, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById,
      meta: meta ? JSON.stringify(meta) : null,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrder };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * Fetches order based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order object containing the filter parameters.
 * @returns Array of order data matching the specified parameters.
 */
export const baseOrdersFetcher = async ([_, params]: [string, FilterRequest<OrderInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    organizationId,
    keywords,
    customerId,
    pickupPoint,
    pickupZoneId,
    pickupAdjacentZoneId,
    deliveryPoint,
    deliveryZoneId,
    deliveryAdjacentZoneId,
    orderDateFrom,
    orderDateTo,
    weight,
    unitId,
    cbm,
  } = trim(params);

  const query = gql`
    query (
      $page: Int
      $pageSize: Int
      $sort: [String]
      $organizationId: Int!
      $lastStatusType: String
      $keywords: String
      $customerId: ID
      $pickupPoint: String
      $pickupZoneId: ID
      $pickupAdjacentZoneId: ID
      $deliveryPoint: String
      $deliveryZoneId: ID
      $deliveryAdjacentZoneId: ID
      $orderDateFrom: DateTime
      $orderDateTo: DateTime
      $weight: Float
      $unitId: ID
      $cbm: Float
    ) {
      orders(
        sort: $sort
        pagination: { page: $page, pageSize: $pageSize }
        filters: {
          and: [
            {
              or: [
                { code: { containsi: $keywords } }
                { customer: { code: { containsi: $keywords } } }
                { customer: { name: { containsi: $keywords } } }
              ]
            }
            {
              or: [
                { route: { pickupPoints: { code: { containsi: $pickupPoint } } } }
                { route: { pickupPoints: { name: { containsi: $pickupPoint } } } }
                { route: { pickupPoints: { address: { addressLine1: { containsi: $pickupPoint } } } } }
                { route: { pickupPoints: { address: { addressLine2: { containsi: $pickupPoint } } } } }
                { route: { pickupPoints: { address: { ward: { name: { containsi: $pickupPoint } } } } } }
                { route: { pickupPoints: { address: { district: { name: { containsi: $pickupPoint } } } } } }
                { route: { pickupPoints: { address: { city: { name: { containsi: $pickupPoint } } } } } }
              ]
            }
            {
              or: [
                { route: { deliveryPoints: { code: { containsi: $deliveryPoint } } } }
                { route: { deliveryPoints: { name: { containsi: $deliveryPoint } } } }
                { route: { deliveryPoints: { address: { addressLine1: { containsi: $deliveryPoint } } } } }
                { route: { deliveryPoints: { address: { addressLine2: { containsi: $deliveryPoint } } } } }
                { route: { deliveryPoints: { address: { ward: { name: { containsi: $deliveryPoint } } } } } }
                { route: { deliveryPoints: { address: { district: { name: { containsi: $deliveryPoint } } } } } }
                { route: { deliveryPoints: { address: { city: { name: { containsi: $deliveryPoint } } } } } }
              ]
            }
          ]
          customer: { id: { eq: $customerId } }
          route: {
            pickupPoints: { zone: { id: { eq: $pickupZoneId }, adjacentZones: { id: { eq: $pickupAdjacentZoneId } } } }
            deliveryPoints: {
              zone: { id: { eq: $deliveryZoneId }, adjacentZones: { id: { eq: $deliveryAdjacentZoneId } } }
            }
          }
          orderDate: { gte: $orderDateFrom, lte: $orderDateTo }
          weight: { eq: $weight }
          cbm: { eq: $cbm }
          unit: { id: { eq: $unitId } }
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          lastStatusType: { eq: $lastStatusType }
        }
      ) {
        data {
          id
          attributes {
            code
            trips(sort: "createdAt:asc", pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  weight
                }
              }
            }
            participants(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  role
                }
              }
            }
            updatedAt
            customer {
              data {
                id
                attributes {
                  code
                  name
                }
              }
            }
            route {
              data {
                id
                attributes {
                  code
                  name
                  pickupPoints {
                    data {
                      id
                      attributes {
                        code
                        name
                        pickupTimes
                        deliveryTimes
                        address {
                          data {
                            id
                            attributes {
                              addressLine1
                              addressLine2
                              ward {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              district {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              city {
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
                    }
                  }
                  deliveryPoints {
                    data {
                      id
                      attributes {
                        code
                        name
                        pickupTimes
                        deliveryTimes
                        address {
                          data {
                            id
                            attributes {
                              addressLine1
                              addressLine2
                              ward {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              district {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
                              city {
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
                    }
                  }
                }
              }
            }
            orderDate
            deliveryDate
            weight
            cbm
            meta
            unit {
              data {
                id
                attributes {
                  code
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

  const { data, meta } = await graphQLPost<OrderInfo[]>({
    query,
    params: {
      page,
      pageSize,
      sort,
      organizationId,
      lastStatusType: OrderStatusType.NEW,
      ...(keywords && { keywords }),
      ...(customerId && { customerId }),
      ...(pickupPoint && { pickupPoint }),
      ...(pickupZoneId && { pickupZoneId }),
      ...(pickupAdjacentZoneId && { pickupAdjacentZoneId }),
      ...(deliveryPoint && { deliveryPoint }),
      ...(deliveryZoneId && { deliveryZoneId }),
      ...(deliveryAdjacentZoneId && { deliveryAdjacentZoneId }),
      ...(orderDateFrom && { orderDateFrom }),
      ...(orderDateTo && { orderDateTo }),
      ...(weight && { weight }),
      ...(unitId && { unitId }),
      ...(cbm && { cbm }),
    },
  });

  return { data: data?.orders ?? [], meta };
};
