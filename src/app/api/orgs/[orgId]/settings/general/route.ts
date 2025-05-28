import { organizationLogoOptions } from "@/configs/media";
import { OrganizationEditForm } from "@/forms/organization";
import { updateOrganization } from "@/services/server/organization";
import { uploadFile } from "@/services/server/uploadFile";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Handles the editing of organization details, including updating the organization's logo.
 * Returns an OK response with the updated logo details if the update is successful.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {OrganizationEditForm} reqData - The data for editing organization details.
 * @returns {object} An object containing the HTTP status and result data, including updated logo details.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, reqData: OrganizationEditForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { logoName, ...organization } = reqData;
  let uploadFileId, uploadFileUrl, uploadFilePreviewUrl;
  const fileName = ensureString(logoName);

  if (fileName) {
    const logoFileName = `${userId}_${fileName}`;
    const { id, url, previewUrl } = await uploadFile(
      organizationLogoOptions.localPath,
      fileName,
      logoFileName,
      organizationLogoOptions.folder,
      {
        orgId: organizationId,
      }
    );

    uploadFileId = id;
    uploadFileUrl = url;
    uploadFilePreviewUrl = previewUrl;
  }

  await updateOrganization(jwt, organization, userId, uploadFileId);

  return {
    status: HttpStatusCode.Ok,
    data: {
      logo: {
        id: uploadFileId,
        url: uploadFileUrl,
        previewUrl: uploadFilePreviewUrl,
      },
    },
  };
});
