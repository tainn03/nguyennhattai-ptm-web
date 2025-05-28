import { prisma } from "@/configs/prisma";
import { NotificationInfo } from "@/types/strapi";
import { trim } from "@/utils/string";

/**
 * Creates a notification and associates it with specified users as recipients.
 *
 * @param userId - The ID of the user triggering the notification.
 * @param recipientUserIds - An array of user IDs who will receive the notification.
 * @param entity - An object containing information about the notification.
 *   - organizationId: The ID of the organization related to the notification.
 *   - targetId: The ID of the target related to the notification.
 *   - type: The type of the notification.
 *   - subject: The subject of the notification.
 *   - message: The message content of the notification.
 *
 * @returns A promise that resolves when the notification and its associations are created.
 */
export const createNotification = async (entity: Partial<NotificationInfo>) => {
  const { organizationId, targetId, type, subject, message, meta, recipients, createdById } = trim(entity);
  const now = new Date();
  const userId = Number(createdById);

  const notificationInfo = await prisma.$transaction(async (prisma) => {
    const notification = await prisma.notification.create({
      data: {
        organizationId: Number(organizationId),
        ...(type && { type }),
        subject,
        message,
        meta: meta ?? undefined,
        targetId: Number(targetId),
        publishedAt: now,
      },
    });

    const notificationId = Number(notification.id);

    await prisma.notificationCreatedByUserLinks.create({
      data: { notificationId, userId },
    });
    await prisma.notificationUpdatedByUserLinks.create({
      data: { notificationId, userId },
    });

    const notificationRecipientIds: number[] = [];
    if (recipients) {
      for (const item of recipients) {
        const notificationRecipient = await prisma.notificationRecipient.create({
          data: { isRead: false, publishedAt: now },
        });
        const notificationRecipientId = Number(notificationRecipient.id);
        await prisma.notificationRecipientsUserLinks.create({
          data: { userId: Number(item?.user?.id), notificationRecipientId },
        });
        notificationRecipientIds.push(notificationRecipientId);
      }

      for (const item of notificationRecipientIds) {
        await prisma.notificationRecipientsNotificationLinks.create({
          data: { notificationId, notificationRecipientId: item },
        });
      }
    }

    return notification;
  });

  return notificationInfo;
};
