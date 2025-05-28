"use client";

import { useCallback } from "react";

import { Modal } from "@/components/molecules";
import VehicleForm from "@/components/organisms/VehicleForm/VehicleForm";
import { useAuth } from "@/hooks";
import { OrganizationInfo, UserInfo } from "@/types/strapi";

export type NewVehicleModalProps = {
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id: number) => void;
};

const NewVehicleModal = ({ open, onClose, onSubmit }: NewVehicleModalProps) => {
  const { orgId, orgLink, org, userId, user } = useAuth();

  const handleCancelClick = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  const handleModalSubmit = useCallback(
    (id: number) => {
      onSubmit && onSubmit(id);
    },
    [onSubmit]
  );

  return (
    <Modal open={open} size="5xl">
      <VehicleForm
        inModal
        org={org as OrganizationInfo}
        orgId={Number(orgId)}
        orgLink={orgLink}
        screenMode="NEW"
        user={user as UserInfo}
        userId={Number(userId)}
        onCancelModal={handleCancelClick}
        onSubmitModal={handleModalSubmit}
      />
    </Modal>
  );
};

export default NewVehicleModal;
