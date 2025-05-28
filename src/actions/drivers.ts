"use server";

import { OrderStatusType, Prisma } from "@prisma/client";
import { gql } from "graphql-request";

import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { prisma } from "@/configs/prisma";
import { OrganizationSettingExtendedKey, ReportCalculationDateFlag } from "@/constants/organizationSettingExtended";
import { AnyObject } from "@/types";
import { HttpStatusCode } from "@/types/api";
import {
  DetailedDriverSalaryInfo,
  DriverSalaryOverview,
  DriverSalaryQueryParams,
  DriverSalaryReport,
  IndividualDriverSalaryParams,
  IndividualDriverSalaryReportParams,
} from "@/types/report";
import { DriverInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { transformObject } from "@/utils/object";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Fetches driver salaries based on the provided parameters.
 *
 * @param {DriverSalaryQueryParams} params - The parameters for fetching driver salaries.
 * @returns {Promise<{data: DriverSalaryOverview[], pagination: Pagination}>}
 * Returns a promise that resolves to an object containing an array of driver salaries and pagination details.
 */
export const driverSalariesFetcher = async (params: DriverSalaryQueryParams) => {
  const { organizationId, driverReportIds, driverId, page, pageSize, startDate, endDate } = params;

  const offset = (page! - 1) * pageSize!;
  const sortColumn = Prisma.sql(["d.first_name"]);
  const sortOrder = Prisma.sql(["asc"]);

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);

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
        ot.id AS order_trip_id,
        dr.id AS driver_report_id,
        dr.display_order,
        ots.created_at,
        ot.pickup_date,
        ot.delivery_date,
        ots.type AS status,
        ROW_NUMBER() OVER(PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn
    FROM
        order_trip_statuses ots
    JOIN order_trip_statuses_trip_links otstl
        ON ots.id = otstl.order_trip_status_id
    JOIN order_trips ot
        ON otstl.order_trip_id = ot.id
    JOIN order_trips_order_links otol
        ON ot.id = otol.order_trip_id
    JOIN orders o
        ON otol.order_id = o.id
    JOIN order_trip_statuses_driver_report_links otsdrl
        ON ots.id = otsdrl.order_trip_status_id
    JOIN driver_reports dr
        ON otsdrl.driver_report_id = dr.id
    WHERE
        ${Prisma.join(searchConditions, " AND ")}
),
driver_filter_trips AS (
    SELECT
        ls.order_trip_id,
        ls.status,
        COALESCE(
          CASE
            WHEN ls.display_order < (SELECT display_order FROM waiting_for_pickup_order) THEN ls.pickup_date
            WHEN ls.display_order = (SELECT display_order FROM waiting_for_pickup_order) THEN ls.created_at
            ELSE (
              SELECT created_at
              FROM order_trip_statuses ots2
              JOIN order_trip_statuses_trip_links otstl2
                ON ots2.id = otstl2.order_trip_status_id
              WHERE otstl2.order_trip_id = ls.order_trip_id
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
        END AS end_date
    FROM
        latest_statuses ls
    WHERE
        ls.rn = 1
        AND ls.driver_report_id IN (${Prisma.join(driverReportIds!)})
),
filtered_trips AS (
    SELECT * FROM driver_filter_trips
    ${
      !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
        ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
        : Prisma.empty
    }
),
driver_salaries AS (
    SELECT
        otdl.driver_id,
        SUM(tde.amount) AS trip_salary_total
    FROM
        trip_driver_expenses tde
    JOIN trip_driver_expenses_trip_links tdetl
        ON tde.id = tdetl.trip_driver_expense_id
    JOIN order_trips_driver_links otdl
        ON tdetl.order_trip_id = otdl.order_trip_id
    WHERE
        tde.organization_id = ${organizationId}
        AND tdetl.order_trip_id IN (SELECT order_trip_id FROM filtered_trips)
    GROUP BY
        otdl.driver_id
),
driver_salary_advances AS (
    SELECT
        adl.driver_id,
        SUM(ad.approved_amount) AS salary_advance
    FROM
        advances ad
    JOIN advances_driver_links adl
        ON ad.id = adl.advance_id
    WHERE
        ad.organization_id = ${organizationId}
        AND ad.type = 'DRIVER'
        AND ad.advance_type = 'SALARY'
        AND ad.status = 'PAYMENT'
        AND ad.payment_date >= ${startDate}
        AND ad.payment_date <= ${endDate}
    GROUP BY
        adl.driver_id
),
driver_advance_total_costs AS (
    SELECT
        adl.driver_id,
        SUM(ad.approved_amount) AS advance_total_cost
    FROM
        advances ad
    JOIN advances_driver_links adl
        ON ad.id = adl.advance_id
    WHERE
        ad.organization_id = ${organizationId}
        AND ad.type = 'DRIVER'
        AND ad.advance_type = 'COST'
        AND ad.status = 'PAYMENT'
        AND ad.payment_date >= ${startDate}
        AND ad.payment_date <= ${endDate}
    GROUP BY
        adl.driver_id
)
SELECT
    d.id,
    d.first_name,
    d.last_name,
    v.id AS vehicle_id,
    v.vehicle_number,
    t.trailer_number,
    COUNT(ft.order_trip_id) AS total_trip,
    d.phone_number,
    d.basic_salary,
    d.security_deposit,
    d.union_dues,
    COALESCE(ds.trip_salary_total, 0) AS trip_salary_total,
    COALESCE(dsa.salary_advance, 0) AS salary_advance,
    COALESCE(datc.advance_total_cost, 0) AS advance_total_cost
FROM
    drivers d
LEFT JOIN vehicles_driver_links vdl
    ON d.id = vdl.driver_id
LEFT JOIN vehicles v
    ON vdl.vehicle_id = v.id AND v.organization_id = ${organizationId}
LEFT JOIN vehicles_trailer_links vtl
    ON v.id = vtl.vehicle_id
LEFT JOIN trailers t
    ON vtl.trailer_id = t.id AND t.organization_id = ${organizationId}
LEFT JOIN order_trips_driver_links otdl
    ON d.id = otdl.driver_id
LEFT JOIN filtered_trips ft
    ON otdl.order_trip_id = ft.order_trip_id
LEFT JOIN driver_salaries ds
    ON d.id = ds.driver_id
LEFT JOIN driver_salary_advances dsa
    ON d.id = dsa.driver_id
LEFT JOIN driver_advance_total_costs datc
    ON d.id = datc.driver_id
WHERE
    d.organization_id = ${organizationId}
    AND d.is_active = true
    AND d.published_at IS NOT NULL
    ${driverId ? Prisma.sql`AND d.id = ${driverId}` : Prisma.empty}
GROUP BY
    d.id,
    d.first_name,
    d.last_name,
    v.id,
    v.vehicle_number,
    t.trailer_number,
    d.phone_number,
    d.basic_salary,
    d.security_deposit,
    d.union_dues,
    ds.trip_salary_total,
    dsa.salary_advance,
    datc.advance_total_cost
ORDER BY ${sortColumn} ${sortOrder}
LIMIT ${pageSize} OFFSET ${offset};
`;

  const paginationQuery = Prisma.sql`
SELECT COUNT(*) AS total
FROM drivers d
WHERE
    d.organization_id = ${organizationId}
    AND d.is_active = true
    AND d.published_at IS NOT NULL
    ${driverId ? Prisma.sql`AND d.id = ${driverId}` : Prisma.empty};
`;

  const [data, total] = await Promise.all([
    prisma.$queryRaw<AnyObject[]>(query),
    prisma.$queryRaw<AnyObject[]>(paginationQuery),
  ]);
  const transformedData = data ? transformObject<DriverSalaryOverview>(data) : ([] as DriverSalaryOverview[]);

  return {
    data: transformedData,
    pagination: {
      page,
      pageSize,
      pageCount: transformedData.length,
      total: Number(total?.[0]?.total) ?? 0,
    },
  };
};

/**
 * Fetches driver salary based on the provided parameters.
 *
 * @param {IndividualDriverSalaryParams} params - The parameters for fetching driver salary.
 * @returns {Promise<DetailedDriverSalaryInfo>}
 * Returns a promise that resolves to an object containing the driver salary.
 */
export const driverSalaryFetcher = async (params: IndividualDriverSalaryParams) => {
  const { organizationId, driverReportIds, driverId, startDate, endDate } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  searchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);

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
      ot.id AS order_trip_id,
      dr.id AS driver_report_id,
      dr.display_order,
      ots.created_at,
      ot.pickup_date,
      ot.delivery_date,
      ots.type AS status,
      ROW_NUMBER() OVER(PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn
  FROM
      order_trip_statuses ots
  JOIN order_trip_statuses_trip_links otstl
      ON ots.id = otstl.order_trip_status_id
  JOIN order_trips ot
      ON otstl.order_trip_id = ot.id
  JOIN order_trips_order_links otol
      ON ot.id = otol.order_trip_id
  JOIN orders o
      ON otol.order_id = o.id
  JOIN order_trip_statuses_driver_report_links otsdrl
      ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
      ON otsdrl.driver_report_id = dr.id
  WHERE
      ${Prisma.join(searchConditions, " AND ")}
),
driver_filter_trips AS (
  SELECT
      ls.order_trip_id,
      ls.status,
      COALESCE(
        CASE
          WHEN ls.display_order < (SELECT display_order FROM waiting_for_pickup_order) THEN ls.pickup_date
          WHEN ls.display_order = (SELECT display_order FROM waiting_for_pickup_order) THEN ls.created_at
          ELSE (
            SELECT created_at
            FROM order_trip_statuses ots2
            JOIN order_trip_statuses_trip_links otstl2
              ON ots2.id = otstl2.order_trip_status_id
            WHERE otstl2.order_trip_id = ls.order_trip_id
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
      END AS end_date
  FROM
      latest_statuses ls
  WHERE
      ls.rn = 1
      AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
),
filtered_trips AS (
  SELECT * FROM driver_filter_trips
  ${
    !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
      ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
      : Prisma.empty
  }
),
driver_salaries AS (
  SELECT
      otdl.driver_id,
      SUM(tde.amount) AS trip_salary_total
  FROM
      trip_driver_expenses tde
  JOIN trip_driver_expenses_trip_links tdetl
      ON tde.id = tdetl.trip_driver_expense_id
  JOIN order_trips_driver_links otdl
      ON tdetl.order_trip_id = otdl.order_trip_id
  WHERE
      tde.organization_id = ${organizationId}
      AND tdetl.order_trip_id IN (SELECT order_trip_id FROM filtered_trips)
  GROUP BY
      otdl.driver_id
  ),
  driver_salary_advances AS (
  SELECT
      adl.driver_id,
      SUM(ad.approved_amount) AS salary_advance
  FROM
      advances ad
  JOIN advances_driver_links adl
      ON ad.id = adl.advance_id
  WHERE
      ad.organization_id = ${organizationId}
      AND ad.type = 'DRIVER'
      AND ad.advance_type = 'SALARY'
      AND ad.status = 'PAYMENT'
      AND ad.payment_date >= ${startDate}
      AND ad.payment_date <= ${endDate}
  GROUP BY
      adl.driver_id
  ),
  driver_advance_total_costs AS (
  SELECT
      adl.driver_id,
      SUM(ad.approved_amount) AS advance_total_cost
  FROM
      advances ad
  JOIN advances_driver_links adl
      ON ad.id = adl.advance_id
  WHERE
      ad.organization_id = ${organizationId}
      AND ad.type = 'DRIVER'
      AND ad.advance_type = 'COST'
      AND ad.status = 'PAYMENT'
      AND ad.payment_date >= ${startDate}
      AND ad.payment_date <= ${endDate}
  GROUP BY
      adl.driver_id
  )
  SELECT
      d.id,
      d.first_name,
      d.last_name,
      d.id_number,
      v.id AS vehicle_id,
      v.vehicle_number,
      t.trailer_number,
      COUNT(ft.order_trip_id) AS total_trip,
      d.phone_number,
      d.basic_salary,
      d.security_deposit,
      d.union_dues,
      COALESCE(ds.trip_salary_total, 0) AS trip_salary_total,
      COALESCE(dsa.salary_advance, 0) AS salary_advance,
      COALESCE(datc.advance_total_cost, 0) AS advance_total_cost,
      ba.account_number,
      ba.bank_branch,
      ba.bank_name,
      aucity.name AS city,
      audistrict.name AS district,
      auward.name AS ward,
      ai.address_line_1
  FROM
      drivers d
  LEFT JOIN vehicles_driver_links vdl
      ON d.id = vdl.driver_id
  LEFT JOIN vehicles v
      ON vdl.vehicle_id = v.id AND v.organization_id = ${organizationId}
  LEFT JOIN vehicles_trailer_links vtl
      ON v.id = vtl.vehicle_id
  LEFT JOIN trailers t
      ON vtl.trailer_id = t.id AND t.organization_id = ${organizationId}
  LEFT JOIN drivers_bank_account_links dbal
      ON d.id = dbal.driver_id
  LEFT JOIN bank_accounts ba
      ON dbal.bank_account_id = ba.id
  LEFT JOIN order_trips_driver_links otdl
      ON d.id = otdl.driver_id
  LEFT JOIN filtered_trips ft
      ON otdl.order_trip_id = ft.order_trip_id
  LEFT JOIN driver_salaries ds
      ON d.id = ds.driver_id
  LEFT JOIN driver_salary_advances dsa
      ON d.id = dsa.driver_id
  LEFT JOIN driver_advance_total_costs datc
      ON d.id = datc.driver_id
  LEFT JOIN drivers_address_links dal
      ON d.id = dal.driver_id
  LEFT JOIN address_informations ai
      ON dal.address_information_id = ai.id
  LEFT JOIN address_informations_city_links aicl
      ON ai.id = aicl.address_information_id
  LEFT JOIN administrative_units aucity
      ON aicl.administrative_unit_id = aucity.id
  LEFT JOIN address_informations_district_links aidl
      ON ai.id = aidl.address_information_id
  LEFT JOIN administrative_units audistrict
      ON aidl.administrative_unit_id = audistrict.id
  LEFT JOIN address_informations_ward_links aiwl
      ON ai.id = aiwl.address_information_id
  LEFT JOIN administrative_units auward
      ON aiwl.administrative_unit_id = auward.id
  WHERE
      d.organization_id = ${organizationId}
      AND d.is_active = true
      AND d.published_at IS NOT NULL
      AND d.id = ${driverId}
  GROUP BY
      d.id,
      d.first_name,
      d.last_name,
      d.id_number,
      v.id,
      v.vehicle_number,
      t.trailer_number,
      d.phone_number,
      d.basic_salary,
      d.security_deposit,
      d.union_dues,
      ds.trip_salary_total,
      dsa.salary_advance,
      datc.advance_total_cost,
      ba.account_number,
      ba.bank_branch,
      ba.bank_name,
      aucity.name,
      audistrict.name,
      auward.name,
      ai.address_line_1;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  const transformedData = data ? transformObject<DetailedDriverSalaryInfo>(data) : ([] as DetailedDriverSalaryInfo[]);
  return transformedData.length > 0 ? transformedData[0] : null;
};

/**
 * Fetches driver salaries based on the provided parameters.
 *
 * @param {IndividualDriverSalaryReportParams} params - The parameters for fetching driver salaries.
 * @returns {Promise<DriverSalaryReport[]>}
 * Returns a promise that resolves to an array containing the driver salaries.
 */
export const getDriverSalaries = async (params: IndividualDriverSalaryReportParams) => {
  const { organizationId, driverReportIds, driverId, startDate, endDate } = params;

  const driverSearchConditions: Prisma.Sql[] = [];
  driverSearchConditions.push(Prisma.sql`d.organization_id = ${organizationId}`);
  driverSearchConditions.push(Prisma.sql`d.is_active = true`);
  driverSearchConditions.push(Prisma.sql`d.published_at IS NOT NULL`);
  driverId && driverSearchConditions.push(Prisma.sql`d.id = ${driverId}`);

  const tripSearchConditions: Prisma.Sql[] = [];
  tripSearchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  tripSearchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  tripSearchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  tripSearchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);
  tripSearchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  tripSearchConditions.push(Prisma.sql`o.published_at IS NOT NULL`);
  tripSearchConditions.push(Prisma.sql`o.last_status_type != ${OrderStatusType.CANCELED}`);

  const reportCalculationDateFlag = await getOrganizationSettingExtended<string>({
    organizationId,
    key: OrganizationSettingExtendedKey.REPORT_CALCULATION_DATE_FLAG,
  });

  switch (reportCalculationDateFlag) {
    case ReportCalculationDateFlag.TRIP_PICKUP_DATE:
      tripSearchConditions.push(Prisma.sql`ot.pickup_date >= ${startDate}`);
      tripSearchConditions.push(Prisma.sql`ot.pickup_date <= ${endDate}`);
      break;
    case ReportCalculationDateFlag.TRIP_DELIVERY_DATE:
      tripSearchConditions.push(Prisma.sql`ot.delivery_date >= ${startDate}`);
      tripSearchConditions.push(Prisma.sql`ot.delivery_date <= ${endDate}`);
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
      ot.id AS order_trip_id,
      dr.id AS driver_report_id,
      dr.display_order,
      ots.created_at,
      ot.pickup_date,
      ot.delivery_date,
      ots.type AS status,
      ROW_NUMBER() OVER(PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn
  FROM
      order_trip_statuses ots
  JOIN order_trip_statuses_trip_links otstl
      ON ots.id = otstl.order_trip_status_id
  JOIN order_trips ot
      ON otstl.order_trip_id = ot.id
  JOIN order_trips_order_links otol
      ON ot.id = otol.order_trip_id
  JOIN orders o
      ON otol.order_id = o.id
  JOIN order_trip_statuses_driver_report_links otsdrl
      ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
      ON otsdrl.driver_report_id = dr.id
  WHERE
      ${Prisma.join(tripSearchConditions, " AND ")}
),
driver_filter_trips AS (
  SELECT
      ls.order_trip_id,
      ls.status,
      COALESCE(
        CASE
          WHEN ls.display_order < (SELECT display_order FROM waiting_for_pickup_order) THEN ls.pickup_date
          WHEN ls.display_order = (SELECT display_order FROM waiting_for_pickup_order) THEN ls.created_at
          ELSE (
            SELECT created_at
            FROM order_trip_statuses ots2
            JOIN order_trip_statuses_trip_links otstl2
              ON ots2.id = otstl2.order_trip_status_id
            WHERE otstl2.order_trip_id = ls.order_trip_id
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
      END AS end_date
  FROM
      latest_statuses ls
  WHERE
      ls.rn = 1
      AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
),
filtered_trips AS (
  SELECT * FROM driver_filter_trips
  ${
    !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
      ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
      : Prisma.empty
  }
),
driver_salaries AS (
  SELECT
      otdl.driver_id,
      SUM(tde.amount) AS trip_salary_total
  FROM
      trip_driver_expenses tde
  JOIN trip_driver_expenses_trip_links tdetl
      ON tde.id = tdetl.trip_driver_expense_id
  JOIN order_trips_driver_links otdl
      ON tdetl.order_trip_id = otdl.order_trip_id
  WHERE
      tde.organization_id = ${organizationId}
      AND tdetl.order_trip_id IN (SELECT order_trip_id FROM filtered_trips)
  GROUP BY
      otdl.driver_id
),
driver_salary_advances AS (
  SELECT
      adl.driver_id,
      SUM(ad.approved_amount) AS salary_advance
  FROM
      advances ad
  JOIN advances_driver_links adl
      ON ad.id = adl.advance_id
  WHERE
      ad.organization_id = ${organizationId}
      AND ad.type = 'DRIVER'
      AND ad.advance_type = 'SALARY'
      AND ad.status = 'PAYMENT'
      AND ad.payment_date >= ${startDate}
      AND ad.payment_date <= ${endDate}
  GROUP BY
      adl.driver_id
),
driver_advance_total_costs AS (
  SELECT
      adl.driver_id,
      SUM(ad.approved_amount) AS advance_total_cost
  FROM
      advances ad
  JOIN advances_driver_links adl
      ON ad.id = adl.advance_id
  WHERE
      ad.organization_id = ${organizationId}
      AND ad.type = 'DRIVER'
      AND ad.advance_type = 'COST'
      AND ad.status = 'PAYMENT'
      AND ad.payment_date >= ${startDate}
      AND ad.payment_date <= ${endDate}
  GROUP BY
      adl.driver_id
)
SELECT
    d.id AS driver_id,
    d.first_name,
    d.last_name,
    d.phone_number,
    d.date_of_birth,
    aucity.name AS city,
    audistrict.name AS district,
    auward.name AS ward,
    ai.address_line_1,
    d.id_number,
    d.id_issue_date,
    d.id_issued_by,
    dlt.name AS license_type,
    d.license_number,
    d.license_issue_date,
    d.license_expiry_date,
    d.experience_years,
    d.email,
    d.contract_start_date,
    d.contract_end_date,
    d.basic_salary,
    d.union_dues,
    d.security_deposit,
    COUNT(ft.order_trip_id) AS total_trip,
    d.description,
    ba.account_number,
    ba.holder_name,
    ba.bank_name,
    ba.bank_branch,
    v.id AS vehicle_id,
    v.vehicle_number,
    t.trailer_number,
    COALESCE(ds.trip_salary_total, 0) AS trip_salary_total,
    COALESCE(dsa.salary_advance, 0) AS salary_advance,
    COALESCE(datc.advance_total_cost, 0) AS advance_total_cost
FROM
    drivers d
LEFT JOIN vehicles_driver_links vdl
    ON d.id = vdl.driver_id
LEFT JOIN vehicles v
    ON vdl.vehicle_id = v.id AND v.organization_id = ${organizationId}
LEFT JOIN vehicles_trailer_links vtl
    ON v.id = vtl.vehicle_id
LEFT JOIN trailers t
    ON vtl.trailer_id = t.id
LEFT JOIN drivers_bank_account_links dbal
    ON d.id = dbal.driver_id
LEFT JOIN bank_accounts ba
    ON dbal.bank_account_id = ba.id
LEFT JOIN order_trips_driver_links otdl
    ON d.id = otdl.driver_id
LEFT JOIN filtered_trips ft
    ON otdl.order_trip_id = ft.order_trip_id
LEFT JOIN driver_salaries ds
    ON d.id = ds.driver_id
LEFT JOIN driver_salary_advances dsa
    ON d.id = dsa.driver_id
LEFT JOIN driver_advance_total_costs datc
    ON d.id = datc.driver_id
LEFT JOIN drivers_address_links dal
    ON d.id = dal.driver_id
LEFT JOIN address_informations ai
    ON dal.address_information_id = ai.id
LEFT JOIN address_informations_city_links aicl
    ON ai.id = aicl.address_information_id
LEFT JOIN administrative_units aucity
    ON aicl.administrative_unit_id = aucity.id
LEFT JOIN address_informations_district_links aidl
    ON ai.id = aidl.address_information_id
LEFT JOIN administrative_units audistrict
    ON aidl.administrative_unit_id = audistrict.id
LEFT JOIN address_informations_ward_links aiwl
    ON ai.id = aiwl.address_information_id
LEFT JOIN administrative_units auward
    ON aiwl.administrative_unit_id = auward.id
LEFT JOIN drivers_license_type_links dltl
    ON d.id = dltl.driver_id
LEFT JOIN driver_license_types dlt
    ON dltl.driver_license_type_id = dlt.id
WHERE
    ${Prisma.join(driverSearchConditions, " AND ")}
GROUP BY
    d.id,
    d.first_name,
    d.last_name,
    d.phone_number,
    d.date_of_birth,
    aucity.name,
    audistrict.name,
    auward.name,
    ai.address_line_1,
    d.id_number,
    d.id_issue_date,
    d.id_issued_by,
    dlt.name,
    d.license_number,
    d.license_issue_date,
    d.license_expiry_date,
    d.experience_years,
    d.email,
    d.contract_start_date,
    d.contract_end_date,
    d.basic_salary,
    d.union_dues,
    d.security_deposit,
    d.description,
    ba.account_number,
    ba.holder_name,
    ba.bank_name,
    ba.bank_branch,
    v.id,
    v.vehicle_number,
    t.trailer_number,
    ds.trip_salary_total,
    dsa.salary_advance,
    datc.advance_total_cost
ORDER BY d.first_name;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<DriverSalaryReport>(data) : ([] as DriverSalaryReport[]);
};

/**
 * Fetches the user associated with a driver by their ID.
 *
 * @param token - The authentication token.
 * @param driverId - The ID of the driver to fetch the user for.
 * @returns The user associated with the driver.
 */
export const getDriverUserIdByDriverId = withActionExceptionHandler<number, number | null>(async (token, driverId) => {
  const query = gql`
    query ($id: ID!) {
      driver(id: $id) {
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
  `;

  const { data } = await fetcher<DriverInfo>(token.jwt, query, {
    id: driverId,
  });

  return {
    status: HttpStatusCode.Ok,
    data: data?.driver?.user?.id ?? null,
  };
});
