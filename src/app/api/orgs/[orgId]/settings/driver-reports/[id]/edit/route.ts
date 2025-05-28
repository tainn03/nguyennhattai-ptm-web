import { DriverReportInputForm } from "@/forms/driverReport";
import {
  checkDriverReportExclusives,
  checkDriverReportNameExists,
  checkIsSystemDriverReport,
  updateDriverReport,
} from "@/services/server/driverReport";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Handles an HTTP PUT request to update a driver report and related data.
 *
 * @param req - The API request object.
 * @param requestData - The data received in the request body.
 * @returns An object with the HTTP status code indicating the result of the update.
 */
export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: DriverReportInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { id, name, updatedAt, isRequired, photoRequired, billOfLadingRequired, reportDetails, ...otherProps } =
    requestData;

  // Check if a driver report has been updated by comparing its last update timestamp. If it has, return a Conflict error.
  const isErrorExclusives = await checkDriverReportExclusives(jwt, organizationId, Number(id), ensureString(updatedAt));
  if (isErrorExclusives) {
    return { status: HttpStatusCode.Conflict, code: ErrorType.EXCLUSIVE };
  }

  // Check if a driver report with the same name already exists. If it does, return a Conflict error.
  const isDriverReportNameExists = await checkDriverReportNameExists(
    jwt,
    organizationId,
    ensureString(name),
    Number(id)
  );
  if (isDriverReportNameExists) {
    return { status: HttpStatusCode.Conflict, code: ErrorType.EXISTED };
  }

  // Check if a driver report is a system data
  const isSystemData = await checkIsSystemDriverReport(jwt, organizationId, Number(id));

  const result = await updateDriverReport({
    id: Number(id),
    organizationId,
    name: ensureString(name),
    reportDetails,
    isRequired,
    photoRequired,
    billOfLadingRequired,
    updatedById: userId,
    ...(!isSystemData && { ...otherProps }),
  });

  return { status: HttpStatusCode.Ok, data: result };
});
