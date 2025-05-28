"use server";

import { OrderStatusType, Prisma } from "@prisma/client";
import { gql } from "graphql-request";

import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { prisma } from "@/configs/prisma";
import { OrganizationSettingExtendedKey, ReportCalculationDateFlag } from "@/constants/organizationSettingExtended";
import { AnyObject } from "@/types";
import { HttpStatusCode } from "@/types/api";
import {
  CustomerStatisticOverview,
  CustomerStatisticQueryParams,
  CustomerStatisticReport,
  DetailedCustomerStatisticInfo,
  IndividualCustomerStatisticParams,
  IndividualCustomerStatisticReportParams,
} from "@/types/report";
import { CustomerInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";
import { transformObject } from "@/utils/object";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Fetches customer statistic based on the provided parameters.
 *
 * @param {CustomerStatisticQueryParams} params - The parameters for fetching customer statistic.
 * @returns {Promise<{data: CustomerStatisticOverview[], pagination: Pagination}>}
 * Returns a promise that resolves to an object containing an array of customer statistic and pagination details.
 */
export const customerStatisticsFetcher = async (params: CustomerStatisticQueryParams) => {
  const { organizationId, startDate, endDate, driverReportIds, customerId, page, pageSize } = params;

  const offset = (page! - 1) * pageSize!;
  const sortColumn = Prisma.sql(["c.code"]);
  const sortOrder = Prisma.sql(["asc"]);

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`o.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.published_at IS NOT NULL`);
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
latest_statuses AS (
  SELECT
    ot.id AS order_trip_id,
    dr.id AS driver_report_id,
    dr.display_order,
    ots.created_at,
    ot.pickup_date,
    ot.delivery_date,
    c.id as customer_id,
    o.id as order_id,
    o.total_amount,
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
  JOIN orders_customer_links ocl
    ON o.id = ocl.order_id
  JOIN customers c
    ON ocl.customer_id = c.id
  JOIN order_trip_statuses_driver_report_links otsdrl
    ON ots.id = otsdrl.order_trip_status_id
  JOIN driver_reports dr
    ON otsdrl.driver_report_id = dr.id
  WHERE
    ${Prisma.join(searchConditions, " AND ")}
),
customer_filter_trips AS (
  SELECT
    ls.order_trip_id,
    ls.customer_id,
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
    ls.total_amount,
    ls.order_id
  FROM
    latest_statuses ls
  WHERE
    ls.rn = 1
    AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
),
filtered_trips AS (
  SELECT * FROM customer_filter_trips
  ${
    !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
      ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
      : Prisma.empty
  }
),
filtered_orders AS (
  SELECT customer_id, order_id, total_amount FROM filtered_trips
  GROUP BY customer_id, order_id, total_amount
)
SELECT
  c.id,
  c.code,
  c.name,
  c.tax_code,
  c.phone_number,
  c.email,
  COUNT(ft.order_trip_id) AS total_trip,
  (
    SELECT SUM(fo.total_amount) FROM filtered_orders fo
    WHERE fo.customer_id = c.id
  ) AS total_amount,
  (
    SELECT COUNT(fo.order_id)
    FROM filtered_orders fo
    WHERE fo.customer_id = c.id
  ) AS total_order

FROM customers c
LEFT JOIN filtered_trips ft
  ON c.id = ft.customer_id
WHERE
  c.organization_id = ${organizationId}
  AND c.is_active = true
  AND c.published_at IS NOT NULL
  ${customerId ? Prisma.sql`AND c.id = ${customerId}` : Prisma.empty}
GROUP BY
  c.id,
  c.code,
  c.name,
  c.tax_code,
  c.phone_number,
  c.email
ORDER BY ${sortColumn} ${sortOrder}
LIMIT ${pageSize} OFFSET ${offset};
`;

  const paginationQuery = Prisma.sql`
SELECT COUNT(*) AS total
FROM customers c
WHERE
    c.organization_id = ${organizationId}
    AND c.is_active = true
    AND c.published_at IS NOT NULL
    ${customerId ? Prisma.sql`AND c.id = ${customerId}` : Prisma.empty};
`;

  const [data, total] = await Promise.all([
    prisma.$queryRaw<AnyObject[]>(query),
    prisma.$queryRaw<AnyObject[]>(paginationQuery),
  ]);
  const transformedData = data ? transformObject<CustomerStatisticOverview>(data) : ([] as CustomerStatisticOverview[]);

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
 * Fetches customer statistic based on the provided parameters.
 *
 * @param {IndividualDriverSalaryParams} params - The parameters for fetching customer statistic.
 * @returns {Promise<DetailedDriverSalaryInfo>}
 * Returns a promise that resolves to an object containing the customer statistic.
 */
export const customerStatisticFetcher = async (params: IndividualCustomerStatisticParams) => {
  const { organizationId, startDate, endDate, driverReportIds, customerId } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`c.id = ${customerId}`);
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
WITH waiting_for_pickup AS (
    SELECT display_order
    FROM driver_reports
    WHERE type = 'WAITING_FOR_PICKUP'
      AND organization_id = ${organizationId}
),
latest_trip_statuses AS (
    SELECT
        ot.id AS order_trip_id,
        dr.id AS driver_report_id,
        dr.display_order,
        ots.created_at,
        ot.pickup_date,
        ot.delivery_date,
        c.id AS customer_id,
        o.id AS order_id,
        o.total_amount,
        ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn
    FROM order_trip_statuses ots
    JOIN order_trip_statuses_trip_links otstl
        ON ots.id = otstl.order_trip_status_id
    JOIN order_trips ot
        ON otstl.order_trip_id = ot.id
    JOIN order_trips_order_links otol
        ON ot.id = otol.order_trip_id
    JOIN orders o
        ON otol.order_id = o.id
    JOIN orders_customer_links ocl
        ON o.id = ocl.order_id
    JOIN customers c
        ON ocl.customer_id = c.id
    JOIN order_trip_statuses_driver_report_links otsdrl
        ON ots.id = otsdrl.order_trip_status_id
    JOIN driver_reports dr
        ON otsdrl.driver_report_id = dr.id
    WHERE
        ${Prisma.join(searchConditions, " AND ")}
),
filtered_customer_trips AS (
    SELECT
        ls.order_trip_id,
        ls.customer_id,
        COALESCE(
            CASE
                WHEN ls.display_order < (SELECT display_order FROM waiting_for_pickup) THEN ls.pickup_date
                WHEN ls.display_order = (SELECT display_order FROM waiting_for_pickup) THEN ls.created_at
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
        ls.total_amount,
        ls.order_id
    FROM latest_trip_statuses ls
    WHERE ls.rn = 1
      AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
),
final_filtered_trips AS (
    SELECT *
    FROM filtered_customer_trips
    ${
      !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
        ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
        : Prisma.empty
    }
),
aggregated_orders AS (
    SELECT
        customer_id,
        order_id,
        total_amount
    FROM final_filtered_trips
    GROUP BY customer_id, order_id, total_amount
),
customer_bank_info AS (
    SELECT
        cbal.customer_id,
        ba.holder_name,
        ba.bank_name,
        ba.account_number,
        ba.bank_branch
    FROM customers_bank_account_links cbal
    JOIN bank_accounts ba
        ON cbal.bank_account_id = ba.id
    WHERE cbal.customer_id = ${customerId}
    ORDER BY ba.id
    LIMIT 1
)
SELECT
    c.id,
    c.code,
    c.name,
    c.tax_code,
    c.phone_number,
    c.email,
    c.business_address,
    c.contact_name,
    c.contact_position,
    ba.holder_name,
    ba.bank_name,
    ba.account_number,
    ba.bank_branch,
    COUNT(ft.order_trip_id) AS total_trip,
    (
        SELECT SUM(fo.total_amount)
        FROM aggregated_orders fo
        WHERE fo.customer_id = c.id
    ) AS total_amount,
    (
        SELECT COUNT(ao.order_id)
        FROM aggregated_orders ao
        WHERE ao.customer_id = c.id
    ) AS total_order
FROM customers c
LEFT JOIN final_filtered_trips ft
    ON c.id = ft.customer_id
LEFT JOIN customer_bank_info ba
    ON c.id = ba.customer_id
WHERE c.organization_id = ${organizationId}
  AND c.is_active = true
  AND c.published_at IS NOT NULL
  AND c.id = ${customerId}
GROUP BY
    c.id,
    c.code,
    c.name,
    c.tax_code,
    c.phone_number,
    c.email,
    c.business_address,
    c.contact_name,
    c.contact_position,
    ba.holder_name,
    ba.bank_name,
    ba.account_number,
    ba.bank_branch;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  const transformedData = data
    ? transformObject<DetailedCustomerStatisticInfo>(data)
    : ([] as DetailedCustomerStatisticInfo[]);
  return transformedData.length > 0 ? transformedData[0] : null;
};

/**
 * Retrieves customer statistics based on the provided parameters.
 *
 * @param {IndividualCustomerStatisticReportParams} params - The parameters for fetching customer statistics.
 * @returns {Promise<DetailedCustomerStatisticInfo | null>} A promise that resolves to the customer statistics or null if no data is found.
 */
export const getCustomerStatistics = async (params: IndividualCustomerStatisticReportParams) => {
  const { organizationId, startDate, endDate, driverReportIds, customerId } = params;

  const searchConditions: Prisma.Sql[] = [];
  searchConditions.push(Prisma.sql`ots.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`ot.organization_id = ${organizationId}`);
  searchConditions.push(Prisma.sql`dr.organization_id = ${organizationId}`);
  customerId && searchConditions.push(Prisma.sql`c.id = ${customerId}`);
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
WITH waiting_for_pickup AS (
    SELECT display_order
    FROM driver_reports
    WHERE type = 'WAITING_FOR_PICKUP'
      AND organization_id = ${organizationId}
),
latest_trip_statuses AS (
    SELECT
        ot.id AS order_trip_id,
        dr.id AS driver_report_id,
        dr.display_order,
        ots.created_at,
        ot.pickup_date,
        ot.delivery_date,
        c.id AS customer_id,
        o.id AS order_id,
        o.total_amount,
        ROW_NUMBER() OVER (PARTITION BY ot.id ORDER BY ots.created_at DESC) AS rn
    FROM order_trip_statuses ots
    JOIN order_trip_statuses_trip_links otstl
        ON ots.id = otstl.order_trip_status_id
    JOIN order_trips ot
        ON otstl.order_trip_id = ot.id
    JOIN order_trips_order_links otol
        ON ot.id = otol.order_trip_id
    JOIN orders o
        ON otol.order_id = o.id
    JOIN orders_customer_links ocl
        ON o.id = ocl.order_id
    JOIN customers c
        ON ocl.customer_id = c.id
    JOIN order_trip_statuses_driver_report_links otsdrl
        ON ots.id = otsdrl.order_trip_status_id
    JOIN driver_reports dr
        ON otsdrl.driver_report_id = dr.id
    WHERE
        ${Prisma.join(searchConditions, " AND ")}
),
filtered_customer_trips AS (
    SELECT
        ls.order_trip_id,
        ls.customer_id,
        COALESCE(
            CASE
                WHEN ls.display_order < (SELECT display_order FROM waiting_for_pickup) THEN ls.pickup_date
                WHEN ls.display_order = (SELECT display_order FROM waiting_for_pickup) THEN ls.created_at
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
        ls.total_amount,
        ls.order_id
    FROM latest_trip_statuses ls
    WHERE ls.rn = 1
      AND ls.driver_report_id IN (${Prisma.join(driverReportIds)})
),
final_filtered_trips AS (
    SELECT *
    FROM filtered_customer_trips
    ${
      !reportCalculationDateFlag || reportCalculationDateFlag === ReportCalculationDateFlag.STATUS_CREATED_AT
        ? Prisma.sql`WHERE start_date >= ${startDate} AND start_date <= ${endDate}`
        : Prisma.empty
    }
),
aggregated_orders AS (
    SELECT
        customer_id,
        order_id,
        total_amount
    FROM final_filtered_trips
    GROUP BY customer_id, order_id, total_amount
),
customer_bank_info AS (
    SELECT
        cbal.customer_id,
        ba.holder_name,
        ba.bank_name,
        ba.account_number,
        ba.bank_branch
    FROM customers_bank_account_links cbal
    JOIN bank_accounts ba
        ON cbal.bank_account_id = ba.id
    ${customerId ? Prisma.sql`WHERE cbal.customer_id = ${customerId}` : Prisma.empty}
    ORDER BY ba.id
    LIMIT 1
)
SELECT
    c.id,
    c.code,
    c.name,
    c.tax_code,
    c.phone_number,
    c.email,
    c.business_address,
    c.contact_name,
    c.contact_position,
    c.contact_phone_number,
    c.contact_email,
    ba.holder_name,
    ba.bank_name,
    ba.account_number,
    ba.bank_branch,
    COUNT(ft.order_trip_id) AS total_trip,
    (
        SELECT SUM(fo.total_amount)
        FROM aggregated_orders fo
        WHERE fo.customer_id = c.id
    ) AS total_amount,
    (
        SELECT COUNT(ao.order_id)
        FROM aggregated_orders ao
        WHERE ao.customer_id = c.id
    ) AS total_order
FROM customers c
LEFT JOIN final_filtered_trips ft
    ON c.id = ft.customer_id
LEFT JOIN customer_bank_info ba
    ON c.id = ba.customer_id
WHERE c.organization_id = ${organizationId}
  AND c.is_active = true
  AND c.published_at IS NOT NULL
  ${customerId ? Prisma.sql`AND c.id = ${customerId}` : Prisma.empty}
GROUP BY
    c.id,
    c.code,
    c.name,
    c.tax_code,
    c.phone_number,
    c.email,
    c.business_address,
    c.contact_name,
    c.contact_position,
    c.contact_phone_number,
    c.contact_email,
    ba.holder_name,
    ba.bank_name,
    ba.account_number,
    ba.bank_branch
ORDER BY c.code;
`;

  const data = await prisma.$queryRaw<AnyObject[]>(query);
  return data ? transformObject<CustomerStatisticReport>(data) : ([] as CustomerStatisticReport[]);
};

/**
 * Fetches customers that have imported drivers for a given organization
 *
 * @param token - Authentication token containing JWT and user info
 * @param params - Object containing organizationId
 * @returns Array of customer records with their imported driver data
 */
export const importDriversForCustomerFetcher = withActionExceptionHandler<
  [string, Pick<CustomerInfo, "organizationId">],
  CustomerInfo[]
>(async (token, params) => {
  const [_, { organizationId }] = params;

  // GraphQL query to get customers with imported drivers
  const query = gql`
    query ($organizationId: Int) {
      customers(
        pagination: { limit: -1 }
        filters: {
          organizationId: { eq: $organizationId }
          publishedAt: { ne: null }
          isActive: { eq: true }
          importDriver: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            code
            name
            importDriver
          }
        }
      }
    }
  `;

  // Fetch customer data using the user's org ID or provided org ID
  const { data } = await fetcher<CustomerInfo[]>(token.jwt, query, {
    organizationId: token.user?.orgId ?? organizationId,
  });

  // Return successful response with customer data or empty array if none found
  return {
    status: HttpStatusCode.Ok,
    data: data.customers ?? [],
  };
});
