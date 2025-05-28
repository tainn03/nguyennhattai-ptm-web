"use server";

import { Prisma, UploadFoLder } from "@prisma/client";
import { gql } from "graphql-request";

import { STRAPI_TOKEN_KEY } from "@/configs/environment";
import { AnyObject } from "@/types";
import { ApiError, HttpStatusCode } from "@/types/api";
import { fetcher } from "@/utils/graphql";

/**
 * Fetches an upload folder by name using a GraphQL query.
 *
 * @param {string} pathName - The name of the upload folder to retrieve.
 * @returns {Promise<UploadFoLder | undefined>} A promise that resolves to the matching upload folder or undefined if not found.
 */
export const getUploadFolderByPath = async (pathName: string): Promise<UploadFoLder | undefined> => {
  const query = gql`
    query ($path: String!) {
      uploadFolders(filters: { path: { eq: $path } }) {
        data {
          id
        }
      }
    }
  `;

  const { data } = await fetcher<UploadFoLder[]>(STRAPI_TOKEN_KEY, query, {
    path: pathName,
  });

  return data.uploadFolders[0];
};

/**
 * Fetches the maximum path ID among upload folders using a GraphQL query.
 *
 * @param {string} token - The authentication token for the request.
 * @returns {Promise<number>} A promise that resolves to the maximum path ID or 0 if no folders are found.
 */
export const getMaxPathId = async (): Promise<number> => {
  const query = gql`
    query {
      uploadFolders(pagination: { limit: 1 }, sort: "pathId:desc") {
        data {
          id
          attributes {
            pathId
          }
        }
      }
    }
  `;

  const { data } = await fetcher<UploadFoLder[]>(STRAPI_TOKEN_KEY, query);
  return Number(data?.uploadFolders[0]?.pathId || 0);
};

/**
 * Creates a new upload folder with the specified parameters using a GraphQL mutation.
 *
 * @param {string} token - The authentication token for the request.
 * @param {Prisma.UploadFoLderCreateInput & { parentId?: number }} params - The parameters for creating the folder.
 * @returns {Promise<UploadFoLder>} A promise that resolves to the created upload folder.
 */
export const createUploadFolder = async (
  params: Prisma.UploadFoLderCreateInput & { parentId?: number }
): Promise<UploadFoLder | undefined> => {
  const query = gql`
    mutation ($name: String!, $path: String!, $pathId: Int!, $parentId: ID) {
      createUploadFolder(data: { name: $name, pathId: $pathId, path: $path, parent: $parentId }) {
        data {
          id
          attributes {
            name
            path
            pathId
          }
        }
      }
    }
  `;

  const { data } = await fetcher<UploadFoLder>(STRAPI_TOKEN_KEY, query, params);
  return data.createUploadFolder;
};

/**
 * Ensures the existence of an upload folder and retrieves its ID based on the given folder path.
 * If the folder or any intermediate folders do not exist, it creates them.
 *
 * @param {string} folderPath - The path of the upload folder.
 * @param {AnyObject} pathReplacements - Optional path replacements for dynamic folders.
 * @returns {Promise<{ folderId: number; fullPath: string }>} - A Promise that resolves with the folder ID
 * and the full path of the upload folder.
 */
export const ensureUploadFolder = async (
  folderPath: string,
  pathReplacements?: AnyObject
): Promise<{ folderId: number; fullPath: string }> => {
  let fullPath = "";
  let folderId: number | undefined;
  let parentId: number | undefined;

  const segments = folderPath.split("/");
  for (const item of segments) {
    let segment = item;
    if (pathReplacements) {
      // Replace [dynamic folder], e.g.: abc/[abc] => abc/123
      const [propSyntax, propName] = item.match(/\[([^/]+)\]/) || [];
      if (propSyntax && propName) {
        const replacement = pathReplacements[propName] || segment;
        segment = item.replace(propSyntax, `${replacement}`);
      }
    }

    fullPath += `/${segment}`;
    const uploadFolder = await getUploadFolderByPath(fullPath);
    folderId = uploadFolder?.id;

    // Create a new upload folder if it doesn't exist
    if (!folderId) {
      const currentPathId = await getMaxPathId();
      const newUploadFolder = await createUploadFolder({
        name: segment,
        path: fullPath,
        pathId: currentPathId + 1,
        parentId,
      });
      folderId = newUploadFolder?.id;
    }
    parentId = folderId;
  }

  // Handle error case if the folder ID is not found
  if (!folderId) {
    throw new ApiError(HttpStatusCode.InternalServerError);
  }

  return { folderId, fullPath };
};
