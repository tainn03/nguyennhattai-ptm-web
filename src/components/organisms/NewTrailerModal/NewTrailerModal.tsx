"use client";

import { useCallback } from "react";

import { Modal } from "@/components/molecules";
import { TrailerForm } from "@/components/organisms";
import { useAuth } from "@/hooks";
import { OrganizationInfo, UserInfo } from "@/types/strapi";

export type NewTrailerModalProps = {
  open: boolean;
  onClose?: () => void;
  onSubmit?: (id?: number) => void;
};

const NewTrailerModal = ({ open, onClose, onSubmit }: NewTrailerModalProps) => {
  const { orgId, orgLink, org, userId, user } = useAuth();

  const handleCancelClick = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  const handleSubmit = useCallback(
    (id?: number) => {
      onSubmit && onSubmit(id);
    },
    [onSubmit]
  );

  return (
    <Modal open={open} size="5xl">
      <TrailerForm
        inModal
        org={org as OrganizationInfo}
        orgId={Number(orgId)}
        orgLink={orgLink}
        screenMode="NEW"
        user={user as UserInfo}
        userId={Number(userId)}
        onCancelModal={handleCancelClick}
        onSubmitModal={handleSubmit}
      />
    </Modal>
  );
};

export default NewTrailerModal;
