import { ValidationError } from "yup";

import { notifyAndUpdateStatusInProgress } from "@/actions/orderGroup";
import { CLIENT_API_KEY } from "@/configs/environment";
import { orderGroupInputFormSchema } from "@/forms/server/orderGroup";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { WarehouseNotifyRequest } from "@/types/tms-tap-warehouse";
import logger from "@/utils/logger";
import { withExceptionHandler } from "@/utils/server";

/**
 * POST endpoint handler for notifying in-stock or in-progress orders
 *
 * This function handles the following workflow:
 * 1. Validates the client API key from request headers for authentication
 * 2. Validates the request payload against the order group schema
 * 3. Calls service to notify TMS web about in-stock or in-progress orders and update their status
 * 4. Returns success/error response
 *
 * @param request - The incoming API request containing client API key header
 * @param requestData - The request payload containing order group data
 * @returns API response with status code and message
 */
export const POST = withExceptionHandler(async (request: ApiNextRequest, requestData: WarehouseNotifyRequest) => {
  // Extract client API key from request headers
  const clientApiKey = request.headers.get("client-api-key");

  // Validate client API key - return 401 if missing or invalid
  if (!clientApiKey || clientApiKey !== CLIENT_API_KEY) {
    return { status: HttpStatusCode.Unauthorized, message: "Unauthorized" };
  }

  // Validate request payload against schema
  try {
    // abortEarly: false allows collecting all validation errors
    await orderGroupInputFormSchema.validate(requestData, { abortEarly: false });
  } catch (error) {
    // Log validation error details for debugging
    logger.error(JSON.stringify(error, null, 2));

    // Return validation errors in response if validation failed
    if (error instanceof ValidationError) {
      return { status: HttpStatusCode.BadRequest, message: JSON.stringify(error.errors) };
    }
  }

  // Process the in-progress notification and status update
  const result = await notifyAndUpdateStatusInProgress(requestData);

  // Return success response with updated data
  return {
    status: HttpStatusCode.Ok,
    data: result,
    message: "In-progress orders notified and status updated",
  };
});
