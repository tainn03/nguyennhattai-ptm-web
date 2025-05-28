import { OrderTripStatusType } from "@prisma/client";
import moment from "moment";

import { deprecatedGetDriverSalaryById, getDriverSalaryById } from "@/services/server/driver";
import { getDriverReportsByTypes } from "@/services/server/driverReport";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { IndividualDriverSalaryParams, MobileSalariesParams } from "@/types/report";
import { getToken, withExceptionHandler } from "@/utils/server";

type DeprecatedMonthlyPeriod = {
  month: number;
  year: number;
};

type DeprecatedMobileSalariesParams = {
  organizationId: number;
  driverId: number;
  monthlyPeriods: DeprecatedMonthlyPeriod[];
};

/**
 * Handles the PUT request to retrieve driver salaries and calculate salary variance.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {MobileSalariesParams} data - The parameters containing organization ID, driver ID, and monthly periods.
 * @returns {Promise<ApiResult<MobileDriverSalaries>>} The response object containing the status, optional error code, message, and data.
 */
export const PUT = withExceptionHandler(async (req: ApiNextRequest, data: MobileSalariesParams) => {
  const { jwt } = getToken(req);
  const { organizationId, driverId, monthlyPeriods } = data;

  const driverReports = await getDriverReportsByTypes(jwt, organizationId, [
    OrderTripStatusType.DELIVERED,
    OrderTripStatusType.COMPLETED,
  ]);

  if (!driverReports || driverReports.length === 0) {
    return { status: HttpStatusCode.NotFound, code: ErrorType.NOT_FOUND, message: "No driver reports found" };
  }

  const driverReportIds = driverReports.map((report) => Number(report.id));
  const driverSalaries = monthlyPeriods.map((periods) =>
    getSalary({ organizationId, driverId, driverReportIds, ...periods })
  );

  const salaries = await Promise.all(driverSalaries);
  const salariesWithVariance = salaries.slice(0, -1).map((salary, index) => {
    const nextSalary = salaries[index + 1];
    return {
      ...salary,
      salaryVariance:
        salary && nextSalary ? calculateSalaryVariance(salary.tripSalaryTotal, nextSalary.tripSalaryTotal) : null,
    };
  });

  return { status: HttpStatusCode.Ok, data: salariesWithVariance };
});

/**
 * Retrieves the salary for an individual driver based on the provided parameters.
 *
 * @param {IndividualDriverSalaryParams} params - The parameters containing the driver ID and other relevant information.
 * @returns {Promise<any>} A promise that resolves to the driver's salary information.
 */
const getSalary = async (params: IndividualDriverSalaryParams) => {
  return await getDriverSalaryById(params);
};

/**
 * Calculates the salary variance percentage between the current month and the previous month.
 *
 * @param {string | null} currentMonthSalary - The salary for the current month.
 * @param {string | null} previousMonthSalary - The salary for the previous month.
 * @returns {string | number | null} The salary variance percentage as a string, 0 if the salaries are equal, or null if the calculation cannot be performed.
 */
const calculateSalaryVariance = (
  currentMonthSalary: string | null,
  previousMonthSalary: string | null
): string | number | null => {
  const VARIANCE_LIMIT = 100000;
  const current = Number(currentMonthSalary);
  const previous = Number(previousMonthSalary);

  if (!currentMonthSalary || !previousMonthSalary || previous === 0 || current === 0) {
    return null;
  }

  if (previous === current) {
    return 0;
  }

  const result = ((current - previous) / previous) * 100;
  if (!Number.isFinite(result) || Number.isNaN(result) || result > VARIANCE_LIMIT || result < -VARIANCE_LIMIT) {
    return null;
  }

  return result.toFixed(2);
};

/**
 * Handles the POST request to retrieve driver salaries and calculate salary variance.
 * Deprecated in favor of the GET request.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {DeprecatedMobileSalariesParams} data - The parameters containing organization ID, driver ID, and monthly periods.
 * @returns {Promise<ApiResult<MobileDriverSalaries>>} The response object containing the status, optional error code, message, and data.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, data: DeprecatedMobileSalariesParams) => {
  const { jwt } = getToken(req);
  const { organizationId, driverId, monthlyPeriods } = data;

  const driverReports = await getDriverReportsByTypes(jwt, organizationId, [
    OrderTripStatusType.DELIVERED,
    OrderTripStatusType.COMPLETED,
  ]);

  if (!driverReports || driverReports.length === 0) {
    return { status: HttpStatusCode.NotFound, code: ErrorType.NOT_FOUND, message: "No driver reports found" };
  }

  const driverReportIds = driverReports.map((report) => Number(report.id));

  // Add an extra month to the monthlyPeriods
  const extendedMonthlyPeriods = [...monthlyPeriods, getPreviousMonth(monthlyPeriods[monthlyPeriods.length - 1])];

  const driverSalaries = extendedMonthlyPeriods.map(({ month, year }) => {
    const { startDate, endDate } = calculateStartEndDates(month, year);
    return deprecatedGetSalary({
      organizationId,
      driverId,
      driverReportIds,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  });

  const salaries = await Promise.all(driverSalaries);
  const salariesWithVariance = salaries.slice(0, -1).map((salary, index) => {
    const nextSalary = salaries[index + 1];
    return {
      ...salary,
      salaryVariance:
        salary && nextSalary ? calculateSalaryVariance(salary.tripSalaryTotal, nextSalary.tripSalaryTotal) : null,
    };
  });
  return { status: HttpStatusCode.Ok, data: salariesWithVariance };
});

const calculateStartEndDates = (month: number, year: number) => {
  const startDate = moment({ year, month: month - 1 })
    .startOf("month")
    .toDate();
  const endDate = moment({ year, month: month - 1 })
    .endOf("month")
    .toDate();
  return { startDate, endDate };
};

const getPreviousMonth = (period: DeprecatedMonthlyPeriod): DeprecatedMonthlyPeriod => {
  const date = moment({ year: period.year, month: period.month - 1 }).subtract(1, "month");
  return {
    month: date.month() + 1,
    year: date.year(),
  };
};

const deprecatedGetSalary = async (params: IndividualDriverSalaryParams) => {
  return await deprecatedGetDriverSalaryById(params);
};
