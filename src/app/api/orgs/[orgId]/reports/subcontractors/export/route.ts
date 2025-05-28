import { OrganizationReportType } from "@prisma/client";
import { HttpStatusCode } from "axios";
import { formatInTimeZone } from "date-fns-tz/formatInTimeZone";

import { getSubcontractorCosts } from "@/actions/subcontractors";
import { createSubcontractorCostReport } from "@/services/server/dynamicReport";
import { getDynamicReportId } from "@/services/server/organizationReport";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { DynamicReportStatusCode, IndividualSubcontractorCostReportParams } from "@/types/report";
import { createTranslator } from "@/utils/locale";
import { getToken, withExceptionHandler } from "@/utils/server";
import { getSubcontractorCostReportRequest } from "@/utils/subcontractor";

/**
 * Handle POST requests to fetch subcontractor costs.
 *
 * This function is an Express middleware that handles POST requests to the /subcontractor-costs endpoint.
 * It extracts the JWT and organization ID from the request, fetches the subcontractor costs with these and the request data,
 * and sends the fetched data in the response.
 *
 * @param {ApiNextRequest} req - The Express request object.
 * @param {FilterRequest<SubcontractorInfo>} requestData - The request data, containing the filter parameters.
 * @returns {Promise} A promise that resolves to an object containing the HTTP status code and the fetched data or an error code.
 */

export const POST = withExceptionHandler(
  async (req: ApiNextRequest, requestData: Omit<IndividualSubcontractorCostReportParams, "organizationId">) => {
    const { jwt, organizationId, userId } = getToken(req);
    const { startDate, endDate, isExportList, locale, clientTimezone } = requestData;

    if (!startDate || !endDate || !locale || !clientTimezone) {
      return {
        status: HttpStatusCode.BadRequest,
        message: "Missing required parameters",
      };
    }

    const subcontractorCost = await getSubcontractorCosts({ organizationId, ...requestData });
    const request = await getSubcontractorCostReportRequest(
      {
        ...requestData,
        jwt,
        organizationId,
        userId,
      },
      subcontractorCost
    );

    // Get the dynamic report ID with the JWT, organization ID, and report type
    const dynamicReportId = await getDynamicReportId(jwt, {
      organizationId,
      type: OrganizationReportType.SUBCONTRACTOR_COST,
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

    // Create a subcontractor costs report with the dynamic report ID and fetched data
    const result = await createSubcontractorCostReport(
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
