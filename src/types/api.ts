import {
  AxiosRequestHeaders as RequestHeaders,
  AxiosResponseHeaders as ResponseHeaders,
  HttpStatusCode as AxiosHttpStatusCode,
  Method,
  responseEncoding as ResponseEncoding,
  ResponseType,
} from "axios";
import createHttpError, { HttpError } from "http-errors";
import { NextRequest } from "next/server";

import { AnyObject, AnyType } from "@/types";
import { UserSession } from "@/types/auth";
import { Meta } from "@/types/graphql";

enum LogicHttpStatusCode {
  NotFound = 5001,
  Existed = 5002,
  Exclusive = 5003,
  UsernameExisted = 5004,
  EmailExisted = 5005,
  BlockFailed = 5006,
  InvalidValidityPeriod = 5007,
  ScheduleSelectionRequired = 5008,
  NotEnoughDataToChangeStatus = 5009,
}

/**
 * Alias enums, type of the Axios library
 */
export const HttpStatusCode = {
  ...AxiosHttpStatusCode,
  ...LogicHttpStatusCode,
};

export type { Method, RequestHeaders, ResponseEncoding, ResponseHeaders, ResponseType };

/**
 * Next auth token
 */
export type Token = {
  jwt: string;
  user: UserSession;
};

/**
 * API request object
 */
export type ApiNextRequest = NextRequest & {
  startTime: number;
  token?: Token;
};

/**
 * The `ApiResultMeta` type defines metadata associated with an API response.
 */
export type MetaResult = Meta & {
  /**
   * The URL of the API endpoint.
   */
  url?: string;

  /**
   * The parameters of the API request.
   * NOTE: This is for development use only.
   */
  data?: AnyType;

  /**
   * The parameters of the API request.
   * NOTE: This is for development use only.
   */
  params?: AnyType;

  /**
   * The time (UTC) when the server starts receiving requests from the client.
   */
  start?: string;

  /**
   * The end time (UTC) of the API response
   */
  end?: string;

  /**
   * The duration of the API response, in milliseconds.
   */
  duration?: number;

  /**
   * The stack trace associated with the error, if available.
   * NOTE: This is for development use only.
   */
  exception?: string;
};

/**
 * The `ApiResultMeta` type defines metadata associated with an API response.
 */
export type ApiResultMeta = Meta & {
  /**
   * The URL of the API endpoint.
   */
  url?: string;

  /**
   * The parameters of the API request.
   * NOTE: This is for development use only.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;

  /**
   * The parameters of the API request.
   * NOTE: This is for development use only.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: any;

  /**
   * The time (UTC) when the server starts receiving requests from the client.
   */
  start?: string;

  /**
   * The end time (UTC) of the API response
   */
  end?: string;

  /**
   * The duration of the API response, in milliseconds.
   */
  duration?: number;

  /**
   * The stack trace associated with the error, if available.
   * NOTE: This is for development use only.
   */
  exception?: string;
};

/**
 * The ActionResult type defines the structure of API response.
 * @template T - The type of data property.
 */
export type ActionResult<T = AnyType> = ApiResult<T>;

/**
 * The ApiResult type defines the structure of API response.
 * @template T - The type of data property.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ApiResult<T = any> = {
  /**
   * The status code of the response.
   */
  status: number;

  /**
   * A custom error code that may be associated with the error.
   */
  code?: string;

  /**
   * The message describing the result of the response.
   */
  message?: string;

  /**
   * The response data.
   */
  data?: T;

  /**
   * The metadata about the API response.
   */
  meta?: ApiResultMeta;
};

/**
 * API Error
 */
export class ApiError extends Error {
  /**
   * The HTTP status code associated with the error.
   */
  public status: number;

  /**
   * Http Error
   */
  public error: HttpError;

  /**
   * Meta
   */
  public meta?: AnyObject;

  public constructor(statusCode: AxiosHttpStatusCode, message?: string, meta?: AnyObject) {
    const httpError = createHttpError(statusCode);
    super(message || httpError.message);
    this.status = statusCode;
    this.error = httpError;
    this.meta = meta;
  }
}
