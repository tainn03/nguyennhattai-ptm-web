import { randomUUID } from "crypto";
import fse from "fs-extra";
import moment from "moment";
import path from "path";

import { avatarOptions } from "@/configs/media";
import { uploadFile } from "@/services/server/uploadFile";
import { updateAvatar } from "@/services/server/userDetail";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getFileExtension } from "@/utils/file";
import { withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest, formData: FormData) => {
  if (!req.token) {
    throw new ApiError(HttpStatusCode.Unauthorized);
  }

  const file = formData.get("file") as File;
  const userDetailId = formData.get("userDetailId") as string;
  if (!file || !userDetailId) {
    throw new ApiError(HttpStatusCode.BadRequest);
  }

  // Check and create upload folder
  const uploadPath = path.resolve(avatarOptions.localPath);
  const isExists = await fse.exists(uploadPath);
  if (!isExists) {
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

  // Upload file to strapi server
  const { user } = req.token;
  const avatarFileName = `${user.id}_${fileName}`;
  const { id: uploadFileId } = await uploadFile(
    avatarOptions.localPath,
    fileName,
    avatarFileName,
    avatarOptions.folder
  );

  if (uploadFileId) {
    // Update user avatar
    const result = await updateAvatar(Number(userDetailId), uploadFileId);
    if (!result) {
      throw new ApiError(HttpStatusCode.BadRequest, "Update avatar failed.");
    }
  }

  return { status: HttpStatusCode.Ok, data: uploadFileId };
});
