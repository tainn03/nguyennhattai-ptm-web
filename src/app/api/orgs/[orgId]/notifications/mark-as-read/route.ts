import { HttpStatusCode } from "axios";

import { prisma } from "@/configs/prisma";
import { markAsReadNotification } from "@/services/server/notificationRecipient";
import { ApiNextRequest } from "@/types/api";
import { MarkAsReadNotification } from "@/types/notification";
import { getToken, withExceptionHandler } from "@/utils/server";

export const POST = withExceptionHandler(async (req: ApiNextRequest, reqData: MarkAsReadNotification) => {
  const { userId } = getToken(req);
  const result = await prisma.$transaction(async (prisma) => {
    const updatedCount = await markAsReadNotification(prisma, userId, reqData.notificationRecipientId);
    return updatedCount;
  });

  if (result >= 0) {
    return { status: HttpStatusCode.Ok };
  }

  return { status: HttpStatusCode.InternalServerError };
});
