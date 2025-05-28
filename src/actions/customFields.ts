/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { CustomFieldDataType } from "@prisma/client";

import { deleteFile, uploadFile } from "@/actions/uploadFile";
import { customFieldOptions } from "@/configs/media";
import { AnyObject } from "@/types";
import { CustomFieldFile } from "@/types/customField";
import { UploadInputValue } from "@/types/file";
import { equalId, isNumeric } from "@/utils/number";
import { ensureString } from "@/utils/string";

/**
 * Uploads custom field files for a given entity.
 *
 * @param {AnyObject} entity - The entity containing custom fields to be processed.
 * @returns {Promise<AnyObject>} - A promise that resolves to the updated entity with processed custom fields.
 *
 */
export const uploadCustomFieldFiles = async <T>(entity: AnyObject) => {
  // Retrieve previous and current custom fields from the data object
  const customFields = entity?.meta?.customFields || [];

  // Create a new list of updated custom fields excluding fields with FILE dataType
  const updatedCustomFields = [...customFields].filter(
    (field: AnyObject) => field.dataType !== CustomFieldDataType.FILE
  );

  // Retrieve the organization ID from the request token
  const organizationId = entity.organizationId;

  // Process current custom fields to handle file uploads
  if (customFields && customFields.length > 0) {
    for (const field of customFields) {
      if (field.dataType !== CustomFieldDataType.FILE || !field?.value) {
        continue; // Skip non-file fields or fields without a value
      }
      const fileList = [];
      for (const file of field.value as UploadInputValue[]) {
        if (!file.id) {
          // Upload new files and add them to the file list
          const result = await uploadFile(
            customFieldOptions.localPath,
            file.name,
            `${organizationId}_${ensureString(file.name)}`,
            customFieldOptions.folder,
            {
              orgId: organizationId,
            }
          );
          fileList.push({ id: result.id, name: file.name, url: result.url });
        } else {
          // Retain existing files in the file list
          fileList.push(file);
        }
      }
      // Update custom fields with the processed file list
      updatedCustomFields.push({ ...field, value: fileList });
    }
  }

  // Create a new data object with updated custom fields
  return { ...entity, meta: { ...(entity as AnyObject)?.meta, customFields: updatedCustomFields } } as T;
};

/**
 * Deletes custom field files for a given entity.
 *
 * @param {string} jwt - The authentication token for the request.
 * @param {AnyObject} entity - The entity containing custom fields to be processed.
 * @param {Partial<OrderRouteStatusInfo>} currentRouteStatuses - The current route status data.
 *
 */
export const uploadAndDeleteCustomFieldFiles = async <T>(
  jwt: string,
  entity: AnyObject,
  currentRouteStatuses?: AnyObject
) => {
  const customFields = entity?.meta?.customFields || [];
  const prevCustomFields = currentRouteStatuses?.meta?.customFields ?? [];
  // Retrieve previous and current custom fields from the data object

  // Create a new list of updated custom fields excluding fields with FILE dataType
  const updatedCustomFields = [...customFields].filter(
    (field: AnyObject) => field.dataType !== CustomFieldDataType.FILE
  );

  // Retrieve the organization ID from the request token
  const organizationId = entity.organizationId;

  // Process current custom fields to handle file uploads
  if (customFields && customFields.length > 0) {
    for (const field of customFields) {
      if (field.dataType !== CustomFieldDataType.FILE || !field?.value) {
        continue; // Skip non-file fields or fields without a value
      }
      const fileList = [];
      for (const file of field.value as UploadInputValue[]) {
        if (!file.id) {
          // Upload new files and add them to the file list
          const result = await uploadFile(
            customFieldOptions.localPath,
            file.name,
            `${organizationId}_${ensureString(file.name)}`,
            customFieldOptions.folder,
            {
              orgId: organizationId,
            }
          );
          fileList.push({ id: result.id, name: file.name, url: result.url });
        } else {
          // Retain existing files in the file list
          fileList.push(file);
        }
      }
      // Update custom fields with the processed file list
      updatedCustomFields.push({ ...field, value: fileList });
    }
  }

  for (const field of prevCustomFields) {
    if (field.dataType !== CustomFieldDataType.FILE || !field?.value) {
      continue; // Skip non-file fields or fields without a value
    }
    for (const file of field.value as CustomFieldFile[]) {
      const updatedField = updatedCustomFields.find((f: any) => equalId(f.id, field.id));
      let isDeleted = false;
      if (updatedField?.value && Array.isArray(updatedField.value)) {
        isDeleted = !(updatedField.value ?? []).some((f: any) => equalId(f.id, file.id));
      }
      const isChangedType = updatedField?.dataType !== field.dataType;
      if ((isDeleted || isChangedType) && isNumeric(file.id)) {
        deleteFile(jwt, file.id); // Delete files that are removed or changed in type
      }
    }
  }

  // Create a new data object with updated custom fields
  return { ...entity, meta: { ...(entity as AnyObject)?.meta, customFields: updatedCustomFields } } as T;
};
