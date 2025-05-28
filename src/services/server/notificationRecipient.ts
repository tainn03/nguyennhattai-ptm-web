import { PrismaClientTransaction } from "@/configs/prisma";

/**
 * Mark as read all notification of user.
 *
 * @param {PrismaClientTransaction} prismaClient - The Prisma client used for database operations.
 * @param {number} userId - The ID of the user creating the merchandise types.
 */
export const markAsReadNotification = async (
  prismaClient: PrismaClientTransaction,
  userId: number,
  notificationRecipientId?: number
) => {
  let result = 0;

  if (notificationRecipientId) {
    const updateResult = await prismaClient.notificationRecipient.updateMany({
      where: { id: notificationRecipientId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    result = updateResult.count;
  } else {
    const notificationRecipients = await prismaClient.notificationRecipientsUserLinks.findMany({
      select: { notificationRecipientId: true },
      where: { userId },
    });

    if (notificationRecipients) {
      const notificationRecipientIds = notificationRecipients.map((item) => Number(item.notificationRecipientId));

      const updateResult = await prismaClient.notificationRecipient.updateMany({
        where: { id: { in: notificationRecipientIds }, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      result = updateResult.count;
    }
  }

  return result;
};
