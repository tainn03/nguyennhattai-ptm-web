import {
  DriverExpenseType,
  NotificationType,
  OrderStatusType,
  OrderTripStatusType,
  OrganizationRoleType,
  Prisma,
} from "@prisma/client";
import { gql } from "graphql-request";

import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { prisma, PrismaClientTransaction } from "@/configs/prisma";
import {
  DateTimeDisplayType,
  OrganizationSettingExtendedKey,
  ReportCalculationDateFlag,
} from "@/constants/organizationSettingExtended";
import { ORDER_TRIP_BILL_OF_LADING_IMAGES_FIELD, ORDER_TRIP_RELATED_TYPE } from "@/constants/relatedType";
import { OrderTripInputForm, UpdateBillOfLadingForm } from "@/forms/orderTrip";
import { createOrderStatus } from "@/services/server/orderStatus";
import { getOrganizationMemberByMemberId } from "@/services/server/organizationMember";
import { createTripDriverExpense } from "@/services/server/tripDriverExpense";
import { AnyObject } from "@/types";
import { OrderInProgressNotification } from "@/types/notification";
import { DriverPaidTripReport, IndividualDriverSalaryParams } from "@/types/report";
import { OrderTripInfo, RouteInfo } from "@/types/strapi";
import { convertEndOfDayString, convertStartOfDayString } from "@/utils/date";
import { fetcher } from "@/utils/graphql";
import { pushNotification } from "@/utils/notification";
import { transformObject } from "@/utils/object";
import { generateOrderTripCode } from "@/utils/order";
import { ensureString, trim } from "@/utils/string";

/**
 * Checks if a order trip code exists within an organization, optionally excluding a specific order trip ID.
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client for database access.
 * @param {number} organizationId - The ID of the organization to search within.
 * @param {string} code - The order trip code to check for.
 * @param {number | undefined} excludeId - (Optional) The ID of a order trip to exclude from the check.
 * @returns {Promise<boolean>} A promise that resolves to true if the order trip code exists, otherwise false.
 */
export const checkOrderTripCodeExists = async (
  prisma: PrismaClientTransaction,
  organizationId: number,
  code: string,
  excludeId?: number
): Promise<boolean> => {
  const result = await prisma.orderTrip.findFirst({
    where: {
      organizationId,
      code,
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });

  return !!result?.id;
};

/**
 * Get the sequence number of the order trip.
 * This function counts the number of order trip links associated with a specific order.
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client transaction object.
 * @param {number} orderId - The ID of the order.
 * @returns {Promise<number>} - A promise that resolves to the sequence number of the order trip.
 */
export const getOrderTripSequence = async (prisma: PrismaClientTransaction, orderId: number): Promise<number> => {
  const result = await prisma.orderTripsOrderLinks.count({ where: { orderId } });
  return result;
};

/**
 * This function creates a new order trip with the provided details, and links it to the relevant entities.
 * It also generates a unique order trip code, and creates an order status record if this is the first order trip.
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client transaction object.
 * @param {Partial<OrderTripInputForm>} entity - The details of the order trip to create.
 * @param {string} jwt - The JSON Web Token for authentication.
 *
 * @returns {Promise<string | undefined>} - A promise that resolves to the code of the created order trip.
 */
export const createOrderTrip = async (
  prisma: PrismaClientTransaction,
  entity: Partial<OrderTripInputForm>,
  jwt: string,
  route: RouteInfo | null,
  { isPushOrderInProgressNotification = true }: { isPushOrderInProgressNotification?: boolean } = {}
): Promise<string | undefined> => {
  const {
    organizationId,
    order,
    vehicle,
    driver,
    orderTripCount,
    fullName,
    driverReportId,
    createdById,
    isUseRouteDriverExpenses,
    driverExpenseRate,
    ...otherEntities
  } = trim(entity);

  let orderTripCode: string;
  let isCodeExists: boolean;
  let orderTripSequence = 0;
  orderTripSequence = await getOrderTripSequence(prisma, Number(order?.id));
  do {
    orderTripSequence++;
    orderTripCode = generateOrderTripCode(ensureString(order?.code), orderTripSequence);
    isCodeExists = await checkOrderTripCodeExists(prisma, Number(organizationId), orderTripCode);
  } while (isCodeExists);

  const createdOrderResult = await prisma.orderTrip.create({
    data: {
      ...(otherEntities as Prisma.OrderTripCreateInput),
      organizationId: Number(organizationId),
      code: ensureString(orderTripCode),
      lastStatusType: OrderTripStatusType.NEW,
      ...(isUseRouteDriverExpenses && route?.bridgeToll && { bridgeToll: route.bridgeToll }),
      ...(isUseRouteDriverExpenses && route?.subcontractorCost && { subcontractorCost: route.subcontractorCost }),
      ...(isUseRouteDriverExpenses && route?.otherCost && { otherCost: route.otherCost }),
      publishedAt: new Date(),
    },
  });

  const orderTripId = createdOrderResult.id;
  if (isUseRouteDriverExpenses && route?.driverExpenses && route.driverExpenses.length > 0) {
    let driverExpenseOrder = 0;
    let driverCost = 0;
    for (const item of route.driverExpenses) {
      let amount = item.amount;
      if (item.driverExpense?.type === DriverExpenseType.DRIVER_COST && item.amount && driverExpenseRate) {
        amount = (item.amount * driverExpenseRate) / 100;
      }
      driverCost += amount || 0;
      const tripDriverExpenseId = await createTripDriverExpense(prisma, { organizationId, amount });
      await prisma.tripDriverExpensesDriverExpenseLinks.create({
        data: { driverExpenseId: Number(item.driverExpense?.id), tripDriverExpenseId },
      });
      await prisma.tripDriverExpensesTripLinks.create({
        data: {
          orderTripId,
          tripDriverExpenseId,
          tripDriverExpenseOrder: driverExpenseOrder++,
        },
      });
    }
    await prisma.orderTrip.update({ where: { id: orderTripId }, data: { driverCost } });
  }

  const createdOrderTripStatusResult = await prisma.orderTripStatus.create({
    data: {
      type: OrderTripStatusType.NEW,
      publishedAt: new Date(),
      organizationId: Number(organizationId),
    },
  });

  const orderTripStatusId = createdOrderTripStatusResult.id;
  await prisma.orderTripStatusesTripLinks.create({ data: { orderTripStatusId, orderTripId, orderTripStatusOrder: 1 } });

  await prisma.orderTripStatusesDriverReportLinks.create({
    data: { orderTripStatusId, driverReportId: Number(driverReportId) },
  });

  await prisma.orderTripsOrderLinks.create({
    data: { orderTripId, orderId: Number(order?.id), orderTripOrder: orderTripCount || 1 },
  });

  if (vehicle?.id) {
    await prisma.orderTripsVehicleLinks.create({ data: { orderTripId, vehicleId: Number(vehicle.id) } });
  }

  if (driver?.id) {
    await prisma.orderTripsDriverLinks.create({ data: { orderTripId, driverId: Number(driver.id) } });
  }

  await prisma.orderTripsCreatedByUserLinks.create({ data: { orderTripId, userId: Number(createdById) } });
  await prisma.orderTripsUpdatedByUserLinks.create({ data: { orderTripId, userId: Number(createdById) } });
  await prisma.orderTripStatusesCreatedByUserLinks.create({ data: { orderTripStatusId, userId: Number(createdById) } });
  await prisma.orderTripStatusesUpdatedByUserLinks.create({ data: { orderTripStatusId, userId: Number(createdById) } });

  // Create an order status record if this is the first order trip
  const currentOrder = await prisma.order.findFirst({
    where: { id: Number(order?.id), organizationId: Number(organizationId) },
    select: { id: true, lastStatusType: true },
  });

  if (currentOrder?.lastStatusType === OrderStatusType.RECEIVED) {
    const orderStatusId = await createOrderStatus(prisma, {
      organizationId: Number(organizationId),
      type: OrderStatusType.IN_PROGRESS,
      order: { id: Number(order?.id) },
      createdById,
    });

    await prisma.orderStatusesOrderLinks.create({
      data: { orderStatusId, orderId: Number(order?.id), orderStatusOrder: 3 },
    });

    if (isPushOrderInProgressNotification) {
      // Send notification
      const notificationData: OrderInProgressNotification = {
        orderCode: ensureString(order?.code),
        fullName: ensureString(fullName),
        orderStatus: OrderStatusType.IN_PROGRESS,
      };

      pushNotification({
        entity: {
          type: NotificationType.ORDER_STATUS_CHANGED,
          targetId: Number(order?.id),
          organizationId,
          createdById,
        },
        data: notificationData,
        orgMemberRoles: [OrganizationRoleType.MANAGER, OrganizationRoleType.ACCOUNTANT],
        jwt,
      });
    }
  }

  return orderTripCode;
};

/**
 * Checks if a order trip has been updated since a specified date.
 *
 * @param jwt - The JWT of the user making the request.
 * @param organizationId - The ID of the organization to which the order trip belongs.
 * @param id - The ID of the order trip to check.
 * @param lastUpdatedAt - The date to compare against the order trip's last updated timestamp.
 * @returns A promise that resolves to true if the order trip has been updated, otherwise false.
 */
export const checkOrderTripExclusives = async (
  jwt: string,
  organizationId: number,
  id: number,
  lastUpdatedAt?: Date | string
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

  const { data } = await fetcher<OrderTripInfo[]>(jwt, query, {
    id,
    organizationId,
  });

  return data.orderTrips[0].updatedAt !== lastUpdatedAt;
};

/**
 * Updates an existing order trip record based on the provided entity data.
 *
 * @param prisma - The Prisma client for database access.
 * @param entity - The data for updating an existing order trip record, including the ID.
 * @returns A promise that resolves to the ID of the updated order trip record.
 */
export const updateOrderTrip = async (
  prisma: PrismaClientTransaction,
  entity: OrderTripInputForm
): Promise<string | null | undefined> => {
  const { id, code, organizationId: _, vehicle, driver, updatedById, ...otherEntities } = trim(entity);
  const orderTripId = Number(id);

  const userId = Number(updatedById);

  await prisma.orderTrip.update({
    where: { id: orderTripId },
    data: {
      ...(otherEntities as Prisma.OrderTripUpdateManyMutationInput),

      ...(vehicle?.id && {
        OrderTripsVehicleLinks: {
          update: {
            where: { orderTripId },
            data: { vehicleId: Number(vehicle.id) },
          },
        },
      }),

      ...(driver?.id && {
        OrderTripsDriverLinks: {
          update: {
            where: { orderTripId },
            data: { driverId: Number(driver.id) },
          },
        },
      }),

      OrderTripsUpdatedByUserLinks: {
        connectOrCreate: {
          where: { orderTripId },
          create: { userId },
        },
      },
    },
  });

  return code;
};

/**
 * Update bill of lading
 *
 * @param {PrismaClientTransaction} prisma - The Prisma client for database access.
 * @param {UpdateStatusInputForm} entity - The data for updating an existing order trip record, including the ID.
 * @returns {Promise<OrderTripInfo | undefined>} A promise that resolves to the ID of the updated order trip record.
 */
export const updateBillOfLading = async (
  prisma: PrismaClientTransaction,
  entity: Omit<UpdateBillOfLadingForm, "locale">
): Promise<number | undefined> => {
  const { id, organizationId, billOfLading, billOfLadingImageIds, updatedById, deleteImage, billOfLadingReceived } =
    trim(entity);
  const orderTripId = Number(id);
  const userId = Number(updatedById);

  await prisma.orderTrip.update({
    where: { id: orderTripId, organizationId: Number(organizationId) },
    data: {
      billOfLading,
      billOfLadingReceived,
      billOfLadingReceivedDate: new Date(),
      OrderTripsUpdatedByUserLinks: {
        connectOrCreate: {
          where: { orderTripId },
          create: { userId },
        },
      },
    },
  });

  if (deleteImage) {
    await prisma.filesRelatedMorphs.deleteMany({ where: { fileId: { in: deleteImage } } });
  }

  if (billOfLadingImageIds && billOfLadingImageIds.length > 0) {
    for (const [index, fileId] of billOfLadingImageIds.entries()) {
      await prisma.filesRelatedMorphs.create({
        data: {
          fileId: Number(fileId),
          relatedId: orderTripId,
          relatedType: ORDER_TRIP_RELATED_TYPE,
          field: ORDER_TRIP_BILL_OF_LADING_IMAGES_FIELD,
          order: index,
        },
      });
    }
  }

  return orderTripId;
};

/**
 * Retrieves reminder trips for bill of lading based on specified criteria.
 * @param {string} reminderDate - The reminder date to filter the trips
 * @returns {Promise<OrderTripInfo[]>} A promise that resolves to an array of order trips that meet the criteria
 */
export const getReminderTripsForBillOfLading = async (reminderDate: Date | string): Promise<OrderTripInfo[]> => {
  const query = gql`
    query ($reminderDate: DateTime, $deliveredType: String) {
      orderTrips(
        pagination: { limit: -1 }
        filters: {
          lastStatusType: { eq: $deliveredType }
          statuses: { createdAt: { gte: $reminderDate }, type: { eq: $deliveredType } }
          or: [{ billOfLadingReceived: { eq: false } }, { billOfLadingReceived: { eq: null } }]
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            organizationId
            code
            deliveryDate
            lastStatusType
            statuses(filters: { type: { eq: $deliveredType } }) {
              data {
                attributes {
                  type
                  createdAt
                }
              }
            }
            driver {
              data {
                id
                attributes {
                  firstName
                  lastName
                  user {
                    data {
                      id
                    }
                  }
                }
              }
            }
            order {
              data {
                attributes {
                  code
                  route {
                    data {
                      attributes {
                        minBOLSubmitDays
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

  const { data } = await fetcher<OrderTripInfo[]>(STRAPI_TOKEN_KEY, query, {
    reminderDate: convertStartOfDayString(reminderDate),
    deliveredType: OrderTripStatusType.DELIVERED,
  });

  return data?.orderTrips ?? [];
};

/**
 * Fetches paid trips for a specific driver within a given date range.
 *
 * @param {IndividualDriverSalaryParams} params - The parameters for fetching paid trips.
 * @returns {Promise<DriverPaidTripReport[]>} - A promise that resolves to an array of trip details.
 */
export const getDriverPaidTrips = async (params: IndividualDriverSalaryParams) => {
  const { startDate, endDate, organizationId, driverReportIds, driverId } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`otdl.driver_id = ${driverId}`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`ot.bill_of_lading IS NOT NULL`);
  searchConditions.push(Prisma.sql`ot.bill_of_lading <> ''`);

  const reportCalculationDateFlag = await getOrganizationSettingExtended({
    organizationId,
    key: OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
  });

  let sortColumn = Prisma.sql(["start_date"]);
  const sortOrder = Prisma.sql(["asc"]);

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.TRIP_PICKUP_DATE:
      searchConditions.push(Prisma.sql`ot.pickup_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.pickup_date <= ${endDate}`);
      sortColumn = Prisma.sql(["pickup_date"]);
      break;
    case ReportCalculationDateFlag.TRIP_DELIVERY_DATE:
      searchConditions.push(Prisma.sql`ot.delivery_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.delivery_date <= ${endDate}`);
      sortColumn = Prisma.sql(["delivery_date"]);
      break;
  }

  const query = Prisma.sql`
WITH waiting_for_pickup_order AS (
  SELECT display_order
  FROM driver_reports
  WHERE type = 'WAITING_FOR_PICKUP'
    AND organization_id = ${organizationId}
),
delivered_order AS (
  SELECT display_order
  FROM driver_reports
  WHERE type = 'DELIVERED'
    AND organization_id = ${organizationId}
),
latest_statuses AS (
  SELECT
    ot.id,
    ot.code,
    ot.pickup_date,
    ot.delivery_date,
    ot.weight,
    r.id AS route_id,
    r.code AS route_code,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.display_order
  FROM order_trip_statuses ots
  JOIN order_trip_statuses_trip_links otstl
    ON ots.id = otstl.order_trip_status_id
  JOIN order_trips ot
    ON otstl.order_trip_id = ot.id
  JOIN order_trip_statuses_driver_report_links otsdrl
    ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
    ON otsdrl.driver_report_id = dr.id
  JOIN order_trips_driver_links otdl
    ON ot.id = otdl.order_trip_id
  JOIN order_trips_order_links otol
    ON ot.id = otol.order_trip_id
  JOIN orders_route_links orl
    ON otol.order_id = orl.order_id
  JOIN routes r
    ON orl.route_id = r.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
filtered_trips AS (
  SELECT
    ls.id,
    ls.code,
    ls.pickup_date,
    ls.delivery_date,
    ls.weight,
    ls.route_id,
    ls.route_code,
    u.code as unit,
    COALESCE(
      CASE
        WHEN ls.display_order < (SELECT display_order FROM waiting_for_pickup_order) THEN ls.pickup_date
        WHEN ls.display_order = (SELECT display_order FROM waiting_for_pickup_order) THEN ls.created_at
        ELSE (
          SELECT created_at
          FROM order_trip_statuses ots2
          JOIN order_trip_statuses_trip_links otstl2
            ON ots2.id = otstl2.order_trip_status_id
          WHERE otstl2.order_trip_id = ls.id
            AND ots2.type = 'WAITING_FOR_PICKUP'
          ORDER BY ots2.created_at DESC
          LIMIT 1
        )
      END,
      ls.pickup_date
    ) AS start_date,
    CASE
        WHEN ls.display_order < (SELECT display_order FROM delivered_order) THEN ls.delivery_date
        ELSE ls.created_at
    END AS end_date,
    IFNULL(SUM(tde.amount), 0) AS driverCost
  FROM latest_statuses ls
  LEFT JOIN trip_driver_expenses_trip_links tdetl
    ON ls.id = tdetl.order_trip_id
  LEFT JOIN trip_driver_expenses tde
    ON tdetl.trip_driver_expense_id = tde.id AND tde.organization_id = ${organizationId}
  JOIN order_trips_order_links otol
    ON ls.id = otol.order_trip_id
  JOIN orders o
    ON otol.order_id = o.id
  LEFT JOIN orders_unit_links oul
    ON o.id = oul.order_id
  LEFT JOIN unit_of_measures u
    ON oul.unit_of_measure_id = u.id AND u.organization_id = ${organizationId}
  WHERE
    ls.rn = 1
    AND o.organization_id = ${organizationId}
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
  GROUP BY
      ls.id,
      ls.code,
      ls.pickup_date,
      ls.delivery_date,
      ls.weight,
      ls.route_id,
      ls.route_code,
      u.code,
      start_date,
      end_date
)
SELECT * FROM filtered_trips
${
  !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
    ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
    : Prisma.empty
}
ORDER BY ${sortColumn} ${sortOrder};
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<DriverPaidTripReport>(data) : ([] as DriverPaidTripReport[]);
};

export const deprecatedGetDriverPaidTrips = async (params: IndividualDriverSalaryParams) => {
  const { organizationId, driverReportIds, driverId } = params;
  const startDate = convertStartOfDayString(params.startDate);
  const endDate = convertEndOfDayString(params.endDate);

  const query = Prisma.sql`
WITH delivered_order AS (
    SELECT display_order
    FROM driver_reports
    WHERE type = 'DELIVERED'
      AND organization_id = ${organizationId}
),
latest_statuses AS (
  SELECT
    ot.id,
    ot.code,
    ot.pickup_date,
    ot.delivery_date,
    ot.weight,
    r.id AS route_id,
    r.code AS route_code,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.display_order
  FROM order_trip_statuses ots
  JOIN order_trip_statuses_trip_links otstl
    ON ots.id = otstl.order_trip_status_id
  JOIN order_trips ot
    ON otstl.order_trip_id = ot.id
  JOIN order_trip_statuses_driver_report_links otsdrl
    ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
    ON otsdrl.driver_report_id = dr.id
  JOIN order_trips_driver_links otdl
    ON ot.id = otdl.order_trip_id
  JOIN order_trips_order_links otol
    ON ot.id = otol.order_trip_id
  JOIN orders_route_links orl
    ON otol.order_id = orl.order_id
  JOIN routes r
    ON orl.route_id = r.id
  WHERE ots.organization_id = ${organizationId}
    AND ot.organization_id = ${organizationId}
    AND ot.bill_of_lading IS NOT NULL
    AND ot.bill_of_lading <> ''
    AND dr.organization_id = ${organizationId}
    AND r.organization_id = ${organizationId}
    AND ot.published_at IS NOT NULL
    AND otdl.driver_id = ${driverId}
    AND ots.created_at >= ${startDate}
    AND ots.created_at <= ${endDate}
)
SELECT
  ls.id,
  ls.code,
  CASE
      WHEN ls.display_order < (SELECT display_order FROM delivered_order) THEN ls.delivery_date
      ELSE ls.created_at
  END AS end_date,
  ls.weight,
  u.code as unit,
  IFNULL(SUM(tde.amount), 0) AS driverCost,
  ls.route_id,
  ls.route_code
FROM latest_statuses ls
LEFT JOIN trip_driver_expenses_trip_links tdetl
  ON ls.id = tdetl.order_trip_id
LEFT JOIN trip_driver_expenses tde
  ON tdetl.trip_driver_expense_id = tde.id AND tde.organization_id = ${organizationId}
JOIN order_trips_order_links otol
  ON ls.id = otol.order_trip_id
JOIN orders o
  ON otol.order_id = o.id
LEFT JOIN orders_unit_links oul
  ON o.id = oul.order_id
LEFT JOIN unit_of_measures u
  ON oul.unit_of_measure_id = u.id AND u.organization_id = ${organizationId}
WHERE ls.rn = 1
  AND o.organization_id = ${organizationId}
  AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
GROUP BY
    ls.id,
    ls.code,
    end_date,
    ls.weight,
    u.code,
    ls.route_id,
    ls.route_code
ORDER BY end_date DESC;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<DriverPaidTripReport>(data) : ([] as DriverPaidTripReport[]);
};

/**
 * Retrieves the driver ID associated with a given order trip ID.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {number} orderTripId - The ID of the order trip.
 * @returns {Promise<number | undefined>} A promise that resolves to the driver ID or undefined if not found.
 */
export const getDriverIdByOrderTripId = async (jwt: string, orderTripId: number): Promise<number | undefined> => {
  const query = gql`
    query ($id: ID!) {
      orderTrips(filters: { id: { eq: $id } }) {
        data {
          id
          attributes {
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
    }
  `;

  const { data } = await fetcher<OrderTripInfo[]>(jwt, query, { id: Number(orderTripId) });
  return data?.orderTrips?.[0]?.driver?.user?.id;
};

/**
 * Asynchronously retrieves detailed order trip data for a specified organization and order code - Sharing.
 *
 * @param {number} organizationId - The unique identifier of the organization to which the order belongs.
 * @param {string} tripCode - The unique code identifying the specific order trip to be retrieved.
 * @returns {Promise<OrderTripInfo | undefined>} A promise that resolves to the first order data matching the criteria,
 * or undefined if no such order exists.
 **/
export const getOrderTripData = async (organizationId: number, tripCode: string, isShareMap: boolean) => {
  const query = gql`
    query ($organizationId: Int!, $code: String!, $cancelType: String, $isShareMap: Boolean!) {
      orderTrips(
        filters: {
          lastStatusType: { ne: $cancelType }
          order: { isDraft: { ne: true } }
          code: { eq: $code }
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            code
            order {
              data {
                attributes {
                  code
                  unit {
                    data {
                      attributes {
                        code
                        name
                      }
                    }
                  }
                  customer {
                    data {
                      attributes {
                        name
                      }
                    }
                  }
                  route {
                    data {
                      attributes {
                        name
                        code
                        type
                        pickupPoints(sort: "displayOrder:asc", pagination: { limit: -1 }) {
                          data {
                            attributes {
                              name
                              code
                              contactName
                              contactPhoneNumber
                              displayOrder
                              address {
                                data {
                                  attributes {
                                    country {
                                      data {
                                        attributes {
                                          name
                                          code
                                        }
                                      }
                                    }
                                    city {
                                      data {
                                        attributes {
                                          name
                                          code
                                        }
                                      }
                                    }
                                    district {
                                      data {
                                        attributes {
                                          name
                                          code
                                        }
                                      }
                                    }
                                    ward {
                                      data {
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
                            attributes {
                              name
                              code
                              contactName
                              contactPhoneNumber
                              displayOrder
                              address {
                                data {
                                  attributes {
                                    country {
                                      data {
                                        attributes {
                                          name
                                          code
                                        }
                                      }
                                    }
                                    city {
                                      data {
                                        attributes {
                                          name
                                          code
                                        }
                                      }
                                    }
                                    district {
                                      data {
                                        attributes {
                                          name
                                          code
                                        }
                                      }
                                    }
                                    ward {
                                      data {
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
                  merchandiseTypes(pagination: { limit: -1 }) {
                    data {
                      attributes {
                        name
                      }
                    }
                  }
                  merchandiseNote
                  participants(filters: { role: { eq: "OWNER" } }) {
                    data {
                      attributes {
                        user {
                          data {
                            id
                            attributes {
                              detail {
                                data {
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
              }
            }
            vehicle {
              data {
                attributes {
                  vehicleNumber
                  vehicleTracking @include(if: $isShareMap) {
                    data {
                      attributes {
                        longitude
                        latitude
                        updatedAt
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
                  email
                  phoneNumber
                }
              }
            }
            weight
            pickupDate
            deliveryDate
            notes
            statuses(sort: "createdAt:asc", pagination: { limit: -1 }, filters: { type: { ne: null } }) {
              data {
                attributes {
                  type
                  createdAt
                }
              }
            }
            messages(
              sort: "createdAt:desc"
              pagination: { limit: 1 }
              filters: { latitude: { ne: null }, longitude: { ne: null } }
            ) @include(if: $isShareMap) {
              data {
                attributes {
                  latitude
                  longitude
                  createdAt
                }
              }
            }
            lastStatusType
          }
        }
      }
    }
  `;
  const { data } = await fetcher<OrderTripInfo[]>(STRAPI_TOKEN_KEY, query, {
    organizationId,
    code: tripCode,
    cancelType: OrderStatusType.CANCELED,
    isShareMap,
  });

  const orderTripData = data?.orderTrips[0] || null;

  // Get organization email
  const orderData = orderTripData?.order || null;

  if (orderData.participants?.length) {
    // Check if participants (only have 1 record is order owner) is exist
    const member = orderData.participants[0].user || null;
    if (orderData && member?.id) {
      const orgMember = await getOrganizationMemberByMemberId(organizationId, member.id);
      if (orgMember) {
        member.phoneNumber = orgMember.phoneNumber;
        member.email = orgMember.email;
        const { id: _, ...otherProps } = member;
        orderData.participants[0].user = otherProps;
      }
    }
  }

  const orgSettingExtended = await getOrganizationSettingExtended<string>({
    organizationId,
    key: OrganizationSettingExtendedKey.ORGANIZATION_ORDER_RELATED_DATE_FORMAT,
  });
  const organizationOrderRelatedDateFormat = orgSettingExtended || DateTimeDisplayType.DATE;
  return {
    ...orderTripData,
    organizationOrderRelatedDateFormat,
  };
};
