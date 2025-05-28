import { NotificationType, OrganizationRoleType } from "@prisma/client";
import fse from "fs-extra";
import moment from "moment";
import path from "path";

import { getOrderGroupByTripId } from "@/actions/orderGroup";
import { getOrganizationSettingExtended } from "@/actions/organizationSettingExtended";
import { internalMessageOptions } from "@/configs/media";
import { prisma } from "@/configs/prisma";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { MessageUploadFormModal } from "@/forms/orderTripMessage";
import { createOrderTripMessage } from "@/services/server/orderTripMessage";
import { uploadFile } from "@/services/server/uploadFile";
import { ErrorType } from "@/types";
import { ApiNextRequest, HttpStatusCode } from "@/types/api";
import { TripMessageNotification } from "@/types/notification";
import { pushNotification } from "@/utils/notification";
import { getToken, withExceptionHandler } from "@/utils/server";
import { ensureString, isTrue, trim } from "@/utils/string";

export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: MessageUploadFormModal) => {
  const { jwt, organizationId: serverOrganizationId, userId: createdById } = getToken(req);

  // Destructure data parameters
  const {
    orderCode,
    organizationId: clientOrganizationId,
    file: fileName,
    tripId,
    tripCode,
    fullName,
    driverUserId,
    orderDate,
    type,
    message,
    longitude,
    latitude,
  } = requestData;

  const organizationId = serverOrganizationId || Number(clientOrganizationId);
  // Prepare upload path
  const uploadPath = path.resolve(internalMessageOptions.localPath);

  // Check if the upload path exists, create it if not
  const isExists = await fse.exists(uploadPath);
  if (!isExists) {
    await fse.mkdir(uploadPath, { recursive: true });
  }

  // Upload each file and store the IDs
  const listUploaded: number[] = [];
  if (fileName && fileName.length > 0) {
    for (const file of fileName) {
      const momentDate = moment(orderDate);
      const { id: uploadFileId } = await uploadFile(
        internalMessageOptions.localPath,
        file,
        file,
        internalMessageOptions.folder,
        {
          orgId: organizationId,
          mmyyyy: momentDate.format("MMYYYY"),
        }
      );

      if (uploadFileId) {
        listUploaded.push(uploadFileId);
      }
    }
  }

  // Use Prisma transaction to create an order trip message
  const result = await prisma.$transaction(async (prisma) => {
    return await createOrderTripMessage(
      prisma,
      {
        organizationId,
        createdById,
        tripId: Number(tripId),
        ...(type && { type }),
        message: trim(message),
        longitude: longitude ? parseFloat(ensureString(longitude)) : null,
        latitude: latitude ? parseFloat(ensureString(latitude)) : null,
      },
      listUploaded,
      jwt
    );
  });

  // If the transaction is not successful, return an internal server error
  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  let orderGroupCode: string | null = null;
  // Get the order consolidation enabled setting.
  const orderConsolidationEnabled = await getOrganizationSettingExtended<boolean>({
    organizationId,
    key: OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED,
  });

  if (isTrue(orderConsolidationEnabled)) {
    const { data: orderTripData } = await getOrderGroupByTripId({ tripId: Number(tripId) });
    if (orderTripData?.order?.group?.code) {
      orderGroupCode = orderTripData.order.group.code;
    }
  }

  // Prepare data for the trip message notification
  const data: TripMessageNotification = {
    orderCode,
    tripCode,
    tripId,
    ...(orderGroupCode && { orderGroupCode }),
    fullName: ensureString(fullName),
    driverUserId,
    ...(message && { message }),
    ...(listUploaded.length > 0 && { numOfAttachment: listUploaded.length }),
  };

  // Push the notification
  pushNotification({
    entity: {
      type: NotificationType.TRIP_NEW_MESSAGE,
      organizationId,
      createdById,
      targetId: Number(tripId),
    },
    data,
    jwt,
    orgMemberRoles: [OrganizationRoleType.ACCOUNTANT],
    ...(driverUserId && { receivers: [{ user: { id: driverUserId } }] }),
  });

  // Return success status and result
  return { status: HttpStatusCode.Ok, data: result };
});
