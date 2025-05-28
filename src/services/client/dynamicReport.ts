import { ApiResult } from "@/types/api";
import {
  IndividualCustomerStatisticReportParams,
  IndividualDriverSalaryReportParams,
  IndividualSubcontractorCostReportParams,
} from "@/types/report";
import { IndividualFuelLogsHistoryQueryParams } from "@/types/report";
import { post } from "@/utils/api";
import { getClientTimezone } from "@/utils/date";
import { trim } from "@/utils/string";

/**
 * Export the salary information of a driver.
 * It sends a POST request to the server with the filter parameters, calculates the driver salaries from the fetched data,
 * and returns the calculated salaries or an error.
 *
 * @param {FilterRequest<OrderTripInfo>} params - The request data, containing the filter parameters.
 * @returns {Promise<{data: DriverSalary[]}|{error: ErrorType}>} A promise that resolves to an object containing the calculated salaries or an error.
 */
export const exportDriverSalaries = async (
  params: Omit<IndividualDriverSalaryReportParams, "organizationId"> & { organizationCode: string }
) => {
  const { organizationCode, ...otherProps } = trim(params);

  const clientTimezone = getClientTimezone();
  const result = await post<ApiResult<string>>(`/api/orgs/${organizationCode}/reports/drivers/export`, {
    ...otherProps,
    clientTimezone,
  });

  return result;
};

/**
 * Exports the accounts receivable report for a specific organization.
 *
 * @param {Omit<IndividualCustomerStatisticReportParams, "organizationId"> & { organizationCode: string }} params - The parameters for the report, excluding organizationId but including organizationCode.
 * @returns {Promise<ApiResult<string>>} A promise that resolves to the result of the report export.
 */
export const exportCustomerReport = async (
  params: Omit<IndividualCustomerStatisticReportParams, "organizationId"> & { organizationCode: string }
) => {
  const { organizationCode, ...otherProps } = trim(params);

  const clientTimezone = getClientTimezone();
  const result = await post<ApiResult<string>>(`/api/orgs/${organizationCode}/reports/customers/export`, {
    ...otherProps,
    clientTimezone,
  });

  return result;
};

/**
 * Export the subcontractor cost information.
 * This function sends a POST request to the server with the filter parameters,
 * calculates the subcontractor costs from the fetched data,
 * and returns the calculated costs or an error.
 *
 * @param {Omit<IndividualSubcontractorCostReportParams, "organizationId">} params - The request data, containing the filter parameters.
 * @returns {Promise<{data: SubcontractorCost[]}|{error: ErrorType}>}
 * A promise that resolves to an object containing the calculated costs or an error.
 */
export const exportSubcontractorCosts = async (
  params: Omit<IndividualSubcontractorCostReportParams, "organizationId"> & { organizationCode: string }
) => {
  // Extract necessary parameters from the input
  const { organizationCode, ...otherProps } = trim(params);

  const clientTimezone = getClientTimezone();
  // Send a POST request to the server to export subcontractor cost report
  const result = await post<ApiResult<string>>(`/api/orgs/${organizationCode}/reports/subcontractors/export`, {
    ...otherProps,
    clientTimezone,
  });

  return result;
};

/**
 * Exports the history of fuel logs for a given organization.
 * @param {Omit<IndividualFuelLogsHistoryQueryParams, "clientTimezone">} params - The query parameters required for the report,
 * excluding the client's timezone. It includes all necessary details for the API to process the request.
 * @returns {Promise<ApiResult<string>>} - A promise that resolves to the API result, which contains a string response
 * indicating the status or outcome of the export operation.
 */
export const exportHistoryFuelLogs = async (params: Omit<IndividualFuelLogsHistoryQueryParams, "clientTimezone">) => {
  // Extract necessary parameters from the input
  const { organizationCode, ...otherProps } = trim(params);

  const clientTimezone = getClientTimezone();
  const result = await post<ApiResult<string>>(`/api/orgs/${organizationCode}/reports/fuel-logs/export`, {
    ...otherProps,
    clientTimezone,
  });

  return result;
};
