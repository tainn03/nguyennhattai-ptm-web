"use client";

import { ArrowTopRightOnSquareIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { CustomFieldType, OrderParticipantRole, RouteType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { KeyedMutator } from "swr";

import { createOrderRouteStatus, updateOrderRouteStatus } from "@/actions/order-route-status";
import {
  createRoutePointAndOrderRouteStatus,
  removeRoutePointAndUpdateOrderStatus,
  updateRoutePointAndOrderRouteStatus,
} from "@/actions/route-point";
import {
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  InfoBox,
  Link,
  NumberLabel,
  Visible,
  VisibleWithSetting,
} from "@/components/atoms";
import { Authorization, FixedRouteStatusModal, NonFixedRouteStatusModal } from "@/components/molecules";
import { RoutePointTable } from "@/components/organisms";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { OrderRouteStatusInputForm } from "@/forms/orderRouteStatus";
import { RouteInputForm, RoutePointType } from "@/forms/route";
import { RoutePointInputForm } from "@/forms/routePoint";
import { useAuth, useCustomFieldByType, useIdParam, useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import { OrderInfo, OrderRouteStatusInfo, RoutePointInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { getOrderStatusFlags } from "@/utils/order";
import { isTrue } from "@/utils/string";
import { cn } from "@/utils/twcn";

import { RouteNameModal } from ".";

type NonFixedModalState = {
  type: RoutePointType;
  routePoint?: RoutePointInputForm;
  orderRouteStatus?: OrderRouteStatusInputForm;
};

export type RouteCardProps = {
  route?: RouteInputForm;
  loading?: boolean;
  mutate: KeyedMutator<OrderInfo | undefined>;
};

export const RouteCard = ({ route, loading, mutate }: RouteCardProps) => {
  const { showNotification } = useNotification();
  const t = useTranslations();
  const { encryptId } = useIdParam();
  const { orgLink, orgId, userId } = useAuth();
  const { order } = useOrderState();
  const { allowOrderEditAnyStatus } = useOrgSettingExtendedStorage();
  const { canEdit: canEditRoute, canEditOwn: canEditOwnRoute } = usePermission("customer-route");
  const { canEdit, canEditOwn } = usePermission("order");

  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoutePointId, setSelectedRoutePointId] = useState<number>();
  const [selectedOrderRouteStatus, setSelectedOrderRouteStatus] = useState<OrderRouteStatusInputForm>();
  const [isNonFixedModalOpen, setIsNonFixedModalOpen] = useState(false);
  const [selectedRoutePoint, setSelectedRoutePoint] = useState<NonFixedModalState>({ type: RoutePointType.PICKUP });
  const [isEditRouteNameOpen, setIsEditRouteNameOpen] = useState(false);

  const { mergeDeliveryAndPickup, orderConsolidationEnabled } = useOrgSettingExtendedStorage();
  const { isNew, isReceived, isCanceled, isCompleted } = useMemo(() => getOrderStatusFlags({ ...order }), [order]);
  const isNonFixedType = useMemo(() => route?.type === RouteType.NON_FIXED, [route?.type]);

  const { customFields } = useCustomFieldByType({
    organizationId: orgId,
    ...(!isNonFixedType && { type: CustomFieldType.ROUTE_POINT }),
  });

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

  const canInteract = useMemo(
    () =>
      !loading &&
      ((!isNew && ((!isCanceled && !isCompleted) || allowOrderEditAnyStatus)) || isTrue(orderConsolidationEnabled)) &&
      (isEditor || canEdit() || (canEditOwn() && equalId(order?.createdByUser?.id, userId))),
    [
      loading,
      isNew,
      isCanceled,
      isCompleted,
      allowOrderEditAnyStatus,
      orderConsolidationEnabled,
      isEditor,
      canEdit,
      canEditOwn,
      order?.createdByUser?.id,
      userId,
    ]
  );

  const handleToggleEditRouteNameModal = useCallback(() => {
    setIsEditRouteNameOpen((prev) => !prev);
  }, []);

  const handleDeleteNonFixedRoutePoint = useCallback(
    async (routePointType: RoutePointType, routePoint: Partial<RoutePointInfo>) => {
      const currentRoutePoints = [...(route?.[routePointType] || [])].filter(
        (item) => !equalId(item.id, routePoint.id)
      );
      const currentRouteStatuses = [...(route?.routeStatuses || [])].filter(
        (status) => !equalId(status.routePoint?.id, routePoint.id)
      );

      const result = await removeRoutePointAndUpdateOrderStatus(
        {
          id: route?.id,
          updatedById: Number(userId),
          ...(routePointType === RoutePointType.PICKUP && {
            pickupPoints: currentRoutePoints.map(({ id }) => ({ id })),
          }),
          ...(routePointType === RoutePointType.DELIVERY && {
            deliveryPoints: currentRoutePoints.map(({ id }) => ({ id })),
          }),
        },
        {
          id: order?.id,
          routeStatuses: currentRouteStatuses.map((status) => ({ id: status.id })),
        }
      );

      if (!result?.id) {
        showNotification({
          color: "error",
          title: t("common.message.delete_error_title"),
          message: t(
            selectedRoutePoint.type === RoutePointType.DELIVERY
              ? "route_point.delete_error_message_delivery"
              : "route_point.delete_error_message_pickup"
          ),
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.delete_success_title"),
          message: t(
            selectedRoutePoint.type === RoutePointType.DELIVERY
              ? "route_point.delete_success_delivery"
              : "route_point.delete_success_pickup"
          ),
        });
      }
      mutate();
    },
    [mutate, order?.id, route, selectedRoutePoint.type, showNotification, t, userId]
  );

  const handleCloseFixedRoutePointModal = useCallback(() => {
    setSelectedRoutePointId(undefined);
    setSelectedOrderRouteStatus(undefined);
  }, []);

  const handleSaveFixedRoutePoint = useCallback(
    async (routeStatus: OrderRouteStatusInputForm) => {
      let result: OrderRouteStatusInfo;
      setIsLoading(true);
      if (!routeStatus?.id) {
        result = await createOrderRouteStatus({
          ...routeStatus,
          organizationId: orgId,
          order: { id: order?.id },
          createdById: userId,
        });
      } else {
        result = await updateOrderRouteStatus({
          ...routeStatus,
          organizationId: orgId,
          order: { id: order?.id },
          updatedById: userId,
        });
      }

      if (!result?.id) {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("common.message.save_error_unknown"),
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t(
            selectedRoutePoint.type === RoutePointType.DELIVERY
              ? "route_point.save_success_delivery"
              : "route_point.save_success_pickup"
          ),
        });
      }
      mutate();
      setIsLoading(false);
      handleCloseFixedRoutePointModal();
    },
    [handleCloseFixedRoutePointModal, mutate, order?.id, orgId, selectedRoutePoint.type, showNotification, t, userId]
  );

  const handleOpenFixedRoutePointModal = useCallback(
    (_type: RoutePointType, routePoint?: Partial<RoutePointInfo>) => {
      setSelectedRoutePointId(routePoint?.id);
      const editRouteStatus = [...(route?.routeStatuses || [])].find((status) =>
        equalId(status.routePoint?.id, routePoint?.id)
      );
      setSelectedOrderRouteStatus(editRouteStatus);
    },
    [route?.routeStatuses]
  );

  const handleOpenCreateNonFixedModalByButton = useCallback((routePointType: RoutePointType) => {
    setIsNonFixedModalOpen(true);
    setSelectedRoutePoint({ type: routePointType });
  }, []);

  const handleOpenCreateNonFixedModalByLink = useCallback(
    (routePointType: RoutePointType) => (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      event.preventDefault();
      setIsNonFixedModalOpen(true);
      setSelectedRoutePoint({ type: routePointType });
    },
    []
  );

  const handleOpenEditNonFixedModal = useCallback(
    (type: RoutePointType, routePoint?: Partial<RoutePointInfo>, orderRouteStatus?: Partial<OrderRouteStatusInfo>) => {
      setIsNonFixedModalOpen(true);
      setSelectedRoutePoint({ type, routePoint, orderRouteStatus });
    },
    []
  );

  const handleCloseNonFixedRoutePointModal = useCallback(() => {
    setIsNonFixedModalOpen(false);
    setSelectedRoutePoint({ type: RoutePointType.PICKUP });
  }, []);

  const handleSaveNonFixedRoutePoint = useCallback(
    async (type: RoutePointType, routePoint: RoutePointInputForm, orderRouteStatus: OrderRouteStatusInputForm) => {
      let result: RoutePointInfo;
      setIsLoading(true);
      const pickupPoints = (route?.pickupPoints || []).map((point) => ({ id: point.id }));
      const deliveryPoints = (route?.deliveryPoints || []).map((point) => ({ id: point.id }));
      if (routePoint.id) {
        result = await updateRoutePointAndOrderRouteStatus(
          {
            id: route?.id,
            updatedById: userId,
            ...(type === RoutePointType.PICKUP && { pickupPoints }),
            ...(type === RoutePointType.DELIVERY && { deliveryPoints }),
          },
          { ...routePoint, organizationId: orgId, updatedById: userId },
          {
            ...orderRouteStatus,
            organizationId: orgId,
            order: { id: order?.id },
            createdById: userId,
            updatedById: userId,
          }
        );
      } else {
        result = await createRoutePointAndOrderRouteStatus(
          {
            id: route?.id,
            updatedById: userId,
            ...(type === RoutePointType.PICKUP && { pickupPoints }),
            ...(type === RoutePointType.DELIVERY && { deliveryPoints }),
          },
          { ...routePoint, organizationId: orgId, createdById: userId, displayOrder: (route?.[type] || []).length + 1 },
          { ...orderRouteStatus, organizationId: orgId, order: { id: order?.id }, createdById: userId }
        );
      }

      if (!result) {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("common.message.save_error_unknown"),
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("order.order_route_status.message.update_success"),
        });
      }
      mutate();
      setIsLoading(false);
      handleCloseNonFixedRoutePointModal();
    },
    [handleCloseNonFixedRoutePointModal, mutate, order?.id, orgId, route, showNotification, t, userId]
  );

  return (
    <>
      <Card>
        <CardHeader loading={loading} title={t("order.route_card.card_title")} />
        <CardContent padding={false} className="pb-4">
          {route?.type === RouteType.FIXED && (
            <>
              <DescriptionProperty2 className="px-6 pt-4" label={t("order.route_card.card_title")}>
                <InfoBox label={route.code} subLabel={route.name} emptyLabel={t("common.empty")} />
              </DescriptionProperty2>
              <DescriptionProperty2 className="px-6 pb-1" label={t("order.route_card.min_bol_submit_days")}>
                <NumberLabel
                  value={route?.minBOLSubmitDays}
                  unit={t("order.route_card.days")}
                  showUnitWhenEmpty={false}
                  emptyLabel={t("common.empty")}
                />
                <Authorization
                  resource="customer-route"
                  action="edit"
                  alwaysAuthorized={canEditRoute() || (canEditOwnRoute() && equalId(route.createdByUser?.id, userId))}
                >
                  <Link
                    useDefaultStyle
                    target="_blank"
                    className="ml-1 italic"
                    href={`${orgLink}/customers/${encryptId(route?.customerId)}/routes/${encryptId(route.id)}/edit`}
                  >
                    {t.rich("order.route_card.config_min_bol_submit_days", {
                      icon: () => <ArrowTopRightOnSquareIcon className="ml-1 inline-block h-4 w-4" />,
                    })}
                  </Link>
                </Authorization>
              </DescriptionProperty2>
            </>
          )}

          <Visible when={isNonFixedType} except={isTrue(orderConsolidationEnabled)}>
            <div className="grid-cols-2">
              <DescriptionProperty2
                className="px-6 pb-1 pt-4"
                showEmptyContent={false}
                label={t("order.route_card.card_title")}
              >
                <div className="flex">
                  <div>{route && route.name}</div>
                  <button
                    className={cn("px-3", { hidden: !isReceived })}
                    type="button"
                    title={t("common.edit")}
                    onClick={handleToggleEditRouteNameModal}
                  >
                    <PencilSquareIcon aria-hidden="true" className="h-5 w-5 text-gray-400 hover:text-gray-500" />
                  </button>
                </div>
              </DescriptionProperty2>
            </div>
          </Visible>

          <RoutePointTable
            loading={loading}
            className="mx-0 mt-0 sm:mx-0"
            labelStyles="px-6 pt-4"
            type={RoutePointType.PICKUP}
            label={
              mergeDeliveryAndPickup ? t("order.route_card.pickup_delivery_point") : t("order.route_card.pickup_point")
            }
            routePoints={[...(route?.pickupPoints || [])]}
            routeStatuses={route?.routeStatuses}
            onEdit={
              canInteract
                ? isNonFixedType
                  ? handleOpenEditNonFixedModal
                  : customFields.length > 0
                  ? handleOpenFixedRoutePointModal
                  : undefined
                : undefined
            }
            canCreate={canInteract && isNonFixedType}
            onCreate={canInteract ? handleOpenCreateNonFixedModalByButton : undefined}
            onDelete={canInteract && isNonFixedType ? handleDeleteNonFixedRoutePoint : undefined}
          />

          <Visible
            when={canInteract && isNonFixedType && !!route?.pickupPoints && route?.pickupPoints.length > 0}
            except={isTrue(orderConsolidationEnabled) && isNonFixedType}
          >
            <div className="ml-4 mt-2">
              <Link
                useDefaultStyle
                href=""
                className="font-semibold"
                type="button"
                onClick={handleOpenCreateNonFixedModalByLink(RoutePointType.PICKUP)}
              >
                <span aria-hidden="true">+</span>{" "}
                {mergeDeliveryAndPickup ? t("order.route_card.new_point") : t("order.route_card.new_pickup")}
              </Link>
            </div>
          </Visible>

          <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.MERGE_DELIVERY_AND_PICKUP} expect={false}>
            <RoutePointTable
              loading={loading}
              className="mx-0 mt-0 sm:mx-0"
              labelStyles="px-6 pt-4"
              type={RoutePointType.DELIVERY}
              label={t("order.route_card.delivery_point")}
              routePoints={[...(route?.deliveryPoints || [])]}
              routeStatuses={route?.routeStatuses}
              onEdit={
                canInteract
                  ? isNonFixedType
                    ? handleOpenEditNonFixedModal
                    : customFields.length > 0
                    ? handleOpenFixedRoutePointModal
                    : undefined
                  : undefined
              }
              onDelete={canInteract && isNonFixedType ? handleDeleteNonFixedRoutePoint : undefined}
              canCreate={canInteract && isNonFixedType}
              onCreate={canInteract ? handleOpenCreateNonFixedModalByButton : undefined}
            />
          </VisibleWithSetting>

          <Visible
            when={canInteract && isNonFixedType && (route?.deliveryPoints || []).length > 0}
            except={isTrue(orderConsolidationEnabled) && isNonFixedType}
          >
            <div className="ml-6 mt-2">
              <Link
                useDefaultStyle
                href=""
                className="font-semibold"
                onClick={handleOpenCreateNonFixedModalByLink(RoutePointType.DELIVERY)}
              >
                <span aria-hidden="true">+</span> {t("order.route_card.new_delivery")}
              </Link>
            </div>
          </Visible>
        </CardContent>
      </Card>

      {isNonFixedType && (
        <NonFixedRouteStatusModal
          loading={isLoading}
          open={isNonFixedModalOpen}
          type={selectedRoutePoint?.type}
          routePoint={selectedRoutePoint?.routePoint}
          orderRouteStatus={selectedRoutePoint?.orderRouteStatus}
          onClose={handleCloseNonFixedRoutePointModal}
          onSave={handleSaveNonFixedRoutePoint}
        />
      )}

      {selectedRoutePointId && (
        <FixedRouteStatusModal
          loading={isLoading}
          open={!!selectedRoutePointId}
          routePointId={selectedRoutePointId}
          orderRouteStatus={selectedOrderRouteStatus}
          onSave={handleSaveFixedRoutePoint}
          onClose={handleCloseFixedRoutePointModal}
        />
      )}

      <RouteNameModal open={isEditRouteNameOpen} onClose={handleToggleEditRouteNameModal} />
    </>
  );
};

export default RouteCard;
