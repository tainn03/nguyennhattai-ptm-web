"use server";

import fse from "fs-extra";

import { IMPORT_API_KEY, IMPORT_HEADER_NAME, IMPORT_URL } from "@/configs/environment";
import { ConvertExcelToJsonRequest, GetSheetNamesRequest } from "@/forms/import";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { ImportedOrder } from "@/types/importedOrder";
import { post } from "@/utils/api";
import { withActionExceptionHandler } from "@/utils/server";

/**
 * Get sheet names action handler
 * This function handles getting sheet names from uploaded files
 *
 * @param _token - Authentication token (unused)
 * @param params - Import parameters containing file info
 * @returns Response with import status and data
 */
export const getSheetNames = withActionExceptionHandler<GetSheetNamesRequest, string[]>(async (_token, params) => {
  // Extract file info from params
  const { file } = params;

  // Check if uploaded file exists in server's local storage
  // Construct full file path by joining local storage path with filename
  if (file?.filePath && !fse.existsSync(file?.filePath)) {
    // Return error if file not found
    return {
      status: HttpStatusCode.BadRequest,
      message: "File not found",
    };
  }

  // Make GET request to get sheet names API endpoint
  const result = await post<ApiResult<string[]>>(
    `${IMPORT_URL}/api/v1/sheet-names`,
    { filePath: file.filePath },
    {
      headers: {
        [IMPORT_HEADER_NAME]: IMPORT_API_KEY,
      },
    }
  );

  // Return success response with mock import data
  return {
    status: result.status,
    data: result.data,
  };
});

/**
 * Convert excel to json action handler
 * This function handles converting excel to json
 *
 * @param _token - Authentication token (unused)
 * @param params - Import parameters containing file info
 * @returns Response with import status and data
 */
export const convertExcelToJSON = withActionExceptionHandler<ConvertExcelToJsonRequest, ImportedOrder[]>(
  async (token, params) => {
    // Extract file info from params
    const { customer, organizationId, file, sheetName } = params;

    // Check if uploaded file exists in server's local storage
    // Construct full file path by joining local storage path with filename
    if (file?.filePath && !fse.existsSync(file?.filePath)) {
      // Return error if file not found
      return {
        status: HttpStatusCode.BadRequest,
        message: "File not found",
      };
    }

    // Make POST request to import orders API endpoint
    const result = await post<ApiResult<ImportedOrder[]>>(
      `${IMPORT_URL}/api/v1/import-orders`,
      {
        organizationId: token.user?.orgId ?? organizationId,
        customerId: Number(customer.id),
        customerType: customer.importDriver,
        customerCode: customer.code,
        sheetName,
        filePath: file.filePath,
      },
      {
        headers: {
          [IMPORT_HEADER_NAME]: IMPORT_API_KEY,
        },
      }
    );

    // Return success response with mock import data
    return {
      status: result.status,
      data: result.data,
    };
  }
);
