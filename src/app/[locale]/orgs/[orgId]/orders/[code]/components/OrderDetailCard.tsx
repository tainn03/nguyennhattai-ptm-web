"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { OrderStatusType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { mutate } from "swr";

import {
  Card,
  CardContent,
  CardHeader,
  DateTimeLabel,
  DescriptionProperty2,
  NumberLabel,
  Visible,
  VisibleWithSetting,
} from "@/components/atoms";
import { Authorization } from "@/components/molecules";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { useAuth, useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { OrderInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { isTrue } from "@/utils/string";

import { UpdateOrderModal } from ".";

type OrderDetailCardProps = {
  order?: OrderInfo;
  loading: boolean;
  currentStatus?: OrderStatusType | null;
  isEditor: boolean;
};

export const OrderDetailCard = ({ order, loading, currentStatus, isEditor }: OrderDetailCardProps) => {
  const t = useTranslations();
  const { orgId, userId } = useAuth();
  const [orderDetailModalOpen, setOrderDetailModalOpen] = useState(false);
  const { organizationOrderRelatedDateFormat, allowOrderEditAnyStatus, orderConsolidationEnabled } =
    useOrgSettingExtendedStorage();
  const { canEdit, canEditOwn } = usePermission("order");

  const allowEdit = useMemo(
    () =>
      currentStatus !== OrderStatusType.NEW &&
      (currentStatus === OrderStatusType.RECEIVED ||
        currentStatus === OrderStatusType.IN_PROGRESS ||
        allowOrderEditAnyStatus),
    [allowOrderEditAnyStatus, currentStatus]
  );

  const handleCloseOrderItemModal = useCallback(() => {
    setOrderDetailModalOpen(false);
  }, []);

  const handleSaveOrderItem = useCallback(
    (id?: number) => {
      setOrderDetailModalOpen(false);
      if (id) {
        mutate([`orders/${order?.code}`, { organizationId: orgId, code: order?.code }]);
      }
    },
    [order?.code, orgId]
  );

  const handleEditOrderItem = useCallback(() => {
    setOrderDetailModalOpen(true);
  }, []);

  return (
    <>
      <Card>
        <CardHeader
          loading={loading}
          title={t("order.order_detail.order_detail_title")}
          actionComponent={
            <Visible when={allowEdit} except={isTrue(orderConsolidationEnabled)}>
              <Authorization
                alwaysAuthorized={isEditor || canEdit() || (canEditOwn() && equalId(order?.createdByUser.id, userId))}
              >
                <button onClick={handleEditOrderItem}>
                  <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </Authorization>
            </Visible>
          }
        />
        <CardContent>
          <ul role="list" className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-7 xl:gap-x-8">
            <li className="group col-span-full overflow-hidden rounded-lg">
              <div className="grid sm:grid-cols-2">
                <DescriptionProperty2
                  size="short"
                  label={t("order.order_detail.order_detail_order_date")}
                  loading={loading}
                >
                  <DateTimeLabel
                    type={organizationOrderRelatedDateFormat}
                    value={order?.orderDate}
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>

                <DescriptionProperty2
                  size="short"
                  label={t("order.order_detail.order_detail_delivery_date")}
                  loading={loading}
                >
                  {order?.deliveryDate && (
                    <DateTimeLabel
                      type={organizationOrderRelatedDateFormat}
                      value={order?.deliveryDate}
                      emptyLabel={t("common.empty")}
                    />
                  )}
                </DescriptionProperty2>

                <DescriptionProperty2
                  size="short"
                  label={t("order.order_detail.order_detail_unit_of_measure")}
                  loading={loading}
                >
                  {order?.unit?.code}
                </DescriptionProperty2>

                <DescriptionProperty2
                  size="short"
                  label={t("order.order_detail.order_detail_weight")}
                  loading={loading}
                >
                  {order?.weight && (
                    <NumberLabel value={order.weight} emptyLabel={t("common.empty")} unit={order?.unit?.code} />
                  )}
                </DescriptionProperty2>

                <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ENABLE_CBM_FIELD} expect={true}>
                  <DescriptionProperty2 size="short" label={t("order.order_detail.order_detail_cbm")} loading={loading}>
                    {order?.cbm && <NumberLabel value={order.cbm} emptyLabel={t("common.empty")} />}
                  </DescriptionProperty2>
                </VisibleWithSetting>

                <DescriptionProperty2
                  size="short"
                  label={t("order.order_detail.order_detail_total_amount")}
                  loading={loading}
                >
                  {order?.totalAmount && (
                    <NumberLabel value={order.totalAmount} type="currency" emptyLabel={t("common.empty")} />
                  )}
                </DescriptionProperty2>

                <DescriptionProperty2
                  size="short"
                  label={t("order.order_detail.order_detail_payment_due_date")}
                  loading={loading}
                >
                  {order?.paymentDueDate && (
                    <DateTimeLabel type="date" value={order?.paymentDueDate} emptyLabel={t("common.empty")} />
                  )}
                </DescriptionProperty2>

                <DescriptionProperty2
                  size="short"
                  count={3}
                  multiline
                  label={t("order.order_detail.order_detail_note")}
                  loading={loading}
                >
                  {order?.notes}
                </DescriptionProperty2>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Order detail modal */}
      <UpdateOrderModal open={orderDetailModalOpen} onClose={handleCloseOrderItemModal} onSave={handleSaveOrderItem} />
    </>
  );
};

export default OrderDetailCard;
