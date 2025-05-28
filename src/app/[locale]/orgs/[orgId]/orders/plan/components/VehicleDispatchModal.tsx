"use client";

import { OrderParticipantRole } from "@prisma/client";
import { HttpStatusCode } from "axios";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { mutate } from "swr";

import { DispatchVehicleTab } from "@/app/[locale]/orgs/[orgId]/orders/[code]/components";
import { ModalContent, ModalHeader } from "@/components/atoms";
import { Button, Modal } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { OrderTab } from "@/constants/order";
import { useAuth, usePermission } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { receiveOrder } from "@/services/client/orderTrip";
import { ErrorType } from "@/types";
import { equalId } from "@/utils/number";
import { getOrderStatusFlags } from "@/utils/order";
import { ensureString } from "@/utils/string";

export type VehicleDispatchModalProps = {
  open: boolean;
  handleClose?: () => void;
  orderCode: string;
};

const VehicleDispatchModal = ({ open, handleClose, orderCode }: VehicleDispatchModalProps) => {
  const t = useTranslations();
  const { orgId, userId, orgLink, user } = useAuth();
  const { canEdit, canEditOwn } = usePermission("order");
  const [isReceivingConfirmOpen, setIsReceivingConfirmOpen] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [isRerender, setIsRerender] = useState(false);
  const { order } = useOrderState();
  const { showNotification } = useNotification();

  const participant = useMemo(
    () => (({ ...order })?.participants || [])?.find((item) => equalId(item.user?.id, userId)),
    [order, userId]
  );

  const isEditor = useMemo(
    () =>
      Boolean(
        participant &&
          (participant.role === OrderParticipantRole.EDITOR || participant.role === OrderParticipantRole.OWNER)
      ),
    [participant]
  );

  const { isNew } = useMemo(() => getOrderStatusFlags({ ...order }), [order]);

  /**
   * Toggle the state of the receiving order confirmation dialog.
   */
  const handleToggleReceivingOrder = useCallback(() => {
    setIsReceivingConfirmOpen((prev) => !prev);
  }, []);

  /**
   * Set Rerender child modal to rerender data.
   */
  useEffect(() => {
    setIsRerender(false);
  }, [open]);

  /**
   * Handles the confirmation of an update status action for an order.
   */
  const handleConfirmReceivingOrder = useCallback(async () => {
    if (!order || !isNew) {
      return;
    }
    setIsConfirmLoading(true);
    const result = await receiveOrder(orgLink, {
      order: {
        id: Number(order.id),
        code: ensureString(order.code),
        deliveryDate: order.deliveryDate!,
        updatedByUser: user,
      },
      lastUpdatedAt: order?.updatedAt,
    });
    setIsConfirmLoading(false);
    if (result.status !== HttpStatusCode.Ok) {
      // Handle different error types
      let message = "";
      switch (result.message) {
        case ErrorType.EXCLUSIVE:
          message = t("common.message.save_error_exclusive", { name: order.code });
          break;
        case ErrorType.UNKNOWN:
          message = t("common.message.save_error_unknown", { name: order.code });
          break;
        default:
          break;
      }

      // Show an error notification
      showNotification({
        color: "error",
        title: t("order.receive_error_title"),
        message,
      });
    } else {
      // Show a success notification and navigate to the maintenance types page
      showNotification({
        color: "success",
        title: t("order.receive_success_title"),
        message: t("order.receive_success_message", { name: order.code }),
      });
      setIsReceivingConfirmOpen(false);
      mutate([`orders/${orderCode}`, { organizationId: orgId, orderCode }]);
      mutate(["orders-statuses", { organizationId: orgId, orderCode }]);
      mutate([`order-dispatch-vehicle-info/${orderCode}`, { organizationId: orgId, orderCode }]);
      setIsRerender(true);
    }
  }, [order, isNew, orgLink, user, showNotification, t, orderCode, orgId]);

  return (
    <>
      <Modal open={open} onClose={handleClose} size="full" showCloseButton allowOverflow>
        <ModalHeader
          className="!justify-start [&>h3>span]:whitespace-pre-wrap sm:[&>h3>span]:whitespace-nowrap"
          title={t("order_plan.code", { code: orderCode })}
          actionComponent={
            <div className="flex w-full flex-wrap justify-end gap-y-4 pr-6 sm:flex-nowrap">
              {isNew && (canEdit() || (canEditOwn() && equalId(order?.createdByUser?.id, userId)) || isEditor) && (
                <Button variant="outlined" onClick={handleToggleReceivingOrder}>
                  {t("order.details.receiving_order")}
                </Button>
              )}
            </div>
          }
          actionComponentClassName="w-full"
        />
        <ModalContent>
          <DispatchVehicleTab selectedTab={OrderTab.DISPATCH_VEHICLE} code={orderCode} isRerender={isRerender} />
        </ModalContent>
      </Modal>
      {/* Receive confirm modal */}
      <ConfirmModal
        open={isReceivingConfirmOpen}
        loading={isConfirmLoading}
        icon="question"
        title={t("order.details.confirm_receive_title")}
        message={t("order.details.confirm_receive_message")}
        onClose={handleToggleReceivingOrder}
        onCancel={handleToggleReceivingOrder}
        onConfirm={handleConfirmReceivingOrder}
      />
    </>
  );
};

export default VehicleDispatchModal;
