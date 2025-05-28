import { HttpStatusCode } from "axios";
import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";

import { getCustomerStatistics } from "@/actions/customers";
import { createCustomerStatisticReport } from "@/services/server/dynamicReport";
import { getDynamicReportId } from "@/services/server/organizationReport";
import { ApiNextRequest } from "@/types/api";
import { DynamicReportStatusCode, IndividualCustomerStatisticReportParams } from "@/types/report";
import { getCustomerStatisticReportRequest } from "@/utils/customer";
import { createTranslator } from "@/utils/locale";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * Handle POST requests to fetch customer statistics.
 *
 * It extracts the JWT and organization ID from the request, fetches the customer statistics with these and the request data,
 * and sends the fetched data in the response.
 *
 * @param {ApiNextRequest} req - The Express request object.
 * @param {FilterRequest<OrderTripInfo>} requestData - The request data, containing the filter parameters.
 * @returns {Promise} A promise that resolves to an object containing the HTTP status code and the fetched data or an error code.
 */
export const POST = withExceptionHandler(
  async (req: ApiNextRequest, requestData: Omit<IndividualCustomerStatisticReportParams, "organizationId">) => {
    const { jwt, organizationId, userId } = getToken(req);
    const { type, startDate, endDate, isExportList, locale, clientTimezone } = requestData;

    if (!type || !startDate || !endDate || !locale || !clientTimezone) {
      return {
        status: HttpStatusCode.BadRequest,
        message: "Missing required parameters",
      };
    }

    const customerStats = await getCustomerStatistics({ organizationId, ...requestData });
    const request = await getCustomerStatisticReportRequest(
      {
        ...requestData,
        jwt,
        organizationId,
        userId,
      },
      customerStats
    );

    // Get the dynamic report ID with the JWT, organization ID, and report type
    const dynamicReportId = await getDynamicReportId(jwt, { organizationId, type });

    // If the dynamic report ID was not fetched successfully, return an error
    if (!dynamicReportId) {
      return {
        status: HttpStatusCode.InternalServerError,
        message: "Dynamic report ID not found",
      };
    }

    const t = await createTranslator(locale);
    const dateFormat = t("common.format.fns.date_no_delimiter");

    // Create a driver salary report with the dynamic report ID and fetched data
    const result = await createCustomerStatisticReport(
      type,
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
        message: "Report service cannot generate the report",
      };
    } else {
      return { status: HttpStatusCode.Ok, data: result.url };
    }
  }
);
