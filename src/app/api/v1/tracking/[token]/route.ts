import { AccessLogType, ShareObjectType } from "@prisma/client";
import { JsonObject } from "@prisma/client/runtime/library";
import { HttpStatusCode } from "axios";
import isNumber from "lodash/isNumber";
import moment from "moment";
import UAParser from "ua-parser-js";

import { APP_SECRET, CLIENT_API_KEY } from "@/configs/environment";
import { createAccessLog } from "@/services/server/accessLog";
import { getOrderData } from "@/services/server/order";
import { getOrderTripData } from "@/services/server/orderTrip";
import { getShareObjectByToken } from "@/services/server/shareObject";
import { AnyObject } from "@/types";
import { ApiError, ApiNextRequest } from "@/types/api";
import { AccessLogInfo } from "@/types/strapi";
import { decryptAES } from "@/utils/security";
import { withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

const types: string[] = [ShareObjectType.ORDER, ShareObjectType.TRIP];

/**
 * Asynchronously creates an access log entry for a given order request.
 *
 * @param {ApiNextRequest} request - The API request object that contains headers and other request data.
 * @param {number} targetId - The ID of the order or trip for which the access log is being created.
 * @returns {Promise<void>} This function returns a promise that resolves when the log entry has been created.
 */
const createAccessLogRequest = async (
  request: ApiNextRequest,
  targetId: number,
  type: AccessLogType = AccessLogType.ORDER
) => {
  try {
    const referrer = request.headers.get("referer") || request.referrer;
    const ipAddress = request.headers.get("x-forwarded-for");
    const userAgent = request.headers.get("user-agent");
    let device, os, browser;

    // If a user-agent is provided, parse it to extract device, OS, and browser information
    if (userAgent) {
      const parser = new UAParser(userAgent);
      device = parser.getDevice().type;
      os = parser.getOS().name;
      browser = parser.getBrowser().name;
    }

    // Construct a partial AccessLogInfo object with gathered request details
    const paramsLogs: Partial<AccessLogInfo> = {
      targetId,
      type,
      timestamp: new Date(),
      referrerUrl: referrer,
      ipAddress,
      userAgent,
      deviceType: device || null,
      os: os || null,
      browser: browser || null,
    };
    await createAccessLog(paramsLogs);
  } catch (error) {
    // Error handling is not implemented; errors are silently caught
  }
};

/**
 * Handles GET requests with exception handling.
 *
 * @param {ApiNextRequest} request - The incoming API request object.
 * @param reqData - Additional request data (not used in the current implementation).
 * @param params - Parameters extracted from the request, which should include a 'token'.
 * @returns {Promise<{ status: number, data: any }>} - Returns a promise that resolves to an object containing
 * the HTTP status and the order data (excluding the order id).
 */
export const GET = withExceptionHandler(async (request: ApiNextRequest, _reqData, params) => {
  const clientApiKey = request.headers.get("client-api-key");
  // Check if the client API key is provided and valid
  if (!clientApiKey || clientApiKey !== CLIENT_API_KEY) {
    return { status: HttpStatusCode.Unauthorized, message: "Unauthorized" };
  }

  // Ensure that the token parameter is a string
  const token = ensureString(params.token);

  // Decrypt the token using AES encryption with a pre-defined secret
  const decryptedData = decryptAES(token, APP_SECRET);
  if (!decryptedData) {
    throw new ApiError(HttpStatusCode.BadRequest, "Token is invalid.");
  }

  // Parse the decrypted data to extract needed fields
  const { type, orgId, orderCode, tripCode, exp } = JSON.parse(decryptedData);
  if (
    !types.includes(type) ||
    !isNumber(orgId) ||
    (type === ShareObjectType.ORDER && !orderCode) ||
    (type === ShareObjectType.TRIP && !tripCode)
  ) {
    throw new ApiError(HttpStatusCode.BadRequest, "Token is invalid.");
  }

  // Check if the token has expired
  if (exp) {
    const currentDate = moment();
    if (currentDate.isAfter(moment(exp))) {
      throw new ApiError(498 as HttpStatusCode, "Token was expired.");
    }
  }

  // Retrieve order share using the token
  const orderShare = await getShareObjectByToken(token);
  if (!orderShare) {
    throw new ApiError(HttpStatusCode.NotFound, "Order Share not exists.");
  }

  const isShareMap = ((orderShare.meta as JsonObject)?.map as boolean) || false;

  if (type === ShareObjectType.ORDER && orderCode) {
    // Retrieve order data using orgId and orderCode
    const order = await getOrderData(orgId, orderCode, isShareMap);
    if (!order) {
      throw new ApiError(HttpStatusCode.NotFound, "Order not exists.");
    }

    // Log the access request with the order id
    await createAccessLogRequest(request, Number(order.id));

    return {
      status: HttpStatusCode.Ok,
      data: {
        ...order,
        meta: orderShare.meta,
      },
    };
  }

  // Case sharing order trip
  // Retrieve order trip data using orgId and tripCode
  const orderTrip = await getOrderTripData(orgId, tripCode, isShareMap);
  if (!orderTrip) {
    throw new ApiError(HttpStatusCode.NotFound, "Order trip does not exist.");
  }

  // Log the access request with the trip id
  await createAccessLogRequest(request, Number(orderTrip.id), AccessLogType.TRIP);

  return {
    status: HttpStatusCode.Ok,
    data: {
      ...orderTrip,
      meta: orderShare.meta,
    } as AnyObject,
  };
});
