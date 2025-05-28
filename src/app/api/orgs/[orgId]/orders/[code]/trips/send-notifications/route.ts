import { NotificationType, OrderTripStatusType } from "@prisma/client";
import moment from "moment";

import { prisma } from "@/configs/prisma";
import { SendNotificationForm } from "@/forms/orderTrip";
import { getDriverReportByType } from "@/services/server/driverReport";
import { updateOrderTrip } from "@/services/server/orderTrip";
import { createOrderTripStatus, getOrderTripStatusesByTripId } from "@/services/server/orderTripStatus";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { TripPendingConfirmationNotification } from "@/types/notification";
import { pushNotification } from "@/utils/notification";
import { getToken, withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest, data: SendNotificationForm) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);
  const { trips, fullName, orderId, orderCode, unitOfMeasure, notificationType } = data;

  // If driver report is not available, return an internal server error
  const driverReport = await getDriverReportByType(jwt, organizationId, OrderTripStatusType.PENDING_CONFIRMATION);
  if (!driverReport) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  // Use Prisma transaction to update trip statuses
  const scheduledNotification = notificationType === "scheduled";
  const result = await prisma.$transaction(async (prisma) => {
    for (const trip of trips) {
      if (
        (scheduledNotification && trip.driverNotificationScheduledAt) ||
        (!scheduledNotification &&
          trip.driverNotificationScheduledAt &&
          moment(trip.driverNotificationScheduledAt).isAfter(new Date()))
      ) {
        await updateOrderTrip(prisma, {
          id: Number(trip.id),
          organizationId,
          driverNotificationScheduledAt: scheduledNotification ? trip.driverNotificationScheduledAt : null,
          updatedById: createdById,
        });
      }
      if (scheduledNotification) {
        continue;
      }

      const orderTripStatusIds = await getOrderTripStatusesByTripId(jwt, organizationId, Number(trip.id));
      await createOrderTripStatus(
        prisma,
        {
          id: Number(trip.id),
          organizationId,
          status: OrderTripStatusType.PENDING_CONFIRMATION,
          driverReportId: driverReport.id,
          createdById,
        },
        orderTripStatusIds.length + 1
      );
    }
    return true;
  });

  // If the transaction is not successful, return an internal server error
  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  // Send notifications for each trip
  if (!scheduledNotification) {
    for (const trip of trips) {
      const { id, code, driverUserId, driverFullName, weight, vehicleNumber } = trip;
      // Data to handle notification
      const data: TripPendingConfirmationNotification = {
        orderId,
        orderCode,
        tripCode: code,
        tripId: Number(id),
        fullName,
        driverFullName,
        tripStatus: OrderTripStatusType.PENDING_CONFIRMATION,
        weight: Number(weight),
        unitOfMeasure,
        vehicleNumber,
        driverReportId: driverReport.id,
      };

      // Push notifications
      pushNotification({
        entity: {
          type: NotificationType.TRIP_STATUS_CHANGED,
          organizationId,
          createdById,
          targetId: Number(id),
        },
        data,
        jwt,
        ...(driverUserId && { receivers: [{ user: { id: driverUserId } }] }),
        isSendToParticipants: false,
      });
    }
  }

  return { status: HttpStatusCode.Ok, data: result };
});
