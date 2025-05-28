import { OrganizationReportType } from "@prisma/client";

export const ORDER_META_PREFIX_KEY = "order_meta";

export const ROUTE_POINT_META_PREFIX_KEY = "route_point_meta";

export const REPORT_LIST = [
  { type: OrganizationReportType.INVOICE },
  { type: OrganizationReportType.DRIVER_SALARY },
  { type: OrganizationReportType.SUBCONTRACTOR_COST },
  { type: OrganizationReportType.FUEL_LOGS },
  { type: OrganizationReportType.ACCOUNTS_RECEIVABLE },
  { type: OrganizationReportType.AGGREGATE_ACCOUNTS_RECEIVABLE },
];
