import { avatarOptions, MediaType } from "@/configs/media";
import { uploadFile } from "@/services/server/uploadFile";
import { updateAvatar } from "@/services/server/userDetail";
import { ApiError, ApiNextRequest, HttpStatusCode } from "@/types/api";
import { withExceptionHandler } from "@/utils/server";

type UserProfileUploadForm = {
  fileName: string;
  userDetailId: number;
  type: MediaType;
};

/**
 * This function handles the upload of user profile files to the server via an API.
 * @param req - The API request object.
 * @param reqData - The data containing file information and user details.
 * @returns - An object with the status code and uploaded file information or user avatar ID.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, reqData: UserProfileUploadForm) => {
  if (!req.token) {
    throw new ApiError(HttpStatusCode.Unauthorized);
  }
  const { user } = req.token;
  const { fileName, userDetailId } = reqData;

  // Upload file to strapi server
  const avatarFileName = `${user.id}_${fileName}`;
  const { id: uploadFileId } = await uploadFile(
    avatarOptions.localPath,
    fileName,
    avatarFileName,
    avatarOptions.folder
  );

  if (uploadFileId) {
    // Update user avatar
    const result = await updateAvatar(userDetailId, uploadFileId);
    if (!result) {
      throw new ApiError(HttpStatusCode.BadRequest, "Update avatar failed.");
    }
  }

  return { status: HttpStatusCode.Ok, data: uploadFileId };
});
