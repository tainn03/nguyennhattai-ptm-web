import { customFieldOptions } from "@/configs/media";
import { deleteFile, uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { CustomFieldFile } from "@/types/customField";
import { UploadInputValue } from "@/types/file";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

/**
 * Uploads a file to Strapi and returns the file's id and url.
 *
 * @param {string} localFileName - The name of the file on the local system.
 * @param {string} uploadFileName - The name to use when uploading the file.
 * @param {number} orgId - The id of the organization.
 * @returns {Promise<{ id: number; name: string }>} - Returns a promise that resolves to an object containing the id and url of the uploaded file.
 */
const uploadFileStrapi = async (
  localFileName: string,
  uploadFileName: string,
  orgId: number
): Promise<{ id: number; name: string }> => {
  const file = await uploadFile(
    customFieldOptions.localPath,
    localFileName,
    uploadFileName,
    customFieldOptions.folder,
    {
      orgId,
    }
  );
  return { id: file.id, name: file.url };
};

/**
 * Remakes the value of custom field file by uploading new files to Strapi and keeping the existing ones.
 *
 * @param {UploadInputValue[]} files - The array of files to be processed. Each file should have an id, name, and url.
 * @param {number} organizationId - The id of the organization.
 * @returns {Promise<CustomFieldFile[]>} - Returns a promise that resolves to an array of custom field file values. Each value includes an id, name, and url.
 */
const remakeCustomFieldFileValue = async (
  files: UploadInputValue[],
  organizationId: number
): Promise<CustomFieldFile[]> => {
  const rs: CustomFieldFile[] = [];
  let customFieldImage: CustomFieldFile = {} as CustomFieldFile;

  for (const file of files) {
    if (!file.id) {
      const { id, name } = await uploadFileStrapi(
        ensureString(file.name),
        `${organizationId}_${ensureString(file.name)}`,
        organizationId
      );

      customFieldImage = {
        id: id,
        name: file.name,
        url: name,
      };
    } else {
      customFieldImage = {
        id: file.id,
        name: file.name,
        url: file.url,
      };
    }

    rs.push(customFieldImage);
  }
  return rs;
};

/**
 * Handles the creation of a new file based on the incoming data.
 * Returns the result with the appropriate HTTP status and data.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {filesUpload: UploadInputValue[]} request - The data for creating a new file upload.
 * @returns {object} An object containing the HTTP status and result data.
 */
export const POST = withExceptionHandler(
  async (req: ApiNextRequest, request: { filesUpload: UploadInputValue[]; filesRemove: UploadInputValue[] }) => {
    const { jwt, organizationId } = getToken(req);
    const { filesUpload, filesRemove } = request;
    const fieldRemake = await remakeCustomFieldFileValue(filesUpload, organizationId);

    if (filesRemove) {
      for (const fileRm of filesRemove) {
        if (fileRm.id) {
          await deleteFile(jwt, fileRm.id);
        }
      }
    }

    if (fieldRemake) {
      return { status: HttpStatusCode.Ok, data: fieldRemake };
    } else {
      return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
    }
  }
);
