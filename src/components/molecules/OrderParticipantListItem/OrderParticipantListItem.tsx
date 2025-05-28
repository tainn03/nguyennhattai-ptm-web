"use client";

import { OrderParticipantRole, OrganizationRoleType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { Badge, TableCell, TableRow } from "@/components/atoms";
import { ProfileInfo } from "@/components/molecules";
import Select, { SelectItem } from "@/components/molecules/Select/Select";
import { useAuth } from "@/hooks";
import { OrderParticipantInfo, OrganizationMemberInfo, OrganizationRoleInfo } from "@/types/strapi";
import { getAccountInfo, isOrganizationOwner } from "@/utils/auth";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";

type OrderParticipantListItemProps = {
  value: Partial<
    OrderParticipantInfo & {
      ogrRole: OrganizationRoleInfo;
      orgMember: OrganizationMemberInfo;
    }
  >;
  onUpdate?: (value: Partial<OrderParticipantInfo>) => void;
  onCreate?: (value: Partial<OrderParticipantInfo>) => void;
};

const OrderParticipantListItem = ({ value, onCreate, onUpdate }: OrderParticipantListItemProps) => {
  const t = useTranslations();
  const { org, userId } = useAuth();
  const [role, setRole] = useState(value.role);
  const [currentRole, setCurrentRole] = useState(value.role);

  const ROLE: SelectItem[] = [
    { label: t("components.order_participant_list_item.editor"), value: OrderParticipantRole.EDITOR },
    { label: t("components.order_participant_list_item.viewer"), value: OrderParticipantRole.VIEWER },
    { label: t("components.order_participant_list_item.remove_access"), value: "" },
  ];

  /**
   * Handle the change of role for an order participant.
   * @param {string} role - The new role for the order participant.
   */
  const handleChangeRole = useCallback(
    (role: string) => {
      setRole(role as OrderParticipantRole);
      if (currentRole) {
        onUpdate && onUpdate({ ...value, role: role as OrderParticipantRole });
      } else {
        onCreate && onCreate({ ...value, role: role as OrderParticipantRole });
      }
      setCurrentRole(role as OrderParticipantRole);
    },
    [currentRole, onCreate, onUpdate, value]
  );

  const roleOptions = useMemo(() => {
    setCurrentRole(value.role);
    let roleFormat = [...ROLE];

    if (value.ogrRole?.type !== OrganizationRoleType.DISPATCHER) {
      roleFormat = roleFormat.filter((item: SelectItem) => {
        return item.value !== OrderParticipantRole.VIEWER;
      });
    }

    if (!currentRole) {
      roleFormat = roleFormat.slice(0, -1);
    }
    setRole(value.role);
    return roleFormat;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRole, value.ogrRole?.type, setRole, handleChangeRole]);

  return (
    <TableRow>
      <TableCell>
        <ProfileInfo
          className="pl-3"
          user={value.user}
          description={getAccountInfo(value.user, value.orgMember).contactInfo}
          slot={
            equalId(value.user?.id, userId) && (
              <Badge className="ml-1" label={t("components.order_participant_list_item.you_label")} />
            )
          }
        />
      </TableCell>
      <TableCell>{isOrganizationOwner(org, value.user) ? t("role.owner") : value.ogrRole?.name}</TableCell>
      <TableCell className="w-48">
        {value.role === OrderParticipantRole.OWNER ? (
          t("order.order_participant_card.owner")
        ) : (
          <Select
            className={clsx({
              "[&_ul>*:last-child]:border-t [&_ul>*:last-child]:border-gray-200": roleOptions.length > 2,
            })}
            items={roleOptions}
            value={ensureString(role)}
            onChange={handleChangeRole}
          />
        )}
      </TableCell>
    </TableRow>
  );
};

export default OrderParticipantListItem;
