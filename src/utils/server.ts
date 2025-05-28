/* eslint-disable @typescript-eslint/no-explicit-any */
import { CustomFieldDataType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken as getNextAuthToken } from "next-auth/jwt";

import { __DEV__ } from "@/configs/environment";
import { customFieldOptions } from "@/configs/media";
import { authOptions } from "@/configs/nextauth";
import { getBasicOrganizationByCodeOrAlias } from "@/services/server/organization";
import { getCurrentOrganizationMemberIncludeRole } from "@/services/server/organizationMember";
import { deleteFile, uploadFile } from "@/services/server/uploadFile";
import { AnyObject, AnyType } from "@/types";
import {
  ActionResult,
  ApiError,
  ApiNextRequest,
  ApiResult,
  ApiResultMeta,
  HttpStatusCode,
  MetaResult,
  Token,
} from "@/types/api";
import { CustomFieldFile } from "@/types/customField";
import { UploadInputValue } from "@/types/file";
import { OrganizationMemberInfo } from "@/types/strapi";
import logger from "@/utils/logger";
import { isNumeric } from "@/utils/number";
import { ensureString } from "@/utils/string";

/**
 * Get request data by combining data from the request body, query, and params.
 *
 * @param req - The Next Request object for the current API request
 * @param params - The Original params of the current API request.
 * @returns The request data object.
 */
export const getRequestParams = (req: NextRequest, params: AnyObject = {}) => {
  const { searchParams } = new URL(req.url);
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
};

/**
 * Returns metadata for an API result, including the request URL, start and end times, and duration.
 *
 * @param req - The Next Request object for the current API request
 * @param data - The Original body of the current API request.
 * @param params - The Original params of the current API request.
 * @returns An object containing metadata for the API result
 */
export const getResponseMeta = (req: ApiNextRequest, data: AnyObject, params: AnyObject): ApiResultMeta => {
  const start = req.startTime;
  const end = Date.now();
  const { pathname, searchParams } = req.nextUrl;
  const qs = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
  const result: ApiResultMeta = {
    url: `${pathname}${qs}`,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    duration: end - start,
  };

  // if in development mode, include request data in the metadata object
  if (__DEV__) {
    if (data && Object.keys(data).length) {
      result.data = data;
    }
    if (params && Object.keys(params).length) {
      result.params = params;
    }
  }
  return result;
};

/**
 * Get the error response object based on the provided error.
 *
 * @param req - The Next Request object for the current API request
 * @param data - The Original body of the current API request.
 * @param params - The Original params of the current API request.
 * @param err - The error object.
 * @returns The error response object containing relevant error details.
 */
export const getResponseError = (req: ApiNextRequest, data: AnyObject, params: AnyObject, err: ApiError): ApiResult => {
  const { status, message, name, stack, meta: errorMeta } = err;

  // get information about the called API request.
  const meta = getResponseMeta(req, data, params);

  return {
    status: Number(status || HttpStatusCode.InternalServerError),
    message: message || name,
    meta: {
      ...meta,
      ...errorMeta,
      // configure information about the error exception (if configured for development).
      ...{ exception: (__DEV__ && stack) || message },
    },
  };
};

/**
 * Defines a type for the handler function used in API request handlers
 *
 * @template D - The type of the data in the handler function
 * @template P - The type of the params in the handler function
 * @param _request - The incoming request object
 * @param _data - The data in the handler function
 * @param _params - The params in the handler function
 * @returns A Promise of an ApiResult object or void.
 */
export type HandlerFunction<T = any, D = any, P = AnyObject> = (
  _request: ApiNextRequest,
  _data: D,
  _params: P
) => Promise<ApiResult<T>> | ApiResult<T> | void;

/**
 * Higher-order function that wraps an API request handler with error handling and response formatting logic
 *
 * @template D - The type of the data in the handler function
 * @template P - The type of the params in the handler function
 * @param handler - The handler function to be wrapped
 * @param req - The incoming request object
 * @param params - The params object containing additional parameters
 * @returns A Promise that resolves to a NextResponse object
 */
export const withExceptionHandler =
  <T = any, D = any, P = AnyObject>(handler: HandlerFunction<T, D, P>) =>
  async (req: ApiNextRequest, { params = {} }: { params: AnyObject }) => {
    // Config start time for the current request
    req.startTime = Date.now();

    // Get token from logged in user
    const token = await getNextAuthToken({ req });
    if (token) {
      req.token = token as Token;
    }

    // Extract params from Next params and query string
    params = getRequestParams(req, params);
    let reqData: AnyObject = {};

    try {
      // Get data from the request body
      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        const contentType = req.headers.get("content-type");
        if (contentType?.includes("multipart/form-data")) {
          reqData = await req.formData();
        } else {
          reqData = await req.json();
        }
      }

      // Executing the logic from handler function
      const result = (await handler(req, reqData as D, params as P)) || {
        status: HttpStatusCode.Ok,
      };

      // get information about the called API request.
      const meta = getResponseMeta(req, reqData, params);

      result.meta = {
        ...result.meta,
        ...meta,
      };
      if (result.meta) {
        const { start, url, duration } = result.meta;
        logger.info(`[${start}] ${req.method} ${url} (${duration} ms) ${result.status}`);
      }
      return NextResponse.json(result, { status: result.status });
    } catch (err) {
      const result = getResponseError(req, reqData, params, err as ApiError);
      if (result.meta) {
        const { start, url, duration } = result.meta;
        logger.error(`[${start}] ${req.method} ${url} (${duration} ms) ${result.status}`);
      }
      logger.error(err);
      return NextResponse.json(result, { status: result.status });
    }
  };

/**
 * Retrieves authorization data, including organization and user information,
 * from the server session based on the provided authentication options.
 *
 * @param {string} orgCode - The organization code.
 * @returns {Promise<OrganizationMemberInfo | undefined>} A Promise that resolves to the authorization data
 * or undefined if the session or required user and organization IDs are not present.
 */
export const getCurrentOrganizationMemberInfo = async (
  orgCode?: string
): Promise<OrganizationMemberInfo | undefined> => {
  // Retrieve the server session using the provided authentication options
  const session = (await getServerSession(authOptions)) as Token | undefined;

  // Extract organization ID from the session, considering the organization code if provided
  let orgId = session?.user?.orgId && Number(session.user.orgId);
  if (!orgId && orgCode) {
    // If organization ID is not present but orgCode is provided, retrieve the organization ID by code
    const data = await getBasicOrganizationByCodeOrAlias(orgCode);
    if (data?.id) {
      orgId = Number(data.id);
    }
  }

  // Retrieve detailed organization member info include role information
  if (session?.user?.id && orgId) {
    const userId = Number(session.user.id);
    return await getCurrentOrganizationMemberIncludeRole(orgId, userId);
  }
};

/**
 * Formats a token object by extracting and returning relevant information.
 *
 * @param token - The token object containing JWT and user information.
 * @returns An object containing the JWT token, organization ID, user ID, and user information.
 */
export const formatToken = (token: Token) => {
  // Retrieve the JWT token and user information from the request.
  const { jwt, user } = token;

  // Return an object containing the JWT token, organization ID, and user ID.
  return {
    jwt,
    organizationId: Number(user.orgId),
    userId: Number(user.id),
    user,
  };
};

/**
 * Retrieves the authentication token and user information from the request.
 * Throws an unauthorized error if the token is not present in the request.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @returns {object} An object containing the JWT token, organization ID, and user ID.
 * @throws {ApiError} Throws an unauthorized error if the token is not present.
 */
export const getToken = (req: ApiNextRequest) => {
  // Throw an unauthorized error if the token is not present in the request.
  if (!req.token) {
    throw new ApiError(HttpStatusCode.Unauthorized);
  }
  return formatToken(req.token);
};

/**
 * Higher-order function that wraps a given handler function to manage custom fields, including file uploads and deletions.
 * It ensures that custom fields are processed before invoking the original handler function.
 *
 * @template T - The return type of the handler function.
 * @template D - The type of data being passed to the handler function.
 * @template P - The type of parameters being passed to the handler function.
 *
 * @param {HandlerFunction<T, D, P>} handler - The original handler function to be wrapped.
 * @returns {Function} - A new function that wraps the original handler with custom fields processing logic.
 */
export const withCustomFieldsHandler = <T = any, D = any, P = AnyObject>(handler: HandlerFunction<T, D, P>) => {
  return withExceptionHandler(async (req: ApiNextRequest, data: D, params: P) => {
    // Retrieve previous and current custom fields from the data object
    const prevCustomFields = (data as any)?.prevCustomFields || [];
    const customFields = (data as any)?.meta?.customFields || [];

    // Create a new list of updated custom fields excluding fields with FILE dataType
    const updatedCustomFields = [...customFields].filter((field: any) => field.dataType !== CustomFieldDataType.FILE);

    // Retrieve the organization ID from the request token
    const organizationId = req.token?.user?.orgId;

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
            const uploadResult = await uploadFile(
              customFieldOptions.localPath,
              file.name,
              `${organizationId}_${ensureString(file.name)}`,
              customFieldOptions.folder,
              {
                orgId: organizationId,
              }
            );
            fileList.push({ id: uploadResult.id, name: file.name, url: uploadResult.url });
          } else {
            // Retain existing files in the file list
            fileList.push(file);
          }
        }
        // Update custom fields with the processed file list
        updatedCustomFields.push({ ...field, value: fileList });
      }
    }

    // Process previous custom fields to handle file deletions
    for (const field of prevCustomFields) {
      if (field.dataType !== CustomFieldDataType.FILE || !field?.value) {
        continue; // Skip non-file fields or fields without a value
      }

      for (const file of field.value as CustomFieldFile[]) {
        const updatedField = updatedCustomFields.find((f: any) => f.id === field.id);
        let isDeleted = false;
        if (updatedField?.value && Array.isArray(updatedField.value)) {
          isDeleted = !(updatedField.value ?? []).find((f: any) => f.id === file.id);
        }
        const isChangedType = updatedField?.dataType !== field.dataType;
        if ((isDeleted || isChangedType) && isNumeric(file.id) && req.token?.jwt) {
          deleteFile(req.token?.jwt, file.id); // Delete files that are removed or changed in type
        }
      }
    }

    // Create a new data object with updated custom fields
    const newData = { ...data, meta: { ...(data as any)?.meta, customFields: updatedCustomFields } };

    // Invoke the original handler with the new data object
    let result;
    if ((newData as any)?.prevCustomFields) {
      const { prevCustomFields: _, ...rest } = newData as any;
      result = await handler(req, rest as D, params);
    } else {
      result = await handler(req, newData, params);
    }

    // Return no content status if the result is undefined
    if (result === undefined) {
      return { status: HttpStatusCode.NoContent };
    }

    return result;
  });
};

/**
 * ## getServerToken Function
 * Retrieves and decodes the server-side authentication token from cookies to extract JWT and user information.
 *
 * ### Returns:
 * - `Promise<{ jwt: string; user: User }>`: An object containing the JWT token and user information.
 *
 * ### Process:
 * 1. **Cookie Retrieval**: Accesses the `next-auth.session-token` from cookies.
 * 2. **Token Decoding**: Decodes the token using the application's secret to extract session details.
 * 3. **Return Structure**: Returns an object with the JWT and user information.
 *
 * ### Errors:
 * - Potential errors if the token is not present or decoding fails.
 */
export const getServerToken = async () => {
  const session = (await getServerSession(authOptions)) || {};
  const { jwt, user } = (session as AnyObject) || {};
  return {
    jwt,
    user,
  };
};

/**
 * Generates metadata for an action result, including the start and end times, and the duration.
 *
 * @param startTime - The timestamp representing the start time of the action, in milliseconds since the Unix epoch.
 * @returns An object containing metadata about the action result, including:
 * - `start`: The ISO 8601 string representation of the start time.
 * - `end`: The ISO 8601 string representation of the end time.
 * - `duration`: The duration of the action in milliseconds.
 */
export const getActionResultMeta = (startTime: number): MetaResult => {
  const end = Date.now();
  const result: MetaResult = {
    start: new Date(startTime).toISOString(),
    end: new Date(end).toISOString(),
    duration: end - startTime,
  };
  return result;
};

/**
 * Represents a function type for handling actions, which processes a token and a variable number of parameters,
 * and optionally returns a result.
 *
 * @template ResultDataType - The type of data included in the action's result. Defaults to `AnyType`.
 *
 * @param token - The token used for authentication or authorization.
 * @param params - A variable number of input parameters required to execute the action.
 *
 * @returns A promise resolving to an `ActionResult` containing the result data,
 *          an `ActionResult` directly, or `void` if no return value is required.
 */
export type ActionHandlerFunction<ResultDataType = AnyType, ParameterType = AnyType> = (
  token: Token,
  params: ParameterType
) => Promise<ActionResult<ResultDataType>> | ActionResult<ResultDataType> | void;

/**
 * A higher-order function that wraps an action handler with exception handling and metadata tracking.
 *
 * This function ensures the following:
 * - The start time of the request is recorded for calculating the execution duration.
 * - A token is securely retrieved for the current user.
 * - The provided handler function is executed safely.
 * - Metadata about the request (e.g., start time, end time, duration) is automatically attached to the result.
 * - Errors encountered during execution are caught, logged, and returned in a consistent error response format.
 *
 * @template ResultDataType - The type of the result data returned by the handler function. Defaults to `AnyType`.
 *
 * @param handler - The action handler function to be wrapped. It takes a token and optional parameters,
 *                  performs specific business logic, and returns a result or throws an error.
 *
 * @returns An asynchronous function that:
 * - Accepts a variable number of parameters (`params`) for the handler function.
 * - Executes the handler function with exception handling.
 * - Returns the handler's result with attached metadata, or a consistent error response in case of failure.
 */
export const withActionExceptionHandler =
  <ParameterType = AnyType, ResultDataType = AnyType>(handler: ActionHandlerFunction<ResultDataType, ParameterType>) =>
  async (params?: ParameterType) => {
    // Config start time for the current request
    const startTime = Date.now();

    // Get token from logged in user
    const token = await getServerToken();

    try {
      // Executing the logic from handler function
      const result = (await handler(token, params as ParameterType)) || {
        status: HttpStatusCode.Ok,
      };

      // Get information about the called action
      const meta = getActionResultMeta(startTime);
      result.meta = {
        ...result.meta,
        ...meta,
      };
      return {
        ...result,
        status: result.status || HttpStatusCode.Ok,
      };
    } catch (err) {
      logger.error(err);
      const { status, message, name, stack, meta: errorMeta } = err as ApiError;

      // Get information about the called action
      const meta = getActionResultMeta(startTime);

      return {
        status: status || HttpStatusCode.InternalServerError,
        message: message || name,
        meta: {
          ...meta,
          ...errorMeta,
          ...{ exception: (__DEV__ && stack) || message },
        },
      };
    }
  };
