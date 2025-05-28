"use client";

import { Cog6ToothIcon, EyeIcon, PencilSquareIcon, UserIcon } from "@heroicons/react/24/outline";
import { OrderParticipantRole } from "@prisma/client";
import { useTranslations } from "next-intl";
import { ElementType, useCallback, useMemo, useState } from "react";
import { mutate } from "swr";

import { Badge, Card, CardContent, CardHeader, Visible } from "@/components/atoms";
import { ProfileInfo } from "@/components/molecules";
import { OrderParticipantModal } from "@/components/organisms";
import { OrderParticipantInputForm } from "@/forms/orderParticipant";
import { useAuth, useOrgSettingExtendedStorage } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { deleteOrderParticipant } from "@/services/client/orderParticipant";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { OrderParticipantInfo } from "@/types/strapi";
import { post, put } from "@/utils/api";
import { getAccountInfo, getFullName } from "@/utils/auth";
import { isTrue } from "@/utils/string";

type OrderParticipantCardProps = {
  loading?: boolean;
  allowEdit: boolean;
};

const OrderParticipantCard = ({ loading, allowEdit }: OrderParticipantCardProps) => {
  const t = useTranslations();
  const { orgId, orgLink, userId, user } = useAuth();
  const { order } = useOrderState();
  const { showNotification } = useNotification();
  const { orderConsolidationEnabled } = useOrgSettingExtendedStorage();
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);

  const USER_ROLE = {
    OWNER: { label: t("order.order_participant_card.owner"), icon: UserIcon },
    EDITOR: { label: t("order.order_participant_card.editor"), icon: PencilSquareIcon },
    VIEWER: { label: t("order.order_participant_card.viewer"), icon: EyeIcon },
  };

  /**
   * Get the priority of a given order participant role.
   *
   * @param {string | null | undefined} role - The role of the order participant.
   * @returns {number} The priority value for the given role.
   */
  const getRolePriority = useCallback((role?: string | null) => {
    switch (role) {
      case OrderParticipantRole.OWNER:
        return 1;
      case OrderParticipantRole.EDITOR:
        return 2;
      default:
        return 3;
    }
  }, []);

  /**
   * Returns a sorted list of participants for the order.
   * The list is sorted based on the priority of their roles.
   *
   * @returns {Array} The sorted list of participants.
   */
  const participants = useMemo(() => {
    return [...(order?.participants || [])]?.sort((a, b) => getRolePriority(a.role) - getRolePriority(b.role));
  }, [getRolePriority, order?.participants]);

  /**
   * Opens the participant modal.
   */
  const handleOpenParticipantModal = useCallback(() => {
    setIsParticipantModalOpen(true);
  }, []);

  /**
   * Closes the participant modal.
   */
  const handleCloseParticipantModal = useCallback(() => {
    setIsParticipantModalOpen(false);
  }, []);

  /**
   * Updates the role of an order participant.
   * @param {OrderParticipantInputForm} value - The updated order participant information.
   * @returns {Promise<void>} The promise that resolves when the update is completed.
   */
  const handleUpdateParticipant = useCallback(
    async (value: OrderParticipantInputForm) => {
      const { id, role, updatedAt } = value;
      let result: ApiResult<OrderParticipantInfo> | undefined;
      switch (value.role) {
        case OrderParticipantRole.EDITOR:
        case OrderParticipantRole.VIEWER:
          result = await put<ApiResult<OrderParticipantInfo>>(`/api${orgLink}/orders/${order?.code}/participants`, {
            orderParticipant: { id: Number(id), role },
            lastUpdatedAt: updatedAt,
          });
          break;
        case OrderParticipantRole.OWNER:
          break;
        default:
          {
            const deleteResult = await deleteOrderParticipant(
              { organizationId: Number(orgId), id: Number(id), updatedById: Number(userId) },
              updatedAt
            );
            result = {
              status: deleteResult.error ? HttpStatusCode.BadRequest : HttpStatusCode.Ok,
              message: deleteResult.error,
            };
          }
          break;
      }

      if (!result) {
        return;
      }

      const fullName = getFullName(value.user?.detail?.firstName, value.user?.detail?.lastName);
      if (result.status !== HttpStatusCode.Ok) {
        let message = "";
        switch (result.message) {
          case ErrorType.EXCLUSIVE:
            message = t("common.message.save_error_exclusive", { name: fullName });
            break;
          case ErrorType.UNKNOWN:
            message = t("common.message.save_error_unknown", { name: fullName });
            break;
          default:
            break;
        }

        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message,
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: fullName }),
        });
      }

      mutate([`orders/${order?.code}`, { organizationId: orgId, code: order?.code }]);
    },
    [order?.code, orgId, orgLink, showNotification, t, userId]
  );

  /**
   * Creates a new order participant.
   * @param {OrderParticipantInputForm} value - The new order participant information.
   * @returns {Promise<void>} The promise that resolves when the creation is completed.
   */
  const handleCreateParticipant = useCallback(
    async (value: OrderParticipantInputForm) => {
      let result: ApiResult<OrderParticipantInfo> | undefined;
      switch (value.role) {
        case OrderParticipantRole.EDITOR:
        case OrderParticipantRole.VIEWER:
          result = await post<ApiResult<OrderParticipantInfo>>(`/api${orgLink}/orders/${order?.code}/participants`, {
            user: { id: Number(value.user?.id) },
            role: value.role,
            orderId: Number(order?.id),
            orderParticipantOrder: (participants?.length || 0) + 1,
            fullName: getAccountInfo(user).displayName,
            orderCode: order?.code,
          });
          break;
        default:
          break;
      }

      if (!result) {
        return;
      }

      const fullName = getFullName(value.user?.detail?.firstName, value.user?.detail?.lastName);
      if (result.status !== HttpStatusCode.Ok) {
        const message = t("common.message.save_error_unknown", { name: fullName });
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message,
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: fullName }),
        });
      }

      mutate([`orders/${order?.code}`, { organizationId: orgId, code: order?.code }]);
    },
    [order?.code, order?.id, orgId, orgLink, participants?.length, user, t, showNotification]
  );

  const showRoleIcon = useCallback((Icon: ElementType) => {
    return <Icon className="h-3 w-3 text-gray-500" />;
  }, []);

  return (
    <>
      <Card>
        <CardHeader
          title={t("order.order_participant_card.title")}
          loading={loading}
          actionComponent={
            <Visible when={allowEdit} except={isTrue(orderConsolidationEnabled)}>
              <button onClick={handleOpenParticipantModal}>
                <Cog6ToothIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </Visible>
          }
        />
        <CardContent padding={false}>
          <ul role="list" className="divide-y divide-gray-100">
            {(order?.participants || [])
              .filter(({ role }) => !!role)
              .map((item, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-x-4 px-4 py-3 hover:bg-gray-50 sm:px-6"
                >
                  <ProfileInfo
                    user={item.user}
                    // description={item.user?.phoneNumber || ""} }
                    slot={
                      Number(item.user?.id) === userId && (
                        <Badge className="ml-1" label={t("components.order_participant_list_item.you_label")} />
                      )
                    }
                    className="[&_.ml-3>div]:break-all"
                  />
                  <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
                    {item.role && (
                      <div className="mt-1 flex items-center gap-x-1.5">
                        <div className="flex-none rounded-full p-1">{showRoleIcon(USER_ROLE[item.role].icon)}</div>
                        <p className="text-xs leading-5 text-gray-500">{USER_ROLE[item.role].label}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            {/* <li className="px-4 py-3 sm:px-6">
                  <SkeletonUserInformation background="light" imageSize="sm" />
                </li> */}
          </ul>
        </CardContent>
      </Card>

      <OrderParticipantModal
        open={isParticipantModalOpen}
        orderParticipants={participants}
        onUpdate={handleUpdateParticipant}
        onCreate={handleCreateParticipant}
        onClose={handleCloseParticipantModal}
      />
    </>
  );
};

export default OrderParticipantCard;
