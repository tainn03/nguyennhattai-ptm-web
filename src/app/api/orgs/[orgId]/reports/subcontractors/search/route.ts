import { subcontractorCostsFetcher } from "@/services/server/subcontractorReport";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { SubcontractorCostQueryParams } from "@/types/report";
import { withExceptionHandler } from "@/utils/server";

/**
 * Handles the POST request to fetch costs for a subcontractor.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {SubcontractorCostQueryParams } param - The request data.
 * @returns {Promise<{ status: HttpStatusCode; code?: ErrorType; message?: string; data?: any }>} The response object containing status, code, message, and data.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, param: SubcontractorCostQueryParams) => {
  const data = await subcontractorCostsFetcher(param);
  return { status: HttpStatusCode.Ok, data: data };
});
