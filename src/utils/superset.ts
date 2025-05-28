import snakeCase from "lodash/snakeCase";

import { NEXT_PUBLIC_SUPERSET_BASE_URL, SUPERSET_API_URL } from "@/configs/environment";
import { AnyObject } from "@/types";
import {
  SupersetChartDataRequest,
  SupersetChartDataResponse,
  SupersetDatasetResponse,
  SupersetLoginRequest,
  SupersetLoginResponse,
} from "@/types/superset";

import { get, post } from "./api";
import { objectToQueryString } from "./string";

/**
 * Type representing embed data.
 */
export type EmbedData = AnyObject & {
  orgId?: number;
  userId?: number;
  driverId?: number;
  vehicleId?: number;
  date?: Date | string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
};

/**
 * Type representing options for embedding analytics.
 */
export type EmbedOptions = {
  chartId?: string;
  standalone?: number;
  tz?: string;
  data?: EmbedData;
};

/**
 * Converts an object with camelCase keys to snake_case keys.
 * If a value is a Date, it converts the value to its ISO string representation.
 *
 * @param data - The data object to convert. If undefined or null, returns an empty object.
 * @returns A new object with snake_case keys and ISO date strings for Date values.
 */
function convertDataToParameters(data?: EmbedData | null): AnyObject {
  if (!data) {
    return {};
  }

  const obj: AnyObject = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      if (value instanceof Date) {
        obj[snakeCase(key)] = value.toISOString();
      } else {
        obj[snakeCase(key)] = value;
      }
    }
  });
  return obj;
}

/**
 * Generates the embed URL for the specified analytics chart.
 *
 * @param options - Options for embedding the analytics chart.
 * @param options.chartId - The ID of the chart to embed.
 * @param options.standalone - Whether to show the chart in standalone mode.
 * @param options.tz - Timezone for the chart display.
 * @param options.data - Data to embed with the chart.
 * @returns The generated embed URL.
 */
export const getAnalyticsEmbedUrl = ({ chartId, standalone = 1, tz, data }: EmbedOptions): string => {
  // Get the timezone
  const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Convert data to snake_case parameters
  const params = convertDataToParameters(data);

  // Construct and return the full embed URL
  const qs = objectToQueryString({
    slice_id: chartId,
    standalone,
    tz: timezone,
    ...params,
  });

  return `${NEXT_PUBLIC_SUPERSET_BASE_URL}/explore/?${qs}`;
};

/**
 * ## loginToSuperset Function
 * Authenticates a user with the Superset API and retrieves a login response.
 *
 * ### Parameters
 * - `requestData: SupersetLoginRequest`: The login request payload containing credentials and other necessary login details.
 *
 * ### Returns
 * - `Promise<SupersetLoginResponse>`: A promise that resolves to the response from Superset’s login endpoint, including any authentication tokens or session data.
 *
 * ### Process
 * 1. **API Request**: Sends a POST request to the Superset `/security/login` endpoint using the provided login data.
 * 2. **Response Handling**: Returns the login response, which typically includes the authentication token.
 *
 * ### Errors
 * - Throws an error if login fails due to invalid credentials or connectivity issues.
 */
export const loginToSuperset = async (requestData: SupersetLoginRequest): Promise<SupersetLoginResponse> => {
  const response = await post<SupersetLoginResponse>(`${SUPERSET_API_URL}/security/login`, requestData);
  return response;
};

/**
 * ## fetchSupersetChartData Function
 * Fetches chart data from the Superset API based on specified filters, timezone, and request parameters.
 *
 * ### Parameters
 * - `accessToken: string`: The access token required for API authorization.
 * - `requestData: SupersetChartDataRequest`: The data request payload for fetching the chart.
 * - `EmbedOptions`: An options object with:
 *   - `standalone?: number` (default `1`): Specifies whether the chart is standalone.
 *   - `tz?: string`: Optional timezone; defaults to the client’s local timezone.
 *   - `data: AnyObject`: Additional filtering parameters for the chart data.
 *
 * ### Returns
 * - `Promise<SupersetChartDataResponse>`: A promise that resolves to the chart data response.
 *
 * ### Process
 * 1. **Timezone Handling**: Uses provided timezone (`tz`) or defaults to the client’s local timezone.
 * 2. **Parameter Conversion**: Converts `filters` to URL-compatible query string parameters.
 * 3. **API Request**: Sends a POST request with authorization to the Superset API, including query string parameters and payload.
 *
 * ### Errors
 * - Throws an error if the request fails due to invalid access token or data request parameters.
 */
export const fetchSupersetChartData = async (
  accessToken: string,
  requestData: SupersetChartDataRequest,
  { standalone = 1, tz, data: filters }: EmbedOptions
): Promise<SupersetChartDataResponse> => {
  // Get the timezone
  const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Convert data to snake_case parameters
  const params = convertDataToParameters(filters);

  // Construct and return the fetch full URL
  const qs = objectToQueryString({
    standalone,
    tz: timezone,
    ...params,
  });

  const data = await post<SupersetChartDataResponse>(`${SUPERSET_API_URL}/chart/data?${qs}`, requestData, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data;
};

/**
 * ## getDatasetColumns Function
 * Retrieves the column names of a specified dataset from the Superset API.
 *
 * ### Parameters
 * - `datasetId: string`: The unique identifier of the dataset.
 * - `accessToken: string`: The access token required for API authorization.
 *
 * ### Returns
 * - `Promise<string[]>`: A promise that resolves to an array of column names in the dataset.
 *
 * ### Process
 * 1. **API Call**: Sends a GET request to the Superset API, specifying the dataset ID.
 * 2. **Column Extraction**: Maps the `columns` field from the API response to extract column names.
 * 3. **Return Result**: Returns an array of column names, or an empty array if no columns are found.
 *
 * ### Errors
 * - Returns an empty array if the API response lacks column data.
 * - Throws an error if the request fails due to invalid dataset ID or authorization issues.
 */
export const getDatasetColumns = async (datasetId: string, accessToken: string): Promise<string[]> => {
  const response = await get<SupersetDatasetResponse>(`${SUPERSET_API_URL}/dataset/${datasetId}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response?.result?.columns) {
    return response.result.columns.map((column) => column.column_name);
  }

  return [];
};
