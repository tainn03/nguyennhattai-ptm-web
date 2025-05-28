"use client";

import { ChatBubbleBottomCenterTextIcon } from "@heroicons/react/24/outline";
import { OrderTripStatusType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";

import {
  Badge,
  DateTimeLabel,
  DescriptionProperty2,
  ModalActions,
  ModalContent,
  ModalHeader,
  NumberLabel,
} from "@/components/atoms";
import { Button, Modal } from "@/components/molecules";
import MessageModal from "@/components/organisms/MessageModal/MessageModal";
import QuickUpdateOrderTripStatusModal from "@/components/organisms/QuickUpdateOrderTripStatusModal/QuickUpdateOrderTripStatusModal";
import useProcessByOrder from "@/hooks/useProcessByOrder";
import { useNotificationState } from "@/redux/states";
import { NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION } from "@/redux/types";
import { OrderTripInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { getDetailAddress, joinNonEmptyStrings } from "@/utils/string";

export type InboundOrderInfoModalProps = {
  open: boolean;
  onClose?: () => void;
  orderId: number | null;
};

const InboundOrderInfoModal = ({ open, onClose, orderId }: InboundOrderInfoModalProps) => {
  const t = useTranslations();
  const dispatch = useDispatch();
  const [openQuickUpdateOrderTripStatusModal, setOpenQuickUpdateOrderTripStatusModal] = useState(false);
  const [openMessageModal, setOpenMessageModal] = useState(false);
  const { order, isLoading, mutate } = useProcessByOrder(orderId ?? 0);
  const { haveNewNotification } = useNotificationState();

  const selectedOrderTripRef = useRef<Partial<OrderTripInfo> | null>(null);
  const statusType = order?.trips?.[0]?.lastStatusType ?? "UNKNOWN";

  type BadgeColor =
    | "primary"
    | "purple"
    | "pink"
    | "teal"
    | "success"
    | "error"
    | "warning"
    | "info"
    | "secondary"
    | "cyan"
    | "zinc";
  const statusColorMap: Record<OrderTripStatusType | "UNKNOWN", BadgeColor> = {
    [OrderTripStatusType.NEW]: "primary",
    [OrderTripStatusType.CONFIRMED]: "primary",
    [OrderTripStatusType.PENDING_CONFIRMATION]: "purple",
    [OrderTripStatusType.WAITING_FOR_PICKUP]: "warning",
    [OrderTripStatusType.WAREHOUSE_GOING_TO_PICKUP]: "zinc",
    [OrderTripStatusType.WAREHOUSE_PICKED_UP]: "cyan",
    [OrderTripStatusType.WAITING_FOR_DELIVERY]: "pink",
    [OrderTripStatusType.DELIVERED]: "teal",
    [OrderTripStatusType.COMPLETED]: "success",
    [OrderTripStatusType.CANCELED]: "error",
    UNKNOWN: "primary",
  };

  useEffect(() => {
    if (haveNewNotification) {
      dispatch({
        type: NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION,
        payload: false,
      });
      mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haveNewNotification]);

  const handleCloseQuickUpdateOrderTripStatusModal = useCallback(() => {
    setOpenQuickUpdateOrderTripStatusModal(false);
    selectedOrderTripRef.current = null;
  }, []);

  const handleUpdateOrderTripStatus = useCallback(() => {
    setOpenQuickUpdateOrderTripStatusModal(false);
    selectedOrderTripRef.current = null;
    mutate();
  }, [mutate]);

  const handleOpenQuickUpdateOrderTripStatusModal = useCallback(
    (item: Partial<OrderTripInfo> | null) => () => {
      setOpenQuickUpdateOrderTripStatusModal(true);
      selectedOrderTripRef.current = item;
    },
    []
  );

  const handleCloseMessageModal = useCallback(() => {
    setOpenMessageModal(false);
  }, []);

  const handleOpenMessageModal = useCallback(() => {
    setOpenMessageModal(true);
  }, []);

  return (
    <Modal open={open} size="3xl" onClose={onClose} showCloseButton>
      <ModalHeader title={t("inbound_order_modal.title")} />
      <ModalContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Code */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.code")}>
            {order?.group?.code || t("common.empty")}
          </DescriptionProperty2>
          {/* Status */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.status")}>
            <Badge
              label={order?.trips?.[0]?.statuses?.[0]?.driverReport?.name || t("common.empty")}
              color={statusColorMap[statusType]}
            />
          </DescriptionProperty2>
          {/* Vehicle Number */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.vehicle")}>
            {order?.trips?.[0]?.vehicle?.vehicleNumber || t("common.empty")}
          </DescriptionProperty2>
          {/* Vehicle Type */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.vehicle_type")}>
            {order?.trips?.[0]?.vehicle?.type?.name || t("common.empty")}
          </DescriptionProperty2>
          {/* Driver Name */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.driver")}>
            {getFullName(order?.trips?.[0]?.driver?.firstName, order?.trips?.[0]?.driver?.lastName) ||
              t("common.empty")}
          </DescriptionProperty2>
          {/* Driver Phone */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.driver_phone")}>
            {order?.trips?.[0]?.driver?.phoneNumber || t("common.empty")}
          </DescriptionProperty2>
          {/* Pickup Date */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.pickup_date")}>
            <DateTimeLabel type="date" value={order?.trips?.[0]?.pickupDate} emptyLabel={t("common.empty")} />
          </DescriptionProperty2>
          {/* Delivery Date */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.delivery_date")}>
            <DateTimeLabel type="date" value={order?.trips?.[0]?.deliveryDate} emptyLabel={t("common.empty")} />
          </DescriptionProperty2>

          {/* Quantity */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.quantity")}>
            <NumberLabel value={order?.weight} unit={order?.unit?.code} emptyLabel={t("common.empty")} />
          </DescriptionProperty2>
          {/* CBM */}
          <DescriptionProperty2 loading={isLoading} label={t("inbound_order_modal.cbm")}>
            {order?.cbm || t("common.empty")}
          </DescriptionProperty2>
        </div>

        {/* Delivery Point */}
        <DescriptionProperty2 loading={isLoading} className="mt-4" label={t("inbound_order_modal.delivery_point")}>
          <div className="font-semibold">
            {joinNonEmptyStrings(
              [order?.route?.deliveryPoints?.[0]?.code, order?.route?.deliveryPoints?.[0]?.name],
              " - "
            ) || t("common.empty")}
          </div>
          <div>{getDetailAddress(order?.route?.deliveryPoints?.[0]?.address) || t("common.empty")}</div>
        </DescriptionProperty2>
      </ModalContent>

      <ModalActions>
        <Button
          disabled={isLoading}
          onClick={handleOpenQuickUpdateOrderTripStatusModal(order?.trips?.[0] as OrderTripInfo)}
        >
          {t("inbound_order_modal.update_status")}
        </Button>
        <Button disabled={isLoading} variant="outlined" onClick={handleOpenMessageModal}>
          <ChatBubbleBottomCenterTextIcon className="h-6 w-6 text-blue-500" aria-hidden="true" />
          {t("inbound_order_modal.message")}
        </Button>
      </ModalActions>

      {/* Update order trip status modal */}
      <QuickUpdateOrderTripStatusModal
        open={openQuickUpdateOrderTripStatusModal}
        orderTripId={Number(selectedOrderTripRef.current?.id)}
        onClose={handleCloseQuickUpdateOrderTripStatusModal}
        onSaved={handleUpdateOrderTripStatus}
      />
      {/* Message modal component */}
      <MessageModal
        open={openMessageModal}
        orderTripId={Number(order?.trips?.[0]?.id)}
        driverUserId={Number(order?.trips?.[0]?.driver?.user?.id)}
        onClose={handleCloseMessageModal}
      />
    </Modal>
  );
};

export default InboundOrderInfoModal;
