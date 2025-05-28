"use client";

import { NotificationType } from "@prisma/client";
import { HttpStatusCode } from "axios";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import { BillOfLadingAccountantModal, VehicleDocumentOperatorModal } from "@/components/molecules";
import { ConfirmModal, MessageModal, NotificationListItem } from "@/components/organisms";
import { useNotification } from "@/redux/actions";
import { deleteNotification } from "@/services/client/notification";
import { ApiResult } from "@/types/api";
import {
  BillOfLadingAccountantReminderNotification,
  NotificationData,
  VehicleDocumentOperatorReminderNotification,
} from "@/types/notification";
import { NotificationRecipientInfo, OrderTripInfo } from "@/types/strapi";
import { post } from "@/utils/api";

type NotificationListProps = {
  type: "list" | "menu";
  notifications: NotificationRecipientInfo[];
  orgLink: string;
  onDelete: (id: number) => void;
  onMarkAsRead: (id: number) => void;
};

const NotificationList = ({ type, notifications, orgLink, onDelete, onMarkAsRead }: NotificationListProps) => {
  const t = useTranslations();
  const { showNotification } = useNotification();

  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isBillOfLadingAccountantModalOpen, setIsBillOfLadingAccountantModalOpen] = useState(false);
  const [isVehicleDocumentOperatorOpen, setIsVehicleDocumentOperatorOpen] = useState(false);

  const notificationRef = useRef<Partial<NotificationRecipientInfo>>();
  const selectedOrderTripRef = useRef<Partial<OrderTripInfo>>();
  const reminderRef = useRef<NotificationData | null>(null);

  /**
   * Handles opening the message modal for sending a notification to a specific driver.
   * @param {NotificationRecipientInfo} data - The notification recipient information.
   * @param {number} driverUserId - The user ID of the driver.
   */
  const handleOpenMessageModal = useCallback((data: NotificationRecipientInfo, driverUserId: number) => {
    selectedOrderTripRef.current = {
      id: data.notification.targetId,
      driver: { user: { id: driverUserId } },
    };

    setIsMessageModalOpen(true);
  }, []);

  /**
   * Handles closing the message modal.
   */
  const handleCloseMessageModal = useCallback(() => {
    selectedOrderTripRef.current = undefined;
    setIsMessageModalOpen(false);
  }, []);

  /**
   * Handles canceling the delete action.
   */
  const handleCancelDelete = useCallback(() => {
    setIsConfirmDeleteModalOpen(false);
    notificationRef.current = undefined;
  }, []);

  /**
   * Handles deleting a notification.
   * @param {Partial<NotificationRecipientInfo>} notification - The notification recipient information.
   */
  const handleDelete = useCallback((notification: Partial<NotificationRecipientInfo>) => {
    notificationRef.current = notification;
    setIsConfirmDeleteModalOpen(true);
  }, []);

  /**
   * Handles confirming the delete action.
   */
  const handleConfirmDelete = useCallback(async () => {
    if (notificationRef?.current?.notification?.id) {
      await deleteNotification(notificationRef.current.notification.id);
      setIsConfirmDeleteModalOpen(false);
      onDelete(notificationRef.current.notification.id);
      notificationRef.current = undefined;
    }
  }, [onDelete]);

  /**
   * Handles marking a notification as read.
   * @param {Partial<NotificationRecipientInfo>} data - The notification recipient information.
   */
  const handleMarkAsRead = useCallback(
    async (data: Partial<NotificationRecipientInfo>) => {
      const result = await post<ApiResult>(`/api${orgLink}/notifications/mark-as-read`, {
        notificationRecipientId: Number(data.id),
      });

      if (result.status !== HttpStatusCode.Ok) {
        showNotification({
          color: "error",
          title: t("common.message.error_title"),
          message: t("common.message.save_error_unknown", { name: t("components.notification_menu.title") }),
        });
      }
      onMarkAsRead(Number(data.notification?.id));
    },
    [onMarkAsRead, orgLink, showNotification, t]
  );

  /**
   * Handles opening the bill of lading accountant modal.
   * @param {NotificationData} notification - The notification data.
   * @param {NotificationType} type - The notification type.
   */
  const handleOpenModal = useCallback((notification: NotificationData, type: NotificationType) => {
    switch (type) {
      case NotificationType.BILL_OF_LADING_ACCOUNTANT_REMINDER:
        setIsBillOfLadingAccountantModalOpen(true);
        break;
      case NotificationType.VEHICLE_DOCUMENT_OPERATOR_REMINDER:
        setIsVehicleDocumentOperatorOpen(true);
        break;
    }

    reminderRef.current = notification;
  }, []);

  /**
   * Handles closing the bill of lading accountant modal.
   */
  const handleCloseBillOfLadingAccountantModal = useCallback(() => {
    reminderRef.current = null;
    setIsBillOfLadingAccountantModalOpen(false);
  }, []);

  /**
   * Handles closing the vehicle document operator modal.
   */
  const handleCloseVehicleDocumentOperatorModal = useCallback(() => {
    reminderRef.current = null;
    setIsVehicleDocumentOperatorOpen(false);
  }, []);

  return (
    <>
      <ul
        role="list"
        className={clsx("divide-y divide-gray-200", {
          "mx-auto max-w-3xl": type === "list",
          "max-h-96 overflow-auto": type === "menu",
        })}
      >
        {(notifications || []).map((item) => (
          <NotificationListItem
            key={item.id}
            data={item}
            onDelete={handleDelete}
            onMarkAsRead={handleMarkAsRead}
            onOpenMessage={handleOpenMessageModal}
            onOpenModal={handleOpenModal}
          />
        ))}
      </ul>

      {/* Confirm delete modal */}
      <ConfirmModal
        open={isConfirmDeleteModalOpen}
        icon="error"
        color="error"
        title={t("common.confirmation.delete_title", { name: t("components.notification_list_item.delete_title") })}
        message={t("common.confirmation.delete_message")}
        onClose={handleCancelDelete}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      {/* Message modal component */}
      <MessageModal
        open={isMessageModalOpen}
        orderTripId={Number(selectedOrderTripRef.current?.id)}
        onClose={handleCloseMessageModal}
        driverUserId={Number(selectedOrderTripRef.current?.driver?.user?.id)}
      />

      {/* Bill of Lading Accountant Modal */}
      <BillOfLadingAccountantModal
        open={isBillOfLadingAccountantModalOpen}
        notification={reminderRef.current as BillOfLadingAccountantReminderNotification}
        onClose={handleCloseBillOfLadingAccountantModal}
      />

      {/* Vehicle Document Operator Modal */}
      <VehicleDocumentOperatorModal
        open={isVehicleDocumentOperatorOpen}
        notification={reminderRef.current as VehicleDocumentOperatorReminderNotification}
        onClose={handleCloseVehicleDocumentOperatorModal}
      />
    </>
  );
};

export default NotificationList;
