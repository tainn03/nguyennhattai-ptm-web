import { UpdateDisplayOrderForm } from "@/forms/driverReport";
import { updateDisplayOrder } from "@/services/server/driverReport";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * Handles an HTTP PUT request to update driver reports and related data.
 *
 * @param req - The API request object.
 * @param requestData - The data received in the request body.
 * @returns An object with the HTTP status code indicating the result of the update.
 */
export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: Partial<UpdateDisplayOrderForm>) => {
  const { organizationId, userId } = getToken(req);
  const { driverReports } = requestData;

  const updatedDataResult = await updateDisplayOrder({
    driverReports: [...(driverReports || [])],
    organizationId,
    updatedById: userId,
  });

  if (!updatedDataResult) {
    throw new ApiError(HttpStatusCode.InternalServerError);
  }

  return { status: HttpStatusCode.Ok, data: updatedDataResult };
});
