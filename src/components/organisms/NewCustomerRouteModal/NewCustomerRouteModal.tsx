"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { ModalHeader } from "@/components/atoms";
import { Modal } from "@/components/molecules";
import { RouteForm } from "@/components/organisms";
import { OrgPageProps } from "@/utils/client";

export type NewCustomerRouteModalProps = Pick<OrgPageProps, "orgId" | "orgLink" | "userId"> & {
  customerId: number;
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id: number) => void;
};

const NewCustomerRouteModal = ({
  orgId,
  orgLink,
  userId,
  customerId,
  open,
  onClose,
  onSubmit,
}: NewCustomerRouteModalProps) => {
  const t = useTranslations();
  const handleClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  const handleCreateCustomerRoute = useCallback(
    (id: number) => {
      onSubmit && onSubmit(id);
    },
    [onSubmit]
  );

  return (
    <Modal open={open} size="5xl">
      <ModalHeader title={t("order_new.route_tab.new_fixed_route_title")} />
      <RouteForm
        screenMode="NEW"
        inModal
        modalCustomerId={customerId}
        orgId={orgId}
        orgLink={orgLink}
        userId={userId}
        onCreateCustomerRoute={handleCreateCustomerRoute}
        onCloseCreateCustomerModal={handleClose}
      />
    </Modal>
  );
};

export default NewCustomerRouteModal;
