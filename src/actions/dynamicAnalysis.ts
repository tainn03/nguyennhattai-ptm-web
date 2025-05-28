"use server";

import { DynamicAnalysis } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY, SUPERSET_PASSWORD, SUPERSET_USERNAME } from "@/configs/environment";
import { DynamicAnalysisInfoRequestParams } from "@/hooks/useDynamicAnalysisInfo";
import { createReport } from "@/services/server/dynamicReport";
import { getOrganizationReportInfo } from "@/services/server/organization";
import { getUserById } from "@/services/server/user";
import { AnyObject } from "@/types";
import { ReportData } from "@/types/dynamicReport";
import { DynamicAnalysisInfo } from "@/types/strapi";
import { SupersetChartDataRequest } from "@/types/superset";
import { formatDate } from "@/utils/date";
import { fetcher } from "@/utils/graphql";
import { getServerToken } from "@/utils/server";
import { ensureString } from "@/utils/string";
import { EmbedOptions, fetchSupersetChartData, getDatasetColumns, loginToSuperset } from "@/utils/superset";

/**
 * Fetches dynamic analysis information based on the provided report ID and fields.
 * @param {number} id - The ID of the dynamic analysis to retrieve information for.
 * @param {T[]} fields - An array of fields to include in the query for the dynamic analysis.
 * @returns {Promise<DynamicAnalysisInfo>} - The dynamic analysis data with the specified fields.
 * @template T - A generic type representing the keys of the DynamicAnalysisInfo object.
 */
export const dynamicAnalysisInfoFetcher = async (params: DynamicAnalysisInfoRequestParams) => {
  const { id, fields } = params;
  const query = gql`
    query ($id: ID!) {
      dynamicAnalyses(
        filters: { id: { eq: $id }, isActive: { in: true }, publishedAt: { ne: null } }
      ) {
        data {
          id
          attributes {
            ${fields.join("\n")}
          }
        }
      }
    }
  `;

  // Executes the query using the fetcher, passing the report ID and dynamic fields as parameters.
  const { data } = await fetcher<DynamicAnalysisInfo[]>(STRAPI_TOKEN_KEY, query, { id });

  // Returns the dynamic analysis data retrieved from the query.
  if (data.dynamicAnalyses) {
    return data.dynamicAnalyses[0];
  }
};

/**
 * Fetches a dynamic analysis based on the provided parameters.
 *
 * @param {Pick<DynamicAnalysisInfo, "id">} params - The parameters to filter the dynamic analysis.
 * @returns {Promise<DynamicAnalysisInfo>} - A promise that resolves to the dynamic analysis.
 */
export const getDynamicAnalysisFiltersById = async (id: number): Promise<DynamicAnalysisInfo> => {
  const query = gql`
    query ($id: ID!) {
      dynamicAnalysis(id: $id) {
        data {
          id
          attributes {
            filters(
              filters: { isActive: { eq: true }, publishedAt: { ne: null } }
              pagination: { limit: -1 }
              sort: "displayOrder:asc"
            ) {
              data {
                id
                attributes {
                  name
                  key
                  defaultValue
                  dataType
                  size
                  displayOrder
                  isActive
                }
              }
            }
          }
        }
      }
    }
  `;

  const { data } = await fetcher<DynamicAnalysisInfo>(STRAPI_TOKEN_KEY, query, { id });
  return data.dynamicAnalysis ?? {};
};

export const fetchDynamicAnalysesByCodeAction = async (
  code: string,
  orgId: number
): Promise<DynamicAnalysis | null> => {
  if (!code || !orgId) {
    return null;
  }

  const query = gql`
    query ($code: String!, $orgId: ID!) {
      dynamicAnalyses(filters: { code: { eq: $code }, isActive: { eq: true }, organizations: { id: { eq: $orgId } } }) {
        data {
          id
          attributes {
            chartId
            datasetId
            reportTemplateId
            type
            name
          }
        }
      }
    }
  `;

  const { data } = await fetcher<DynamicAnalysis[]>(STRAPI_TOKEN_KEY, query, {
    code,
    orgId,
  });

  return data.dynamicAnalyses?.length > 0 ? data.dynamicAnalyses[0] : null;
};

/**
 * ## getDynamicAnalysisByIdAction Function
 * Retrieves a specific dynamic analysis by its ID from the Strapi API.
 *
 * ### Parameters
 * - `id: number`: The unique identifier of the dynamic analysis to be fetched.
 *
 * ### Returns
 * - `Promise<DynamicAnalysis | null>`: A promise that resolves to the dynamic analysis data if found, or `null` if it does not exist.
 *
 * ### Process
 * 1. **GraphQL Query**: Executes a GraphQL query to retrieve the dynamic analysis details based on the provided ID.
 * 2. **Data Extraction**: Extracts the relevant information such as `chartId`, `datasetId`, `reportTemplateId`, and `name` from the response.
 * 3. **Return Value**: Returns the dynamic analysis data or `null` if the analysis is not found.
 *
 * ### Errors
 * - Throws an error if the GraphQL query fails or the data is not in the expected format.
 */
export const getDynamicAnalysisByIdAction = async (id: number): Promise<DynamicAnalysis | null> => {
  const query = gql`
    query ($id: ID!) {
      dynamicAnalysis(id: $id) {
        data {
          id
          attributes {
            chartId
            datasetId
            reportTemplateId
            name
          }
        }
      }
    }
  `;

  const { data } = await fetcher<DynamicAnalysis>(STRAPI_TOKEN_KEY, query, {
    id,
  });

  return data.dynamicAnalysis;
};

/**
 * ### exportReportForDownloadAction
 *
 * Generates and returns a downloadable report file based on a dynamic analysis ID and embedded data options.
 * This function:
 * 1. Retrieves server tokens and user/organization details.
 * 2. Authenticates with Superset to obtain an access token.
 * 3. Fetches details of the specified dynamic analysis (including dataset and report template IDs).
 * 4. Obtains the dataset's column structure from Superset.
 * 5. Constructs and sends a chart data request to Superset based on retrieved columns and additional parameters.
 * 6. Compiles organization and user details along with the dataset into the report data structure.
 * 7. Generates and returns the report if data retrieval is successful.
 *
 * **Parameters:**
 * - `dynamicAnalysisId` (number): The ID of the dynamic analysis to fetch data for.
 * - `{ data }` (EmbedOptions): Object containing additional options and filters.
 *
 * **Returns:**
 * - `Promise<AnyObject | null | undefined>`: Returns a generated report file object if successful, `null` otherwise.
 *
 * **Example:**
 * ```typescript
 * const report = await exportReportForDownloadAction(123, { data: { startDate: "2024-01-01", endDate: "2024-12-31" } });
 * ```
 */
export const exportReportForDownloadAction = async (
  dynamicAnalysisId: number,
  { data }: EmbedOptions
): Promise<AnyObject | null | undefined> => {
  const { jwt, user } = await getServerToken();

  // Get DynamicAnalysis
  const dynamicAnalysis = await getDynamicAnalysisByIdAction(dynamicAnalysisId);

  // Fetch organization and user information concurrently
  const [org, userInfo] = await Promise.all([
    getOrganizationReportInfo(jwt, Number(user.orgId)),
    getUserById(jwt, Number(user.id)),
  ]);

  // Login to Superset
  const { access_token: accessToken } = await loginToSuperset({
    username: SUPERSET_USERNAME,
    password: SUPERSET_PASSWORD,
    provider: "db",
  });

  if (accessToken && dynamicAnalysis?.datasetId && dynamicAnalysis?.reportTemplateId && dynamicAnalysis?.name) {
    // Get dataset columns
    const columns = await getDatasetColumns(dynamicAnalysis.datasetId, accessToken);
    if (columns.length) {
      const chartDataRequest: SupersetChartDataRequest = {
        datasource: {
          id: dynamicAnalysis.datasetId,
          type: "table",
        },
        queries: [
          {
            columns,
            orderby: [],
            metrics: [],
            filters: [],
            granularity: "all",
          },
        ],
      };

      // Get dataset from Superset
      const response = await fetchSupersetChartData(accessToken, chartDataRequest, {
        data: {
          orgId: org.id,
          userId: user.id,
          ...data,
        },
      });

      if (response.result) {
        const reportData: ReportData[] = [
          {
            data: {
              body: {
                dataset: response.result[0]?.data,
                sheetName: dynamicAnalysis.name,
                startDate: formatDate(data?.startDate, "DD/MM/YYYY"),
                endDate: formatDate(data?.endDate, "DD/MM/YYYY"),
                organization: {
                  name: org.name,
                  taxCode: ensureString(org.taxCode),
                  abbreviationName: ensureString(org.abbreviationName),
                  internationalName: ensureString(org.internationalName),
                  phoneNumber: ensureString(org.phoneNumber),
                  email: ensureString(org.email),
                  website: ensureString(org.website),
                  businessAddress: ensureString(org.businessAddress),
                  contactName: ensureString(org.contactName),
                  contactPosition: ensureString(org.contactPosition),
                  contactEmail: ensureString(org.contactEmail),
                  contactPhoneNumber: ensureString(org.contactPhoneNumber),
                },
                createdByUser: {
                  name: `${userInfo.detail.lastName} ${userInfo.detail.firstName}`,
                },
              },
            },
          },
        ];

        // Export report file
        const result = await createReport({
          reportId: dynamicAnalysis?.reportTemplateId,
          reportName: dynamicAnalysis?.name,
          request: reportData,
        });

        return result;
      }
    }
  }

  return null;
};
