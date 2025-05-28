import { OrganizationReportType } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";
import FormData from "form-data";
import fs from "fs-extra";

import { REPORT_API_URL, REPORT_TOKEN_KEY } from "@/configs/environment";
import { AnyObject } from "@/types";
import { CreateReportParams, ExportReportRequest, ReportResponse } from "@/types/dynamicReport";
import { LocaleType } from "@/types/locale";
import {
  AggregateCustomerReport,
  CustomerStatisticReport,
  DriverSalaryReport,
  ReportRequest,
  SubcontractorCostReport,
} from "@/types/report";
import { FuelLogsHistoryExportData } from "@/types/report";
import { post } from "@/utils/api";
import { getFullName } from "@/utils/auth";
import { createTranslator } from "@/utils/locale";
import { slugifyString } from "@/utils/string";

/**
 * The header configuration for the request.
 */
const headerConfig = {
  headers: {
    Authorization: `Bearer ${REPORT_TOKEN_KEY}`,
  },
};

export type ExportOptions = {
  clientTimezone: string;
  dateFormat?: string;
  timeFormat?: string;
};

/**
 * Formats a given date according to the specified timezone and format.
 *
 * @param date - The date to format. Can be a Date object, null, or undefined.
 * @param timezone - The timezone in which to format the date.
 * @param format - The format string to use for formatting the date.
 * @returns The formatted date string, or an empty string if the date is null or undefined.
 */
export const formatDate = (date: Date | null | undefined, timezone: string, format: string): string => {
  return date ? formatInTimeZone(date, timezone, format) : "";
};

/**
 * Exports a report based on the provided parameters.
 *
 * @template T - The type of the data object.
 * @param {Object} params - The parameters for exporting the report.
 * @param {string} params.dynamicTemplateId - The ID of the dynamic template to use for the report.
 * @param {string} params.downloadFileName - The name of the file to download.
 * @param {T} params.data - The data to include in the report.
 * @param {boolean} [params.exportPdf=false] - Whether to export the report as a PDF.
 * @param {string} [params.returnType="url"] - The type of return value, either "url" or "blob".
 * @returns {Promise<ReportResponse | undefined>} A promise that resolves to the report response or undefined.
 */
export const exportReport = async <T = AnyObject>({
  dynamicTemplateId,
  downloadFileName,
  data,
  exportPdf = false,
  returnType = "url",
}: ExportReportRequest<T>): Promise<ReportResponse | undefined> => {
  // Send request to generate report
  const result = await post<ReportResponse>(
    `${REPORT_API_URL}/report/export`,
    {
      reportId: dynamicTemplateId,
      reportName: downloadFileName,
      exportPdf,
      returnType,
      data: JSON.stringify(data),
    },
    headerConfig
  );
  return result;
};

/**
 * Create a driver salary report.
 *
 * This function is called with a dynamic report ID and data to create a driver salary report.
 * It currently returns a hardcoded URL to an example report.
 *
 * @param {string} reportId - The dynamic report ID.
 * @param {string} startDate - Report start date.
 * @param {string} endDate - Report end date.
 * @param {string} request - The data to include in the report.
 * @param {boolean} isExportList - A flag indicating whether the report is an export list.
 * @param {LocaleType} locale - The locale code for the desired language.
 * @returns {Promise<string | undefined>} A promise that resolves to the URL to the report or undefined if the creation was not successful.
 */
export const createDriverSalaryReport = async (
  reportId: string,
  startDate: string,
  endDate: string,
  request: ReportRequest<DriverSalaryReport>[],
  isExportList?: boolean,
  locale?: LocaleType
) => {
  const t = await createTranslator(locale);
  let reportName = "";

  const date = `${startDate}-${endDate}`;
  if (!isExportList && request && request.length === 1) {
    reportName = t("report.drivers.driver_salary_file_name", {
      date,
      name: slugifyString(getFullName(request[0].data.body.firstName, request[0].data.body.lastName), {
        separator: "-",
      }).toUpperCase(),
    });
  } else {
    reportName = t("report.drivers.general_salary_file_name", { date });
  }

  const result = await post<AnyObject>(
    `${REPORT_API_URL}/report/export`,
    {
      reportId,
      reportName,
      exportPdf: false,
      returnType: "url",
      data: JSON.stringify(request),
    },
    headerConfig
  );

  return result;
};

/**
 * Upload a dynamic report.
 *
 * This function is called to upload a dynamic report.
 * It generates a random UUID and returns it.
 * The returned UUID can be used as a unique identifier for the uploaded report.
 *
 * @returns {Promise<string>} A promise that resolves to a random UUID.
 */
export const uploadDynamicReport = async (filePath: string) => {
  const data = new FormData();
  const { reportId } = await post<AnyObject>(
    `${REPORT_API_URL}/report/upload`,
    {
      file: fs.createReadStream(filePath),
    },
    {
      headers: {
        ...headerConfig.headers,
        ...data.getHeaders(),
      },
    }
  );

  return reportId;
};

/**
 * Create a subcontractor cost report.
 *
 * This function is called with a dynamic report ID and data to create a subcontractor cost report.
 * It currently returns a hardcoded URL to an example report.
 *
 * @param {string} reportId - The dynamic report ID.
 * @param {string} startDate - Report start date.
 * @param {string} endDate - Report end date.
 * @param {string} request - The data to include in the report.
 * @param {boolean} isExportList - A flag indicating whether the report is an export list.
 * @param {string} locale - The locale code for the desired language.
 * @returns {Promise<string | undefined>} A promise that resolves to the URL to the report or undefined if the creation was not successful.
 */
export const createSubcontractorCostReport = async (
  reportId: string,
  startDate: string,
  endDate: string,
  request: ReportRequest<SubcontractorCostReport>[],
  isExportList?: boolean,
  locale?: LocaleType
) => {
  const t = await createTranslator(locale);
  let reportName = "";
  const date = `${startDate}-${endDate}`;
  if (!isExportList && request && request.length === 1) {
    reportName = t("report.subcontractors.subcontractor_code_file_name", {
      date,
      name: slugifyString(getFullName(request[0].data.body.name), { separator: "-" }).toUpperCase(),
    });
  } else {
    reportName = t("report.subcontractors.general_cost_file_name", { date });
  }

  const result = await post<AnyObject>(
    `${REPORT_API_URL}/report/export`,
    {
      reportId,
      reportName,
      exportPdf: false,
      returnType: "url",
      data: JSON.stringify(request),
    },
    headerConfig
  );

  return result;
};

/**
 * Create a Accounts Receivable Report.
 *
 * This function is called with a dynamic report ID and data to create a driver salary report.
 * It currently returns a hardcoded URL to an example report.
 *
 * @param {OrganizationReportType} type - The report type.
 * @param {string} reportId - The dynamic report ID.
 * @param {string} startDate - Report start date.
 * @param {string} endDate - Report end date.
 * @param {string} request - The data to include in the report.
 * @param {LocaleType} locale - The locale code for the desired language.
 * @returns {Promise<string | undefined>} A promise that resolves to the URL to the report or undefined if the creation was not successful.
 */
export const createCustomerStatisticReport = async (
  type: OrganizationReportType,
  reportId: string,
  startDate: string,
  endDate: string,
  request: ReportRequest<CustomerStatisticReport>[] | ReportRequest<AggregateCustomerReport>[],
  isExportList?: boolean,
  locale?: LocaleType
) => {
  const t = await createTranslator(locale);
  let reportName = "";
  const date = `${startDate}-${endDate}`;
  if (type === OrganizationReportType.ACCOUNTS_RECEIVABLE) {
    if (!isExportList && request && request.length === 1 && "name" in request[0].data.body) {
      reportName = t("report.customers.accounts_receivable_file_name", {
        date,
        name: slugifyString(getFullName(request[0].data.body.name), { separator: "-" }).toUpperCase(),
      });
    } else {
      reportName = t("report.customers.general_accounts_receivable_file_name", { date });
    }
  } else {
    reportName = t("report.customers.aggregate_accounts_receivable_file_name", { date });
  }

  const result = await post<AnyObject>(
    `${REPORT_API_URL}/report/export`,
    {
      reportId,
      reportName,
      exportPdf: false,
      returnType: "url",
      data: JSON.stringify(request),
    },
    headerConfig
  );

  return result;
};

/**
 * Generates a history fuel logs report for a specified date range and returns the report URL.
 * @param {string} reportId - The unique identifier for the report.
 * @param {string} startDate - The start date for the report in the format 'YYYY-MM-DD'.
 * @param {string} endDate - The end date for the report in the format 'YYYY-MM-DD'.
 * @param {ReportRequest<FuelLogsHistoryExportData>} request - The request object containing the data for the report.
 * @param {LocaleType} [locale] - Optional locale parameter for translation purposes.
 * @returns {Promise<AnyObject>} - Returns a promise that resolves to the result of the report generation, typically a URL.
 */
export const createHistoryFuelLogsReport = async (
  reportId: string,
  startDate: string,
  endDate: string,
  request: ReportRequest<FuelLogsHistoryExportData>[],
  locale?: LocaleType
) => {
  const t = await createTranslator(locale);
  const date = `${startDate}-${endDate}`;
  const reportName = t("report.fuel_log.history_fuel_logs_file_name", { date });
  const result = await post<AnyObject>(
    `${REPORT_API_URL}/report/export`,
    {
      reportId,
      reportName,
      exportPdf: false,
      returnType: "url",
      data: JSON.stringify(request),
    },
    headerConfig
  );

  return result;
};

/**
 * ## Create Report
 *
 * Generates a report based on provided parameters and returns the URL to access the report file.
 * This function is flexible for different report types, allowing customization of the report name,
 * the data included in the report, and export options.
 *
 * ### Parameters
 * - `reportId` (string): The dynamic report ID for identifying the report type.
 * - `reportName` (string): The name to assign to the generated report.
 * - `request` (Array<ReportData>): An array of data objects to include in the report.
 * - `exportPdf` (boolean, optional): A flag indicating if the report should be exported as a PDF. Defaults to `false`.
 *
 * ### Returns
 * - `Promise<ReportResponse | undefined>`: A promise that resolves to an object containing the report URL and status or undefined if the report creation failed.
 */
export const createReport = async ({
  reportId,
  reportName,
  request,
  exportPdf = false,
}: CreateReportParams): Promise<ReportResponse | undefined> => {
  // Send request to generate report
  const result = await post<ReportResponse>(
    `${REPORT_API_URL}/report/export`,
    {
      reportId,
      reportName,
      exportPdf,
      returnType: "url",
      data: JSON.stringify(request),
    },
    headerConfig
  );

  return result;
};
