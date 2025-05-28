import { NotificationType, OrganizationRoleType } from "@prisma/client";
import { HttpStatusCode } from "axios";

import { UpdateOrderInputForm } from "@/forms/order";
import { checkOrderExclusives, updateOrder } from "@/services/server/order";
import { getOrganizationOrderCodeSetting } from "@/services/server/organizationSetting";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { NewOrderNotification } from "@/types/notification";
import { pushNotification } from "@/utils/notification";
import { getToken, withCustomFieldsHandler } from "@/utils/server";

/**
 * Handles the update of an existing order based on the incoming data.
 * If the order update is not a draft and contains necessary details (code, customer, route, unit, weight),
 * sends a notification to relevant members about the new order.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {UpdateOrderInputForm} requestData - The data for updating an existing order.
 * @returns {object} An object containing the HTTP status and result data.
 */
export const PUT = withCustomFieldsHandler(async (req: ApiNextRequest, requestData: UpdateOrderInputForm) => {
  const { jwt, organizationId, userId } = getToken(req);

  // Extract relevant data from the incoming payload.
  const { lastUpdatedAt, lastCustomer, lastRoute, ...otherProps } = requestData;
  const { id, isDraft, code, customer, route, unit, weight } = otherProps;

  // Check for exclusive modifications to the order.
  const isErrorExclusives = await checkOrderExclusives(jwt, organizationId, Number(id), lastUpdatedAt);
  if (isErrorExclusives) {
    return { status: HttpStatusCode.Conflict, message: ErrorType.EXCLUSIVE };
  }

  // Fetch the organization's order code settings.
  const organizationSetting = await getOrganizationOrderCodeSetting(jwt, { organizationId });
  if (!organizationSetting) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  // Update the order using the provided data.
  const result = await updateOrder(
    jwt,
    { ...otherProps, organizationId, updatedById: userId },
    lastCustomer,
    lastRoute,
    organizationSetting
  );

  // Check if the transaction was successful.
  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  // If the update is not a draft and contains necessary details, send a notification about the new order.
  if (!isDraft && code && customer && route && unit && weight) {
    // Data for the new order notification.
    const data: NewOrderNotification = { orderCode: code, customer, route, unit, weight };

    // Send a notification to relevant members about the new order.
    pushNotification({
      entity: {
        type: NotificationType.NEW_ORDER,
        organizationId,
        createdById: userId,
        targetId: Number(id),
      },
      data,
      jwt,
      orgMemberRoles: [OrganizationRoleType.MANAGER, OrganizationRoleType.ACCOUNTANT],
    });
  }

  // Return the HTTP status and result data.
  return { status: HttpStatusCode.Ok, data: result.code };
});
