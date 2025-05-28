import { NotificationType, OrderTripMessageType, OrderTripStatusType, OrganizationRoleType } from "@prisma/client";
import isNil from "lodash/isNil";
import moment from "moment";

import {
  updateOrderGroupStatusIfAllTripsCompleted,
  updateOrderGroupStatusIfAllTripsDelivered,
} from "@/actions/orderGroup";
import { checkBillOfLadingExists } from "@/actions/orderTrip";
import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { internalMessageOptions } from "@/configs/media";
import { prisma } from "@/configs/prisma";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { UpdateStatusInputForm } from "@/forms/orderTrip";
import { getOrderByCode } from "@/services/client/order";
import { createOrderTripMessage } from "@/services/server/orderTripMessage";
import { createOrderTripStatus, getOrderTripStatusesByTripId } from "@/services/server/orderTripStatus";
import { uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import {
  NotificationData,
  TripConfirmedNotification,
  TripDeliveryStepNotification,
  TripPendingConfirmationNotification,
  TripWarehouseGoingToPickupNotification,
} from "@/types/notification";
import { DriverInfo, OrderParticipantInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { pushNotification } from "@/utils/notification";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString, isTrue } from "@/utils/string";

/**
 * Handles the creation and update of order trip status.
 * Returns an OK response with the result of the transaction if successful, or an Internal Server Error response otherwise.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {UpdateStatusInputForm} data - The data for updating the order trip status.
 * @returns {object} An object containing the HTTP status and result data.
 */
export const POST = withExceptionHandler(async (req: ApiNextRequest, data: UpdateStatusInputForm) => {
  const { jwt, organizationId: serverOrganizationId, userId: createdById } = getToken(req);
  const {
    id,
    organizationId: clientOrganizationId,
    code,
    attachments,
    status,
    orderDate,
    longitude,
    latitude,
    driver,
    orderId,
    orderCode,
    orderGroupCode,
    orderGroupId,
    fullName,
    unitOfMeasure,
    vehicle,
    weight,
    driverReportName,
    driverReportId,
    billOfLading,
    pushNotification: isPushNotification = true,
  } = data;

  const organizationId = serverOrganizationId || Number(clientOrganizationId);

  if (billOfLading) {
    const isBillOfLadingExists = await checkBillOfLadingExists({ id, organizationId, billOfLading });
    if (isBillOfLadingExists) {
      return { status: HttpStatusCode.BadRequest, code: ErrorType.EXISTED, message: "Bill of lading already exists" };
    }
  }

  if (!driverReportId) {
    return { status: HttpStatusCode.BadRequest, message: "Driver report id is required" };
  }

  // Collect IDs of uploaded attachments.
  const idImages: number[] = [];
  if (attachments && attachments.length > 0) {
    for (const item of attachments) {
      const momentDate = moment(orderDate);
      const { id: uploadFileId } = await uploadFile(
        internalMessageOptions.localPath,
        item,
        item,
        internalMessageOptions.folder,
        {
          orgId: organizationId,
          mmyyyy: momentDate.format("MMYYYY"),
        }
      );
      idImages.push(uploadFileId);
    }
  }

  // Retrieve existing order trip status IDs for the specified trip.
  const orderTripStatusIds = await getOrderTripStatusesByTripId(jwt, organizationId, Number(id));
  if (!orderTripStatusIds) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  // Perform a transaction to create/update the order trip status and associated messages.
  const result = await prisma.$transaction(async (prisma) => {
    // Create the order trip status
    const createOrderTripStatusId = await createOrderTripStatus(
      prisma,
      { ...data, createdById, organizationId },
      orderTripStatusIds.length + 1
    );

    // Create order trip messages if there are uploaded attachments or have latitude and longitude.
    if (idImages.length > 0 || (!isNil(longitude) && !isNil(latitude))) {
      const type =
        status && Object.values(OrderTripMessageType).includes(status as OrderTripMessageType)
          ? (status as OrderTripMessageType)
          : null;

      await createOrderTripMessage(
        prisma,
        {
          organizationId,
          tripId: id,
          ...(type && { type }),
          longitude: longitude ? parseFloat(ensureString(longitude)) : null,
          latitude: latitude ? parseFloat(ensureString(latitude)) : null,
          createdById,
        },
        idImages,
        jwt
      );
    }

    return createOrderTripStatusId;
  });

  // Check if the transaction was successful.
  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  // Get the order consolidation enabled setting.
  const orderConsolidationEnabled = await getOrganizationSettingExtended<boolean>({
    organizationId,
    key: OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED,
  });

  // If the order consolidation is enabled and the order group code exists, update the code in the title and description.
  if (isTrue(orderConsolidationEnabled) && orderGroupId) {
    // Update the order group status based on the trip status.
    switch (status) {
      case OrderTripStatusType.DELIVERED:
        await updateOrderGroupStatusIfAllTripsDelivered({ id: Number(orderGroupId), organizationId });
        break;
      case OrderTripStatusType.COMPLETED:
        await updateOrderGroupStatusIfAllTripsCompleted({ id: Number(orderGroupId), organizationId });
        break;
    }
  }

  if (isPushNotification) {
    // Send notifications based on the status, updating relevant parties.
    const driverFullName = getFullName(driver?.firstName, driver?.lastName);
    const receivers: Partial<DriverInfo | OrderParticipantInfo>[] = [];
    let notificationData: NotificationData | undefined;
    let orgMemberRoles: OrganizationRoleType[] = [];
    let isSendToParticipants = true;

    if (status) {
      // Determine the notification data and receivers based on the status.
      switch (status) {
        case OrderTripStatusType.PENDING_CONFIRMATION: {
          isSendToParticipants = false;
          driver && receivers.push(driver);
          const tripPendingConfirmationNotificationData: TripPendingConfirmationNotification = {
            driverFullName,
            fullName: ensureString(fullName),
            orderId: Number(orderId),
            orderCode: ensureString(orderCode),
            tripCode: ensureString(code),
            tripId: Number(id),
            orderGroupCode,
            tripStatus: status,
            unitOfMeasure: ensureString(unitOfMeasure),
            vehicleNumber: ensureString(vehicle?.vehicleNumber),
            weight: Number(weight),
            driverReportId,
          };
          notificationData = tripPendingConfirmationNotificationData;
          break;
        }
        case OrderTripStatusType.CONFIRMED: {
          const tripConfirmedNotificationData: TripConfirmedNotification = {
            driverFullName,
            orderCode: ensureString(orderCode),
            tripCode: ensureString(code),
            tripId: Number(id),
            orderGroupCode,
            tripStatus: status,
            driverReportId,
          };

          notificationData = tripConfirmedNotificationData;
          break;
        }
        case OrderTripStatusType.WAITING_FOR_PICKUP:
        case OrderTripStatusType.WAREHOUSE_GOING_TO_PICKUP: {
          const orderData = await getOrderByCode(organizationId, ensureString(orderCode));
          const tripWarehouseGoingToPickupNotificationData: TripWarehouseGoingToPickupNotification = {
            driverFullName,
            orderCode: ensureString(orderCode),
            tripCode: ensureString(code),
            tripId: Number(id),
            pickupPoint: orderData?.route?.pickupPoints?.[0]?.name || orderData?.route?.pickupPoints?.[0]?.code || "",
            orderGroupCode,
            tripStatus: status,
            driverReportId,
          };

          notificationData = tripWarehouseGoingToPickupNotificationData;
          break;
        }
        case OrderTripStatusType.WAREHOUSE_PICKED_UP: {
          const tripWarehousePickedUpNotificationData: TripConfirmedNotification = {
            driverFullName,
            orderCode: ensureString(orderCode),
            tripCode: ensureString(code),
            tripId: Number(id),
            orderGroupCode,
            tripStatus: status,
            driverReportId,
          };

          notificationData = tripWarehousePickedUpNotificationData;
          break;
        }
        case OrderTripStatusType.WAITING_FOR_DELIVERY:
        case OrderTripStatusType.DELIVERED: {
          const dataTmp: TripDeliveryStepNotification = {
            driverFullName,
            driverReportName: ensureString(driverReportName),
            orderCode: ensureString(orderCode),
            tripCode: ensureString(code),
            tripId: Number(id),
            orderGroupCode,
            tripStatus: status,
            vehicleNumber: ensureString(vehicle?.vehicleNumber),
            driverReportId,
          };

          notificationData = dataTmp;
          orgMemberRoles = [OrganizationRoleType.ACCOUNTANT];
          break;
        }
      }
    } else {
      const dataTmp: TripDeliveryStepNotification = {
        driverFullName,
        driverReportName: ensureString(driverReportName),
        orderCode: ensureString(orderCode),
        tripCode: ensureString(code),
        tripId: Number(id),
        orderGroupCode,
        vehicleNumber: ensureString(vehicle?.vehicleNumber),
        driverReportId,
      };

      notificationData = dataTmp;
      orgMemberRoles = [OrganizationRoleType.ACCOUNTANT];
    }

    // Send the notification.
    if (notificationData) {
      pushNotification({
        entity: {
          type: NotificationType.TRIP_STATUS_CHANGED,
          organizationId,
          createdById,
          targetId: Number(id),
        },
        data: notificationData,
        jwt,
        orgMemberRoles,
        receivers,
        isSendToParticipants,
      });
    }
  }

  // Return an OK response with the result of the transaction.
  return { status: HttpStatusCode.Ok, data: result };
});
