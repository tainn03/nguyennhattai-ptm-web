import { NotificationType, OrderStatusType, OrderTripStatusType, OrganizationRoleType } from "@prisma/client";
import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { OrderStatusChangeForm } from "@/forms/order";
import { getDriverReportByType } from "@/services/server/driverReport";
import { checkOrderExclusives } from "@/services/server/order";
import { createOrderStatusByGraphQL } from "@/services/server/orderStatus";
import { createOrderTripStatus, getOrderTripStatusesByTripId } from "@/services/server/orderTripStatus";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { OrderCanceledNotification } from "@/types/notification";
import { getAccountInfo } from "@/utils/auth";
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

  const trips = order.trips;
  // Perform a transaction to create/update the order trip status and associated messages.
  const result = await prisma.$transaction(async (prisma) => {
    const rs = await createOrderStatusByGraphQL(jwt, {
      order: { id: order.id },
      organizationId,
      createdById,
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
            createdById,
          },
          orderTripStatusIds.length + 1
        );
      }
      return true;
    }
  });

  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  const notificationData: OrderCanceledNotification = {
    orderCode: ensureString(order.code),
    fullName: getAccountInfo(order.updatedByUser).displayName,
    orderStatus: OrderStatusType.CANCELED,
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
