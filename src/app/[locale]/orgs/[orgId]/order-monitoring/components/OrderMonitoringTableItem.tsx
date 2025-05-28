import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { CustomerType, OrderStatusType, OrderTripStatusType, RouteType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Badge, DateTimeLabel, InfoBox, Link, Process, TableRow } from "@/components/atoms";
import { Authorization, CopyToClipboard } from "@/components/molecules";
import { orderSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import { RoutePointInfoModal } from "@/components/organisms";
import { useIdParam, useOrderTripsInfoOrderMonitoring, useOrgSettingExtendedStorage } from "@/hooks";
import { OrderInfo } from "@/types/strapi";
import { formatNumber } from "@/utils/number";

import OrderMonitoringTripInfoItem from "./OrderMonitoringTripInfoItem";

const styleTableCell = "text-sm text-gray-500 whitespace-nowrap";

export type OrderMonitoringTableItemProps = {
  order: OrderInfo;
  organizationId: number;
  orgLink: string;
};

const OrderMonitoringTableItem = ({ order, organizationId, orgLink }: OrderMonitoringTableItemProps) => {
  const t = useTranslations();
  const { encryptId } = useIdParam();
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();

  const { orderTripsInfo, isLoading } = useOrderTripsInfoOrderMonitoring({
    organizationId: organizationId,
    id: order.id,
    isFetch: showDetail,
  });

  const currentStatus = useMemo(() => {
    if (order.isDraft || !order.lastStatusType) {
      return null;
    }

    return order.lastStatusType;
  }, [order.isDraft, order.lastStatusType]);

  const currentStep = useMemo(() => orderSteps.find((item) => item.value === currentStatus), [currentStatus]);

  const [isDraft, isCanceled] = useMemo(
    () => [order.isDraft, order.lastStatusType === OrderStatusType.CANCELED],
    [order.isDraft, order.lastStatusType]
  );

  const [cntTrips, cntTripsComplete, cntTripHasBillOfLading, hasTransportedPerQuantity] = useMemo(() => {
    let rs: string | undefined = undefined;
    const hasTransported = order.trips.reduce((acc, trip) => acc + (trip?.weight || 0), 0) || 0;
    const quantity = order.weight;
    const unitCode = order.unit?.code;

    if (hasTransported !== undefined && quantity !== undefined && unitCode !== undefined) {
      rs = `${formatNumber(hasTransported)}/${formatNumber(quantity || 0)} ${unitCode}`;
    }

    return [
      order.trips.length,
      order.trips.filter(
        (trip) => trip.lastStatusType === OrderTripStatusType.COMPLETED || OrderTripStatusType.DELIVERED
      ).length,
      order.trips.filter((trip) => trip.billOfLading).length,
      rs,
    ];
  }, [order]);

  return (
    <Disclosure as={Fragment}>
      {({ open }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          if (open) {
            setShowDetail(open);
          }
        }, [open]);
        return (
          <>
            <TableRow hover={!open}>
              {/* Expanded/Collapsed */}
              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-100": open,
                })}
              >
                {open ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                )}
              </Disclosure.Button>

              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-100": open,
                })}
              >
                <Authorization
                  resource="order"
                  action="detail"
                  fallbackComponent={<span className="!font-semibold">{order.code}</span>}
                >
                  <Link useDefaultStyle href={`${orgLink}/orders/${order.code}`} className="!font-semibold">
                    {order.code}
                  </Link>
                  <CopyToClipboard value={order.code} />
                </Authorization>
              </Disclosure.Button>

              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-100": open,
                })}
              >
                <Authorization
                  resource="customer"
                  action="detail"
                  fallbackComponent={
                    <InfoBox label={order.customer?.code} subLabel={order.customer?.name} emptyLabel="_" />
                  }
                >
                  <InfoBox
                    as={order.customer?.type === CustomerType.FIXED ? Link : undefined}
                    label={order.customer?.code}
                    subLabel={order.customer?.name}
                    emptyLabel="_"
                    href={
                      order.customer?.type === CustomerType.FIXED
                        ? `${orgLink}/customers/${encryptId(order.customer?.id)}`
                        : undefined
                    }
                  />
                </Authorization>
              </Disclosure.Button>

              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, "text-center", {
                  "bg-blue-100": open,
                })}
              >
                <DateTimeLabel value={order.orderDate} type={organizationOrderRelatedDateFormat} emptyLabel="_" />
              </Disclosure.Button>

              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, "text-center", {
                  "bg-blue-100": open,
                })}
              >
                <DateTimeLabel value={order.deliveryDate} type={organizationOrderRelatedDateFormat} emptyLabel="_" />
              </Disclosure.Button>

              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-100": open,
                })}
              >
                <Authorization
                  resource="customer-route"
                  action="detail"
                  fallbackComponent={
                    <InfoBox
                      label={
                        order.route?.type === RouteType.FIXED
                          ? order.route?.code
                          : t("order_monitoring.list_item.route_not_fixed")
                      }
                      subLabel={order.route?.name}
                      emptyLabel="_"
                    />
                  }
                >
                  <div className="flex items-center gap-2">
                    <InfoBox
                      as={order.route?.type === RouteType.FIXED ? Link : undefined}
                      label={
                        order.route?.type === RouteType.FIXED
                          ? order.route?.code
                          : t("order_monitoring.list_item.route_not_fixed")
                      }
                      subLabel={order.route?.name}
                      emptyLabel="_"
                      href={
                        order.route?.type === RouteType.FIXED
                          ? `${orgLink}/customers/${encryptId(order.customer?.id)}`
                          : undefined
                      }
                    />
                    <RoutePointInfoModal orderId={order.id} />
                  </div>
                </Authorization>
              </Disclosure.Button>

              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, "text-right", {
                  "bg-blue-100": open,
                })}
              >
                <InfoBox label={hasTransportedPerQuantity} emptyLabel="_" />
              </Disclosure.Button>

              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-100": open,
                })}
              >
                <Process
                  label={
                    order.trips.filter(
                      (trip) =>
                        trip.lastStatusType === OrderTripStatusType.COMPLETED ||
                        trip.lastStatusType === OrderTripStatusType.DELIVERED
                    ).length +
                    "/" +
                    cntTrips
                  }
                  emptyLabel="_"
                  processing={
                    order.trips.filter(
                      (trip) =>
                        trip.lastStatusType === OrderTripStatusType.COMPLETED ||
                        trip.lastStatusType === OrderTripStatusType.DELIVERED
                    ).length / cntTrips
                  }
                  classValue={{
                    "bg-green-500": cntTripsComplete === cntTrips && cntTrips > 0,
                    "bg-yellow-500":
                      (cntTripsComplete / cntTrips) * 100 <= 50 && (cntTripsComplete / cntTrips) * 100 > 0,
                    "bg-sky-500":
                      (cntTripsComplete / cntTrips) * 100 >= 51 && (cntTripsComplete / cntTrips) * 100 < 100,
                  }}
                />
              </Disclosure.Button>

              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, "text-center", {
                  "bg-blue-100": open,
                })}
              >
                {!isNaN(cntTripHasBillOfLading / cntTrips) ? (
                  <span className="font-semibold text-gray-900">{`${cntTripHasBillOfLading}/${cntTrips}`}</span>
                ) : (
                  "_"
                )}
              </Disclosure.Button>

              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "text-center": true,
                  "bg-blue-100": open,
                })}
              >
                {isDraft ? (
                  <Badge color="secondary" label={t("order.status.draft")} />
                ) : (
                  <Badge
                    color={isCanceled ? "error" : currentStep?.color}
                    label={isCanceled ? t("order.status.canceled") : t(currentStep?.label)}
                  />
                )}
              </Disclosure.Button>
            </TableRow>
            <OrderMonitoringTripInfoItem
              orderTripsInfo={orderTripsInfo}
              unitCode={order.unit?.code ?? ""}
              orgLink={orgLink}
              isLoading={isLoading}
            />
          </>
        );
      }}
    </Disclosure>
  );
};

export default OrderMonitoringTableItem;
