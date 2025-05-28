"use client";

import { Disclosure, Popover, Transition } from "@headlessui/react";
import {
  ChatBubbleBottomCenterTextIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  MinusIcon,
  PlusIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { OrderParticipantRole, OrderStatusType, OrderTripStatusType, RouteType } from "@prisma/client";
import clsx from "clsx";
import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useMemo, useState } from "react";
import { BiArrowFromLeft as BiArrowFromLeftIcon, BiArrowToRight as BiArrowToRightIcon } from "react-icons/bi";

import { Badge, DateTimeLabel, Link, NumberLabel } from "@/components/atoms";
import { BadgeProps } from "@/components/atoms/Badge/Badge";
import {
  Authorization,
  AvatarGroup,
  Button,
  CopyToClipboard,
  OrderMenu,
  SkeletonOrderGridItem,
} from "@/components/molecules";
import { OrderShareModal } from "@/components/organisms";
import {
  NAM_PHONG_BILL_NO_FIELD_ID,
  NAM_PHONG_CONT_NO_FIELD_ID,
  NAM_PHONG_ORGANIZATION_ID,
} from "@/constants/organization";
import { useOrgSettingExtendedStorage, usePermission, useRelatedOrderInfo } from "@/hooks";
import { AnyObject } from "@/types";
import { OrderInfo, OrderStatusInfo, OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { getGeneralDispatchVehicleInfo } from "@/utils/order";
import { encryptId } from "@/utils/security";
import { ensureString, getDetailAddress, getDetailRoutePointAddress } from "@/utils/string";
import { cn } from "@/utils/twcn";

export type OrderStepItem = Pick<BadgeProps, "color"> & {
  value: OrderStatusType;
  label: string;
  color: string;
};

type TripStepItem = Pick<BadgeProps, "color"> & {
  value: string;
};

export const orderSteps: OrderStepItem[] = [
  {
    value: OrderStatusType.NEW,
    label: "order.status.new",
    color: "primary",
  },
  {
    value: OrderStatusType.RECEIVED,
    label: "order.status.received",
    color: "purple",
  },
  {
    value: OrderStatusType.IN_PROGRESS,
    label: "order.status.in_progress",
    color: "warning",
  },
  {
    value: OrderStatusType.COMPLETED,
    label: "order.status.completed",
    color: "success",
  },
];

export const tripSteps: TripStepItem[] = [
  {
    value: OrderTripStatusType.NEW,
    color: "primary",
  },
  {
    value: OrderTripStatusType.PENDING_CONFIRMATION,
    color: "purple",
  },
  {
    value: OrderTripStatusType.CONFIRMED,
    color: "info",
  },
  {
    value: OrderTripStatusType.WAITING_FOR_PICKUP,
    color: "warning",
  },
  {
    value: OrderTripStatusType.WAREHOUSE_GOING_TO_PICKUP,
    color: "zinc",
  },
  {
    value: OrderTripStatusType.WAREHOUSE_PICKED_UP,
    color: "cyan",
  },
  {
    value: OrderTripStatusType.WAITING_FOR_DELIVERY,
    color: "pink",
  },
  {
    value: OrderTripStatusType.DELIVERED,
    color: "teal",
  },
  {
    value: OrderTripStatusType.COMPLETED,
    color: "success",
  },
  {
    value: OrderTripStatusType.CANCELED,
    color: "error",
  },
];

export type OrderGridItemProps = OrgPageProps & {
  order: OrderInfo;
  onDeleted?: (order: OrderInfo) => void;
  onCanceled?: (order: OrderInfo) => void;
};

const OrderGridItem = ({ order, orgId, orgLink, onDeleted, onCanceled, userId }: OrderGridItemProps) => {
  const t = useTranslations();
  const [showDetail, setShowDetail] = useState(false);
  const [isShareConfirmOpen, setIsShareConfirmOpen] = useState(false);
  const { organizationOrderRelatedDateFormat, mergeDeliveryAndPickup } = useOrgSettingExtendedStorage();
  const { canDetail } = usePermission("order");
  const { canFind: canFindOrderTrip } = usePermission("order-trip");

  const { relatedOrderInfo, isLoading } = useRelatedOrderInfo({
    organizationId: orgId,
    code: order.code,
    mode: "grid",
    isFetch: showDetail,
  });

  const currentStatus = useMemo(() => {
    if (order.isDraft || order.statuses?.length === 0) {
      return null;
    }

    const latestStatus = order.statuses
      .filter((item) => item.type !== OrderStatusType.CANCELED)
      .reduce((prev, current) => {
        return (prev as OrderStatusInfo).createdAt > (current as OrderStatusInfo).createdAt ? prev : current;
      });
    return latestStatus?.type;
  }, [order.isDraft, order.statuses]);

  const isEdit = useMemo(() => {
    const participant = order.participants.find((item) => equalId(item.user?.id, userId));
    return (
      participant &&
      (participant.role === OrderParticipantRole.EDITOR || participant.role === OrderParticipantRole.OWNER)
    );
  }, [order.participants, userId]);

  const isView = useMemo(() => {
    const participant = order.participants.find((item) => equalId(item.user?.id, userId));
    return participant && participant.role === OrderParticipantRole.VIEWER;
  }, [order.participants, userId]);

  const currentStep = useMemo(() => orderSteps.find((item) => item.value === currentStatus), [currentStatus]);

  const [isDraft, isCanceled] = useMemo(
    () => [order.isDraft, !!order.statuses?.some((item) => item.type === OrderStatusType.CANCELED)],
    [order.isDraft, order.statuses]
  );

  const { totalTripWeight, weight } = useMemo(() => getGeneralDispatchVehicleInfo(order), [order]);

  const stepCompleted = useCallback(
    (currentIndex: number) => orderSteps.findIndex(({ value }) => value === currentStatus) > currentIndex,
    [currentStatus]
  );

  const getCurrentTripType = useCallback((trip: Partial<OrderTripInfo>) => {
    const latestStatus = trip.statuses?.reduce((prev, current) => {
      return (prev as OrderTripStatusInfo).createdAt > (current as OrderTripStatusInfo).createdAt ? prev : current;
    });

    return (
      <Badge
        className="!max-w-[110px] !whitespace-pre-wrap"
        color={tripSteps.find(({ value: item }) => item === latestStatus?.type)?.color || "info"}
        label={ensureString(latestStatus?.driverReport?.name)}
      />
    );
  }, []);

  const handleShowDetail = useCallback(() => {
    setShowDetail(true);
  }, []);

  const handleHideDetail = useCallback(() => {
    setShowDetail(false);
  }, []);

  /**
   * Callback function for setting open modal share dialog.
   */
  const handleShare = useCallback(() => {
    setIsShareConfirmOpen(true);
  }, []);

  /**
   * Callback function for setting close modal share dialog.
   */
  const handleCloseShareOrder = useCallback(() => {
    setIsShareConfirmOpen(false);
  }, []);

  const isNamPhongOrg = useMemo(() => equalId(orgId, NAM_PHONG_ORGANIZATION_ID), [orgId]);

  const customFields = useMemo(
    () => (isNamPhongOrg ? (order.meta as AnyObject)?.customFields : null),
    [isNamPhongOrg, order.meta]
  );

  const billNo = useMemo(
    () =>
      isNamPhongOrg
        ? customFields?.find((item: AnyObject) => equalId(item.id, NAM_PHONG_BILL_NO_FIELD_ID))?.value
        : null,
    [customFields, isNamPhongOrg]
  );

  const contNo = useMemo(
    () =>
      isNamPhongOrg
        ? customFields?.find((item: AnyObject) => equalId(item.id, NAM_PHONG_CONT_NO_FIELD_ID))?.value
        : null,
    [customFields, isNamPhongOrg]
  );

  return (
    <>
      <Popover
        as="li"
        className={clsx("relative col-span-1 shadow ring-1 sm:rounded-md", {
          "rounded-t-lg bg-blue-50 ring-gray-300": showDetail,
          "bg-white ring-gray-200 hover:bg-gray-50": !showDetail,
        })}
      >
        <Popover.Button className="flex h-full cursor-pointer flex-col justify-between" as="div">
          <div className="px-4 py-5 sm:px-6">
            <div className="-ml-4 -mt-4 flex items-start justify-between">
              <div className="ml-4 mt-4 w-full">
                <div className="flex flex-nowrap justify-between gap-x-2">
                  <h3>
                    <Authorization
                      resource="order"
                      action="detail"
                      alwaysAuthorized={canDetail() || isEdit || isView}
                      fallbackComponent={
                        <span className="text-base font-medium leading-6 text-gray-700">{order.code}</span>
                      }
                    >
                      <Link
                        useDefaultStyle
                        className="!text-base font-semibold leading-6"
                        href={
                          isDraft ? `${orgLink}/orders/new?orderId=${order.code}` : `${orgLink}/orders/${order.code}`
                        }
                      >
                        {order.code}
                      </Link>
                    </Authorization>
                    <CopyToClipboard value={order.code} />
                  </h3>

                  <div className="flex">
                    <div
                      className={cn("flex items-center", {
                        hidden: totalTripWeight <= weight,
                      })}
                    >
                      <div className="flex-shrink-0">
                        <ExclamationTriangleIcon
                          data-tooltip-id="tooltip"
                          data-tooltip-html={t("order.order_detail.warning_exceed_payload_tooltip")}
                          className="h-5 w-5 text-yellow-500"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                    <OrderMenu
                      order={order}
                      onCanceled={onCanceled}
                      onDeleted={onDeleted}
                      isEdit={isEdit}
                      isView={isView}
                      onShare={handleShare}
                    />
                  </div>
                </div>

                {isNamPhongOrg && (
                  <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 text-xs">
                    <p>
                      <span className="font-semibold text-gray-700">{t("order.nam_phong.bill_no_colon")}</span>
                      <span className="text-gray-500">{billNo || t("common.empty")}</span>
                    </p>
                    <p>
                      <span className="font-semibold text-gray-700">{t("order.nam_phong.cont_no_colon")}</span>
                      <span className="text-gray-500">{contNo || t("common.empty")}</span>
                    </p>
                  </div>
                )}

                <p className="mt-1">
                  <Authorization
                    resource="customer"
                    action="detail"
                    fallbackComponent={
                      <span className="text-sm font-medium leading-6 text-gray-900">{order.customer?.name}</span>
                    }
                  >
                    <Link
                      useDefaultStyle
                      color="secondary"
                      underline
                      href={`${orgLink}/customers/${encryptId(order.customer?.id)}`}
                    >
                      {order.customer?.name}
                    </Link>
                  </Authorization>
                  <span className="text-sm text-gray-500">
                    {t.rich("order.grid_item.order_information", {
                      separator: () =>
                        order.customer?.name && order.orderDate
                          ? t("order.grid_item.order_date")
                          : t("order.grid_item.order_date_no_customer"),
                      date: () => (
                        <span className="text-sm text-gray-700">
                          <DateTimeLabel type={organizationOrderRelatedDateFormat} value={order.orderDate} />
                        </span>
                      ),
                      route: () =>
                        order.route && order.route.type === RouteType.FIXED ? (
                          <>
                            <span className="text-sm text-gray-500">{t("order.grid_item.route")}</span>
                            <span className="rounded-xl bg-slate-200 px-1.5 py-0.5 text-sm text-gray-700">
                              {order.route.code}
                            </span>
                            <span className="text-sm text-gray-600"> {order.route.name}</span>
                          </>
                        ) : null,
                    })}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200">
            <nav aria-label="Progress" className="px-4 py-4 sm:px-6">
              <ol role="list" className="flex items-center">
                {orderSteps.map((item, index) => (
                  <li
                    key={item.value}
                    className={clsx("relative", {
                      "flex-1": index < orderSteps.length - 1,
                    })}
                  >
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div
                        className={clsx("h-0.5 w-full", {
                          "bg-blue-700": currentStatus !== OrderStatusType.NEW && !isCanceled,
                          "bg-gray-200": !stepCompleted(index) || isCanceled,
                        })}
                      />
                    </div>
                    <div
                      className={clsx("relative flex h-5 w-5 items-center justify-center rounded-full", {
                        "border-2 border-gray-300 bg-white":
                          (item.value !== currentStatus && !stepCompleted(index)) ||
                          (item.value === currentStatus && isCanceled),
                        "border-2 border-blue-700 bg-white":
                          item.value === currentStatus && currentStatus !== OrderStatusType.COMPLETED && !isCanceled,
                        "bg-gray-300":
                          (stepCompleted(index) || currentStatus === OrderStatusType.COMPLETED) && isCanceled,
                        "bg-blue-700":
                          (stepCompleted(index) || currentStatus === OrderStatusType.COMPLETED) && !isCanceled,
                      })}
                    >
                      {stepCompleted(index) || currentStatus === OrderStatusType.COMPLETED ? (
                        <CheckIcon className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                      ) : (
                        <span
                          className={clsx("h-2.5 w-2.5 rounded-full", {
                            "bg-gray-300":
                              (item.value === OrderStatusType.NEW && isDraft) ||
                              (item.value === currentStatus && isCanceled),
                            "bg-blue-700": item.value === currentStatus && !isCanceled,
                          })}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </nav>

            <div className="flex items-center justify-between gap-x-4 px-4 pb-4 sm:px-6">
              <p className="flex min-w-0 flex-1 items-center">
                {isDraft ? (
                  <Badge color="secondary" label={t("order.status.draft")} />
                ) : (
                  <Badge
                    color={isCanceled ? "error" : currentStep?.color}
                    label={isCanceled ? t("order.status.canceled") : t(currentStep?.label)}
                  />
                )}
              </p>

              <div className="flex -space-x-1">
                <AvatarGroup useTooltip orderParticipants={order.participants} />
              </div>
            </div>
          </div>
        </Popover.Button>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-200"
          enterFrom="opacity-0 translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 translate-y-1"
          beforeEnter={handleShowDetail}
          beforeLeave={handleHideDetail}
        >
          <Popover.Panel className="absolute top-full z-20 w-full">
            <div className="mb-6 max-h-96 overflow-auto rounded-b-lg bg-white shadow-md ring-1 ring-gray-300">
              <ul role="list" className="flex flex-col divide-y divide-gray-100 py-2">
                {/* Pickup point */}
                {isLoading && <SkeletonOrderGridItem />}
                {relatedOrderInfo?.route?.pickupPoints && relatedOrderInfo?.route?.pickupPoints.length > 0 && (
                  <li className="flex flex-row px-4 py-2 hover:bg-gray-50 sm:px-6">
                    <BiArrowFromLeftIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div className="ml-3 flex-1 text-sm">
                      <p className="font-medium text-gray-900">
                        {mergeDeliveryAndPickup
                          ? t("order.grid_item.pickup_delivery_point")
                          : t("order.grid_item.pick_point")}
                      </p>
                      <div className="mt-1 flex flex-col space-y-1 divide-y divide-gray-100">
                        {relatedOrderInfo.route.pickupPoints.map((pickup) => (
                          <div key={pickup.id}>
                            <span>
                              - {pickup.contactName}
                              {pickup.contactName && pickup.contactPhoneNumber && ", "}
                              <Link
                                useDefaultStyle
                                href={`tel:${pickup.contactPhoneNumber}`}
                                underline
                                className="!font-normal !text-gray-500"
                              >
                                {pickup.contactPhoneNumber}
                              </Link>
                            </span>
                            {(pickup.contactName || pickup.contactPhoneNumber) &&
                              getDetailRoutePointAddress(pickup) &&
                              ". "}
                            <span className="text-left text-gray-500">{getDetailRoutePointAddress(pickup)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                )}

                {/* Delivery point */}
                {!mergeDeliveryAndPickup && (
                  <>
                    {isLoading && <SkeletonOrderGridItem />}
                    {relatedOrderInfo?.route?.deliveryPoints && relatedOrderInfo?.route?.deliveryPoints.length > 0 && (
                      <li className="flex flex-row px-4 py-2 hover:bg-gray-50 sm:px-6">
                        <BiArrowToRightIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                        <div className="ml-3 flex-1 text-sm">
                          <p className="font-medium text-gray-900">{t("order.grid_item.delivery_point")}</p>
                          <div className="mt-1 flex flex-col space-y-1 divide-y divide-gray-100">
                            {relatedOrderInfo.route.deliveryPoints.map((delivery) => (
                              <div key={delivery.id}>
                                <span>
                                  - {delivery.contactName}
                                  {delivery.contactName && delivery.contactPhoneNumber && ", "}
                                  <Link
                                    useDefaultStyle
                                    href={`tel:${delivery.contactPhoneNumber}`}
                                    underline
                                    className="!font-normal !text-gray-500"
                                  >
                                    {delivery.contactPhoneNumber}
                                  </Link>
                                </span>
                                {(delivery.contactName || delivery.contactPhoneNumber) &&
                                  getDetailAddress(delivery.address) &&
                                  ". "}
                                <span className="text-left text-gray-500">{getDetailAddress(delivery.address)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </li>
                    )}
                  </>
                )}

                {/* Trips */}
                {isLoading && <SkeletonOrderGridItem count={0} />}
                {!isLoading && (
                  <li className="flex flex-row px-4 py-2 hover:bg-gray-50 sm:px-6">
                    <TruckIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    <Disclosure as="div" className="ml-3 flex-1 text-sm">
                      {({ open }) => (
                        <>
                          <Disclosure.Button className="flex w-full items-center justify-between font-medium text-gray-900">
                            <span className="font-medium text-gray-900">
                              {isEmpty(relatedOrderInfo?.trips) || relatedOrderInfo?.trips.length === 0 ? (
                                <span className="text-gray-500">{t("order.grid_item.not_dispatched")}</span>
                              ) : (
                                <NumberLabel value={weight} unit={relatedOrderInfo?.unit?.code} />
                              )}
                            </span>
                            {!isDraft &&
                              ((canFindOrderTrip() && canDetail()) ||
                                isEdit ||
                                (!isEmpty(relatedOrderInfo?.trips) && (relatedOrderInfo?.trips ?? []).length > 0)) && (
                                <span className="flex items-center">
                                  {open ? (
                                    <MinusIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                  ) : (
                                    <PlusIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                  )}
                                </span>
                              )}
                          </Disclosure.Button>
                          <Disclosure.Panel
                            as="div"
                            className={clsx("flex flex-col space-y-1 divide-y divide-gray-100", {
                              "mt-1": !isDraft,
                            })}
                          >
                            {!isDraft &&
                            !isCanceled &&
                            ((canFindOrderTrip() && canDetail()) || isEdit) &&
                            (isEmpty(relatedOrderInfo?.trips) || relatedOrderInfo?.trips.length === 0) ? (
                              <div className="flex justify-end">
                                <Button
                                  as={Link}
                                  href={`${orgLink}/orders/${order.code}?tab=dispatch-vehicle`}
                                  type="button"
                                  className="!h-7 !px-2"
                                >
                                  {t("order.grid_item.dispatch")}
                                </Button>
                              </div>
                            ) : (
                              <>
                                {relatedOrderInfo?.trips?.map((trip) => (
                                  <div key={trip.id}>
                                    <p className="flex flex-row items-center justify-between space-y-1 font-medium text-gray-900">
                                      <Authorization
                                        resource="vehicle"
                                        action="detail"
                                        fallbackComponent={<span>{trip.vehicle?.vehicleNumber}</span>}
                                      >
                                        <Link
                                          useDefaultStyle
                                          color="secondary"
                                          underline
                                          href={`${orgLink}/vehicles/${encryptId(trip.vehicle?.id)}`}
                                        >
                                          {trip.vehicle?.vehicleNumber}
                                        </Link>
                                      </Authorization>
                                      {getCurrentTripType(trip)}
                                    </p>
                                    <p className="mt-1 text-gray-500">
                                      {getFullName(trip.driver?.firstName, trip.driver?.lastName)}
                                      {getFullName(trip.driver?.firstName, trip.driver?.lastName) &&
                                        trip.driver?.phoneNumber &&
                                        ", "}
                                      <Link
                                        useDefaultStyle
                                        color="secondary"
                                        underline
                                        href={`tel:${trip.driver?.phoneNumber}`}
                                        className="!font-normal !text-gray-500"
                                      >
                                        {trip.driver?.phoneNumber}
                                      </Link>
                                    </p>
                                    {trip.notes && <p className="mt-1 text-gray-500">{trip.notes}</p>}
                                  </div>
                                ))}
                              </>
                            )}
                          </Disclosure.Panel>
                        </>
                      )}
                    </Disclosure>
                  </li>
                )}

                {/* Note */}
                {isLoading && <SkeletonOrderGridItem count={2} />}
                {relatedOrderInfo?.notes && (
                  <li className="flex flex-row px-4 py-2 hover:bg-gray-50 sm:px-6">
                    <ChatBubbleBottomCenterTextIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div className="ml-3 text-sm">
                      <p className="font-medium text-gray-900">{relatedOrderInfo.notes}</p>
                    </div>
                  </li>
                )}

                {/* Creation Info */}
                {isLoading && <SkeletonOrderGridItem count={1} />}
                {!isLoading && relatedOrderInfo?.createdByUser && (
                  <li className="flex flex-row px-4 py-2 hover:bg-gray-50 sm:px-6">
                    <InformationCircleIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    <div className="ml-3 text-sm">
                      <p className="text-gray-500">
                        {t.rich("order.grid_item.create_information", {
                          link: () => (
                            <span
                              className="text-sm font-medium leading-6 text-gray-900 hover:text-gray-800 hover:underline"
                              // href={`${orgLink}/profile/${encryptId(order.createdByUser.id)}`}
                            >
                              {getFullName(
                                relatedOrderInfo.createdByUser?.detail?.firstName,
                                relatedOrderInfo.createdByUser?.detail?.lastName
                              )}
                            </span>
                          ),
                          strong: () => (
                            <span className="text-gray-900">
                              <DateTimeLabel type="datetime" value={relatedOrderInfo?.createdAt} />
                            </span>
                          ),
                        })}
                      </p>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </Popover.Panel>
        </Transition>
      </Popover>

      {/* Order share modal */}
      <OrderShareModal
        order={order}
        open={isShareConfirmOpen}
        onClose={handleCloseShareOrder}
        onCancel={handleCloseShareOrder}
      />
    </>
  );
};

export default OrderGridItem;
