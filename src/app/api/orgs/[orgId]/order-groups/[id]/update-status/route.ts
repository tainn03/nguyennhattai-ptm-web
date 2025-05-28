import { updateOrderTripStatusAndSendNotificationByOrderGroupId } from "@/actions/orderGroup";
import { UpdateOrderGroupStatusInputForm } from "@/forms/orderGroup";
import { ApiNextRequest } from "@/types/api";
import { getToken, withExceptionHandler } from "@/utils/server";

/**
 * Handles the update of the status of an order group.
 *
 * @param req - The API request object.
 * @param requestData - The data for updating the status of the order group.
 * @returns The updated order group.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: UpdateOrderGroupStatusInputForm) => {
  // Get authentication token from request
  getToken(req);

  // Send notification about order group status change and get response
  return await updateOrderTripStatusAndSendNotificationByOrderGroupId(requestData);
});
