import { OrderGroupStatusType } from "@prisma/client";
import { gql } from "graphql-request";

import { FilterRequest } from "@/types/filter";
import { OrderGroupInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { trim } from "@/utils/string";

/**
 * Finds order groups based on the provided filter parameters.
 *
 * @param jwt - The JSON Web Token for authentication.
 * @param params - The filter parameters for querying order groups.
 * @returns A promise that resolves to an array of order groups.
 */
export const findOrderGroupsPlan = async (jwt: string, params: FilterRequest<OrderGroupInfo>) => {
  const { sort, organizationId, keywords, vehicle, vehicleType, driver, customerId, pickupDateFrom, pickupDateTo } =
    trim(params);

  const query = gql`
    query (
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
        pagination: { limit: -1 }
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
            orders(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  code
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
                              zone {
                                data {
                                  id
                                  attributes {
                                    name
                                  }
                                }
                              }
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
                        pickupDate
                        pickupTimeNotes
                        deliveryDate
                        deliveryTimeNotes
                        lastStatusType
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
  `;

  const { data } = await fetcher<OrderGroupInfo[]>(jwt, query, {
    sort,
    organizationId,
    lastStatusTypes: [OrderGroupStatusType.PLAN],
    ...(keywords && { keywords }),
    ...(vehicle && { vehicle }),
    ...(vehicleType && { vehicleType }),
    ...(customerId && { customerId }),
    ...(driver && { driver }),
    ...(pickupDateFrom && { pickupDateFrom }),
    ...(pickupDateTo && { pickupDateTo }),
  });

  return data?.orderGroups ?? [];
};
