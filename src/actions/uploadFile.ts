"use server";

import { UploadFile } from "@prisma/client";
import fse from "fs-extra";
import { gql } from "graphql-request";
import path from "path";

import { ensureUploadFolder } from "@/actions/uploadFolder";
import { STRAPI_API_URL, STRAPI_TOKEN_KEY } from "@/configs/environment";
import { MediaOptions } from "@/configs/media";
import { AnyObject } from "@/types";
import { ApiError, HttpStatusCode } from "@/types/api";
import { UploadInputValue } from "@/types/file";
import { postForm } from "@/utils/api";
import { getFileType } from "@/utils/file";
import { fetcher } from "@/utils/graphql";

/**
 * Updates an upload file by uploading a new file, removing the old file, or keeping the existing file.
 *
 * @param jwt - The authentication token for the request.
 * @param file - The new file to be uploaded.
 * @param option - The media options for the upload file.
 * @param pathReplacements - Optional path replacements for dynamic folders.
 * @returns A promise that resolves to the updated upload file.
 */
export const updateUploadFile = async (
  jwt: string,
  option: MediaOptions,
  file?: UploadInputValue,
  pathReplacements?: AnyObject
) => {
  if (!file) {
    return { file: null, isUpdated: false };
  }

  // User changed the upload file
  if (file?.originalName && file?.name) {
    if (file.id) {
      // Delete the old file
      await deleteFile(jwt, file.id);
    }
    const result = await uploadFile(option.localPath, file.name, file.name, option.folder, pathReplacements);
    return { file: result, isUpdated: true };
  }

  // User only removed the upload file
  if (file?.id && !file?.name) {
    await deleteFile(jwt, file.id);
    return { file: null, isUpdated: true };
  }

  // User didn't change the upload file
  return { file, isUpdated: false };
};

/**
 * Upload a file to the Strapi server after performing several operations.
 * It checks if the local file exists, creates an upload form, ensures the existence of
 * the target upload folder, uploads the file, and moves it to the target folder.
 *
 * @param {string} localPath - The path to the local file.
 * @param {string} localFileName - The name of the local file.
 * @param {string} uploadFileName - The name to use when uploading the file.
 * @param {string} folderPath - The path to the target upload folder.
 * @param {AnyObject} pathReplacements - Optional path replacements for dynamic folders.
 * @returns {Promise<UploadFile>} - A Promise that resolves with the uploaded file data.
 */
export const uploadFile = async (
  localPath: string,
  localFileName: string,
  uploadFileName: string,
  folderPath: string,
  pathReplacements?: AnyObject
) => {
  // Check if the file exists locally
  const filePath = path.resolve(localPath, localFileName);
  const isExists = await fse.exists(filePath);

  if (!isExists) {
    throw new ApiError(HttpStatusCode.BadRequest, `UploadFile "${filePath}" does not exist.`);
  }

  // Create an upload form
  const fileData = await fse.readFile(filePath);
  const type = getFileType(filePath);
  const formData = new FormData();
  const fileBlob = new Blob([fileData], { type });
  formData.append("files", fileBlob, uploadFileName);

  // Delete the local file
  // try {
  //   await fse.remove(filePath);
  // } catch (err) {
  //   logger.error(err);
  // }

  // Ensure the existence of the upload folder
  const { folderId, fullPath } = await ensureUploadFolder(folderPath, pathReplacements);

  // Upload the file to the Strapi server
  const result = await postForm<AnyObject>(`${STRAPI_API_URL}/upload`, formData, {
    headers: {
      Authorization: `Bearer ${STRAPI_TOKEN_KEY}`,
    },
  });
  if (result.error) {
    const { status, message } = result.error;
    throw new ApiError(status || HttpStatusCode.InternalServerError, message);
  }

  // Move the uploaded file to the target folder
  const [uploadFile] = result as UploadFile[];
  const file = await moveFileToFolder(uploadFile.id, `${fullPath}`, folderId);
  if (!file) {
    throw new ApiError(HttpStatusCode.BadRequest, `Can't move file "${uploadFileName}" to target folder.`);
  }

  return file;
};

/**
 * Moves an upload file to a target folder by updating its folder path and folder association
 * using a GraphQL mutation.
 *
 * @param {string} token - The authentication token for the request.
 * @param {number} fileId - The ID of the upload file to be moved.
 * @param {string} targetFolderPath - The new folder path for the file.
 * @param {number} targetFolderId - The ID of the target folder where the file will be moved.
 * @returns {Promise<UploadFile>} A promise that resolves to the updated upload file.
 */
export const moveFileToFolder = async (
  fileId: number,
  targetFolderPath: string,
  targetFolderId: number
): Promise<UploadFile | undefined> => {
  const query = gql`
    mutation ($fileId: ID!, $targetFolderPath: String!, $targetFolderId: ID!) {
      updateUploadFile(id: $fileId, data: { folderPath: $targetFolderPath, folder: $targetFolderId }) {
        data {
          id
          attributes {
            url
            previewUrl
          }
        }
      }
    }
  `;

  const { data } = await fetcher<UploadFile>(STRAPI_TOKEN_KEY, query, {
    fileId,
    targetFolderPath,
    targetFolderId,
  });

  return data.updateUploadFile;
};

/**
 * Deletes an upload file record by its ID.
 *
 * @param id - The ID of the upload file to be deleted.
 * @returns A promise that resolves to the result of the mutation, including the deleted file's ID.
 */
export async function deleteFile(jwt: string, id: number) {
  const query = gql`
    mutation ($id: ID!) {
      deleteUploadFile(id: $id) {
        data {
          id
        }
      }
    }
  `;
  const result = await fetcher<UploadFile>(jwt, query, {
    id: Number(id),
  });
  return result;
}
