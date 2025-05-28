"use client";

import { useTranslations } from "next-intl";
import { memo } from "react";

import { ModalContent, ModalHeader } from "@/components/atoms";
import { Modal } from "@/components/molecules";
import { RoutePointForm } from "@/components/organisms";
import { RoutePointInputForm } from "@/forms/routePoint";
import { useAuth } from "@/hooks";

export const initialFormValues: RoutePointInputForm = {
  id: 0,
  code: "",
  name: "",
  notes: "",
  contactName: "",
  contactPhoneNumber: "",
  contactEmail: "",
  address: {
    country: {
      id: 0,
      name: "",
    },
    city: {
      id: 0,
      name: "",
    },
    district: {
      id: 0,
      name: "",
    },
    ward: {
      id: 0,
      name: "",
    },
    addressLine1: "",
  },
  displayOrder: 0,
};

export type RoutePointKey = "pickupPoints" | "deliveryPoints";

export type RoutePointModalProps = {
  open: boolean;
  onClose: () => void;
  mutateRoutePointList: () => void;
};

export const RoutePointModal = ({ open, onClose, mutateRoutePointList }: RoutePointModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink, org, userId, user } = useAuth();

  return (
    <Modal open={open} size="7xl" showCloseButton onClose={onClose} onDismiss={onClose}>
      <ModalHeader title={t("order.route_card.new_point")} />
      <ModalContent className="max-h-[calc(100vh-240px)] overflow-y-auto overflow-x-visible">
        {orgId && orgLink && org && userId && user && (
          <RoutePointForm
            inModal
            {...{ orgId, orgLink, org, userId, user }}
            mutateRoutePointList={mutateRoutePointList}
            screenMode="NEW"
            onClose={onClose}
          />
        )}
      </ModalContent>
    </Modal>
  );
};

export default memo(RoutePointModal);
