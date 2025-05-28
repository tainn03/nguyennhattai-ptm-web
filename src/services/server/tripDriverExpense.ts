import { gql } from "graphql-request";

import { PrismaClientTransaction } from "@/configs/prisma";
import { AnyObject } from "@/types";
import { OrderTripInfo, TripDriverExpenseInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";

/**
 * Creates a new trip driver expense.
 * @param {PrismaClientTransaction} prisma - The Prisma client transaction instance.
 * @param {Partial<TripDriverExpenseInfo>} entity - Partial information of the trip driver expense.
 * @returns {Promise<number>} A promise resolving to the ID of the created trip driver expense.
 */
export const createTripDriverExpense = async (
  prisma: PrismaClientTransaction,
  entity: Partial<TripDriverExpenseInfo>
): Promise<number> => {
  const { organizationId, amount } = entity;
  const createdTripDriverExpense = await prisma.tripDriverExpense.create({
    data: {
      organizationId: Number(organizationId),
      amount: Number(amount),
      publishedAt: new Date(),
    },
    select: { id: true },
  });
  return createdTripDriverExpense.id;
};

/**
 * Updates trip driver expenses in the database.
 * @param {PrismaClientTransaction} prisma - The Prisma client transaction instance.
 * @param {number} organizationId - The ID of the organization.
 * @param {Partial<TripDriverExpenseInfo>[]} entity - An array of partial trip driver expense information to be updated.
 * @returns {Promise<number>} A promise resolving to the total driver cost of the updated trip driver expenses.
 */
export const updateTripDriverExpense = async (
  prisma: PrismaClientTransaction,
  organizationId: number,
  entity: Partial<TripDriverExpenseInfo>[]
): Promise<number> => {
  // Extract order trip ID from the first item in the entity array
  const orderTripId = Number(entity[0].trip?.id);
  // Array to store IDs of updated trip driver expenses
  const updatedTripDriverExpenses: number[] = [];
  // Variable to calculate the total driver cost
  let driverCost = 0;

  // Check if the entity array is not empty
  if (entity && entity.length > 0) {
    let count = 0;
    // Delete existing trip driver expense links for the order trip
    await prisma.tripDriverExpensesTripLinks.deleteMany({ where: { orderTripId } });
    // Iterate over each item in the entity array
    for (const item of entity) {
      // Upsert trip driver expense in the database
      const updatedTripDriverExpense = await prisma.tripDriverExpense.upsert({
        where: { id: item.id ? Number(item.id) : -1 },
        update: {
          amount: Number(item.amount),
        },
        create: {
          organizationId,
          amount: Number(item.amount),
          publishedAt: new Date(),
        },
        select: { id: true },
      });
      // Get the ID of the updated trip driver expense
      const tripDriverExpenseId = updatedTripDriverExpense.id;

      // Delete existing trip driver expense - driver expense links for the trip driver expense
      await prisma.tripDriverExpensesDriverExpenseLinks.deleteMany({ where: { tripDriverExpenseId } });
      // Add the ID to the array of updated trip driver expenses
      updatedTripDriverExpenses.push(tripDriverExpenseId);

      // Create trip driver expense - driver expense link if driver expense ID exists
      if (item.driverExpense?.id) {
        await prisma.tripDriverExpensesDriverExpenseLinks.create({
          data: {
            tripDriverExpenseId,
            driverExpenseId: item.driverExpense.id,
          },
        });
      }

      // Create trip driver expense - trip link if trip ID exists
      if (item.trip?.id) {
        await prisma.tripDriverExpensesTripLinks.create({
          data: {
            tripDriverExpenseId,
            orderTripId: item.trip.id,
            tripDriverExpenseOrder: ++count,
          },
        });
      }
      // Add the amount to the driver cost
      driverCost += item.amount || 0;
    }
  }

  return driverCost;
};

/**
 * Gets trip driver expenses for a specific order trip.
 * @param jwt - The JSON web token.
 * @param entity - The entity containing the organization ID and trip ID.
 * @returns {Promise<TripDriverExpenseInfo[]>} A promise that resolves with the trip driver expenses.
 */
export const getTripDriverExpensesByTripId = async <T>(
  jwt: string,
  entity: Partial<TripDriverExpenseInfo>,
  includeOrderTrip = false
) => {
  const { organizationId, trip } = entity;
  let orderTripFetcherQuery = "";

  if (includeOrderTrip) {
    orderTripFetcherQuery = `
      orderTrips(filters: { organizationId: { eq: $organizationId }, id: { eq: $tripId } }) {
        data {
          id
          attributes {
            code
            lastStatusType
            driver {
              data {
                id
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
    `;
  }

  const query = gql`
    query ($organizationId: Int!, $tripId: ID!) {
      tripDriverExpenses(filters: { organizationId: { eq: $organizationId }, trip: { id: { eq: $tripId } } }) {
        data {
          id
          attributes {
            amount
          }
        }
      }
      ${orderTripFetcherQuery}
    }
  `;

  const { data } = await fetcher(jwt, query, {
    organizationId,
    tripId: trip?.id,
  });
  const tripDriverExpenses = (data.tripDriverExpenses ?? []) as TripDriverExpenseInfo[];
  const orderTrip = (data.orderTrips?.[0] as OrderTripInfo) ?? null;

  return (orderTrip ? [tripDriverExpenses, orderTrip] : tripDriverExpenses) as T;
};

/**
 * Gets trip driver expenses for a specific order trip.
 * @param jwt - The JSON web token.
 * @param orderTripId - The ID of the order trip.
 * @returns {Promise<TripDriverExpenseInfo[]>} A promise that resolves with the trip driver expenses.
 */
export const getDriverExpensesByTripIds = async (jwt: string, orderTripIds: number[]): Promise<OrderTripInfo[]> => {
  if (orderTripIds.length === 0) {
    return [];
  }

  const query = gql`
    query ($orderTripIds: [ID!]) {
      orderTrips(pagination: { limit: -1 }, filters: { id: { in: $orderTripIds } }) {
        data {
          id
          attributes {
            driverExpenses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  amount
                  driverExpense {
                    data {
                      id
                      attributes {
                        name
                        type
                        key
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

  const { data } = await fetcher(jwt, query, {
    orderTripIds,
  });

  return data.orderTrips ?? [];
};

/**
 * Gets trip related information by order trip IDs.
 * @param {string} jwt - The JSON web token.
 * @param {number[]} orderTripIds - The order trip IDs.
 * @returns {Promise<OrderTripInfo[]>} A promise that resolves with the trip related information.
 */
export const getTripRelatedInfoByIds = async (
  jwt: string,
  orderTripIds: number[],
  _?: AnyObject
): Promise<OrderTripInfo[]> => {
  if (orderTripIds.length === 0) {
    return [];
  }

  const query = gql`
    query ($orderTripIds: [ID!], $includeOrderItemInReports: Boolean!, $includeRoutePointMetaInReports: Boolean!) {
      orderTrips(pagination: { limit: -1 }, filters: { id: { in: $orderTripIds } }) {
        data {
          id
          attributes {
            driverExpenses(pagination: { limit: -1 }) {
              data {
                id
                attributes {
                  amount
                  driverExpense {
                    data {
                      id
                      attributes {
                        name
                        type
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
                  totalAmount
                  weight
                  # unitPrice
                  # baseQuantity
                  # priceAdjustment
                  notes
                  merchandiseTypes(pagination: { limit: -1 }) {
                    data {
                      id
                      attributes {
                        name
                      }
                    }
                  }
                  items(pagination: { limit: -1 }) @include(if: $includeOrderItemInReports) {
                    data {
                      id
                      attributes {
                        name
                      }
                    }
                  }
                  routeStatuses(pagination: { limit: -1 }) @include(if: $includeRoutePointMetaInReports) {
                    data {
                      id
                      attributes {
                        routePoint {
                          data {
                            id
                            attributes {
                              code
                            }
                          }
                        }
                        meta
                      }
                    }
                  }
                  route {
                    data {
                      attributes {
                        pickupPoints(pagination: { limit: -1 }) {
                          data {
                            attributes {
                              name
                              address {
                                data {
                                  attributes {
                                    country {
                                      data {
                                        attributes {
                                          name
                                        }
                                      }
                                    }
                                    city {
                                      data {
                                        attributes {
                                          name
                                        }
                                      }
                                    }
                                    district {
                                      data {
                                        attributes {
                                          name
                                        }
                                      }
                                    }
                                    ward {
                                      data {
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
                        deliveryPoints(pagination: { limit: -1 }) {
                          data {
                            attributes {
                              name
                              address {
                                data {
                                  attributes {
                                    country {
                                      data {
                                        attributes {
                                          name
                                        }
                                      }
                                    }
                                    city {
                                      data {
                                        attributes {
                                          name
                                        }
                                      }
                                    }
                                    district {
                                      data {
                                        attributes {
                                          name
                                        }
                                      }
                                    }
                                    ward {
                                      data {
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
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher(jwt, query, {
    orderTripIds,
    includeOrderItemInReports: false, // TODO: It's change in order issue
    includeRoutePointMetaInReports: false, // TODO: It's change in order issue
  });

  return data.orderTrips ?? [];
};
