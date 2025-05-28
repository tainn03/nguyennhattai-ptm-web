import { gql } from "graphql-request";

import { prisma } from "@/configs/prisma";
import { OrganizationReportInputForm } from "@/forms/organizationReport";
import { OrganizationReportInfo } from "@/types/strapi";
import { fetcher } from "@/utils/graphql";

/**
 * Checks the status of report files for an organization report.
 *
 * @param entity - An object representing an organization report.
 * @returns A Promise that resolves to a boolean indicating whether the report files are active, or undefined if an error occurs.
 */
export const activeOrganizationReport = async (entity: OrganizationReportInfo): Promise<boolean> => {
  const { id, type, updatedById, organizationId, isSystem } = entity;

  const result = await prisma.$transaction(async (prisma) => {
    const lastActiveOrgReports = await prisma.organizationReport.findMany({
      where: { type: type, organizationId, isActive: true },
      select: { id: true },
    });

    let updatedPreviousReportResult;
    const lastActiveReportIds = lastActiveOrgReports.map((item) => item.id);
    if ((lastActiveOrgReports || []).length > 0) {
      updatedPreviousReportResult = await prisma.organizationReport.updateMany({
        where: { id: { in: lastActiveReportIds } },
        data: { isActive: false },
      });
    }

    let updatedOrganizationReport;
    if (!isSystem) {
      updatedOrganizationReport = await prisma.organizationReport.updateMany({
        where: { id: Number(id), organizationId, type },
        data: { isActive: true },
      });
    }

    if ((updatedOrganizationReport?.count || 0) > 0) {
      lastActiveOrgReports.push({ id: Number(id) });
    }

    await prisma.organizationReportsUpdatedByUserLinks.updateMany({
      where: {
        organizationReportId: {
          in: lastActiveReportIds,
        },
      },
      data: { userId: Number(updatedById) },
    });

    if (isSystem) {
      return updatedPreviousReportResult?.count || 0;
    } else {
      return updatedOrganizationReport?.count || 0;
    }
  });

  return result > 0;
};

/**
 * Creates a new organization report.
 *
 * @param jwt - A JSON Web Token used for authentication or authorization.
 * @param entity - An object representing the partial information of the organization report.
 * @returns A Promise that resolves to a number indicating the ID of the created organization report, or undefined if an error occurs.
 */
export const createOrganizationReport = async (
  jwt: string,
  entity: Partial<OrganizationReportInputForm>
): Promise<number> => {
  const query = gql`
    mutation (
      $name: String!
      $description: String
      $isActive: Boolean
      $isSystem: Boolean
      $organizationId: Int
      $templateId: ID
      $dynamicReportId: String
      $type: ENUM_ORGANIZATIONREPORT_TYPE
      $createdById: ID
      $publishedAt: DateTime
    ) {
      createOrganizationReport(
        data: {
          name: $name
          description: $description
          isActive: $isActive
          isSystem: $isSystem
          organizationId: $organizationId
          template: $templateId
          dynamicReportId: $dynamicReportId
          type: $type
          updatedByUser: $createdById
          createdByUser: $createdById
          publishedAt: $publishedAt
        }
      ) {
        data {
          id
        }
      }
    }
  `;
  const { data } = await fetcher<OrganizationReportInfo>(jwt, query, { ...entity, publishedAt: new Date() });
  return data?.createOrganizationReport?.id;
};

/**
 * This function is called with a JWT and an object containing the organization ID and report type to get the ID of a dynamic report.
 * It constructs a GraphQL query with the organization ID, report type, and current date, sends the query to the server, and returns the fetched ID.
 *
 * @param {string} jwt - The JWT for authentication.
 * @param {Pick<OrganizationReportInfo, "organizationId" | "type">} entity - The object containing the organization ID and report type.
 * @returns {Promise<string | null>} A promise that resolves to the fetched ID or null if the fetch was not successful.
 */
export const getDynamicReportId = async (
  jwt: string,
  entity: Pick<OrganizationReportInfo, "organizationId" | "type">
): Promise<string | null> => {
  const query = gql`
    query ($organizationId: Int!, $type: String) {
      organizationReports(
        sort: "isActive:desc"
        filters: {
          or: [
            {
              and: [
                { organizationId: { eq: $organizationId } }
                { isSystem: { eq: false } }
                { isActive: { eq: true } }
              ]
            }
            { and: [{ organizationId: { eq: null } }, { isSystem: { eq: true } }, { isActive: { eq: false } }] }
          ]
          type: { eq: $type }
          publishedAt: { ne: null }
        }
      ) {
        data {
          id
          attributes {
            dynamicReportId
          }
        }
      }
    }
  `;

  const { data } = await fetcher<OrganizationReportInfo[]>(jwt, query, { ...entity, publishedAt: new Date() });
  return (data?.organizationReports || []).length > 0 ? data?.organizationReports[0]?.dynamicReportId : null;
};
