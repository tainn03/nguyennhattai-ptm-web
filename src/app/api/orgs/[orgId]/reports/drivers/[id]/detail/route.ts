import { OrderTripStatusType } from "@prisma/client";
import moment from "moment";

import { getDriverReportsByTypes } from "@/services/server/driverReport";
import { deprecatedGetDriverPaidTrips, getDriverPaidTrips } from "@/services/server/orderTrip";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { IndividualDriverSalaryParams } from "@/types/report";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * Handles the PUT request to fetch paid trips for a driver within a specific month and year.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {IndividualDriverSalaryParams & { month: number; year: number }} data - The data object containing month, year, organizationId, and driverId.
 * @returns {Promise<{ status: HttpStatusCode; code?: ErrorType; message?: string; data?: any }>} The response object containing status, code, message, and data.
 */
export const PUT = withExceptionHandler(async (req: ApiNextRequest, data: IndividualDriverSalaryParams) => {
  const { jwt } = getToken(req);
  const { startDate, endDate, organizationId, driverId } = data;

  // Fetch driver reports for the given organization and statuses
  const driverReports = await getDriverReportsByTypes(jwt, organizationId, [
    OrderTripStatusType.DELIVERED,
    OrderTripStatusType.COMPLETED,
  ]);

  // Handle case where no driver reports are found
  if (!driverReports || driverReports.length === 0) {
    return { status: HttpStatusCode.NotFound, code: ErrorType.NOT_FOUND, message: "No driver reports found" };
  }

  // Collect IDs of driver reports
  const driverReportIds = driverReports.map((report) => Number(report.id));

  // Fetch paid trips for the given date range
  const paidTrips = await getDriverPaidTrips({ organizationId, driverReportIds, driverId, startDate, endDate });

  return { status: HttpStatusCode.Ok, data: paidTrips };
});

/**
 * Handles the POST request to fetch paid trips for a driver within a specific month and year.
 * Deprecated in favor of the GET request.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {IndividualDriverSalaryParams & { month: number; year: number }} data - The data object containing month, year, organizationId, and driverId.
 * @returns {Promise<{ status: HttpStatusCode; code?: ErrorType; message?: string; data?: any }>} The response object containing status, code, message, and data.
 */
export const POST = withExceptionHandler(
  async (req: ApiNextRequest, data: IndividualDriverSalaryParams & { month: number; year: number }) => {
    const { jwt } = getToken(req);
    const { month, year, organizationId, driverId } = data;

    // Calculate start and end dates for the given month and year
    const { startDate, endDate } = calculateStartEndDates(month, year);

    // Fetch driver reports for the given organization and statuses
    const driverReports = await getDriverReportsByTypes(jwt, organizationId, [
      OrderTripStatusType.DELIVERED,
      OrderTripStatusType.COMPLETED,
    ]);

    // Handle case where no driver reports are found
    if (!driverReports || driverReports.length === 0) {
      return { status: HttpStatusCode.NotFound, code: ErrorType.NOT_FOUND, message: "No driver reports found" };
    }

    // Collect IDs of driver reports
    const driverReportIds = driverReports.map((report) => Number(report.id));

    // Fetch paid trips for the given date range
    const paidTrips = await deprecatedGetDriverPaidTrips({
      organizationId,
      driverReportIds,
      driverId,
      startDate,
      endDate,
    });

    return { status: HttpStatusCode.Ok, data: paidTrips };
  }
);

/**
 * Calculates the start and end dates for a given month and year.
 *
 * @param {number} month - The month for which to calculate the dates (1-based).
 * @param {number} year - The year for which to calculate the dates.
 */
const calculateStartEndDates = (month: number, year: number) => {
  const startDate = moment({ year, month: month - 1 })
    .startOf("month")
    .toISOString();
  const endDate = moment({ year, month: month - 1 })
    .endOf("month")
    .toISOString();
  return { startDate, endDate };
};
