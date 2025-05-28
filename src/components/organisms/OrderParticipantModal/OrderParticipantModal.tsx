"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { OrderParticipantRole, OrganizationRoleType } from "@prisma/client";
import cloneDeep from "lodash/cloneDeep";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useMemo, useState } from "react";

import { ModalContent, ModalHeader } from "@/components/atoms";
import { Modal, OrderParticipantList, TextField } from "@/components/molecules";
import { useAuth, useOrganizationMemberOrderParticipants } from "@/hooks";
import { OrderParticipantInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { equalId } from "@/utils/number";

export type OrderParticipantModalProps = {
  open: boolean;
  orderParticipants?: Partial<OrderParticipantInfo>[];
  onUpdate?: (value: Partial<OrderParticipantInfo>) => void;
  onCreate?: (value: Partial<OrderParticipantInfo>) => void;
  onClose?: () => void;
};

const OrderParticipantModal = ({ open, orderParticipants, onClose, ...otherProps }: OrderParticipantModalProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();
  const [keyword, setKeyword] = useState("");
  const { organizationMembers, isLoading } = useOrganizationMemberOrderParticipants({ organizationId: orgId });

  const organizationMemberList = useMemo(() => {
    return organizationMembers.filter((item) =>
      getFullName(item.member.detail?.firstName, item.member.detail?.lastName)
        .toLowerCase()
        .includes(keyword.trim().toLowerCase())
    );
  }, [keyword, organizationMembers]);

  const getRolePriority = (role?: string | null) => {
    switch (role) {
      case OrderParticipantRole.OWNER:
        return 1;
      case OrderParticipantRole.EDITOR:
        return 2;
      case OrderParticipantRole.VIEWER:
        return 3;
      default:
        return 4;
    }
  };

  const orderParticipantList = useMemo(() => {
    const deepCloneParticipants = cloneDeep(orderParticipants) || [];

    const participantList: Partial<OrderParticipantInfo>[] = [];
    for (const participant of deepCloneParticipants) {
      const orgMember = organizationMemberList.find((item) => equalId(item.member.id, participant.user?.id));

      orgMember &&
        participantList.push({
          ...participant,
          user: { ...orgMember.member },
          role: participant?.role,
          ogrRole: orgMember.role,
          orgMember: orgMember,
        } as Partial<OrderParticipantInfo>);
    }

    for (const item of organizationMemberList) {
      if ((item.role === null && item.isAdmin) || item.role.type === OrganizationRoleType.ADMIN) {
        continue;
      }

      const index = participantList.findIndex((d) => equalId(d.user?.id, item.member.id));
      if (index === -1) {
        participantList.push({
          id: item.id,
          user: { ...item.member },
          role: undefined,
          ogrRole: item.role,
          orgMember: item,
        } as Partial<OrderParticipantInfo>);
      }
    }

    return participantList.sort((a, b) => getRolePriority(a.role) - getRolePriority(b.role));
  }, [orderParticipants, organizationMemberList]);

  const handleKeywordChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setKeyword(e.target.value);
  }, []);

  return (
    <Modal open={open} size="2xl" onClose={onClose} allowOverflow showCloseButton>
      <ModalHeader
        title={t("components.order_participant_modal.title")}
        subTitle={t("components.order_participant_modal.subtitle")}
      />
      <ModalContent padding={false}>
        <TextField
          icon={MagnifyingGlassIcon}
          rightAddon={t("components.order_participant_modal.search")}
          value={keyword}
          onChange={handleKeywordChange}
          placeholder={t("components.order_participant_modal.participant_search_placeholder")}
          className="mb-6 w-[340px] pl-6 pt-4 [&_input]:rounded-r-none"
        />
        <OrderParticipantList loading={isLoading} data={orderParticipantList} className="mb-6" {...otherProps} />
      </ModalContent>
    </Modal>
  );
};

export default OrderParticipantModal;
