import { gql } from "graphql-request";

import { FilterRequest } from "@/types/filter";
import { OrderGroupInfo } from "@/types/strapi";
import { graphQLPost } from "@/utils/api";
import { trim } from "@/utils/string";

/**
 * Fetches order based on the specified parameters.
 *
 * @param _ - Placeholder parameter.
 * @param params - Partial order object containing the filter parameters.
 * @returns Array of order data matching the specified parameters.
 */
export const orderGroupsFetcher = async ([_, params]: [string, FilterRequest<OrderGroupInfo>]) => {
  const {
    page,
    pageSize,
    sort,
    organizationId,
    keywords,
    lastStatusTypes,
    vehicle,
    vehicleType,
    driver,
    customerId,
    pickupDateFrom,
    pickupDateTo,
    includeStatuses,
    excludeImportOrders = false,
  } = trim(params);

  const query = gql`
    query (
      $includeStatuses: Boolean!
      $page: Int
      $pageSize: Int
      $sort: [String]
      $organizationId: Int!
      $lastStatusTypes: [String]
      $keywords: String
      $vehicle: String
      $vehicleType: ID
      $customerId: ID
      $driver: String
      $pickupDateFrom: DateTime
      $pickupDateTo: DateTime
    ) {
      orderGroups(
        sort: $sort
        pagination: { page: $page, pageSize: $pageSize }
        filters: {
          and: [
            {
              or: [
                { code: { containsi: $keywords } }
                { orders: { trips: { vehicle: { vehicleNumber: { containsi: $keywords } } } } }
                { orders: { trips: { vehicle: { type: { name: { containsi: $keywords } } } } } }
                { orders: { trips: { driver: { firstName: { containsi: $keywords } } } } }
                { orders: { trips: { driver: { lastName: { containsi: $keywords } } } } }
                { orders: { customer: { code: { containsi: $keywords } } } }
                { orders: { customer: { name: { containsi: $keywords } } } }
              ]
            }
            {
              or: [
                { orders: { trips: { driver: { firstName: { containsi: $driver } } } } }
                { orders: { trips: { driver: { lastName: { containsi: $driver } } } } }
              ]
            }
          ]
          orders: {
            customer: { id: { eq: $customerId } }
            ${excludeImportOrders ? "type: { eq: null }" : ""}
            trips: {
              vehicle: { vehicleNumber: { containsi: $vehicle }, type: { id: { eq: $vehicleType } } }
              pickupDate: { gte: $pickupDateFrom, lte: $pickupDateTo }
            }
          }
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
          lastStatusType: { in: $lastStatusTypes }
        }
      ) {
        data {
          id
          attributes {
            code
            lastStatusType
            warehouse {
              data {
                id
                attributes {
                  name
                }
              }
            }
            processByOrder {
              data {
                id
                attributes {
                  code
                }
              }
            }
            orders(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  code
                  participants(pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        role
                      }
                    }
                  }
                  updatedAt
                  processForGroups(pagination: { limit: -1 }) {
                    data {
                      id
                    }
                  }
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
                        statuses(sort: ["createdAt:desc"], pagination: { limit: 1 }) @include(if: $includeStatuses) {
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

  const { data, meta } = await graphQLPost<OrderGroupInfo[]>({
    query,
    params: {
      page,
      pageSize,
      sort,
      organizationId,
      lastStatusTypes,
      ...(keywords && { keywords }),
      ...(vehicle && { vehicle }),
      ...(vehicleType && { vehicleType }),
      ...(customerId && { customerId }),
      ...(driver && { driver }),
      ...(pickupDateFrom && { pickupDateFrom }),
      ...(pickupDateTo && { pickupDateTo }),
      includeStatuses: includeStatuses ?? false, // Default to false if not provided
    },
  });

  return { data: data?.orderGroups ?? [], meta };
};
