import { NotificationType, OrderStatusType, OrderTripStatusType, OrganizationRoleType } from "@prisma/client";
import moment from "moment";

import { updateOrderGroupStatusIfAllTripsCompleted } from "@/actions/orderGroup";
import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { billOfLadingOptions } from "@/configs/media";
import { prisma } from "@/configs/prisma";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { UpdateBillOfLadingForm } from "@/forms/orderTrip";
import { getDriverReportByType } from "@/services/server/driverReport";
import { checkOrderCompleted } from "@/services/server/order";
import { createOrderStatus } from "@/services/server/orderStatus";
import { checkOrderTripExclusives, updateBillOfLading } from "@/services/server/orderTrip";
import { createOrderTripMessage } from "@/services/server/orderTripMessage";
import { createOrderTripStatus } from "@/services/server/orderTripStatus";
import { getTripDriverExpensesByTripId } from "@/services/server/tripDriverExpense";
import { uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { DriverInfo, OrderParticipantInfo, TripDriverExpenseInfo } from "@/types/strapi";
import { createTranslator } from "@/utils/locale";
import { pushNotification } from "@/utils/notification";
import { formatCurrency } from "@/utils/number";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString, isTrue } from "@/utils/string";

/**
 * Handles the update of a Bill of Lading for a specific order trip.
 *
 * @param {ApiNextRequest} req - The API request object.
 * @param {UpdateBillOfLadingForm} requestData - The data for updating the Bill of Lading.
 * @returns {object} An object containing the HTTP status and result data.
 */
export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: UpdateBillOfLadingForm) => {
  const { jwt, organizationId, userId } = getToken(req);

  const {
    id,
    code,
    billOfLading,
    billOfLadingReceived,
    billOfLadingImages,
    status,
    orderTripStatusOrder,
    order,
    totalTrips,
    remainingWeightCapacity,
    ignoreCheckExclusives,
    lastUpdatedAt,
    deleteImage,
    fullName,
    driver,
    locale,
  } = requestData;

  const t = await createTranslator(locale);

  if (!ignoreCheckExclusives) {
    // Validate the exclusivity of the order trip to prevent concurrent updates.
    const isErrorExclusives = await checkOrderTripExclusives(jwt, organizationId, Number(id), lastUpdatedAt);
    if (isErrorExclusives) {
      return { status: HttpStatusCode.Conflict, message: ErrorType.EXCLUSIVE };
    }
  }

  // Process bill of lading images, updating or uploading them as needed.
  const billOfLadingImageIds: number[] = [];
  const oldBillOfLadingImageIds: number[] = [];
  if (billOfLadingImages && (billOfLadingImages || []).length > 0) {
    for (const item of billOfLadingImages) {
      if (!item.id) {
        // Upload new bill of lading images.
        const momentDate = moment(order?.orderDate); // Get order date for filename
        const billOfLadingName = `${order?.code}_${code}_${ensureString(item.name)}`; // Generate unique filename
        const { id: uploadFileId } = await uploadFile(
          billOfLadingOptions.localPath,
          ensureString(item.name),
          billOfLadingName,
          billOfLadingOptions.folder,
          {
            orgId: organizationId,
            mmyyyy: momentDate.format("MMYYYY"),
          }
        );

        billOfLadingImageIds.push(uploadFileId);
      } else {
        // Track existing bill of lading image IDs.
        oldBillOfLadingImageIds.push(item.id);
      }
    }
  }

  // Retrieve the driver report for completed order trips.
  const driverReport = await getDriverReportByType(jwt, organizationId, OrderTripStatusType.COMPLETED);
  if (!driverReport) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  // Perform a transaction to update the order trip, create a completed order trip status, and send appropriate notifications based on the update.
  const result = await prisma.$transaction(async (prisma) => {
    // Update bill of lading
    const updateOrderTripId = await updateBillOfLading(prisma, {
      id,
      organizationId,
      billOfLading,
      billOfLadingImageIds,
      billOfLadingReceived,
      updatedById: userId,
      deleteImage,
    });

    // Create an order trip message with the composed message.
    await createOrderTripStatus(
      prisma,
      {
        id,
        organizationId,
        status: OrderTripStatusType.COMPLETED,
        notes: ensureString(status?.notes),
        driverReportId: Number(driverReport?.id),
        createdById: userId,
      },
      (orderTripStatusOrder || 0) + 1
    );

    // Combine old and new bill of lading image IDs.
    oldBillOfLadingImageIds.push(...billOfLadingImageIds);

    // Compose the message for the order trip message.
    let message = t("order.trip.message_modal.bill_of_lading_number_message", {
      billOfLading: billOfLading,
    });
    if (status?.notes) {
      message += `\r\n${t("order.trip.message_modal.bill_of_lading_notes_message", {
        notes: status.notes,
      })}`;
    }
    if (billOfLadingReceived) {
      message += `\r\n${t("order.trip.message_modal.is_received_bill_of_lading")}`;
    }
    if (billOfLadingImages && billOfLadingImages.length > 0) {
      message += `\r\n${t("order.trip.message_modal.bill_of_lading_image")}`;
    }

    // Create order trip message
    await createOrderTripMessage(
      prisma,
      {
        organizationId,
        createdById: userId,
        tripId: id,
        message,
      },
      oldBillOfLadingImageIds,
      jwt
    );

    return updateOrderTripId;
  });

  // Check if the transaction was successful.
  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  let orderGroupCode = undefined;

  // Check if order is completed
  const isOrderCompleted = await checkOrderCompleted(
    jwt,
    organizationId,
    ensureString(order?.code),
    Number(totalTrips),
    Number(remainingWeightCapacity)
  );

  if (isOrderCompleted) {
    // Create a completed order status.
    const orderStatusId = await createOrderStatus(prisma, {
      organizationId: Number(organizationId),
      type: OrderStatusType.COMPLETED,
      order: { id: Number(order?.id) },
      createdById: userId,
    });

    // Link the order status to the order.
    await prisma.orderStatusesOrderLinks.create({
      data: {
        orderStatusId,
        orderId: Number(order?.id),
        orderStatusOrder: 4,
      },
    });

    // Get the order consolidation enabled setting.
    const orderConsolidationEnabled = await getOrganizationSettingExtended<boolean>({
      organizationId,
      key: OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED,
    });

    // If the order consolidation is enabled and the order group code exists, update the code in the title and description.
    if (isTrue(orderConsolidationEnabled)) {
      // Update the order group status based on the trip status.
      const { data: orderGroup } = await updateOrderGroupStatusIfAllTripsCompleted({
        organizationId,
        orderId: Number(order?.id),
      });

      orderGroupCode = orderGroup?.code;
    }
  }

  if (billOfLading && fullName && order?.code && code) {
    const entity = {
      organizationId,
      createdById: userId,
      targetId: Number(id),
    };

    const receivers: Partial<DriverInfo | OrderParticipantInfo>[] = [];
    if (driver?.user?.id) {
      receivers.push({ user: { id: Number(driver.user.id) } });
    }

    if (billOfLadingReceived) {
      pushNotification({
        entity: {
          ...entity,
          type: NotificationType.BILL_OF_LADING_RECEIVED,
        },
        data: {
          fullName,
          orderCode: order?.code,
          tripCode: code,
          orderGroupCode,
        },
        receivers,
        orgMemberRoles: [OrganizationRoleType.MANAGER, OrganizationRoleType.ACCOUNTANT],
        jwt,
      });
    }

    const tripDriverExpense = await getTripDriverExpensesByTripId<TripDriverExpenseInfo[]>(jwt, {
      organizationId,
      trip: { id },
    });
    const driverCost = tripDriverExpense.reduce((acc, item) => acc + (item.amount || 0), 0);

    if (status?.type !== OrderTripStatusType.COMPLETED && driverCost > 0) {
      pushNotification({
        entity: {
          ...entity,
          type: NotificationType.TRIP_STATUS_CHANGED,
        },
        data: {
          orderCode: order?.code,
          tripCode: code,
          orderGroupCode,
          tripId: Number(id),
          billOfLading,
          tripStatus: OrderTripStatusType.COMPLETED,
          expense: formatCurrency(driverCost),
        },
        receivers,
        orgMemberRoles: [OrganizationRoleType.ACCOUNTANT],
        jwt,
      });
    } else if (status?.type !== OrderTripStatusType.COMPLETED) {
      pushNotification({
        entity: {
          ...entity,
          type: NotificationType.TRIP_STATUS_CHANGED,
        },
        data: {
          orderCode: order?.code,
          tripCode: code,
          tripId: Number(id),
          orderGroupCode,
          billOfLading,
          tripStatus: OrderTripStatusType.COMPLETED,
          driverReportId: Number(driverReport.id),
        },
        receivers,
        orgMemberRoles: [OrganizationRoleType.ACCOUNTANT],
        jwt,
      });
    }

    // Send notification if order is completed
    if (isOrderCompleted) {
      pushNotification({
        entity: {
          type: NotificationType.ORDER_STATUS_CHANGED,
          organizationId,
          createdById: userId,
          targetId: Number(order?.id),
        },
        data: {
          orderCode: order?.code,
          orderGroupCode,
          orderStatus: OrderStatusType.COMPLETED,
        },
        orgMemberRoles: [OrganizationRoleType.MANAGER, OrganizationRoleType.ACCOUNTANT],
        jwt,
      });
    }
  }
  return { status: HttpStatusCode.Ok, data: result };
});
