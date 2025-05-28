"use server";

import { prisma } from "@/configs/prisma";
import { HttpStatusCode } from "@/types/api";
import { DriverReportInfo, WorkflowInfo } from "@/types/strapi";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Delete driver reports associated with a workflow ID
 * This function performs the following steps:
 * 1. Finds all driver reports linked to the given workflow ID
 * 2. Unpublishes the reports by setting publishedAt to null
 * 3. Updates the updatedBy user ID for the reports
 * 4. Returns the deleted reports
 *
 * @param _token - Authentication token (unused)
 * @param params - Object containing workflow id and updatedById
 * @returns Promise resolving to deleted driver reports
 */
export const deleteDriverReportByWorkflowId = withActionExceptionHandler<Partial<WorkflowInfo>, DriverReportInfo[]>(
  async (_token, params) => {
    const { id, updatedById } = params;

    const result = await prisma.$transaction(async (prisma) => {
      // Find all driver reports linked to this workflow
      const reports = await prisma.driverReport.findMany({
        where: {
          DriverReportsWorkflowLinks: {
            is: {
              workflowId: Number(id),
            },
          },
        },
        select: {
          id: true,
        },
      });

      // Extract report IDs
      const reportIds = reports.map((r) => Number(r.id));

      // Unpublish the reports by setting publishedAt to null
      await prisma.driverReport.updateMany({
        where: { id: { in: reportIds } },
        data: {
          publishedAt: null,
        },
      });

      // Update the updatedBy user for these reports
      await prisma.driverReportsUpdatedByUserLinks.updateMany({
        where: { driverReportId: { in: reportIds } },
        data: {
          userId: Number(updatedById),
        },
      });

      return reports as DriverReportInfo[];
    });

    return { status: HttpStatusCode.Ok, data: result };
  }
);
