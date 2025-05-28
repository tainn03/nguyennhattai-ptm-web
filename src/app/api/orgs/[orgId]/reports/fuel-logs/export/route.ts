import { OrganizationReportType } from "@prisma/client";
import { HttpStatusCode } from "axios";
import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";
import isNumber from "lodash/isNumber";
import isString from "lodash/isString";

import { createHistoryFuelLogsReport } from "@/services/server/dynamicReport";
import { getExportFuelLogs } from "@/services/server/fuelLog";
import { getDynamicReportId } from "@/services/server/organizationReport";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { DynamicReportStatusCode } from "@/types/report";
import { FuelLogsHistoryExportParams } from "@/types/report";
import { getFuelLogReportRequest } from "@/utils/fuelLog";
import { createTranslator } from "@/utils/locale";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * Handle POST requests to export history fuel costs.
 *
 * This function is an Express middleware that handles POST requests to the /subcontractor-costs endpoint.
 * It extracts the JWT and organization ID from the request, fetches the subcontractor costs with these and the request data,
 * and sends the fetched data in the response.
 *
 * @param {ApiNextRequest} req - The Express request object.
 * @param {FilterRequest<SubcontractorInfo>} requestData - The request data, containing the filter parameters.
 * @returns {Promise} A promise that resolves to an object containing the HTTP status code and the fetched data or an error code.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: FuelLogsHistoryExportParams) => {
  const { jwt, organizationId, user } = getToken(req);
  const { startDate, endDate, driverId, gasStationId, locale, clientTimezone } = requestData;

  if (!startDate || !endDate || !locale || !clientTimezone) {
    return {
      status: HttpStatusCode.BadRequest,
      message: "Missing required parameters",
    };
  }

  if (driverId) {
    if (!isString(driverId) && !isNumber(driverId)) {
      return {
        status: HttpStatusCode.BadRequest,
        message: "driverId must be string or number",
      };
    }
  }

  if (gasStationId) {
    if (!isString(gasStationId) && !isNumber(gasStationId)) {
      return {
        status: HttpStatusCode.BadRequest,
        message: "gasStationId must be string or number",
      };
    }
  }

  // Get the dynamic report ID with the JWT, organization ID, and report type
  const dynamicReportId = await getDynamicReportId(jwt, {
    organizationId,
    type: OrganizationReportType.FUEL_LOGS,
  });

  // If the dynamic report ID was not fetched successfully, return an error
  if (!dynamicReportId) {
    return {
      status: HttpStatusCode.InternalServerError,
      code: ErrorType.UNKNOWN,
      message: "Dynamic report ID not found",
    };
  }

  const t = await createTranslator(locale);

  // Query list history logs filtered
  const fuelLogData = await getExportFuelLogs(jwt, { ...requestData, organizationId });
  const reportRequest = await getFuelLogReportRequest(
    jwt,
    organizationId,
    user.id,
    startDate,
    endDate,
    clientTimezone,
    fuelLogData,
    locale
  );

  // Create a history fuel costs report with the dynamic report ID and fetched data
  const result = await createHistoryFuelLogsReport(
    dynamicReportId,
    formatInTimeZone(startDate, clientTimezone, t("common.format.fns.date_no_delimiter")),
    formatInTimeZone(endDate, clientTimezone, t("common.format.fns.date_no_delimiter")),
    reportRequest,
    locale
  );

  if (!result.url || result.status === DynamicReportStatusCode.NOT_GOOD) {
    return {
      status: HttpStatusCode.InternalServerError,
      code: ErrorType.UNKNOWN,
      message: "Report service cannot generate the report",
    };
  } else {
    return { status: HttpStatusCode.Ok, data: result.url };
  }
});
