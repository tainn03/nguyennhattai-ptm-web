import { OrganizationReportType } from "@prisma/client";
import { HttpStatusCode } from "axios";
import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";

import { getDriverSalaries } from "@/actions/drivers";
import { createDriverSalaryReport } from "@/services/server/dynamicReport";
import { getDynamicReportId } from "@/services/server/organizationReport";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { DynamicReportStatusCode, IndividualDriverSalaryReportParams } from "@/types/report";
import { getDriverSalariesReportRequest } from "@/utils/driver";
import { createTranslator } from "@/utils/locale";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * Handle POST requests to fetch driver salaries.
 *
 * This function is an Express middleware that handles POST requests to the /driver-salaries endpoint.
 * It extracts the JWT and organization ID from the request, fetches the driver salaries with these and the request data,
 * and sends the fetched data in the response.
 *
 * @param {ApiNextRequest} req - The Express request object.
 * @param {FilterRequest<OrderTripInfo>} requestData - The request data, containing the filter parameters.
 * @returns {Promise} A promise that resolves to an object containing the HTTP status code and the fetched data or an error code.
 */
export const POST = withExceptionHandler(
  async (req: ApiNextRequest, requestData: Omit<IndividualDriverSalaryReportParams, "organizationId">) => {
    const { jwt, organizationId, userId } = getToken(req);
    const { startDate, endDate, isExportList, locale, clientTimezone } = requestData;

    if (!startDate || !endDate || !locale || !clientTimezone) {
      return {
        status: HttpStatusCode.BadRequest,
        message: "Missing required parameters",
      };
    }

    const driverSalaries = await getDriverSalaries({ organizationId, ...requestData });
    const request = await getDriverSalariesReportRequest(
      {
        ...requestData,
        jwt,
        organizationId,
        userId,
      },
      driverSalaries
    );

    // Get the dynamic report ID with the JWT, organization ID, and report type
    const dynamicReportId = await getDynamicReportId(jwt, {
      organizationId,
      type: OrganizationReportType.DRIVER_SALARY,
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
    const dateFormat = t("common.format.fns.date_no_delimiter");

    // Create a driver salary report with the dynamic report ID and fetched data
    const result = await createDriverSalaryReport(
      dynamicReportId,
      formatInTimeZone(startDate, clientTimezone, dateFormat),
      formatInTimeZone(endDate, clientTimezone, dateFormat),
      request,
      isExportList,
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
  }
);
