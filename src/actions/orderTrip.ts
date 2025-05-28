"use server";

import { OrderStatusType, OrderTripStatusType, Prisma, VehicleOwnerType } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";
import { toZonedTime } from "date-fns-tz/toZonedTime";
import { gql } from "graphql-request";
import moment from "moment";

import { getOrganizationSettingExtended, getOrganizationSettingsExtended } from "@/actions/organizationSettingExtended";
import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { prisma } from "@/configs/prisma";
import {
  MonthlyBOLDuplicateCheckStartDayValue,
  OrganizationSettingExtendedKey,
  ReportCalculationDateFlag,
} from "@/constants/organizationSettingExtended";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { OrderTripInputForm } from "@/forms/orderTrip";
import { AnyObject } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { GraphQLResult } from "@/types/graphql";
import {
  CustomerPaidTrip,
  CustomerPaidTripReport,
  DriverPaidTrip,
  DriverPaidTripReport,
  IndividualCustomerStatisticParams,
  IndividualDriverSalaryParams,
  IndividualSubcontractorCostParams,
  IndividualSubcontractorCostReportParams,
  SubcontractorPaidTrip,
  SubcontractorPaidTripReport,
  TripDetailReport,
  TripReportOverView,
  TripReportQueryParams,
} from "@/types/report";
import { OrderInfo, OrderTripInfo } from "@/types/strapi";
import { endOfDay, startOfDay } from "@/utils/date";
import { fetcher } from "@/utils/graphql";
import { createTranslator } from "@/utils/locale";
import { isNumeric } from "@/utils/number";
import { transformObject } from "@/utils/object";
import { getServerToken, withActionExceptionHandler } from "@/utils/server";
import { isTrue, trim } from "@/utils/string";

/**
 * Fetches paid trips for a specific driver within a given date range.
 *
 * @param {IndividualDriverSalaryParams} params - The parameters for fetching paid trips.
 * @returns {Promise<DriverPaidTrip[]>} - A promise that resolves to an array of trip details.
 */
export const driverPaidTripsFetcher = async (params: IndividualDriverSalaryParams) => {
  const { organizationId, driverReportIds, driverId, startDate, endDate } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`otdl.driver_id = ${driverId}`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);

  const reportCalculationDateFlag = await getOrganizationSettingExtended<string>({
    organizationId,
    key: OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
  });

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.TRIP_PICKUP_DATE:
      searchConditions.push(Prisma.sql`ot.pickup_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.pickup_date <= ${endDate}`);
      break;
    case ReportCalculationDateFlag.TRIP_DELIVERY_DATE:
      searchConditions.push(Prisma.sql`ot.delivery_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.delivery_date <= ${endDate}`);
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
    ot.bill_of_lading,
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    r.id AS route_id,
    r.code AS route_code,
    r.name AS route_name,
    ots.type AS status,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.name AS driver_report_name,
    dr.type AS driver_report_type,
    dr.display_order,
    IFNULL(SUM(a.amount), 0) AS advance_total_cost
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
    JOIN orders o
      ON otol.order_id = o.id
    JOIN orders_customer_links ocl
      ON o.id = ocl.order_id
    JOIN customers c
      ON ocl.customer_id = c.id
    JOIN orders_route_links orl
      ON o.id = orl.order_id
    JOIN routes r
      ON orl.route_id = r.id
    LEFT JOIN advances_order_trip_links aotl
      ON ot.id = aotl.order_trip_id
    LEFT JOIN advances a
      ON aotl.advance_id = a.id
      AND a.organization_id = ${organizationId}
      AND a.payment_date >= ${startDate}
      AND a.payment_date <= ${endDate}
      AND a.status = 'PAYMENT'
      AND a.type = 'DRIVER'
      AND a.advance_type = 'COST'
    WHERE
      ${Prisma.join(searchConditions, " AND ")}
    GROUP BY
      ot.id,
      ot.code,
      ot.pickup_date,
      ot.delivery_date,
      ot.bill_of_lading,
      c.id,
      c.code,
      c.name,
      r.id,
      r.code,
      r.name,
      ots.type,
      ots.created_at,
      dr.id,
      dr.name,
      dr.type,
      dr.display_order
),
filtered_trips AS (
  SELECT
    ls.id,
    ls.code,
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
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    IFNULL(SUM(tde.amount), 0) AS driverCost,
    o.id AS order_id,
    o.code AS order_code,
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.advance_total_cost
  FROM latest_statuses ls
  LEFT JOIN trip_driver_expenses_trip_links tdetl
    ON ls.id = tdetl.order_trip_id
  LEFT JOIN trip_driver_expenses tde
    ON tdetl.trip_driver_expense_id = tde.id AND tde.organization_id = ${organizationId}
  JOIN order_trips_order_links otol
    ON ls.id = otol.order_trip_id
  JOIN orders o
    ON otol.order_id = o.id
  WHERE ls.rn = 1
    AND o.organization_id = ${organizationId}
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
  GROUP BY
    ls.id,
    ls.code,
    start_date,
    end_date,
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    o.id,
    o.code,
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.advance_total_cost
)
SELECT * FROM filtered_trips
${
  !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
    ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
    : Prisma.empty
}
ORDER BY pickup_date;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<DriverPaidTrip>(data) : ([] as DriverPaidTrip[]);
};

/**
 * Fetches paid trips for a specific driver within a given date range.
 *
 * @param {IndividualDriverSalaryParams} params - The parameters for fetching paid trips.
 * @returns {Promise<DriverPaidTripReport[]>} - A promise that resolves to an array of trip details.
 */
export const getDriverPaidTrips = async (params: IndividualDriverSalaryParams) => {
  const { organizationId, driverReportIds, driverId, startDate, endDate } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`otdl.driver_id = ${driverId}`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);

  const orgSettingExtended = await getOrganizationSettingsExtended(organizationId, [
    OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
    OrganizationSettingExtendedKey.INCLUDE_ORDER_META_IN_REPORTS,
  ]);

  const reportCalculationDateFlag = orgSettingExtended?.[OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG];
  const includeOrderMetaInReports = isTrue(
    orgSettingExtended?.[OrganizationSettingExtendedKey.INCLUDE_ORDER_META_IN_REPORTS]
  );

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.TRIP_PICKUP_DATE:
      searchConditions.push(Prisma.sql`ot.pickup_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.pickup_date <= ${endDate}`);
      break;
    case ReportCalculationDateFlag.TRIP_DELIVERY_DATE:
      searchConditions.push(Prisma.sql`ot.delivery_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.delivery_date <= ${endDate}`);
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
    ot.bill_of_lading,
    ot.other_cost,
    ot.bridge_toll,
    ot.subcontractor_cost,
    ot.weight,
    ot.notes,
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    r.id AS route_id,
    r.code AS route_code,
    r.name AS route_name,
    ots.type AS status,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.name AS driver_report_name,
    dr.type AS driver_report_type,
    dr.display_order,
    IFNULL(SUM(a.amount), 0) AS advance_total_cost
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
  JOIN orders o
    ON otol.order_id = o.id
  JOIN orders_customer_links ocl
    ON o.id = ocl.order_id
  JOIN customers c
    ON ocl.customer_id = c.id
  JOIN orders_route_links orl
    ON o.id = orl.order_id
  JOIN routes r
    ON orl.route_id = r.id
  LEFT JOIN advances_order_trip_links aotl
    ON ot.id = aotl.order_trip_id
  LEFT JOIN advances a
    ON aotl.advance_id = a.id
    AND a.organization_id = ${organizationId}
    AND a.payment_date >= ${startDate}
    AND a.payment_date <= ${endDate}
    AND a.status = 'PAYMENT'
    AND a.type = 'DRIVER'
    AND a.advance_type = 'COST'
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
  GROUP BY
    ot.id,
    ot.code,
    ot.pickup_date,
    ot.delivery_date,
    ot.bill_of_lading,
    ot.other_cost,
    ot.bridge_toll,
    ot.subcontractor_cost,
    ot.weight,
    ot.notes,
    c.id,
    c.code,
    c.name,
    r.id,
    r.code,
    r.name,
    ots.type,
    ots.created_at,
    dr.id,
    dr.name,
    dr.type,
    dr.display_order
),
filtered_trips AS (
  SELECT
    ls.id,
    ls.code,
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
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    ls.other_cost,
    ls.bridge_toll,
    ls.subcontractor_cost,
    ls.weight,
    ls.notes,
    IFNULL(SUM(tde.amount), 0) AS driverCost,
    o.id AS order_id,
    o.code AS order_code,
    ${includeOrderMetaInReports ? Prisma.sql`o.meta,` : Prisma.empty}
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.advance_total_cost
  FROM latest_statuses ls
  LEFT JOIN trip_driver_expenses_trip_links tdetl
    ON ls.id = tdetl.order_trip_id
  LEFT JOIN trip_driver_expenses tde
    ON tdetl.trip_driver_expense_id = tde.id AND tde.organization_id = ${organizationId}
  JOIN order_trips_order_links otol
    ON ls.id = otol.order_trip_id
  JOIN orders o
    ON otol.order_id = o.id
  WHERE ls.rn = 1
    AND o.organization_id = ${organizationId}
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
  GROUP BY
    ls.id,
    ls.code,
    start_date,
    end_date,
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    ls.other_cost,
    ls.bridge_toll,
    ls.subcontractor_cost,
    ls.weight,
    ls.notes,
    o.id,
    o.code,
    ${includeOrderMetaInReports ? Prisma.sql`o.meta,` : Prisma.empty}
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.advance_total_cost
)
SELECT * FROM filtered_trips
${
  !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
    ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
    : Prisma.empty
}
ORDER BY pickup_date;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<DriverPaidTripReport>(data) : ([] as DriverPaidTripReport[]);
};

/**
 * Fetches subcontractor paid trips for a specific driver within a given date range.
 *
 * @param {IndividualSubcontractorCostParams} params - The parameters for fetching subcontractor paid trips.
 * @returns {Promise<SubcontractorPaidTrip[]>} - A promise that resolves to an array of trip details.
 */
export const subcontractorPaidTripsFetcher = async (params: IndividualSubcontractorCostParams) => {
  const { organizationId, startDate, endDate, driverReportIds, subcontractorId } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.subcontractor_id = ${subcontractorId}`);
  searchConditions.push(Prisma.sql`d.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);

  const reportCalculationDateFlag = await getOrganizationSettingExtended<string>({
    organizationId,
    key: OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
  });

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.TRIP_PICKUP_DATE:
      searchConditions.push(Prisma.sql`ot.pickup_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.pickup_date <= ${endDate}`);
      break;
    case ReportCalculationDateFlag.TRIP_DELIVERY_DATE:
      searchConditions.push(Prisma.sql`ot.delivery_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.delivery_date <= ${endDate}`);
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
    ot.bill_of_lading,
    ot.subcontractor_cost,
    o.id AS order_id,
    o.code AS order_code,
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    r.id AS route_id,
    r.code AS route_code,
    r.name AS route_name,
    ots.type AS status,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.name AS driver_report_name,
    dr.type AS driver_report_type,
    d.id AS driver_id,
    d.first_name,
    d.last_name,
    v.vehicle_number,
    v.id AS vehicle_id,
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
  JOIN drivers d
    ON otdl.driver_id = d.id
  JOIN order_trips_vehicle_links otvl
    ON ot.id = otvl.order_trip_id
  JOIN vehicles v
    ON otvl.vehicle_id = v.id
  JOIN order_trips_order_links otol
    ON ot.id = otol.order_trip_id
  JOIN orders o
    ON otol.order_id = o.id
  JOIN orders_customer_links ocl
    ON o.id = ocl.order_id
  JOIN customers c
    ON ocl.customer_id = c.id
  JOIN orders_route_links orl
    ON o.id = orl.order_id
  JOIN routes r
    ON orl.route_id = r.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
filtered_trips AS (
  SELECT
    ls.id,
    ls.code,
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
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    ls.subcontractor_cost,
    ls.order_id,
    ls.order_code,
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.driver_id,
    ls.first_name,
    ls.last_name,
    ls.vehicle_number,
    ls.vehicle_id
  FROM latest_statuses ls
  WHERE
    ls.rn = 1
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
)
SELECT * FROM filtered_trips
${
  !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
    ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
    : Prisma.empty
}
ORDER BY pickup_date;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<SubcontractorPaidTrip>(data) : ([] as SubcontractorPaidTrip[]);
};

/**
 * Fetches paid trips for a specific driver within a given date range.
 *
 * @param {IndividualSubcontractorCostReportParams} params - The parameters for fetching paid trips.
 * @returns {Promise<SubcontractorPaidTripReport[]>} - A promise that resolves to an array of trip details.
 */
export const getSubcontractorPaidTrips = async (params: IndividualSubcontractorCostReportParams) => {
  const { organizationId, driverReportIds, subcontractorId, startDate, endDate } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.subcontractor_id = ${subcontractorId}`);
  searchConditions.push(Prisma.sql`d.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);

  const orgSettingExtended = await getOrganizationSettingsExtended(organizationId, [
    OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
    OrganizationSettingExtendedKey.INCLUDE_ORDER_META_IN_REPORTS,
  ]);

  const reportCalculationDateFlag = orgSettingExtended?.[OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG];
  const includeOrderMetaInReports = isTrue(
    orgSettingExtended?.[OrganizationSettingExtendedKey.INCLUDE_ORDER_META_IN_REPORTS]
  );

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.TRIP_PICKUP_DATE:
      searchConditions.push(Prisma.sql`ot.pickup_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.pickup_date <= ${endDate}`);
      break;
    case ReportCalculationDateFlag.TRIP_DELIVERY_DATE:
      searchConditions.push(Prisma.sql`ot.delivery_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.delivery_date <= ${endDate}`);
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
    ot.bill_of_lading,
    ot.other_cost,
    ot.bridge_toll,
    ot.subcontractor_cost,
    ot.weight,
    ot.notes,
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    r.id AS route_id,
    r.code AS route_code,
    r.name AS route_name,
    ots.type AS status,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.name AS driver_report_name,
    dr.type AS driver_report_type,
    dr.display_order,
    v.vehicle_number,
    v.id_number as vehicle_id_number,
    vt.name AS vehicle_type,
    d.first_name,
    d.last_name,
    d.id_number as driver_id_number,
    d.phone_number,
    d.email,
    IFNULL(SUM(a.amount), 0) AS advance_total_cost
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
  JOIN drivers d
    ON otdl.driver_id = d.id
  JOIN order_trips_order_links otol
    ON ot.id = otol.order_trip_id
  JOIN orders o
    ON otol.order_id = o.id
  JOIN orders_customer_links ocl
    ON otol.order_id = ocl.order_id
  JOIN customers c
    ON ocl.customer_id = c.id
  JOIN orders_route_links orl
    ON otol.order_id = orl.order_id
  JOIN routes r
    ON orl.route_id = r.id
  JOIN order_trips_vehicle_links otvl
    ON ot.id = otvl.order_trip_id
  JOIN vehicles v
    ON otvl.vehicle_id = v.id
  LEFT JOIN vehicles_type_links vtl
    ON v.id = vtl.vehicle_id
  LEFT JOIN vehicle_types vt
    ON vtl.vehicle_type_id = vt.id AND vt.organization_id = ${organizationId}
  JOIN subcontractors s
    ON v.subcontractor_id = s.id
  LEFT JOIN advances_order_trip_links aotl
    ON ot.id = aotl.order_trip_id
  LEFT JOIN advances a
    ON aotl.advance_id = a.id
    AND a.organization_id = ${organizationId}
    AND a.payment_date >= ${startDate}
    AND a.payment_date <= ${endDate}
    AND a.status = 'PAYMENT'
    AND a.type = 'DRIVER'
    AND a.advance_type = 'COST'
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
  GROUP BY
    ot.id,
    ot.code,
    ot.pickup_date,
    ot.delivery_date,
    ot.bill_of_lading,
    ot.other_cost,
    ot.bridge_toll,
    ot.subcontractor_cost,
    ot.weight,
    ot.notes,
    c.id,
    c.code,
    c.name,
    r.id,
    r.code,
    r.name,
    ots.type,
    ots.created_at,
    dr.id,
    dr.name,
    dr.type,
    dr.display_order,
    v.vehicle_number,
    v.id_number,
    vt.name,
    d.first_name,
    d.last_name,
    d.id_number,
    d.phone_number,
    d.email
),
filtered_trips AS (
  SELECT
    ls.id,
    ls.code,
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
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    ls.other_cost,
    ls.bridge_toll,
    ls.subcontractor_cost,
    ls.weight,
    ls.notes,
    IFNULL(SUM(tde.amount), 0) AS driverCost,
    o.id AS order_id,
    o.code AS order_code,
    ${includeOrderMetaInReports ? Prisma.sql`o.meta,` : Prisma.empty}
    u.code AS unit_of_measure_code,
    u.name AS unit_of_measure_name,
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.advance_total_cost,
    ls.vehicle_number,
    ls.vehicle_id_number,
    ls.vehicle_type,
    ls.first_name,
    ls.last_name,
    ls.driver_id_number,
    ls.phone_number,
    ls.email
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
    start_date,
    end_date,
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    ls.other_cost,
    ls.bridge_toll,
    ls.subcontractor_cost,
    ls.weight,
    ls.notes,
    o.id,
    o.code,
    ${includeOrderMetaInReports ? Prisma.sql`o.meta,` : Prisma.empty}
    u.code,
    u.name,
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.advance_total_cost,
    ls.vehicle_number,
    ls.vehicle_id_number,
    ls.vehicle_type,
    ls.first_name,
    ls.last_name,
    ls.driver_id_number,
    ls.phone_number,
    ls.email
)
SELECT * FROM filtered_trips
${
  !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
    ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
    : Prisma.empty
}
ORDER BY pickup_date;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<SubcontractorPaidTripReport>(data) : ([] as SubcontractorPaidTripReport[]);
};

/**
 * Fetches customer paid trips for a specific driver within a given date range.
 *
 * @param {IndividualCustomerStatisticParams} params - The parameters for fetching customer paid trips.
 * @returns {Promise<CustomerPaidTrip[]>} - A promise that resolves to an array of trip details.
 */
export const customerPaidTripsFetcher = async (params: IndividualCustomerStatisticParams) => {
  const { organizationId, startDate, endDate, driverReportIds, customerId } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`d.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`c.id = ${customerId}`);

  const reportCalculationDateFlag = await getOrganizationSettingExtended<string>({
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
    ot.bill_of_lading,
    ocl.customer_id,
    r.id AS route_id,
    r.code AS route_code,
    r.name AS route_name,
    ots.type AS status,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.name AS driver_report_name,
    dr.type AS driver_report_type,
    dr.display_order,
    d.id AS driver_id,
    d.first_name,
    d.last_name,
    v.vehicle_number,
    v.id AS vehicle_id,
    o.id AS order_id,
    o.code AS order_code
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
  JOIN drivers d
    ON otdl.driver_id = d.id
  JOIN order_trips_vehicle_links otvl
    ON ot.id = otvl.order_trip_id
  JOIN vehicles v
    ON otvl.vehicle_id = v.id
  JOIN order_trips_order_links otol
    ON ot.id = otol.order_trip_id
  JOIN orders_customer_links ocl
    ON otol.order_id = ocl.order_id
  JOIN customers c
    ON ocl.customer_id = c.id
  JOIN orders_route_links orl
    ON otol.order_id = orl.order_id
  JOIN routes r
    ON orl.route_id = r.id
  JOIN orders o
    ON otol.order_id = o.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
filtered_trips AS (
  SELECT
    ls.id,
    ls.code,
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
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    ls.customer_id,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.driver_id,
    ls.first_name,
    ls.last_name,
    ls.vehicle_number,
    ls.vehicle_id,
    ls.order_id,
    ls.order_code
  FROM latest_statuses ls
  WHERE
    ls.rn = 1
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
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
  return data ? transformObject<CustomerPaidTrip>(data) : ([] as CustomerPaidTrip[]);
};

/**
 * Fetches customer paid trips for a specific driver within a given date range.
 *
 * @param {IndividualCustomerStatisticParams} params - The parameters for fetching customer paid trips.
 * @returns {Promise<CustomerPaidTrip[]>} - A promise that resolves to an array of trip details.
 */
export const getCustomerPaidTrips = async (params: IndividualCustomerStatisticParams) => {
  const { organizationId, startDate, endDate, driverReportIds, customerId } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`d.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`c.id = ${customerId}`);

  const orgSettingExtended = await getOrganizationSettingsExtended(organizationId, [
    OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
    OrganizationSettingExtendedKey.INCLUDE_ORDER_META_IN_REPORTS,
  ]);

  const reportCalculationDateFlag = orgSettingExtended?.[OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG];
  const includeOrderMetaInReports = isTrue(
    orgSettingExtended?.[OrganizationSettingExtendedKey.INCLUDE_ORDER_META_IN_REPORTS]
  );

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
    ot.bill_of_lading,
    ot.bill_of_lading_received_date,
    ot.driver_cost,
    ot.bridge_toll,
    ot.subcontractor_cost,
    ot.other_cost,
    ot.weight,
    ot.notes,
    ocl.customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    r.id AS route_id,
    r.code AS route_code,
    r.name AS route_name,
    ots.type AS status,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.name AS driver_report_name,
    dr.type AS driver_report_type,
    dr.display_order,
    d.id AS driver_id,
    d.first_name,
    d.last_name,
    v.vehicle_number,
    v.id AS vehicle_id,
    vt.name AS vehicle_type,
    o.id AS order_id,
    o.code AS order_code,
    o.order_date,
    o.delivery_date AS order_completed_date,
    o.total_amount AS order_total_amount,
    ${includeOrderMetaInReports ? Prisma.sql`o.meta,` : Prisma.empty}
    u.code AS unit_of_measure_code,
    u.name AS unit_of_measure_name
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
  JOIN drivers d
    ON otdl.driver_id = d.id
  JOIN order_trips_vehicle_links otvl
    ON ot.id = otvl.order_trip_id
  JOIN vehicles v
    ON otvl.vehicle_id = v.id
  LEFT JOIN vehicles_type_links vtl
    ON v.id = vtl.vehicle_id
  LEFT JOIN vehicle_types vt
    ON vtl.vehicle_type_id = vt.id AND vt.organization_id = ${organizationId}
  JOIN order_trips_order_links otol
    ON ot.id = otol.order_trip_id
  JOIN orders_customer_links ocl
    ON otol.order_id = ocl.order_id
  JOIN customers c
    ON ocl.customer_id = c.id
  JOIN orders_route_links orl
    ON otol.order_id = orl.order_id
  JOIN routes r
    ON orl.route_id = r.id
  JOIN orders o
    ON otol.order_id = o.id
  LEFT JOIN orders_unit_links oul
    ON o.id = oul.order_id
  LEFT JOIN unit_of_measures u
    ON oul.unit_of_measure_id = u.id AND u.organization_id = ${organizationId}
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
filtered_trips AS (
  SELECT
    ls.id,
    ls.code,
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
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    ls.bill_of_lading_received_date,
    ls.driver_cost,
    ls.bridge_toll,
    ls.subcontractor_cost,
    ls.other_cost,
    ls.weight,
    ls.notes,
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.driver_id,
    ls.first_name,
    ls.last_name,
    ls.vehicle_number,
    ls.vehicle_id,
    ls.vehicle_type,
    ls.order_id,
    ls.order_code,
    ls.order_date,
    ls.order_completed_date,
    ls.order_total_amount,
    ${includeOrderMetaInReports ? Prisma.sql`ls.meta,` : Prisma.empty}
    ls.unit_of_measure_code,
    ls.unit_of_measure_name
  FROM latest_statuses ls
  WHERE
    ls.rn = 1
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
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
  return data ? transformObject<CustomerPaidTripReport>(data) : ([] as CustomerPaidTripReport[]);
};

/**
 * Fetches recent order trips with notes for a given customer.
 *
 * @param {FilterRequest<OrderTripInfo>} entities - The filter request containing customer ID, page, and page size.
 * @returns {Promise<{ data: OrderTripInfo[]; meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number; } } }>} - A promise that resolves to an object containing the order data and pagination metadata.
 */
export const recentOrderTripNotesFetcher = async (entities: FilterRequest<OrderTripInfo>) => {
  const { organizationId, customerId, page, pageSize } = entities;
  const query = gql`
    query ($organizationId: Int, $customerId: ID, $page: Int, $pageSize: Int) {
      orderTrips(
        sort: "createdAt:desc"
        pagination: { page: $page, pageSize: $pageSize }
        filters: {
          organizationId: { eq: $organizationId }
          and: [{ notes: { ne: null } }, { notes: { ne: "" } }]
          order: { customer: { id: { eq: $customerId } } }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            code
            order {
              data {
                id
                attributes {
                  route {
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

  const { data, meta } = await fetcher<OrderTripInfo[]>(STRAPI_TOKEN_KEY, query, {
    organizationId,
    ...(customerId && { customerId }),
    page,
    pageSize,
  });
  return { data: data?.orderTrips ?? [], meta };
};

/**
 * Checks if a bill of lading already exists for a given order trip.
 *
 * @param {string} jwt - The JSON Web Token for authentication.
 * @param {Pick<OrderTripInputForm, "id" | "organizationId" | "billOfLading">} params - The parameters containing the order trip ID, organization ID, and bill of lading.
 * @returns {Promise<boolean>} - A promise that resolves to a boolean indicating whether the bill of lading exists.
 */
export const checkBillOfLadingExists = async (
  params: Pick<OrderTripInputForm, "id" | "organizationId" | "billOfLading">,
  timeZone = "Asia/Saigon"
) => {
  const { organizationId, id, billOfLading } = params;
  if (!billOfLading || !organizationId || !id) {
    return false;
  }
  // Retrieve the organization settings for preventing duplicate bill of lading
  const orgSettingExtended = await getOrganizationSettingsExtended(organizationId, [
    OrganizationSettingExtendedKey.PREVENT_DUPLICATE_BILL_OF_LADING,
    OrganizationSettingExtendedKey.MONTHLY_BOL_DUPLICATE_CHECK_START_DAY,
  ]);
  const preventDuplicateBillOfLading = isTrue(
    orgSettingExtended?.[OrganizationSettingExtendedKey.PREVENT_DUPLICATE_BILL_OF_LADING]
  );
  if (!preventDuplicateBillOfLading) {
    return false;
  }
  const monthlyBOLDuplicateCheckStartDay =
    orgSettingExtended?.[OrganizationSettingExtendedKey.MONTHLY_BOL_DUPLICATE_CHECK_START_DAY];

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  try {
    if (monthlyBOLDuplicateCheckStartDay) {
      const result = await getPickupDate({ id, organizationId });
      if (!result.pickupDate) {
        return false;
      }
      const pickupDate = toZonedTime(result.pickupDate, timeZone);
      if (isNumeric(monthlyBOLDuplicateCheckStartDay)) {
        startDate = moment(pickupDate)
          .subtract(1, "months")
          .startOf("month")
          .add(Number(monthlyBOLDuplicateCheckStartDay), "days")
          .startOf("day")
          .toDate();
        endDate = moment(pickupDate)
          .startOf("month")
          .add(Number(monthlyBOLDuplicateCheckStartDay), "days")
          .endOf("day")
          .toDate();
      } else {
        switch (monthlyBOLDuplicateCheckStartDay) {
          case MonthlyBOLDuplicateCheckStartDayValue.startOfMonth:
            startDate = moment(pickupDate).startOf("month").startOf("day").toDate();
            endDate = moment(pickupDate).endOf("month").endOf("day").toDate();
            break;
          case MonthlyBOLDuplicateCheckStartDayValue.endOfMonth:
            startDate = moment(pickupDate).subtract(1, "months").endOf("month").startOf("day").toDate();
            endDate = moment(pickupDate).endOf("month").endOf("day").toDate();
            break;
          default:
            break;
        }
      }
    }
  } catch (error) {
    console.error(error);
  }

  const query = gql`
    query ($id: ID!, $organizationId: Int!, $billOfLading: String, $startDate: DateTime, $endDate: DateTime) {
      orderTrips(
        filters: {
          id: { ne: $id }
          organizationId: { eq: $organizationId }
          pickupDate: { gte: $startDate, lte: $endDate }
          billOfLading: { eq: $billOfLading }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<OrderTripInfo[]>(STRAPI_TOKEN_KEY, query, {
    organizationId,
    id,
    billOfLading: trim(billOfLading),
    ...(startDate && endDate && { startDate, endDate }),
  });
  return (data?.orderTrips || []).length > 0;
};

/**
 * Retrieves the bill of lading for a given order trip.
 *
 * @param {OrderTripInfo} tripInfo - The information of the order trip.
 * @returns {Promise<OrderTripInfo | undefined>} - The order trip information containing the bill of lading.
 */
export const getPickupDate = async (tripInfo: Pick<OrderTripInfo, "id" | "organizationId">) => {
  const { jwt } = await getServerToken();
  const { id, organizationId } = tripInfo;

  const query = gql`
    query ($id: ID!, $organizationId: Int!) {
      orderTrips(filters: { id: { eq: $id }, organizationId: { eq: $organizationId } }) {
        data {
          id
          attributes {
            pickupDate
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderTripInfo[]>(jwt, query, {
    id,
    organizationId,
  });

  return data?.orderTrips?.[0];
};

/**
 * Fetches order trips for a specific driver within a given date range.
 *
 * @param {FilterRequest<OrderTripInfo>} params - The parameters for fetching order trips.
 * @returns - A promise that resolves to an object containing the order data and pagination metadata.
 */
export const advanceOrderTripsFetcher = async (params: FilterRequest<OrderTripInfo>) => {
  const { organizationId, startDate, endDate, driverId, page, pageSize } = params;
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

  const query = gql`
    query (
      $page: Int
      $pageSize: Int
      $organizationId: Int
      $driverId: ID
      $excludeStatus: String
      $startDate: DateTime
      $endDate: DateTime
      ${queryParams}
    ) {
      orderTrips(
        pagination: { page: $page, pageSize: $pageSize }
        filters: {
          organizationId: { eq: $organizationId }
          driver: { id: { eq: $driverId } }
          order: { publishedAt: { ne: null }, lastStatusType: { ne: $excludeStatus } }
          ${dateFilter}
          lastStatusType: { ne: $excludeStatus }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            code
            order {
              data {
                id
                attributes {
                  route {
                    data {
                      id
                      attributes {
                        code
                        name
                      }
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
                }
              }
            }
            driver {
              data {
                id
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

  const { data, meta } = await fetcher<OrderTripInfo[]>(STRAPI_TOKEN_KEY, query, {
    page,
    pageSize,
    organizationId,
    excludeStatus: OrderTripStatusType.CANCELED,
    startDate,
    endDate,
    ...(driverId && { driverId }),
    ...(queryParams && {
      prePickupStatuses: [
        OrderTripStatusType.NEW,
        OrderTripStatusType.PENDING_CONFIRMATION,
        OrderTripStatusType.CONFIRMED,
      ],
      pickupType: OrderTripStatusType.WAITING_FOR_PICKUP,
    }),
  });

  return { data: data.orderTrips ?? [], meta };
};

/**
 * Fetches trip reports based on the provided filter parameters.
 *
 * @param {FilterRequest<TripReportQueryParams>} params - The filter parameters for fetching trip reports.
 * @returns {Promise<{ data: TripReportOverView[], pagination: { page: number, pageSize: number, pageCount: number, total: number } }>} The fetched trip reports and pagination information.
 */
export const tripReportsFetcher = async (params: FilterRequest<TripReportQueryParams>) => {
  const { page, pageSize, organizationId, startDate, endDate, driverReportIds } = params;
  const limit = pageSize || PAGE_SIZE_OPTIONS[0];
  const offset = ((page || 1) - 1) * limit;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`uom.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.owner_type = ${VehicleOwnerType.ORGANIZATION}`);
  searchConditions.push(Prisma.sql`d.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);

  const reportCalculationDateFlag = await getOrganizationSettingExtended<string>({
    organizationId,
    key: OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
  });

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.TRIP_PICKUP_DATE:
      searchConditions.push(Prisma.sql`ot.pickup_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.pickup_date <= ${endDate}`);
      break;
    case ReportCalculationDateFlag.TRIP_DELIVERY_DATE:
      searchConditions.push(Prisma.sql`ot.delivery_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.delivery_date <= ${endDate}`);
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
    ot.bill_of_lading,
    ot.bill_of_lading_received_date,
    ot.driver_cost,
    ot.bridge_toll,
    ot.subcontractor_cost,
    ot.weight,
    ot.notes,
    uom.code AS order_unit,
    ot.other_cost,
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    r.id AS route_id,
    r.code AS route_code,
    r.name AS route_name,
    ots.type AS status,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.name AS driver_report_name,
    dr.type AS driver_report_type,
    d.id AS driver_id,
    d.first_name,
    d.last_name,
    v.vehicle_number,
    v.id AS vehicle_id,
    dr.display_order,
    f.url AS bill_of_lading_file_url,
    f.name AS bill_of_lading_file_name,
    ot.created_at as trip_created_at,
    ot.updated_at as trip_updated_at,
    fcreater.url AS created_by_avatar_url,
    fcreater.name AS created_by_avatar_name,
    udcreater.first_name AS created_by_first_name,
    udcreater.last_name AS created_by_last_name,
    fupdater.url AS updated_by_avatar_url,
    fupdater.name AS updated_by_avatar_name,
    udupdater.first_name AS updated_by_first_name,
    udupdater.last_name AS updated_by_last_name
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
  JOIN drivers d
    ON otdl.driver_id = d.id
  JOIN order_trips_vehicle_links otvl
    ON ot.id = otvl.order_trip_id
  JOIN vehicles v
    ON otvl.vehicle_id = v.id
  JOIN order_trips_order_links otol
    ON ot.id = otol.order_trip_id
  JOIN orders o
    ON otol.order_id = o.id
  JOIN orders_customer_links ocl
    ON o.id = ocl.order_id
  JOIN customers c
    ON ocl.customer_id = c.id
  JOIN orders_route_links orl
    ON o.id = orl.order_id
  JOIN routes r
    ON orl.route_id = r.id
  JOIN orders_unit_links oul
    ON o.id = oul.order_id
  JOIN unit_of_measures uom
    ON oul.unit_of_measure_id = uom.id
  LEFT JOIN files_related_morphs frm
    ON frm.related_type = 'api::order-trip.order-trip'
    AND frm.field = 'billOfLadingImages'
    AND frm.related_id = ot.id
  LEFT JOIN files f ON frm.file_id = f.id
  LEFT JOIN order_trips_created_by_user_links otcul
    ON ot.id = otcul.order_trip_id
  LEFT JOIN up_users uccreater
    ON otcul.user_id = uccreater.id
  LEFT JOIN up_users_detail_links uudlcreater
    ON uccreater.id = uudlcreater.user_id
  LEFT JOIN files_related_morphs frmcreater
    ON frmcreater.related_type = 'api::user-detail.user-detail'
    AND frmcreater.field = 'avatar'
    AND frmcreater.related_id = uudlcreater.user_detail_id
  LEFT JOIN files fcreater ON frmcreater.file_id = fcreater.id
  LEFT JOIN user_details udcreater
    ON uudlcreater.user_detail_id = udcreater.id
  LEFT JOIN order_trips_updated_by_user_links otuul
    ON ot.id = otuul.order_trip_id
  LEFT JOIN up_users uupdater
    ON otuul.user_id = uupdater.id
  LEFT JOIN up_users_detail_links uudlupdater
    ON uupdater.id = uudlupdater.user_id
  LEFT JOIN files_related_morphs frmupdater
    ON frmupdater.related_type = 'api::user-detail.user-detail'
    AND frmupdater.field = 'avatar'
    AND frmupdater.related_id = uudlupdater.user_detail_id
  LEFT JOIN files fupdater
    ON frmupdater.file_id = fupdater.id
  LEFT JOIN user_details udupdater
    ON uudlupdater.user_detail_id = udupdater.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
filtered_trips AS (
  SELECT
    ls.id,
    ls.code,
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
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    ls.bill_of_lading_received_date,
    ls.driver_cost,
    ls.bridge_toll,
    ls.subcontractor_cost,
    ls.weight,
    ls.notes,
    ls.order_unit,
    ls.other_cost,
    o.id AS order_id,
    o.code AS order_code,
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.driver_id,
    ls.first_name,
    ls.last_name,
    ls.vehicle_number,
    ls.vehicle_id,
    ls.trip_created_at,
    ls.trip_updated_at,
    ls.bill_of_lading_file_url,
    ls.bill_of_lading_file_name,
    ls.created_by_avatar_url,
    ls.created_by_avatar_name,
    ls.created_by_first_name,
    ls.created_by_last_name,
    ls.updated_by_avatar_url,
    ls.updated_by_avatar_name,
    ls.updated_by_first_name,
    ls.updated_by_last_name
  FROM latest_statuses ls
  JOIN order_trips_order_links otol
    ON ls.id = otol.order_trip_id
  JOIN orders o
    ON otol.order_id = o.id
  WHERE
    ls.rn = 1
    AND o.organization_id = ${organizationId}
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds!)})
),
trip_advances AS (
SELECT
    aotl.order_trip_id,
    SUM(ad.approved_amount) AS total_advance
FROM
    advances ad
JOIN advances_order_trip_links aotl ON ad.id = aotl.advance_id
  WHERE
    ad.organization_id = ${organizationId}
    AND ad.type = 'DRIVER'
    AND ad.status = 'PAYMENT'
    AND ad.payment_date >= ${startDate} AND ad.payment_date <= ${endDate}
  GROUP BY
    aotl.order_trip_id
)
SELECT *, COUNT(*) OVER() AS total_records
FROM filtered_trips
LEFT JOIN trip_advances ta ON filtered_trips.id = ta.order_trip_id
${
  !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
    ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
    : Prisma.empty
}
ORDER BY pickup_date
LIMIT ${limit} OFFSET ${offset};
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  const transformedData = data ? transformObject<TripReportOverView>(data) : ([] as TripReportOverView[]);

  return {
    data: transformedData,
    pagination: {
      page,
      pageSize,
      pageCount: transformedData.length,
      total: transformedData.length > 0 ? Number(data[0].total_records) : 0,
    },
  };
};

/**
 * Retrieves a detailed report of trips based on the provided filter parameters.
 *
 * @param {FilterRequest<TripReportQueryParams>} params - The filter parameters for the trip report.
 * @returns {Promise<TripDetailReport[]>} A promise that resolves to an array of trip detail reports.
 */
export const getTripsReport = async (params: FilterRequest<TripReportQueryParams>) => {
  const { organizationId, startDate, endDate, driverReportIds } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`r.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`uom.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`v.owner_type = ${VehicleOwnerType.ORGANIZATION}`);
  searchConditions.push(Prisma.sql`d.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);

  const orgSettingExtended = await getOrganizationSettingsExtended(Number(organizationId), [
    OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
    OrganizationSettingExtendedKey.INCLUDE_ORDER_META_IN_REPORTS,
    OrganizationSettingExtendedKey.INCLUDE_ATTRIBUTE_ROUTE_IN_REPORTS,
    OrganizationSettingExtendedKey.INCLUDE_ATTRIBUTE_CUSTOMER_IN_REPORTS,
  ]);

  const reportCalculationDateFlag = orgSettingExtended?.[OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG];
  const includeOrderMetaInReports = orgSettingExtended?.[OrganizationSettingExtendedKey.INCLUDE_ORDER_META_IN_REPORTS];
  const includeAttributeRouteInReports =
    orgSettingExtended?.[OrganizationSettingExtendedKey.INCLUDE_ATTRIBUTE_ROUTE_IN_REPORTS];
  const includeAttributeCustomerInReports =
    orgSettingExtended?.[OrganizationSettingExtendedKey.INCLUDE_ATTRIBUTE_CUSTOMER_IN_REPORTS];

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.TRIP_PICKUP_DATE:
      searchConditions.push(Prisma.sql`ot.pickup_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.pickup_date <= ${endDate}`);
      break;
    case ReportCalculationDateFlag.TRIP_DELIVERY_DATE:
      searchConditions.push(Prisma.sql`ot.delivery_date >= ${startDate}`);
      searchConditions.push(Prisma.sql`ot.delivery_date <= ${endDate}`);
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
    ot.bill_of_lading,
    ot.bill_of_lading_received_date,
    ot.driver_cost,
    ot.bridge_toll,
    ot.subcontractor_cost,
    ot.weight,
    ot.notes,
    uom.code AS order_unit,
    ot.other_cost,
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    ${includeAttributeCustomerInReports ? Prisma.sql`c.meta AS customer_meta,` : Prisma.empty}
    r.id AS route_id,
    r.code AS route_code,
    r.name AS route_name,
    ${
      includeAttributeRouteInReports
        ? Prisma.sql`
    r.type AS route_type,
    r.distance AS route_distance,
    r.price AS route_price,
    r.driver_cost AS route_driver_cost,
    r.other_cost AS route_other_cost,
    r.bridge_toll AS route_bridge_toll,
    r.meta AS route_meta,`
        : Prisma.empty
    }
    ots.type AS status,
    ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn,
    ots.created_at,
    dr.id AS driver_report_id,
    dr.name AS driver_report_name,
    dr.type AS driver_report_type,
    d.id AS driver_id,
    d.first_name,
    d.last_name,
    v.vehicle_number,
    v.id AS vehicle_id,
    vt.name AS vehicle_type,
    dr.display_order,
    ot.created_at as trip_created_at,
    ot.updated_at as trip_updated_at
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
  JOIN drivers d
    ON otdl.driver_id = d.id
  JOIN order_trips_vehicle_links otvl
    ON ot.id = otvl.order_trip_id
  JOIN vehicles v
    ON otvl.vehicle_id = v.id
  LEFT JOIN vehicles_type_links vtl
    ON v.id = vtl.vehicle_id
  LEFT JOIN vehicle_types vt
    ON vtl.vehicle_type_id = vt.id AND vt.organization_id = ${organizationId}
  JOIN order_trips_order_links otol
    ON ot.id = otol.order_trip_id
  JOIN orders o
    ON otol.order_id = o.id
  JOIN orders_customer_links ocl
    ON o.id = ocl.order_id
  JOIN customers c
    ON ocl.customer_id = c.id
  JOIN orders_route_links orl
    ON o.id = orl.order_id
  JOIN routes r
    ON orl.route_id = r.id
  JOIN orders_unit_links oul
    ON o.id = oul.order_id
  JOIN unit_of_measures uom
    ON oul.unit_of_measure_id = uom.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
filtered_trips AS (
  SELECT
    ls.id,
    ls.code,
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
    ls.pickup_date,
    ls.delivery_date,
    ls.bill_of_lading,
    ls.bill_of_lading_received_date,
    ls.driver_cost,
    ls.bridge_toll,
    ls.subcontractor_cost,
    ls.weight,
    ls.notes,
    ls.order_unit,
    ls.other_cost,
    o.id AS order_id,
    o.code AS order_code,
    o.order_date,
    o.delivery_date AS order_completed_date,
    ${includeOrderMetaInReports ? Prisma.sql`o.meta,` : Prisma.empty}
    ls.customer_id,
    ls.customer_code,
    ls.customer_name,
    ${includeAttributeCustomerInReports ? Prisma.sql`ls.customer_meta,` : Prisma.empty}
    ls.route_id,
    ls.route_code,
    ls.route_name,
    ${
      includeAttributeRouteInReports
        ? Prisma.sql`
    ls.route_type,
    ls.route_distance,
    ls.route_price,
    ls.route_driver_cost,
    ls.route_other_cost,
    ls.route_bridge_toll,
    ls.route_meta,
      `
        : Prisma.empty
    }
    ls.status,
    ls.driver_report_name,
    ls.driver_report_type,
    ls.driver_id,
    ls.first_name,
    ls.last_name,
    ls.vehicle_number,
    ls.vehicle_id,
    ls.vehicle_type,
    ls.trip_created_at,
    ls.trip_updated_at
  FROM latest_statuses ls
  JOIN order_trips_order_links otol
    ON ls.id = otol.order_trip_id
  JOIN orders o
    ON otol.order_id = o.id
  WHERE
    ls.rn = 1
    AND o.organization_id = ${organizationId}
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds!)})
),
trip_advances AS (
SELECT
    aotl.order_trip_id,
    SUM(ad.approved_amount) AS total_advance
FROM
    advances ad
JOIN advances_order_trip_links aotl ON ad.id = aotl.advance_id
  WHERE
    ad.organization_id = ${organizationId}
    AND ad.type = 'DRIVER'
    AND ad.status = 'PAYMENT'
    AND ad.payment_date >= ${startDate} AND ad.payment_date <= ${endDate}
  GROUP BY
    aotl.order_trip_id
)
SELECT *
FROM filtered_trips
LEFT JOIN trip_advances ta ON filtered_trips.id = ta.order_trip_id
${
  !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
    ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
    : Prisma.empty
}
ORDER BY pickup_date;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<TripDetailReport>(data) : ([] as TripDetailReport[]);
};

/**
 * Fetches the order trip details for a given order ID.
 *
 * @param {number} orderId - The order ID.
 * @returns {Promise<OrderInfo>} A promise that resolves to the order information.
 */
export const getTripAndNotesByOrderId = async (orderId: number) => {
  const { jwt } = await getServerToken();

  const query = gql`
    query ($id: ID) {
      order(id: $id) {
        data {
          id
          attributes {
            trips(pagination: { limit: -1 }, sort: "pickupDate:asc") {
              data {
                id
                attributes {
                  pickupDate
                  notes
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderInfo>(jwt, query, {
    id: orderId,
  });

  return data?.order?.trips;
};

/**
 * Updates the trip sequence in the order notes.
 *
 * @param {number} orderId - The order ID.
 * @param {number} sequence - The trip sequence.
 * @param {string} orderDate - The order date.
 */
export const updateOrderTripSequenceInNote = async (orderId: number, sequence: number, orderDate: string) => {
  const { jwt } = await getServerToken();
  const t = await createTranslator();
  const trips = await getTripAndNotesByOrderId(orderId);

  for (let index = 0; index < trips.length; index++) {
    const { id, notes, pickupDate } = trips[index];
    let newNotes = "";
    const sequenceStr = trips.length > 1 ? `${sequence} (${index + 1})` : `${sequence}`;
    if (notes && notes.search(/\d+/) !== -1) {
      newNotes = notes.replace(/\d+/, sequenceStr);
    } else {
      newNotes = t("order.vehicle_dispatch_modal.daily_trip_sequence", {
        sequence: sequenceStr,
      });
    }
    const query = gql`
      mutation ($id: ID!, $notes: String, $pickupDate: DateTime) {
        updateOrderTrip(id: $id, data: { notes: $notes, pickupDate: $pickupDate }) {
          data {
            id
          }
        }
      }
    `;
    await fetcher<OrderTripInfo>(jwt, query, {
      id,
      notes: newNotes,
      ...(pickupDate && { pickupDate: orderDate }),
    });
  }
};

/**
 * Fetches the order trip details for a given order ID.
 *
 * @param {number} orderId - The order ID.
 * @returns {Promise<OrderInfo>} A promise that resolves to the order information.
 */
export const getTripIdsByOrderId = async (orderId: number) => {
  const { jwt } = await getServerToken();

  const query = gql`
    query ($id: ID) {
      order(id: $id) {
        data {
          id
          attributes {
            trips(pagination: { limit: -1 }) {
              data {
                id
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderInfo>(jwt, query, {
    id: orderId,
  });

  return data?.order?.trips;
};

/**
 * Deletes the order trips by order ID.
 *
 * @param {number} orderId - The order ID.
 */
export const deleteOrderTripsByOrderId = async (orderId: number) => {
  const { jwt } = await getServerToken();
  const trips = await getTripIdsByOrderId(orderId);

  for (const trip of trips) {
    const { id } = trip;
    const query = gql`
      mutation ($id: ID!) {
        deleteOrderTrip(id: $id) {
          data {
            id
          }
        }
      }
    `;
    await fetcher<OrderTripInfo>(jwt, query, { id });
  }
};

/**
 * Fetches notification data for an order trip.
 *
 * @param {number} orderTripId - The ID of the order trip.
 * @param {number} organizationId - The ID of the organization.
 * @returns {Promise<OrderTripInfo | null>} A promise that resolves to the order trip information.
 */
export const getNotificationDataByOrderTrip = async (orderTripId: number, organizationId: number) => {
  const { jwt } = await getServerToken();

  const query = gql`
    query ($id: ID!, $organizationId: Int) {
      orderTrips(filters: { id: { eq: $id }, organizationId: { eq: $organizationId }, publishedAt: { ne: null } }) {
        data {
          id
          attributes {
            code
            order {
              data {
                id
                attributes {
                  code
                  weight
                  participants(pagination: { limit: 1 }, filters: { role: { eq: "OWNER" } }) {
                    data {
                      id
                      attributes {
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
                  group {
                    data {
                      id
                      attributes {
                        code
                      }
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
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrderTripInfo[]>(jwt, query, {
    id: orderTripId,
    organizationId,
  });

  return data?.orderTrips?.[0];
};

/**
 * Retrieves the latest order trips by day for a list of vehicles within a date range.
 *
 * This function uses raw SQL with a CTE to select up to 4 most recent order trips per day
 * (based on pickup date) for the specified vehicles. It enriches the data by joining
 * related tables such as orders, customers, routes, units, statuses, and driver reports.
 *
 * @param {number[]} vehicleIds - The list of vehicle IDs to filter trips by.
 * @param {string} startDate - The start date (YYYY-MM-DD) of the range.
 * @param {string} endDate - The end date (YYYY-MM-DD) of the range.
 * @param {string} clientTimezone - The client's timezone (e.g., 'Asia/Ho_Chi_Minh').
 * @returns {Promise<Record<string, string>[]>} A promise that resolves to an array of transformed trip records.
 */
export const getOrderTripsByDayWithSQL = withActionExceptionHandler<
  { vehicleIds: number[]; startDate: string; endDate: string; clientTimezone: string },
  Record<string, string>[]
>(async (token, params) => {
  const { vehicleIds, startDate, endDate, clientTimezone } = params;
  const dateFormat = "yyyy-MM-dd'T'HH:mm:ssXXX";
  const startDateTime = formatInTimeZone(startOfDay(startDate)!, clientTimezone, dateFormat);
  const endDateTime = formatInTimeZone(endOfDay(endDate)!, clientTimezone, dateFormat);
  const query = Prisma.sql`WITH ranked AS (
  SELECT
    ot.id,
    ot.code,
    CAST(ot.weight AS DOUBLE) AS weight,
    ot.last_status_type,
    ot.pickup_date,
    ot.delivery_date,
    ot.organization_id,
    ov.vehicle_id,
    ROW_NUMBER() OVER (
      PARTITION BY ov.vehicle_id, DATE(CONVERT_TZ(ot.pickup_date, 'UTC', ${clientTimezone}))
      ORDER BY ot.id DESC
    ) AS row_num
  FROM order_trips ot
  JOIN order_trips_vehicle_links ov ON ot.id = ov.order_trip_id
  WHERE
    ov.vehicle_id IN (${Prisma.join(vehicleIds)})
    AND ot.pickup_date BETWEEN ${startDateTime} AND ${endDateTime}
    AND ot.published_at IS NOT NULL
    AND ot.organization_id = ${token.user.orgId}
)
SELECT
  r.id,
  r.code,
  r.weight,
  r.pickup_date,
  r.delivery_date,
  r.last_status_type,
  r.vehicle_id,
  -- Get Order Info
  o.id AS order_id,
  route.id AS route_id,
  route.code AS route_code,
  route.name AS route_name,
  route.type AS route_type,
  uom.name AS unit_name,
  c.code AS customer_code,
  c.name AS customer_name,
  c.type AS customer_type,
  -- Get Latest OrderTrip Status
  status.id AS status_id,
  driver_report.id AS driver_report_id,
  driver_report.name AS driver_report_name
FROM ranked r
LEFT JOIN order_trips_order_links otol ON r.id = otol.order_trip_id
LEFT JOIN orders o ON otol.order_id = o.id
LEFT JOIN orders_customer_links ocl ON o.id = ocl.order_id
LEFT JOIN customers c ON c.id = ocl.customer_id
LEFT JOIN orders_route_links orl ON o.id = orl.order_id
LEFT JOIN routes route ON orl.route_id = route.id
LEFT JOIN orders_unit_links oul ON o.id = oul.order_id
LEFT JOIN unit_of_measures uom ON oul.unit_of_measure_id = uom.id
LEFT JOIN order_trip_statuses_trip_links otsl
  ON r.id = otsl.order_trip_id
  AND otsl.id = (
    SELECT MAX(otsl2.id)
    FROM order_trip_statuses_trip_links otsl2
    WHERE otsl2.order_trip_id = r.id
  )
LEFT JOIN order_trip_statuses status ON otsl.order_trip_status_id = status.id
LEFT JOIN order_trip_statuses_driver_report_links d_report_link
  ON status.id = d_report_link.order_trip_status_id
LEFT JOIN driver_reports driver_report
  ON d_report_link.driver_report_id = driver_report.id
  WHERE r.row_num <= 4 AND o.id IS NOT NULL;`;

  const result = await prisma.$queryRaw<AnyObject[]>(query);
  return {
    status: HttpStatusCode.Ok,
    data: transformObject<Record<string, string>>(result),
  };
});

/**
 * Retrieves the total number of order trips per day for given vehicles within a date range.
 *
 * This function runs a raw SQL query to count order trips grouped by pickup date and vehicle ID,
 * converting the date from UTC to the client's timezone. It filters by vehicle IDs, date range,
 * published status, and organization ID.
 *
 * @param {number[]} vehicleIds - List of vehicle IDs to filter the trips.
 * @param {string} startDate - Start date (YYYY-MM-DD) of the range.
 * @param {string} endDate - End date (YYYY-MM-DD) of the range.
 * @param {string} clientTimezone - The client's timezone (e.g., 'Asia/Ho_Chi_Minh').
 * @returns {Promise<Record<string, string>[]>} A promise that resolves to an array of daily trip counts per vehicle.
 */
export const getTotalOrderTripsCountByDay = withActionExceptionHandler<
  { vehicleIds: number[]; startDate: string; endDate: string; clientTimezone: string },
  Record<string, string>[]
>(async (token, params) => {
  const { vehicleIds, startDate, endDate, clientTimezone } = params;
  const dateFormat = "yyyy-MM-dd'T'HH:mm:ssXXX";
  const startDateTime = formatInTimeZone(startOfDay(startDate)!, clientTimezone, dateFormat);
  const endDateTime = formatInTimeZone(endOfDay(endDate)!, clientTimezone, dateFormat);
  const query = Prisma.sql`
    SELECT
      DATE(CONVERT_TZ(ot.pickup_date, 'UTC', ${clientTimezone})) AS day,
      ov.vehicle_id AS vehicle_id,
      COUNT(*) AS total_count_per_day
    FROM order_trips ot
    JOIN order_trips_vehicle_links ov ON ot.id = ov.order_trip_id
    WHERE
      ov.vehicle_id IN (${Prisma.join(vehicleIds)})
      AND ot.pickup_date BETWEEN ${startDateTime} AND ${endDateTime}
      AND ot.published_at IS NOT NULL
      AND ot.organization_id = ${token.user.orgId}
    GROUP BY day, ov.vehicle_id
    ORDER BY day, vehicle_id
    LIMIT 0, 1000;
  `;

  const result = await prisma.$queryRaw<AnyObject[]>(query);
  return {
    status: HttpStatusCode.Ok,
    data: transformObject<Record<string, string>>(result),
  };
});

/**
 * Fetches paginated order trips for a specific vehicle on a given day using GraphQL.
 *
 * The function builds a GraphQL query to retrieve order trips filtered by pickup date,
 * vehicle ID, organization, and published status. It converts the date to the client's
 * timezone and includes related data such as orders, routes, customers, units, statuses,
 * and driver reports.
 *
 * @param {[string, FilterRequest<OrderTripInfo>]} args - Tuple containing the cache key and filter parameters.
 * @returns {Promise<{ data: OrderTripInfo[]; meta: any }>} A promise that resolves to the list of order trips and pagination metadata.
 */
export const orderTripsByDayAndVehicleFetcher = withActionExceptionHandler<
  [string, FilterRequest<OrderTripInfo>],
  GraphQLResult<OrderTripInfo[]>
>(async (token, params) => {
  const [_, filters] = params;
  const { page, pageSize, date, vehicleId, clientTimezone, sort } = filters;
  let startDateTime, endDateTime;
  if (clientTimezone) {
    const dateFormat = "yyyy-MM-dd'T'HH:mm:ssXXX";
    startDateTime = formatInTimeZone(startOfDay(date)!, clientTimezone, dateFormat);
    endDateTime = formatInTimeZone(endOfDay(date)!, clientTimezone, dateFormat);
  }

  const query = gql`
    query (
      $organizationId: Int!
      $page: Int
      $pageSize: Int
      $sort: [String]
      $vehicleId: ID
      $startDateTime: DateTime
      $endDateTime: DateTime
    ) {
      orderTrips(
        filters: {
          pickupDate: { gte: $startDateTime, lte: $endDateTime }
          vehicle: { id: { eq: $vehicleId } }
          publishedAt: { ne: null }
          organizationId: { eq: $organizationId }
        }
        pagination: { page: $page, pageSize: $pageSize }
        sort: $sort
      ) {
        data {
          id
          attributes {
            code
            weight
            pickupDate
            deliveryDate
            lastStatusType
            billOfLading
            order {
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
                  customer {
                    data {
                      id
                    }
                  }
                  unit {
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
            statuses(sort: ["id:desc"], pagination: { limit: -1 }) {
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
            workflow {
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
  `;

  const { data, meta } = await fetcher<OrderTripInfo[]>(token.jwt, query, {
    organizationId: token.user.orgId,
    page,
    pageSize,
    sort: Array.isArray(sort) ? sort : [sort],
    startDateTime,
    endDateTime,
    vehicleId,
  });

  return {
    status: HttpStatusCode.Ok,
    data: { data: data?.orderTrips ?? [], meta },
  };
});
