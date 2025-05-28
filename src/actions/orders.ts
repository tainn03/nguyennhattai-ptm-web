"use server";

import { OrderParticipantRole, OrderStatusType, RouteType } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { prisma } from "@/configs/prisma";
import { ORDER_CODE_MIN_LENGTH } from "@/constants/organizationSetting";
import { ImportedOrderInputForm } from "@/forms/import";
import { DeleteOrdersForm } from "@/forms/order";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import logger from "@/utils/logger";
import { withActionExceptionHandler } from "@/utils/server";
import { ensureString, randomString } from "@/utils/string";

/**
 * Fetches recent orders with notes for a given customer.
 *
 * @param {FilterRequest<OrderInfo>} entities - The filter request containing customer ID, page, and page size.
 * @returns {Promise<{ data: OrderInfo[]; meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number; } } }>} - A promise that resolves to an object containing the order data and pagination metadata.
 */
export const recentOrderNotesFetcher = async (entities: FilterRequest<OrderInfo>) => {
  const { organizationId, customerId, page, pageSize } = entities;
  const query = gql`
    query ($organizationId: Int, $customerId: ID, $page: Int, $pageSize: Int) {
      orders(
        sort: "createdAt:desc"
        pagination: { page: $page, pageSize: $pageSize }
        filters: {
          organizationId: { eq: $organizationId }
          and: [{ notes: { ne: null } }, { notes: { ne: "" } }]
          customer: { id: { eq: $customerId } }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            code
            route {
              data {
                id
                attributes {
                  code
                  name
                }
              }
            }
            notes
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

  const { data, meta } = await fetcher<OrderInfo[]>(STRAPI_TOKEN_KEY, query, {
    organizationId,
    ...(customerId && { customerId }),
    page,
    pageSize,
  });
  return { data: data?.orders ?? [], meta };
};

/**
 * Imports orders from an array of imported order inputs.
 *
 * @param token - The authentication token.
 * @param params - The array of imported order inputs.
 * @returns The status and data of the import operation.
 */
export const importOrders = withActionExceptionHandler<ImportedOrderInputForm, number>(async (token, params) => {
  const { currentDate: today, customer, orderDate, deliveryDate, orders } = params;
  const currentDate = today || new Date();
  const organizationId = token.user.orgId ? Number(token.user.orgId) : Number(params.organizationId);

  let operationTimeout = 20000;
  if (100 * orders.length > operationTimeout) {
    operationTimeout = 100 * orders.length;
  }

  const startTimeOfBatch = Date.now();
  await prisma.$transaction(
    async (prisma) => {
      const childZones = new Map<string, number>();
      const parentZones = new Map<string, number>();

      for (const order of orders) {
        let childZoneId = order.deliveryPoint?.zone?.id;
        let parentZoneId = order.deliveryPoint?.zone?.parent?.id;

        if (!childZoneId && order.deliveryPoint?.zone?.name) {
          const childZoneName = ensureString(order.deliveryPoint?.zone?.name);
          if (childZones.has(childZoneName)) {
            childZoneId = childZones.get(childZoneName);
          } else {
            if (!parentZoneId && order.deliveryPoint?.zone?.parent?.name) {
              const parentZoneName = ensureString(order.deliveryPoint.zone.parent.name);
              if (parentZones.has(parentZoneName)) {
                parentZoneId = parentZones.get(parentZoneName);
              } else {
                const parentZone = await prisma.zone.create({
                  data: {
                    organizationId,
                    name: parentZoneName,
                    isActive: true,
                    createdAt: currentDate,
                    ZonesCreatedByUserLinks: {
                      create: {
                        userId: token.user.id,
                      },
                    },
                    updatedAt: currentDate,
                    ZonesUpdatedByUserLinks: {
                      create: {
                        userId: token.user.id,
                      },
                    },
                    publishedAt: currentDate,
                  },
                });
                parentZoneId = parentZone.id;
                parentZones.set(parentZoneName, parentZoneId);
              }
            }

            const childZone = await prisma.zone.create({
              data: {
                organizationId,
                name: childZoneName,
                isActive: true,
                createdAt: currentDate,
                ZonesCreatedByUserLinks: {
                  create: {
                    userId: token.user.id,
                  },
                },
                updatedAt: currentDate,
                ZonesUpdatedByUserLinks: {
                  create: {
                    userId: token.user.id,
                  },
                },
                publishedAt: currentDate,
              },
            });

            childZoneId = childZone.id;
            childZones.set(childZoneName, childZoneId);

            if (parentZoneId && childZoneId) {
              await prisma.zonesParentZonesLinks.create({
                data: { parentZoneId: Number(parentZoneId), zoneId: Number(childZoneId) },
              });
            }
          }
        }

        const createdOrder = await prisma.order.create({
          data: {
            organizationId,
            code: randomString(ORDER_CODE_MIN_LENGTH, true),
            weight: order.weight,
            // orderDate: fromZonedTime(orderDate, clientTimezone),
            orderDate: orderDate as Date,
            // deliveryDate: fromZonedTime(deliveryDate, clientTimezone),
            deliveryDate: deliveryDate || null,
            lastStatusType: OrderStatusType.NEW,
            isDraft: false,
            ...(order.cbm && { cbm: order.cbm }),
            ...(order.notes && { notes: order.notes }),
            ...((order.pickupTimeNotes || order.deliveryTimeNotes) && {
              meta: JSON.stringify({
                pickupTimeNotes: order.pickupTimeNotes,
                deliveryTimeNotes: order.deliveryTimeNotes,
              }),
            }),
            OrdersRouteLinks: {
              create: order.route?.id
                ? [
                    {
                      routeId: Number(order.route?.id),
                    },
                  ]
                : [
                    {
                      route: {
                        create: {
                          organizationId,
                          customerId: customer.id,
                          type: RouteType.FIXED,
                          isActive: true,
                          code: ensureString(order.deliveryPoint?.code),
                          name: ensureString(order.deliveryPoint?.name),
                          createdAt: currentDate,
                          RoutesCreatedByUserLinks: {
                            create: {
                              userId: token.user.id,
                            },
                          },
                          updatedAt: currentDate,
                          RoutesUpdatedByUserLinks: {
                            create: {
                              userId: token.user.id,
                            },
                          },
                          publishedAt: currentDate,
                          RoutesPickupPointsLinks: {
                            create: [
                              {
                                routePoint: {
                                  connectOrCreate: {
                                    where: {
                                      id: order.pickupPoint?.id ? Number(order.pickupPoint.id) : -1,
                                    },
                                    create: {
                                      organizationId,
                                      code: ensureString(order.pickupPoint?.code),
                                      name: ensureString(order.pickupPoint?.name),
                                      isActive: true,
                                      contactName: "",
                                      contactEmail: "",
                                      contactPhoneNumber: "",
                                      notes: "",
                                      RoutePointsAddressLinks: {
                                        create: {
                                          address: {
                                            create: {
                                              addressLine1: ensureString(order.pickupPoint?.addressLine1),
                                              createdAt: currentDate,
                                              AddressInformationsCreatedByUserLinks: {
                                                create: {
                                                  userId: token.user.id,
                                                },
                                              },
                                              updatedAt: currentDate,
                                              AddressInformationsUpdatedByUserLinks: {
                                                create: {
                                                  userId: token.user.id,
                                                },
                                              },
                                              publishedAt: currentDate,
                                            },
                                          },
                                        },
                                      },
                                      RoutePointsCreatedByUserLinks: {
                                        create: {
                                          userId: token.user.id,
                                        },
                                      },
                                      updatedAt: currentDate,
                                      RoutePointsUpdatedByUserLinks: {
                                        create: {
                                          userId: token.user.id,
                                        },
                                      },
                                      publishedAt: currentDate,
                                    },
                                  },
                                },
                              },
                            ],
                          },
                          RoutesDeliveryPointsLinks: {
                            connectOrCreate: [
                              {
                                where: {
                                  routePointId: order.deliveryPoint?.id ? Number(order.deliveryPoint.id) : -1,
                                },
                                create: {
                                  routePoint: {
                                    create: {
                                      organizationId,
                                      code: ensureString(order.deliveryPoint?.code),
                                      name: ensureString(order.deliveryPoint?.name),
                                      isActive: true,
                                      contactName: "",
                                      contactEmail: "",
                                      contactPhoneNumber: "",
                                      notes: "",
                                      ...(childZoneId && {
                                        RoutePointsZoneLinks: {
                                          create: { zoneId: Number(childZoneId) },
                                        },
                                      }),
                                      RoutePointsAddressLinks: {
                                        create: {
                                          address: {
                                            create: {
                                              addressLine1: ensureString(order.deliveryPoint?.addressLine1),
                                              createdAt: currentDate,
                                              AddressInformationsCreatedByUserLinks: {
                                                create: {
                                                  userId: token.user.id,
                                                },
                                              },
                                              updatedAt: currentDate,
                                              AddressInformationsUpdatedByUserLinks: {
                                                create: {
                                                  userId: token.user.id,
                                                },
                                              },
                                              publishedAt: currentDate,
                                            },
                                          },
                                        },
                                      },
                                      RoutePointsCreatedByUserLinks: {
                                        create: {
                                          userId: token.user.id,
                                        },
                                      },
                                      updatedAt: currentDate,
                                      RoutePointsUpdatedByUserLinks: {
                                        create: {
                                          userId: token.user.id,
                                        },
                                      },
                                      publishedAt: currentDate,
                                    },
                                  },
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                  ],
            },
            OrdersUnitOfMeasureLinks: {
              create: {
                unitOfMeasureId: order.unitOfMeasure?.id ? Number(order.unitOfMeasure.id) : -1,
              },
            },
            OrdersCustomerLinks: {
              create: {
                customerId: customer?.id ? Number(customer.id) : -1,
              },
            },
            OrdersParticipantsLinks: {
              create: [
                {
                  orderParticipant: {
                    create: {
                      organizationId,
                      role: OrderParticipantRole.OWNER,
                      createdAt: currentDate,
                      OrderParticipantsUserLinks: {
                        create: {
                          userId: token.user.id,
                        },
                      },
                      OrderParticipantsCreatedByUserLinks: {
                        create: {
                          userId: token.user.id,
                        },
                      },
                      updatedAt: currentDate,
                      OrderParticipantsUpdatedByUserLinks: {
                        create: {
                          userId: token.user.id,
                        },
                      },
                      publishedAt: currentDate,
                    },
                  },
                },
              ],
            },
            OrderItemsOrderLinks: {
              create: (order.items || []).map((item) => ({
                orderItem: {
                  create: {
                    organizationId,
                    name: ensureString(item.name),
                    quantity: item.quantity,
                    createdAt: currentDate,
                    updatedAt: currentDate,
                    publishedAt: currentDate,
                  },
                },
              })),
            },
            OrderStatusesOrderLinks: {
              create: [
                {
                  orderStatus: {
                    create: {
                      organizationId,
                      type: OrderStatusType.NEW,
                      createdAt: currentDate,
                      OrderStatusesCreatedByUserLinks: {
                        create: {
                          userId: token.user.id,
                        },
                      },
                      updatedAt: currentDate,
                      OrderStatusesUpdatedByUserLinks: {
                        create: {
                          userId: token.user.id,
                        },
                      },
                      publishedAt: currentDate,
                    },
                  },
                },
              ],
            },
            createdAt: currentDate,
            OrdersCreatedByUserLinks: {
              create: {
                userId: token.user.id,
              },
            },
            updatedAt: currentDate,
            OrdersUpdatedByUserLinks: {
              create: {
                userId: token.user.id,
              },
            },
            publishedAt: currentDate,
          },
        });

        const participant = await prisma.ordersParticipantsLinks.findFirst({ where: { orderId: createdOrder.id } });
        if (participant) {
          await prisma.orderParticipant.update({
            where: { id: participant.orderParticipantId },
            data: { orderId: createdOrder.id },
          });
        }
      }
    },
    {
      maxWait: operationTimeout,
      timeout: operationTimeout,
    }
  );

  const duration = ((Date.now() - startTimeOfBatch) / 1000).toFixed(2);
  logger.info(`Imported ${orders.length} records in ${duration}s`);

  return {
    status: HttpStatusCode.Ok,
    data: orders.length,
  };
});

export const deleteOrders = withActionExceptionHandler<DeleteOrdersForm, number>(async (token, params) => {
  const { orgId } = token.user;
  const { orderIds } = params;

  const result = await prisma.$transaction(async (prisma) => {
    const response = await prisma.order.updateMany({
      where: { organizationId: orgId, id: { in: orderIds } },
      data: { publishedAt: null, updatedAt: new Date() },
    });

    await prisma.ordersUpdatedByUserLinks.updateMany({
      where: { orderId: { in: orderIds } },
      data: { userId: token.user.id },
    });

    return response.count;
  });

  return {
    status: HttpStatusCode.Ok,
    data: result,
  };
});
