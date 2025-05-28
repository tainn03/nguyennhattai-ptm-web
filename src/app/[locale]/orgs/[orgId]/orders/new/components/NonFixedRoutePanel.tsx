"use client";

import { CustomerType } from "@prisma/client";
import { getIn, useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { Link, TabPanel } from "@/components/atoms";
import { NonFixedRouteStatusModal, TextField } from "@/components/molecules";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { RoutePointTable } from "@/components/organisms";
import { OrderInputForm } from "@/forms/order";
import { OrderRouteStatusInputForm } from "@/forms/orderRouteStatus";
import { RoutePointType } from "@/forms/route";
import { RoutePointInputForm } from "@/forms/routePoint";
import { useOrgSettingExtendedStorage } from "@/hooks";
import { OrderRouteStatusInfo, RoutePointInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { formatError } from "@/utils/yup";

import { RouteTabProps } from "./RouteTab";

type NonFixedModalState = {
  type: RoutePointType;
  routePoint?: RoutePointInputForm;
  orderRouteStatus?: OrderRouteStatusInputForm;
};

type NonFixedRoutePanelProps = Omit<RouteTabProps, "customerType"> & {
  type: TabItem;
  selectedTab: string;
};

const NonFixedRoutePanel = ({ type, selectedTab }: NonFixedRoutePanelProps) => {
  const t = useTranslations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoutePoint, setSelectedRoutePoint] = useState<NonFixedModalState>({ type: RoutePointType.PICKUP });
  const [routePoint, setRoutePoint] = useState<RoutePointInputForm>();
  const [orderRouteStatus, setOrderRouteStatus] = useState<OrderRouteStatusInputForm>();

  const { mergeDeliveryAndPickup } = useOrgSettingExtendedStorage();
  const { values, touched, errors, setValues, setFieldValue, handleChange } = useFormikContext<OrderInputForm>();

  const isRouteCreatable = useMemo(
    () => Number(values.customerId) || values?.customer?.type === CustomerType.CASUAL,
    [values.customerId, values.customer?.type]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedRoutePoint({ type: RoutePointType.PICKUP });
    setRoutePoint(undefined);
    setOrderRouteStatus(undefined);
  }, []);

  const handleOpenCreateModalByButton = useCallback((routePointType: RoutePointType) => {
    setIsModalOpen(true);
    setSelectedRoutePoint({ type: routePointType });
  }, []);

  const handleOpenCreateModalByLink = useCallback(
    (routePointType: RoutePointType) => (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
      event.preventDefault();
      setIsModalOpen(true);
      setSelectedRoutePoint({ type: routePointType });
    },
    []
  );

  const handleOpenEditModal = useCallback(
    (type: RoutePointType, routePoint?: Partial<RoutePointInfo>, orderRouteStatus?: Partial<OrderRouteStatusInfo>) => {
      setIsModalOpen(true);
      setSelectedRoutePoint({ type, routePoint, orderRouteStatus });

      setRoutePoint(routePoint as RoutePointInputForm);
      setOrderRouteStatus(orderRouteStatus as OrderRouteStatusInputForm);
    },
    []
  );

  const handleSaveRoutePoint = useCallback(
    (type: RoutePointType, routePoint: RoutePointInputForm, orderRouteStatus: OrderRouteStatusInputForm) => {
      const currentRoutePoints = values.route?.[type] || [];
      const routePointIndex = currentRoutePoints.findIndex(
        (item) =>
          equalId(item.id, routePoint.id) ||
          ("tempId" in item && "tempId" in routePoint && item.tempId === routePoint.tempId)
      );

      if (routePointIndex > -1) {
        currentRoutePoints[routePointIndex] = routePoint;
      } else {
        currentRoutePoints.push({ ...routePoint, displayOrder: currentRoutePoints.length + 1 });
      }

      const routeStatuses = [...(values.routeStatuses || [])];
      const routeStatusIndex = routeStatuses.findIndex(
        (item) =>
          equalId(item.routePoint?.id, orderRouteStatus.routePoint?.id) ||
          (item.routePoint &&
            "tempId" in item.routePoint &&
            item.routePoint?.tempId === orderRouteStatus.routePoint?.tempId)
      );
      if (routeStatusIndex > -1) {
        routeStatuses[routeStatusIndex] = orderRouteStatus;
      } else {
        routeStatuses.push(orderRouteStatus);
      }

      setValues({ ...values, route: { ...values.route, [type]: currentRoutePoints }, routeStatuses });
      handleCloseModal();
    },
    [handleCloseModal, setValues, values]
  );

  const handleDeleteRoutePoint = useCallback(
    (routePointType: RoutePointType, routePoint: Partial<RoutePointInfo>) => {
      const newPoint = [...(values?.route?.[routePointType] || [])];
      const index = newPoint.findIndex((item) => item.displayOrder === routePoint?.displayOrder);
      if (index > -1) {
        newPoint.splice(index, 1);
        newPoint.forEach((item, index) => {
          item.displayOrder = index + 1;
        });
        setFieldValue(`route.${routePointType}`, newPoint);
      }
    },
    [setFieldValue, values?.route]
  );

  return (
    <>
      <TabPanel item={type} selectedTab={selectedTab}>
        <div className="col-span-full">
          <TextField
            label={t("customer.route.name")}
            name="name"
            value={values.route?.name}
            maxLength={30}
            onChange={handleChange("route.name")}
            errorText={formatError(t, getIn(touched, "route.name") && getIn(errors, "route.name"))}
          />
        </div>
        <div className="col-span-full">
          <RoutePointTable
            required
            type={RoutePointType.PICKUP}
            label={mergeDeliveryAndPickup ? t("order_new.route_tab.pickup_delivery") : t("order_new.route_tab.pickup")}
            canCreate={!!isRouteCreatable}
            routePoints={[...(values.route?.pickupPoints || [])]}
            routeStatuses={[...(values.routeStatuses || [])]}
            onCreate={handleOpenCreateModalByButton}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteRoutePoint}
          />
          <p className="mt-2 text-xs text-red-600">
            {formatError(t, getIn(touched, "route.pickupPoints") && getIn(errors, "route.pickupPoints"))}
          </p>
          {(values.route?.pickupPoints || []).length > 0 && (
            <div className="mt-2">
              <Link
                useDefaultStyle
                href=""
                className="font-semibold"
                type="button"
                onClick={handleOpenCreateModalByLink(RoutePointType.PICKUP)}
              >
                <span aria-hidden="true">+</span> {t("order_new.route_tab.new_casual_pickup")}
              </Link>
            </div>
          )}
        </div>

        {!mergeDeliveryAndPickup && (
          <div className="col-span-full">
            <RoutePointTable
              required
              type={RoutePointType.DELIVERY}
              label={t("order_new.route_tab.delivery")}
              canCreate={!!isRouteCreatable}
              routePoints={[...(values.route?.deliveryPoints || [])]}
              routeStatuses={[...(values.routeStatuses || [])]}
              onCreate={handleOpenCreateModalByButton}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteRoutePoint}
            />
            <p className="mt-2 text-xs text-red-600">
              {formatError(t, getIn(touched, "route.deliveryPoints") && getIn(errors, "route.deliveryPoints"))}
            </p>
            {(values.route?.deliveryPoints || []).length > 0 && (
              <div className="mt-2">
                <Link
                  useDefaultStyle
                  href=""
                  className="font-semibold"
                  onClick={handleOpenCreateModalByLink(RoutePointType.DELIVERY)}
                >
                  <span aria-hidden="true">+</span> {t("order_new.route_tab.new_casual_delivery")}
                </Link>
              </div>
            )}
          </div>
        )}
      </TabPanel>

      <NonFixedRouteStatusModal
        open={isModalOpen}
        type={selectedRoutePoint?.type}
        routePoint={routePoint}
        orderRouteStatus={orderRouteStatus}
        onClose={handleCloseModal}
        onSave={handleSaveRoutePoint}
      />
    </>
  );
};

export default NonFixedRoutePanel;
