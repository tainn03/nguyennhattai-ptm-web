import { Prisma } from "@prisma/client";

import { prisma } from "@/configs/prisma";
import { AnyObject } from "@/types";
import { FilterRequest } from "@/types/filter";
import { SubcontractorCostOverview, SubcontractorCostQueryParams } from "@/types/report";
import { convertEndOfDayString, convertStartOfDayString } from "@/utils/date";
import { transformObject } from "@/utils/object";

/**
 * Fetches subcontractor costs based on the provided parameters.
 *
 * @param {FilterRequest<SubcontractorCostQueryParams>} params - The parameters for fetching subcontractor costs.
 * @returns {Promise<{data: SubcontractorCostOverview[], pagination: Pagination}>}
 * Returns a promise that resolves to an object containing an array of subcontractor costs and pagination details.
 */
export const subcontractorCostsFetcher = async (params: FilterRequest<SubcontractorCostQueryParams>) => {
  const { organizationId, driverReportIds, subcontractorId, page, pageSize } = params;
  const startDate = convertStartOfDayString(params.startDate);
  const endDate = convertEndOfDayString(params.endDate);

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`s.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`s.is_active = true`);
  searchConditions.push(Prisma.sql`s.published_at IS NOT NULL`);
  subcontractorId && searchConditions.push(Prisma.sql`s.id = ${subcontractorId}`);

  const offset = (page! - 1) * pageSize!;
  const sortColumn = Prisma.sql(["s.code"]);
  const sortOrder = Prisma.sql(["asc"]);

  const query = Prisma.sql`
  WITH latest_statuses AS (
    SELECT
      ot.id AS order_trip_id,
      dr.id AS driver_report_id,
      v.subcontractor_id,
      ot.subcontractor_cost,
      ROW_NUMBER() OVER(PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn
    FROM
      order_trip_statuses ots
    JOIN order_trip_statuses_trip_links otstl
      ON ots.id = otstl.order_trip_status_id
    JOIN order_trips ot
      ON otstl.order_trip_id = ot.id
    JOIN order_trips_vehicle_links otvl
      ON ot.id = otvl.order_trip_id
    JOIN vehicles v
      ON otvl.vehicle_id = v.id
    JOIN order_trip_statuses_driver_report_links otsdrl
      ON ots.id = otsdrl.order_trip_status_id
    JOIN driver_reports dr
      ON otsdrl.driver_report_id = dr.id
    WHERE
      ots.organization_id = ${organizationId}
      AND ot.organization_id = ${organizationId}
      AND dr.organization_id = ${organizationId}
      AND ot.published_at IS NOT NULL
      AND ots.created_at >= ${startDate} AND ots.created_at <= ${endDate}
  ),
  filter_trips AS (
    SELECT
      ls.order_trip_id,
      ls.subcontractor_id,
      ls.subcontractor_cost
    FROM
      latest_statuses ls
    WHERE
      ls.rn = 1
      AND ls.driver_report_id IN (${Prisma.join(driverReportIds!)})
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
  LEFT JOIN filter_trips ft
    ON s.id = ft.subcontractor_id
  LEFT JOIN subcontractor_salary_advances ssa
    ON s.id = ssa.subcontractor_id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
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
      ${Prisma.join(searchConditions, " AND ")};
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
