import { HttpStatusCode } from "axios";
import { gql } from "graphql-request";

import { ErrorType } from "@/types";
import { ApiResult } from "@/types/api";
import { FilterRequest } from "@/types/filter";
import { OrganizationReportInfo } from "@/types/strapi";
import { graphQLPost, postForm, put } from "@/utils/api";

/**
 * Fetches organization reports based on the provided filter request.
 *
 * @param _ - Ignored parameter.
 * @param params - A filter request object specifying the criteria for fetching organization reports.
 * @returns A Promise that resolves to the fetched organization reports.
 */
export const organizationReportsFetcher = async ([_, params]: [string, FilterRequest<OrganizationReportInfo>]) => {
  const { data, meta } = await graphQLPost<OrganizationReportInfo[]>({
    query: gql`
      query ($organizationId: Int!) {
        organizationReports(
          pagination: { limit: -1 }
          filters: {
            or: [
              { organizationId: { eq: $organizationId } }
              { and: [{ organizationId: { eq: null } }, { isSystem: { eq: true } }] }
            ]
            publishedAt: { ne: null }
          }
        ) {
          data {
            id
            attributes {
              name
              type
              isActive
              isSystem
              template {
                data {
                  attributes {
                    name
                    url
                    previewUrl
                  }
                }
              }
              createdByUser {
                data {
                  id
                  attributes {
                    detail {
                      data {
                        attributes {
                          lastName
                          firstName
                        }
                      }
                    }
                  }
                }
              }
              updatedAt
              updatedByUser {
                data {
                  id
                  attributes {
                    detail {
                      data {
                        attributes {
                          lastName
                          firstName
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
    params,
  });

  return { data: data?.organizationReports ?? [], meta };
};

/**
 * Check if an report has been exclusively updated by another user based on its last updated timestamp.
 *
 * @param {number} organizationId - The ID of the organization associated with the report.
 * @param {number} id - The ID of the report to check.
 * @param {Date | string} lastUpdatedAt - The last known update time of the report (can be a Date object or a string).
 * @returns {Promise<boolean>} A promise that resolves to true if the report has been exclusively updated, false otherwise.
 */
export const checkReportExclusives = async (
  organizationId: number,
  id: number,
  lastUpdatedAt: Date | string
): Promise<boolean> => {
  const { data } = await graphQLPost<OrganizationReportInfo[]>({
    query: gql`
      query ($organizationId: Int!, $id: ID!) {
        organizationReports(filters: { organizationId: { eq: $organizationId }, id: { eq: $id } }) {
          data {
            id
            attributes {
              updatedAt
            }
          }
        }
      }
    `,
    params: {
      organizationId,
      id,
    },
  });
  return data?.organizationReports[0].updatedAt !== lastUpdatedAt;
};

/**
 * Deletes report files based on specified criteria.
 *
 * @param {Partial<ReportFileInfo>} entity - An object representing the criteria for deleting report files. Only files matching the specified properties will be deleted.
 * @param {Date | string} [lastUpdatedAt] - Optional. A date or string representing the last updated timestamp. Only files with a last updated timestamp earlier than this value will be deleted.
 * @returns {Promise<void>} A promise that resolves when the report files are successfully deleted.
 */
export const deleteReportFiles = async (entity: Partial<OrganizationReportInfo>, lastUpdatedAt?: Date | string) => {
  const { organizationId, id, updatedById } = entity;

  // Check for exclusivity if lastUpdatedAt is provided
  if (lastUpdatedAt) {
    const isErrorExclusives = await checkReportExclusives(Number(organizationId), Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { error: ErrorType.EXCLUSIVE };
    }
  }

  const { status, data } = await graphQLPost<OrganizationReportInfo>({
    query: gql`
      mutation ($id: ID!, $updatedById: ID!) {
        updateOrganizationReport(id: $id, data: { publishedAt: null, updatedByUser: $updatedById }) {
          data {
            id
          }
        }
      }
    `,
    params: {
      id,
      updatedById,
    },
  });

  if (status === HttpStatusCode.Ok && data) {
    return { data: data.updateOrganizationReport };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * This function is called with an OrganizationReportInfo object and a File object to upload a report file.
 *
 * @param {Partial<OrganizationReportInfo>} entity - The OrganizationReportInfo object, containing the organization ID and report type.
 * @param {File} file - The file to upload.
 * @returns {Promise<{data: OrganizationReport}|{error: ErrorType}>} A promise that resolves to an object containing the uploaded report or an error.
 */
export const uploadReportFile = async (entity: Partial<OrganizationReportInfo>, file: File) => {
  const { organizationId, type } = entity;
  const { data, status } = await postForm<ApiResult<OrganizationReportInfo>>(
    `/api/orgs/${organizationId}/settings/reports`,
    {
      file,
      reportType: type,
    }
  );

  if (status === HttpStatusCode.Ok && data) {
    return { data };
  }

  return { error: ErrorType.UNKNOWN };
};

/**
 * This function is called with an OrganizationReportInfo object to create an organization report.
 *
 * @param {string} jwt - The JWT for authentication.
 * @param {Partial<OrganizationReportInfo>} entity - The OrganizationReportInfo object, containing the organization ID and report type.
 * @returns {Promise<number>} A promise that resolves to the ID of the created organization report.
 */
export const activeOrganizationReport = async (entity: Partial<OrganizationReportInfo>): Promise<boolean> => {
  const { organizationId, id, type, isSystem } = entity;
  const { status, data } = await put<ApiResult<boolean>>(`/api/orgs/${organizationId}/settings/reports`, {
    id,
    type,
    isSystem,
  });

  if (status === HttpStatusCode.Ok && data) {
    return data;
  } else {
    return false;
  }
};
