import { NotificationType, OrderStatusType, OrderTripStatusType, OrganizationRoleType } from "@prisma/client";
import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { OrderStatusChangeForm } from "@/forms/order";
import { getDriverReportByType } from "@/services/server/driverReport";
import { checkOrderExclusives, deleteOrder, getOrderParticipantNotificationData } from "@/services/server/order";
import { createOrderStatusByGraphQL } from "@/services/server/orderStatus";
import { createOrderTripStatus, getOrderTripStatusesByTripId } from "@/services/server/orderTripStatus";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { OrderDeletedNotification } from "@/types/notification";
import { OrderParticipantInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";
import { pushNotification } from "@/utils/notification";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString } from "@/utils/string";

export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: OrderStatusChangeForm) => {
  const { jwt, organizationId, userId } = getToken(req);
  const { order, lastUpdatedAt } = requestData;

  const isErrorExclusives = await checkOrderExclusives(jwt, organizationId, Number(order.id), lastUpdatedAt);
  if (isErrorExclusives) {
    return { status: HttpStatusCode.Conflict, message: ErrorType.EXCLUSIVE };
  }

  const participants = await getOrderParticipantNotificationData(jwt, organizationId, ensureString(order?.code));

  const trips = order.trips;
  // Perform a transaction to create/update the order trip status and associated messages.
  const result = await prisma.$transaction(async (prisma) => {
    const rs = await createOrderStatusByGraphQL(jwt, {
      order: { id: order.id },
      organizationId,
      createdById: userId,
      type: OrderStatusType.CANCELED,
    });

    if (!rs) {
      return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
    }

    if (trips) {
      const driverReport = await getDriverReportByType(jwt, organizationId, OrderTripStatusType.CANCELED);

      if (!driverReport) {
        return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
      }

      for (const trip of trips) {
        const orderTripStatusIds = await getOrderTripStatusesByTripId(jwt, organizationId, Number(trip.id));

        await createOrderTripStatus(
          prisma,
          {
            id: Number(trip.id),
            driverReportId: driverReport.id,
            organizationId,
            status: OrderTripStatusType.CANCELED,
            createdById: userId,
          },
          orderTripStatusIds.length + 1
        );
      }
    }
    return await deleteOrder(jwt, { ...order, updatedById: userId });
  });

  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  const notificationData: OrderDeletedNotification = {
    orderCode: ensureString(order.code),
    fullName: getAccountInfo(order.updatedByUser).displayName,
  };

  const receivers: Partial<OrderParticipantInfo>[] = participants.map((item) => {
    return { user: item.user };
  });

  pushNotification({
    jwt,
    entity: {
      organizationId,
      type: NotificationType.DELETE_ORDER,
      targetId: order.id,
      createdById: userId,
    },
    data: notificationData,
    orgMemberRoles: [OrganizationRoleType.MANAGER, OrganizationRoleType.ACCOUNTANT],
    receivers,
    isSendToParticipants: false,
  });

  return { status: HttpStatusCode.Ok, data: result };
});
