import { randomUUID } from "crypto";
import fse from "fs-extra";
import moment from "moment";
import path from "path";

import { MediaType } from "@/configs/media";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getFileExtension, getOptionsByType } from "@/utils/file";
import { withExceptionHandler } from "@/utils/server";

/**
 * This function handles file uploads to the server via an API.
 *
 * @param req - The API request object.
 * @param data - The FormData containing the file to be uploaded.
 * @returns - An object with the status code and uploaded file information.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, data: FormData) => {
  if (!req.token) {
    throw new ApiError(HttpStatusCode.Unauthorized);
  }

  const mediaType = data.get("type") as MediaType;
  const file = data.get("file") as File;
  const options = getOptionsByType(mediaType);

  if (!file || !options) {
    throw new ApiError(HttpStatusCode.BadRequest);
  }

  // Check and create upload folder
  const uploadPath = path.resolve(options.localPath);
  if (!(await fse.exists(uploadPath))) {
    await fse.mkdir(uploadPath, { recursive: true });
  }

  // Get file name
  const ext = getFileExtension(file.name);
  const dateTime = moment().format("YYYYMMDDHHmmss");
  const fileName = `${randomUUID()}_${dateTime}${ext}`;
  const filePath = path.resolve(uploadPath, fileName);

  // Write bytes to file
  const fileData = await file.arrayBuffer();
  await fse.writeFile(filePath, Buffer.from(fileData));

  return {
    status: HttpStatusCode.Ok,
    data: {
      originalName: file.name,
      fileName: fileName,
      filePath: filePath,
    },
  };
});
