"use client";

import { CustomFieldType, RouteType } from "@prisma/client";
import { getIn, useFormikContext } from "formik";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { TabPanel } from "@/components/atoms";
import { Combobox, FixedRouteStatusModal } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { TabItem } from "@/components/molecules/Tabs/Tabs";
import { NewCustomerRouteModal, RoutePointTable } from "@/components/organisms";
import { OrderInputForm } from "@/forms/order";
import { OrderRouteStatusInputForm } from "@/forms/orderRouteStatus";
import { RoutePointType } from "@/forms/route";
import {
  useCustomFieldByType,
  useIdParam,
  useOrgSettingExtendedStorage,
  usePermission,
  useRouteOptions,
} from "@/hooks";
import { RouteInfo, RoutePointInfo } from "@/types/strapi";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { formatError } from "@/utils/yup";

import { RouteTabProps } from "./RouteTab";

type FixedRoutePanelProps = Omit<RouteTabProps, "customerType"> & {
  type: TabItem;
  selectedTab: string;
};

const FixedRoutePanel = ({ type, selectedTab, selectedCustomerId, orgId, orgLink, userId }: FixedRoutePanelProps) => {
  const t = useTranslations();
  const { values, touched, errors, setFieldValue } = useFormikContext<OrderInputForm>();
  const { encryptId } = useIdParam();
  const [selectedRoute, setSelectedRoute] = useState<RouteInfo | undefined>();
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [selectedRoutePointId, setSelectedRoutePointId] = useState<number>();
  const [selectedOrderRouteStatus, setSelectedOrderRouteStatus] = useState<OrderRouteStatusInputForm>();

  const { mergeDeliveryAndPickup } = useOrgSettingExtendedStorage();
  const { customFields } = useCustomFieldByType({ organizationId: orgId, type: CustomFieldType.ROUTE_POINT });
  const { canNew, canFind } = usePermission("customer-route");

  const { routes, isLoading, mutate } = useRouteOptions({
    organizationId: orgId,
    customerId: Number(selectedCustomerId),
    type: RouteType.FIXED,
  });

  const routeOptions: ComboboxItem[] = useMemo(
    () =>
      routes?.map((item: RouteInfo) => ({
        value: ensureString(item.id),
        label: item.code,
        subLabel: item.name,
      })) || [],
    [routes]
  );

  const handleNewRoute = useCallback(() => {
    setIsNewCustomerModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsNewCustomerModalOpen(false);
  }, []);

  const handleCreateCustomerRoute = useCallback(
    (id: number) => {
      setIsNewCustomerModalOpen(false);
      if (id) {
        setFieldValue("routeId", id);
        mutate();
      }
    },
    [mutate, setFieldValue]
  );

  const handleManageRoute = useCallback(() => {
    window.open(`${orgLink}/customers/${encryptId(selectedCustomerId)}?tab=routes`, "_blank");
  }, [encryptId, orgLink, selectedCustomerId]);

  const handleRouteChange = useCallback(
    (value: string) => {
      setFieldValue("routeId", Number(value));
    },
    [setFieldValue]
  );

  useEffect(() => {
    if (values.routeId) {
      const newRoute = routes.find((item: RouteInfo) => equalId(item.id, values.routeId));
      setSelectedRoute(newRoute);
      setFieldValue("route.code", newRoute?.code);
    } else {
      setSelectedRoute(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, values.routeId]);

  const handleOpenRoutePointModal = useCallback(
    (_type: RoutePointType, routePoint?: Partial<RoutePointInfo>) => {
      setSelectedRoutePointId(routePoint?.id);
      const editRouteStatus = [...(values.routeStatuses || [])].find((status) =>
        equalId(status.routePoint?.id, routePoint?.id)
      );
      setSelectedOrderRouteStatus(editRouteStatus);
    },
    [values.routeStatuses]
  );

  const handleCloseRoutePointModal = useCallback(() => {
    setSelectedRoutePointId(undefined);
    setSelectedOrderRouteStatus(undefined);
  }, []);

  const handleSaveRoutePoint = useCallback(
    (routeStatus: OrderRouteStatusInputForm) => {
      const routeStatuses = [...(values.routeStatuses || [])];
      const index = routeStatuses.findIndex((item) => equalId(item.routePoint?.id, routeStatus.routePoint?.id));
      if (index > -1) {
        routeStatuses[index] = routeStatus;
      } else {
        routeStatuses.push(routeStatus);
      }
      setFieldValue("routeStatuses", routeStatuses);
      handleCloseRoutePointModal();
    },
    [handleCloseRoutePointModal, setFieldValue, values.routeStatuses]
  );

  return (
    <>
      <TabPanel item={type} selectedTab={selectedTab}>
        <div className="col-span-full">
          <Combobox
            label={t("order_new.route_tab.route")}
            required
            items={routeOptions}
            value={ensureString(values.routeId)}
            onChange={handleRouteChange}
            loading={isLoading}
            placeholder={
              selectedCustomerId
                ? t("order_new.route_tab.route_selected_customer_placeholder")
                : t("order_new.route_tab.route_no_customer_placeholder")
            }
            newButtonText={canNew() ? t("order_new.route_tab.new") : undefined}
            onNewButtonClick={canNew() ? handleNewRoute : undefined}
            manageButtonText={canFind() ? t("order_new.route_tab.manage") : undefined}
            onManageButtonClick={canFind() ? handleManageRoute : undefined}
            errorText={formatError(t, getIn(touched, "routeId") && getIn(errors, "routeId"))}
            disabled={!selectedCustomerId}
          />
        </div>
        {selectedRoute && (
          <>
            <div className="col-span-full">
              <RoutePointTable
                type={RoutePointType.PICKUP}
                label={
                  mergeDeliveryAndPickup ? t("order_new.route_tab.pickup_delivery") : t("order_new.route_tab.pickup")
                }
                routePoints={[...selectedRoute.pickupPoints]}
                routeStatuses={values.routeStatuses}
                onEdit={customFields.length > 0 ? handleOpenRoutePointModal : undefined}
              />
            </div>

            {!mergeDeliveryAndPickup && (
              <div className="col-span-full">
                <RoutePointTable
                  type={RoutePointType.DELIVERY}
                  label={t("order_new.route_tab.delivery")}
                  routePoints={[...selectedRoute.deliveryPoints]}
                  routeStatuses={values.routeStatuses}
                  onEdit={customFields.length > 0 ? handleOpenRoutePointModal : undefined}
                />
              </div>
            )}
          </>
        )}
      </TabPanel>

      <NewCustomerRouteModal
        orgId={orgId}
        orgLink={orgLink}
        userId={userId}
        customerId={Number(selectedCustomerId)}
        open={isNewCustomerModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleCreateCustomerRoute}
      />

      {selectedRoutePointId && (
        <FixedRouteStatusModal
          open={!!selectedRoutePointId}
          routePointId={selectedRoutePointId}
          orderRouteStatus={selectedOrderRouteStatus}
          onSave={handleSaveRoutePoint}
          onClose={handleCloseRoutePointModal}
        />
      )}
    </>
  );
};

export default FixedRoutePanel;
