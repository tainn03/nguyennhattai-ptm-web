"use server";

import { OrderStatusType, Prisma } from "@prisma/client";

import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { prisma } from "@/configs/prisma";
import { OrganizationSettingExtendedKey, ReportCalculationDateFlag } from "@/constants/organizationSettingExtended";
import { AnyObject } from "@/types";
import { FilterRequest } from "@/types/filter";
import {
  DetailedSubcontractorCostInfo,
  IndividualSubcontractorCostParams,
  IndividualSubcontractorCostReportParams,
  SubcontractorCostOverview,
  SubcontractorCostQueryParams,
  SubcontractorCostReport,
} from "@/types/report";
import { transformObject } from "@/utils/object";

/**
 * Fetches subcontractor costs based on the provided parameters.
 *
 * @param {FilterRequest<SubcontractorCostQueryParams>} params - The parameters for fetching subcontractor costs.
 * @returns {Promise<{data: SubcontractorCostOverview[], pagination: Pagination}>}
 * Returns a promise that resolves to an object containing an array of subcontractor costs and pagination details.
 */
export const subcontractorCostsFetcher = async (params: FilterRequest<SubcontractorCostQueryParams>) => {
  const { organizationId, driverReportIds, subcontractorId, page, pageSize, startDate, endDate } = params;

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

  const offset = (page! - 1) * pageSize!;
  const sortColumn = Prisma.sql(["s.code"]);
  const sortOrder = Prisma.sql(["asc"]);

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
    v.subcontractor_id,
    ot.subcontractor_cost,
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
  JOIN order_trips_vehicle_links otvl
    ON ot.id = otvl.order_trip_id
  JOIN vehicles v
    ON otvl.vehicle_id = v.id
  JOIN order_trip_statuses_driver_report_links otsdrl
    ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
    ON otsdrl.driver_report_id = dr.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
subcontractor_filter_trips AS (
  SELECT
    ls.order_trip_id,
    ls.subcontractor_id,
    ls.subcontractor_cost,
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
  SELECT * FROM subcontractor_filter_trips
  ${
    !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
      ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
      : Prisma.empty
  }
),
subcontractor_salary_advances AS (
  SELECT
    asl.subcontractor_id,
    SUM(ad.amount) AS salary_advance
  FROM
    advances ad
  JOIN advances_subcontractor_links asl
    ON ad.id = asl.advance_id
  WHERE
    ad.organization_id = ${organizationId}
    AND ad.type = 'SUBCONTRACTOR'
    AND ad.status = 'PAYMENT'
    AND ad.payment_date >= ${startDate} AND ad.payment_date <= ${endDate}
  GROUP BY
    asl.subcontractor_id
)
SELECT
  s.id,
  s.code,
  s.name,
  s.phone_number,
  s.email,
  COUNT(ft.order_trip_id) AS total_trip,
  SUM(ft.subcontractor_cost) AS subcontractor_cost_total,
  COALESCE(ssa.salary_advance, 0) AS advance_total_cost
FROM subcontractors s
LEFT JOIN filtered_trips ft
  ON s.id = ft.subcontractor_id
LEFT JOIN subcontractor_salary_advances ssa
  ON s.id = ssa.subcontractor_id
WHERE
  s.organization_id = ${organizationId}
  AND s.is_active = true
  AND s.published_at IS NOT NULL
  ${subcontractorId ? Prisma.sql`AND s.id = ${subcontractorId}` : Prisma.empty}
GROUP BY
  s.id,
  s.code,
  s.name,
  s.phone_number,
  s.email,
  ssa.salary_advance
ORDER BY ${sortColumn} ${sortOrder}
LIMIT ${pageSize} OFFSET ${offset};
`;

  const paginationQuery = Prisma.sql`
SELECT COUNT(*) AS total
FROM subcontractors s
WHERE
  s.organization_id = ${organizationId}
  AND s.is_active = true
  AND s.published_at IS NOT NULL
  ${subcontractorId ? Prisma.sql`AND s.id = ${subcontractorId}` : Prisma.empty}
`;

  const [data, total] = await Promise.all([
    prisma.$queryRaw<AnyObject[]>(query),
    prisma.$queryRaw<AnyObject[]>(paginationQuery),
  ]);
  const transformedData = data ? transformObject<SubcontractorCostOverview>(data) : ([] as SubcontractorCostOverview[]);

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
 * Fetches subcontractor cost based on the provided parameters.
 *
 * @param {SubcontractorCostQueryParams} params - The parameters for fetching subcontractor cost.
 * @returns {Promise<DetailedSubcontractorCostInfo>} - Returns a promise that resolves to an object containing an array of subcontractor cost and pagination details.
 */
export const subcontractorCostFetcher = async (params: IndividualSubcontractorCostParams) => {
  const { organizationId, driverReportIds, subcontractorId, startDate, endDate } = params;

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
    v.subcontractor_id,
    ot.subcontractor_cost,
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
  JOIN order_trips_vehicle_links otvl
    ON ot.id = otvl.order_trip_id
  JOIN vehicles v
    ON otvl.vehicle_id = v.id
  JOIN order_trip_statuses_driver_report_links otsdrl
    ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
    ON otsdrl.driver_report_id = dr.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
subcontractor_filter_trips AS (
  SELECT
    ls.order_trip_id,
    ls.subcontractor_id,
    ls.subcontractor_cost,
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
  SELECT * FROM subcontractor_filter_trips
  ${
    !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
      ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
      : Prisma.empty
  }
),
subcontractor_salary_advances AS (
  SELECT
    asl.subcontractor_id,
    SUM(ad.amount) AS salary_advance
  FROM
    advances ad
  JOIN advances_subcontractor_links asl
    ON ad.id = asl.advance_id
  WHERE
    ad.organization_id = ${organizationId}
    AND ad.type = 'SUBCONTRACTOR'
    AND ad.status = 'PAYMENT'
    AND ad.payment_date >= ${startDate}
    AND ad.payment_date <= ${endDate}
  GROUP BY
    asl.subcontractor_id
)
SELECT
  s.id,
  s.code,
  s.name,
  s.phone_number,
  s.email,
  s.business_address,
  s.tax_code,
  ba.account_number,
  ba.holder_name,
  ba.bank_name,
  ba.bank_branch,
  COUNT(ft.order_trip_id) AS total_trip,
  SUM(ft.subcontractor_cost) AS subcontractor_cost_total,
  COALESCE(ssa.salary_advance, 0) AS advance_total_cost
FROM subcontractors s
LEFT JOIN filtered_trips ft
  ON s.id = ft.subcontractor_id
LEFT JOIN subcontractor_salary_advances ssa
  ON s.id = ssa.subcontractor_id
LEFT JOIN subcontractors_bank_account_links sba
  ON s.id = sba.subcontractor_id
LEFT JOIN bank_accounts ba
  ON sba.bank_account_id = ba.id
WHERE
  s.organization_id = ${organizationId}
  AND s.is_active = true
  AND s.published_at IS NOT NULL
  AND s.id = ${subcontractorId}
GROUP BY
  s.id,
  s.code,
  s.name,
  s.phone_number,
  s.email,
  ssa.salary_advance,
  s.business_address,
  s.tax_code,
  ba.account_number,
  ba.holder_name,
  ba.bank_name,
  ba.bank_branch;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  const transformedData = data
    ? transformObject<DetailedSubcontractorCostInfo>(data)
    : ([] as DetailedSubcontractorCostInfo[]);
  return transformedData.length > 0 ? transformedData[0] : null;
};

/**
 * Fetches subcontractor costs based on the provided parameters.
 *
 * @param {FilterRequest<SubcontractorCostQueryParams>} params - The parameters for fetching subcontractor costs.
 * @returns {Promise<SubcontractorCostReport>}
 * Returns a promise that resolves to an object containing an array of subcontractor costs and pagination details.
 */
export const getSubcontractorCosts = async (params: IndividualSubcontractorCostReportParams) => {
  const { organizationId, driverReportIds, subcontractorId, startDate, endDate } = params;

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
    v.subcontractor_id,
    ot.subcontractor_cost,
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
  JOIN order_trips_vehicle_links otvl
    ON ot.id = otvl.order_trip_id
  JOIN vehicles v
    ON otvl.vehicle_id = v.id
  JOIN order_trip_statuses_driver_report_links otsdrl
    ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
    ON otsdrl.driver_report_id = dr.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
subcontractor_filter_trips AS (
  SELECT
    ls.order_trip_id,
    ls.subcontractor_id,
    ls.subcontractor_cost,
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
  SELECT * FROM subcontractor_filter_trips
  ${
    !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
      ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
      : Prisma.empty
  }
),
subcontractor_salary_advances AS (
  SELECT
    asl.subcontractor_id,
    SUM(ad.amount) AS salary_advance
  FROM
    advances ad
  JOIN advances_subcontractor_links asl
    ON ad.id = asl.advance_id
  WHERE
    ad.organization_id = ${organizationId}
    AND ad.type = 'SUBCONTRACTOR'
    AND ad.status = 'PAYMENT'
    AND ad.payment_date >= ${startDate}
    AND ad.payment_date <= ${endDate}
  GROUP BY
    asl.subcontractor_id
)
SELECT
  s.id,
  s.code,
  s.name,
  s.phone_number,
  s.email,
  s.business_address,
  s.tax_code,
  ba.account_number,
  ba.holder_name,
  ba.bank_name,
  ba.bank_branch,
  COUNT(ft.order_trip_id) AS total_trip,
  SUM(ft.subcontractor_cost) AS subcontractor_cost_total,
  COALESCE(ssa.salary_advance, 0) AS advance_total_cost
FROM subcontractors s
LEFT JOIN filtered_trips ft
  ON s.id = ft.subcontractor_id
LEFT JOIN subcontractor_salary_advances ssa
  ON s.id = ssa.subcontractor_id
LEFT JOIN subcontractors_bank_account_links sba
  ON s.id = sba.subcontractor_id
LEFT JOIN bank_accounts ba
  ON sba.bank_account_id = ba.id
WHERE
  s.organization_id = ${organizationId}
  AND s.is_active = true
  AND s.published_at IS NOT NULL
  ${subcontractorId ? Prisma.sql`AND s.id = ${subcontractorId}` : Prisma.empty}
GROUP BY
  s.id,
  s.code,
  s.name,
  s.phone_number,
  s.email,
  s.business_address,
  s.tax_code,
  ba.account_number,
  ba.holder_name,
  ba.bank_name,
  ba.bank_branch,
  ssa.salary_advance
ORDER BY s.code;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<SubcontractorCostReport>(data) : ([] as SubcontractorCostReport[]);
};
