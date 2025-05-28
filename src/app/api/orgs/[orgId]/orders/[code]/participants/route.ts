import { NotificationType } from "@prisma/client";
import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { OrderParticipantInputForm, UpdateOrderParticipantInputForm } from "@/forms/orderParticipant";
import {
  checkOrderParticipantExclusives,
  createOrderParticipant,
  updateOrderParticipant,
} from "@/services/server/orderParticipant";
import { ErrorType } from "@/types";
import { ApiNextRequest } from "@/types/api";
import { NewOrderParticipantNotification } from "@/types/notification";
import { pushNotification } from "@/utils/notification";
import { getToken, withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest, requestData: OrderParticipantInputForm) => {
  const { jwt, organizationId, userId: createdById } = getToken(req);
  const { orderCode, fullName, user: participant } = requestData;

  if (!participant?.id) {
    return { status: HttpStatusCode.BadRequest, message: ErrorType.UNKNOWN };
  }

  const result = await prisma.$transaction(async (prisma) => {
    const createdParticipantId = await createOrderParticipant(prisma, { ...requestData, organizationId, createdById });
    return createdParticipantId;
  });

  if (!result) {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }

  if (orderCode && fullName) {
    const data: NewOrderParticipantNotification = { orderCode, fullName };

    pushNotification({
      entity: {
        type: NotificationType.NEW_ORDER_PARTICIPANT,
        organizationId,
        createdById,
        targetId: Number(result),
      },
      data,
      jwt,
      receivers: [{ user: participant }],
      isSendToParticipants: false,
    });
  }

  return { status: HttpStatusCode.Ok, data: result };
});

export const PUT = withExceptionHandler(async (req: ApiNextRequest, requestData: UpdateOrderParticipantInputForm) => {
  const { jwt, organizationId, userId: updatedById } = getToken(req);
  const { orderParticipant, lastUpdatedAt } = requestData;

  const isErrorExclusives = await checkOrderParticipantExclusives(
    jwt,
    organizationId,
    Number(orderParticipant?.id),
    lastUpdatedAt
  );
  if (isErrorExclusives) {
    return { status: HttpStatusCode.Conflict, message: ErrorType.EXCLUSIVE };
  }

  const result = await prisma.$transaction(async (prisma) => {
    const updatedParticipantId = await updateOrderParticipant(prisma, {
      ...orderParticipant,
      organizationId,
      updatedById,
    });
    return updatedParticipantId;
  });

  if (result) {
    return { status: HttpStatusCode.Ok, data: result };
  } else {
    return { status: HttpStatusCode.InternalServerError, message: ErrorType.UNKNOWN };
  }
});
