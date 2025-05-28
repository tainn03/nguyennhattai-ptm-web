import { NotificationType, OrderStatusType, OrganizationRoleType } from "@prisma/client";
import { HttpStatusCode } from "axios";

import { OrderStatusChangeForm } from "@/forms/order";
import { autoDispatchVehicle, checkOrderExclusives } from "@/services/server/order";
import { createOrderStatusByGraphQL } from "@/services/server/orderStatus";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { OrderReceivedNotification } from "@/types/notification";
import { getAccountInfo } from "@/utils/auth";
import logger from "@/utils/logger";
import { pushNotification } from "@/utils/notification";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: OrderStatusChangeForm) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);
  const { order, lastUpdatedAt } = requestData;

  const isErrorExclusives = await checkOrderExclusives(jwt, organizationId, Number(order.id), lastUpdatedAt);
  if (isErrorExclusives) {
    return { status: HttpStatusCode.Conflict, message: ErrorType.EXCLUSIVE };
  }

  const result = await createOrderStatusByGraphQL(jwt, {
    order: { id: order.id },
    organizationId,
    createdById,
    type: OrderStatusType.RECEIVED,
  });

  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  logger.info(`#Analysis[Receive]: deliveryDate: ${order.deliveryDate}`);
  // Auto dispatch vehicle if order has delivery date
  autoDispatchVehicle(jwt, { ...order, organizationId });

  const notificationData: OrderReceivedNotification = {
    orderCode: ensureString(order.code),
    fullName: getAccountInfo(order.updatedByUser).displayName,
    orderStatus: OrderStatusType.RECEIVED,
  };

  pushNotification({
    jwt,
    entity: {
      organizationId,
      type: NotificationType.ORDER_STATUS_CHANGED,
      targetId: order.id,
      createdById,
    },
    data: notificationData,
    orgMemberRoles: [OrganizationRoleType.MANAGER, OrganizationRoleType.ACCOUNTANT],
  });

  return { status: HttpStatusCode.Ok, data: result };
});
