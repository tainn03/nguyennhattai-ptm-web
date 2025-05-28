import { NotificationType, OrganizationRoleType } from "@prisma/client";
import { HttpStatusCode } from "axios";

import { OrderInputForm } from "@/forms/order";
import { createOrder } from "@/services/server/order";
import { getOrganizationOrderCodeSetting } from "@/services/server/organizationSetting";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { NewOrderNotification } from "@/types/notification";
import { pushNotification } from "@/utils/notification";
import { getToken, withCustomFieldsHandler } from "@/utils/server";

/**
 * Handles the creation of a new order, incorporating the provided request data.
 * If successful, checks if the order is not a draft and sends a new order notification.
 * Returns an OK response with the order code if the creation is successful,
 * or an Internal Server Error response otherwise.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {OrderInputForm} requestData - The data for creating a new order.
 * @returns {object} An object containing the HTTP status and result data.
 */
export const POST = withCustomFieldsHandler(async (req: ApiNextRequest, requestData: OrderInputForm) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);

  // Destructure relevant properties from the request data.
  const { customer, route, unit, weight, isDraft } = requestData;
  const setting = await getOrganizationOrderCodeSetting(jwt, { organizationId });
  if (!setting) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  // Create the order using the provided data.
  const result = await createOrder(jwt, { ...requestData, organizationId, createdById }, setting);

  // Check if the order creation was not successful.
  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  // Check if the order is not a draft and send a new order notification.
  if (!isDraft && result.code && customer && route && unit && weight) {
    // Data to handle notification
    const data: NewOrderNotification = { orderCode: result.code, customer, route, unit, weight };

    // Send the new order notification.
    pushNotification({
      entity: {
        type: NotificationType.NEW_ORDER,
        organizationId,
        createdById,
        targetId: Number(result.id),
      },
      data,
      jwt,
      orgMemberRoles: [OrganizationRoleType.MANAGER, OrganizationRoleType.ACCOUNTANT],
    });
  }

  // Return an OK response with the order code if the creation is successful.
  return { status: HttpStatusCode.Ok, data: result.code };
});
