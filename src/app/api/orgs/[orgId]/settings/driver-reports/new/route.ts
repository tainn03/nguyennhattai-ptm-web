import { DriverReportInputForm } from "@/forms/driverReport";
import { checkDriverReportNameExists, createDriverReport } from "@/services/server/driverReport";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Handles an HTTP POST request to create a driver report and related data.
 *
 * @param req - The API request object.
 * @param requestData - The data received in the request body.
 * @returns An object with the HTTP status code indicating the result of the creation.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: DriverReportInputForm) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);
  const { name, ...otherProps } = requestData;

  // Check if a driver report with the same name already exists. If it does, return a Conflict error.
  const isDriverReportNameExists = await checkDriverReportNameExists(jwt, organizationId, ensureString(name));

  if (isDriverReportNameExists) {
    return { status: HttpStatusCode.Conflict, code: ErrorType.EXISTED };
  }

  const result = await createDriverReport(jwt, {
    ...otherProps,
    name,
    organizationId,
    createdById,
    isSystem: false,
    type: null,
  });

  return { status: HttpStatusCode.Ok, data: result };
});
