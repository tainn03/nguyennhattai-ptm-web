"use client";

import { CustomFieldType, OrderParticipantRole } from "@prisma/client";
import isEmpty from "lodash/isEmpty";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useEffect, useMemo } from "react";

import { DetailDataNotFound } from "@/components/atoms";
import { Alert, SystemInfoCard } from "@/components/molecules";
import { CustomFieldsDisplay } from "@/components/organisms";
import { OrderTab } from "@/constants/order";
import { useAuth, useOrder, useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { useDispatch } from "@/redux/actions";
import { ORDER_UPDATE_ORDER_DETAIL } from "@/redux/types";
import { OrderInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { getGeneralDispatchVehicleInfo, getOrderStatusFlags } from "@/utils/order";
import { ensureString } from "@/utils/string";

import { CustomerCard, OrderDetailCard, OrderItemCard, OrderParticipantCard, RouteCard } from ".";

type OrderDetailTabProps = {
  selectedTab: string;
};

const OrderDetailTab = ({ selectedTab }: OrderDetailTabProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { code } = useParams();
  const dispatch = useDispatch();
  const { orgLink, orgId, userId } = useAuth();
  const { canDetail, canEdit, canEditOwn } = usePermission("order");

  const { allowOrderEditAnyStatus } = useOrgSettingExtendedStorage();
  const { order, isLoading, mutate } = useOrder({
    organizationId: orgId,
    code: selectedTab === OrderTab.INFORMATION ? ensureString(code) : "",
  });

  useEffect(() => {
    if (order && selectedTab === OrderTab.INFORMATION) {
      dispatch({
        type: ORDER_UPDATE_ORDER_DETAIL,
        payload: {
          ...order,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, selectedTab]);

  const { remainingWeight } = useMemo(() => getGeneralDispatchVehicleInfo(order), [order]);

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

  const isView = useMemo(() => {
    return Boolean(participant && participant.role === OrderParticipantRole.VIEWER);
  }, [participant]);

  useEffect(() => {
    if (!isLoading && !isView && !isEditor && !canDetail() && selectedTab === OrderTab.INFORMATION) {
      router.push(`${orgLink}/orders`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDetail, isEditor, isLoading, isView, selectedTab]);

  const { currentStatus, isNew, isReceived, isCanceled, isCompleted } = useMemo(
    () => getOrderStatusFlags({ ...order }),
    [order]
  );

  if (!isLoading && isEmpty(order)) {
    return <DetailDataNotFound goBackLink={`${orgLink}/orders`} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 2xl:grid-cols-6">
      <div className="space-y-6 lg:col-span-3 2xl:col-span-4">
        {remainingWeight < 0 && (
          <div className="mb-4">
            <Alert color="warning" title={t("order.order_detail.warning_exceed_payload")} />
          </div>
        )}
        <OrderDetailCard
          loading={isLoading}
          order={order as OrderInfo}
          currentStatus={currentStatus?.type}
          isEditor={isEditor}
        />
        <RouteCard
          loading={isLoading}
          mutate={mutate}
          route={{ ...order?.route, routeStatuses: order?.routeStatuses, orderId: order?.id }}
        />
        <OrderItemCard
          loading={isLoading}
          mutate={mutate}
          allowEdit={!isNew && (isReceived || allowOrderEditAnyStatus)}
          isEditor={isEditor}
        />
        <CustomFieldsDisplay
          loading={isLoading}
          meta={order?.meta}
          type={CustomFieldType.ORDER}
          allowEdit={
            !isNew &&
            (isReceived || allowOrderEditAnyStatus) &&
            (isEditor || canEdit() || (canEditOwn() && equalId(order?.createdByUser?.id, userId)))
          }
        />
      </div>

      <div className="space-y-6 lg:col-span-2 2xl:col-span-2">
        <CustomerCard
          loading={isLoading}
          allowEdit={!isNew && (isReceived || allowOrderEditAnyStatus)}
          customer={order?.customer}
        />
        <OrderParticipantCard
          loading={isLoading}
          allowEdit={
            !isLoading &&
            !isNew &&
            ((!isCanceled && !isCompleted) || allowOrderEditAnyStatus) &&
            (isEditor || canEdit() || (canEditOwn() && equalId(order?.createdByUser?.id, userId)))
          }
        />
        <SystemInfoCard loading={isLoading} entity={order} />
      </div>
    </div>
  );
};

export default OrderDetailTab;
