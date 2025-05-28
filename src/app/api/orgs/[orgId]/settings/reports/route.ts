import { OrganizationReportType } from "@prisma/client";
import { randomUUID } from "crypto";
import fse from "fs-extra";
import path from "path";

import { organizationReportOptions as options } from "@/configs/media";
import { uploadDynamicReport } from "@/services/server/dynamicReport";
import { activeOrganizationReport, createOrganizationReport } from "@/services/server/organizationReport";
import { uploadFile } from "@/services/server/uploadFile";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { OrganizationReportInfo } from "@/types/strapi";
import { formatDate } from "@/utils/date";
import { getFileExtension } from "@/utils/file";
import { getToken, withExceptionHandler } from "@/utils/server";

export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: OrganizationReportInfo) => {
  const { organizationId, userId: updatedById } = getToken(req);
  const isActiveSuccess = await activeOrganizationReport({
    ...requestData,
    organizationId,
    updatedById,
  });
  return isActiveSuccess
    ? { status: HttpStatusCode.Ok, data: isActiveSuccess }
    : { status: HttpStatusCode.InternalServerError, data: false };
});

/**
 * This function handles file uploads to the server via an API.
 *
 * @param req - The API request object.
 * @param data - The FormData containing the file to be uploaded.
 * @returns - An object with the status code and uploaded file information.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, data: FormData) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);

  const file = data.get("file") as File;
  if (!file) {
    throw new ApiError(HttpStatusCode.BadRequest);
  }

  // Check and create upload folder
  const uploadPath = path.resolve(options.localPath);
  const isExists = await fse.exists(uploadPath);
  if (!isExists) {
    await fse.mkdir(uploadPath, { recursive: true });
  }

  // Get file name and path
  const ext = getFileExtension(file.name);
  const dateTime = formatDate(new Date(), "YYYYMMDDHHmmss");
  const fileName = `${randomUUID()}_${dateTime}${ext}`;
  const filePath = path.resolve(uploadPath, fileName);

  // Write bytes to file
  const fileData = await file.arrayBuffer();
  await fse.writeFile(filePath, Buffer.from(fileData));

  // Upload file to strapi server
  const { id } = await uploadFile(options.localPath, fileName, fileName, options.folder, {
    orgId: organizationId,
  });
  if (!id) {
    return { status: HttpStatusCode.InternalServerError, message: "Upload template to server failed" };
  }

  // Upload file to tms report service
  const dynamicReportId = await uploadDynamicReport(filePath);
  if (!dynamicReportId) {
    return { status: HttpStatusCode.InternalServerError, message: "Upload dynamic report failed" };
  }

  const type = data.get("reportType") as OrganizationReportType;
  const reportId = await createOrganizationReport(jwt, {
    organizationId,
    createdById,
    templateId: id,
    dynamicReportId,
    name: file.name,
    isActive: false,
    type,
  });

  await activeOrganizationReport({
    id: reportId,
    type,
    organizationId,
    updatedById: createdById,
    isSystem: false,
  } as OrganizationReportInfo);

  if (reportId) {
    return { status: HttpStatusCode.Ok, data: { id: reportId, name: file.name } };
  } else {
    return { status: HttpStatusCode.InternalServerError, message: "Create report failed" };
  }
});
