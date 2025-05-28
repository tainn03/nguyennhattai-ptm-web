"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon, ExclamationTriangleIcon, UsersIcon } from "@heroicons/react/24/outline";
import { OrderParticipantRole, OrderStatusType, RouteType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { PiPackage as PiPackageIcon } from "react-icons/pi";

import {
  Badge,
  DateTimeLabel,
  DescriptionProperty2,
  InfoBox,
  Link,
  NumberLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import {
  Authorization,
  Avatar,
  AvatarGroup,
  Button,
  CopyToClipboard,
  OrderMenu,
  ProfileInfo,
} from "@/components/molecules";
import { orderSteps, tripSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import { OrderShareModal } from "@/components/organisms";
import {
  NAM_PHONG_BILL_NO_FIELD_ID,
  NAM_PHONG_CONT_NO_FIELD_ID,
  NAM_PHONG_ORGANIZATION_ID,
} from "@/constants/organization";
import { useOrgSettingExtendedStorage, usePermission, useRelatedOrderInfo } from "@/hooks";
import { AnyObject } from "@/types";
import { OrderInfo, OrderStatusInfo, OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { getAccountInfo, getFullName } from "@/utils/auth";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { getGeneralDispatchVehicleInfo } from "@/utils/order";
import { encryptId } from "@/utils/security";
import { ensureString, getDetailAddress, getDetailRoutePointAddress } from "@/utils/string";

const styleTableCell = "text-sm text-gray-500 whitespace-nowrap";

export type OrderListItemProps = Pick<OrgPageProps, "orgId" | "orgLink" | "userId"> & {
  order: OrderInfo;
  onCanceled?: (order: OrderInfo) => void;
  onDeleted?: (order: OrderInfo) => void;
  actionPlacement?: "start" | "center" | "end";
};

const OrderListItem = ({
  orgLink,
  orgId,
  order,
  onDeleted,
  onCanceled,
  actionPlacement,
  userId,
}: OrderListItemProps) => {
  const t = useTranslations();
  const [showDetail, setShowDetail] = useState(false);
  const { organizationOrderRelatedDateFormat, mergeDeliveryAndPickup } = useOrgSettingExtendedStorage();
  const { canDetail } = usePermission("order");
  const { canFind: canFindOrderTrip } = usePermission("order-trip");
  const { canDetail: canDetailCustomer } = usePermission("customer");
  const [isShareConfirmOpen, setIsShareConfirmOpen] = useState(false);

  const { relatedOrderInfo, isLoading } = useRelatedOrderInfo({
    organizationId: orgId,
    code: order.code,
    mode: "list",
    isFetch: showDetail,
  });

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

  const currentStatusType = useMemo(() => {
    if (order.isDraft || order.statuses?.length === 0) {
      return null;
    }

    const latestStatus = order.statuses.reduce((prev, current) => {
      return (prev as OrderStatusInfo).createdAt > (current as OrderStatusInfo).createdAt ? prev : current;
    });

    return latestStatus?.type;
  }, [order.isDraft, order.statuses]);

  const { totalTripWeight, weight } = useMemo(() => getGeneralDispatchVehicleInfo(order), [order]);

  const getCurrentTripType = useCallback((trip: Partial<OrderTripInfo>) => {
    const latestStatus = trip.statuses?.reduce((prev, current) => {
      return (prev as OrderTripStatusInfo).createdAt > (current as OrderTripStatusInfo).createdAt ? prev : current;
    });

    return (
      <Badge
        color={tripSteps.find(({ value: item }) => item === latestStatus?.type)?.color || "info"}
        label={ensureString(latestStatus?.driverReport?.name)}
      />
    );
  }, []);

  const getCurrentStatus = useCallback(() => {
    const index = orderSteps.findIndex((item) => item.value === currentStatusType);
    if (index >= 0) {
      return orderSteps[index];
    }
    return null;
  }, [currentStatusType]);

  const currentStatus = useMemo(() => {
    return getCurrentStatus();
  }, [getCurrentStatus]);

  const isCanceled = useMemo(() => currentStatusType === OrderStatusType.CANCELED, [currentStatusType]);

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
    <Disclosure as={Fragment}>
      {({ open }) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          setShowDetail(open);
        }, [open]);

        return (
          <>
            <TableRow hover={!open}>
              {/* Expanded/Collapsed */}
              <Disclosure.Button
                as="td"
                className={clsx("relative w-10 min-w-[40px] pl-4 pr-3", {
                  "bg-blue-50": open,
                })}
              >
                {open ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                )}
              </Disclosure.Button>

              {/* Code */}
              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-50": open,
                })}
              >
                <Authorization
                  resource="order"
                  action="detail"
                  alwaysAuthorized={canDetail() || isEdit || isView}
                  fallbackComponent={<span className="!font-semibold">{order.code}</span>}
                >
                  <Link useDefaultStyle href={`${orgLink}/orders/${order.code}`} className="!font-semibold">
                    {order.code}
                  </Link>
                </Authorization>
                <CopyToClipboard value={order.code} />
                {totalTripWeight > weight && (
                  <ExclamationTriangleIcon
                    data-tooltip-id="tooltip"
                    data-tooltip-html={t("order.order_detail.warning_exceed_payload_tooltip")}
                    className="relative mb-[6px] ml-6 inline-flex h-5 w-5 text-yellow-500"
                    aria-hidden="true"
                  />
                )}
              </Disclosure.Button>

              {isNamPhongOrg && (
                <Disclosure.Button
                  as="td"
                  className={clsx(styleTableCell, {
                    "bg-blue-50": open,
                  })}
                >
                  {billNo || t("common.empty")}
                </Disclosure.Button>
              )}

              {isNamPhongOrg && (
                <Disclosure.Button
                  as="td"
                  className={clsx(styleTableCell, {
                    "bg-blue-50": open,
                  })}
                >
                  {contNo || t("common.empty")}
                </Disclosure.Button>
              )}

              {/* Customer */}
              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-50": open,
                })}
              >
                <Authorization
                  resource="customer"
                  action="detail"
                  alwaysAuthorized={canDetailCustomer()}
                  fallbackComponent={<span className="!font-semibold">{order.code}</span>}
                >
                  <Link
                    useDefaultStyle
                    color="secondary"
                    href={`${orgLink}/customers/${encryptId(order.customer?.id)}`}
                    emptyLabel={t("common.empty")}
                  >
                    {order.customer?.name}
                  </Link>
                </Authorization>
              </Disclosure.Button>

              {/* Customer > Phone number */}
              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, "hidden md:table-cell", {
                  "bg-blue-50": open,
                })}
              >
                <Link
                  useDefaultStyle
                  href={`tel:${order.customer?.phoneNumber}`}
                  color="secondary"
                  className="!font-normal !text-gray-500 hover:underline"
                  emptyLabel={t("common.empty")}
                >
                  {order.customer?.phoneNumber}
                </Link>
              </Disclosure.Button>

              {/* Order Date */}
              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-50": open,
                })}
              >
                <DateTimeLabel
                  value={order.orderDate}
                  type={organizationOrderRelatedDateFormat}
                  emptyLabel={t("common.empty")}
                />
              </Disclosure.Button>

              {/* Unit Price */}
              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-50": open,
                })}
              >
                <NumberLabel type="currency" value={Number(order?.totalAmount)} emptyLabel={t("common.empty")} />
              </Disclosure.Button>

              {/* Status */}
              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-50": open,
                })}
              >
                <p className="flex min-w-0 flex-1 items-center">
                  {order.isDraft ? (
                    <Badge color="secondary" label={t("order.status.draft")} />
                  ) : (
                    (currentStatus || isCanceled) && (
                      <Badge
                        color={isCanceled ? "error" : currentStatus?.color}
                        label={isCanceled ? t("order.status.canceled") : t(currentStatus?.label)}
                      />
                    )
                  )}
                </p>
              </Disclosure.Button>

              {/* Participant */}
              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-50": open,
                  // "hidden xl:table-cell": !isNamPhongOrg,
                  "table-cell": !isNamPhongOrg,
                  hidden: isNamPhongOrg,
                })}
              >
                <div className="flex -space-x-1 ">
                  <AvatarGroup useTooltip orderParticipants={order.participants} />
                </div>
              </Disclosure.Button>

              {/* Created By */}
              <Disclosure.Button
                as="td"
                className={clsx(styleTableCell, {
                  "bg-blue-50": open,
                  // "hidden 2xl:table-cell": !isNamPhongOrg,
                  "table-cell": !isNamPhongOrg,
                  hidden: isNamPhongOrg,
                })}
              >
                <ProfileInfo
                  user={order.createdByUser}
                  description={<DateTimeLabel value={order.createdAt} type="datetime" />}
                />
              </Disclosure.Button>

              {/* Menu */}
              <TableCell
                action
                className={clsx({
                  "bg-blue-50": open,
                })}
              >
                <OrderMenu
                  actionPlacement={actionPlacement}
                  order={order}
                  onCanceled={onCanceled}
                  onDeleted={onDeleted}
                  isEdit={isEdit}
                  isView={isView}
                  onShare={handleShare}
                />

                {/* Order share modal */}
                <OrderShareModal
                  order={order}
                  open={isShareConfirmOpen}
                  onClose={handleCloseShareOrder}
                  onCancel={handleCloseShareOrder}
                />
              </TableCell>
            </TableRow>

            <Disclosure.Panel as="tr">
              <TableCell colSpan={10}>
                <ul role="list" className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-7 xl:gap-x-8">
                  {/* Customer Info */}
                  <li className="group overflow-hidden rounded-lg p-4 hover:bg-gray-50 lg:col-span-2">
                    <div className="relative flex items-center gap-x-6">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                        <UsersIcon className="h-6 w-6 text-gray-600 group-hover:text-blue-700" aria-hidden="true" />
                      </div>
                      <div className="font-semibold text-gray-900">{t("order.list_item.customer_info")}</div>
                    </div>
                    <div className="mt-1">
                      <dl className="space-y-1 divide-y divide-gray-100">
                        <DescriptionProperty2
                          loading={isLoading}
                          size="medium"
                          className="pt-2"
                          label={t("order.list_item.customer")}
                          multiline
                        >
                          <Authorization
                            resource="customer"
                            action="detail"
                            alwaysAuthorized={canDetailCustomer()}
                            fallbackComponent={<span className="!font-semibold">{order.customer?.name}</span>}
                          >
                            <Link
                              useDefaultStyle
                              href={`${orgLink}/customers/${encryptId(order.customer?.id)}`}
                              className="text-sm font-medium text-gray-900"
                              emptyLabel={t("common.empty")}
                            >
                              {order.customer?.name}
                            </Link>
                          </Authorization>
                        </DescriptionProperty2>

                        <DescriptionProperty2
                          loading={isLoading}
                          size="short"
                          className="block pt-2 md:hidden"
                          label={t("order.list_item.phone_number")}
                        >
                          <Link
                            useDefaultStyle
                            href={`tel:${order.customer?.phoneNumber}`}
                            color="secondary"
                            underline
                            className="!font-normal !text-gray-500"
                            emptyLabel={t("common.empty")}
                          >
                            {order.customer?.phoneNumber}
                          </Link>
                        </DescriptionProperty2>

                        <DescriptionProperty2
                          loading={isLoading}
                          size="long"
                          className="pt-2"
                          label={t("order.list_item.address")}
                        >
                          {relatedOrderInfo?.customer?.businessAddress}
                        </DescriptionProperty2>
                      </dl>
                    </div>
                  </li>

                  {/* Order Info */}
                  <li className="group overflow-hidden rounded-lg p-4 hover:bg-gray-50 lg:col-span-2">
                    <div className="relative flex items-center gap-x-6">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                        <PiPackageIcon className="h-6 w-6 text-gray-600 group-hover:text-blue-700" aria-hidden="true" />
                      </div>
                      <div className="font-semibold text-gray-900">{t("order.list_item.order_info")}</div>
                    </div>
                    <div className="pt-2">
                      <dl className="space-y-1 divide-y divide-gray-100">
                        {/* Unit of measure */}
                        <DescriptionProperty2
                          loading={isLoading}
                          size="short"
                          className="pt-2"
                          label={t("order.list_item.unit_of_measure")}
                        >
                          {relatedOrderInfo?.unit?.code}
                        </DescriptionProperty2>

                        {/* Merchandise Types */}
                        <DescriptionProperty2
                          loading={isLoading}
                          size="long"
                          className="pt-2"
                          label={t("order.list_item.merchandise_type")}
                        >
                          {relatedOrderInfo?.merchandiseTypes?.map((item) => item.name).join(", ") || t("common.empty")}
                        </DescriptionProperty2>

                        {/* Route */}
                        <DescriptionProperty2
                          loading={isLoading}
                          multiline
                          className="pt-2"
                          label={t("order.list_item.route")}
                        >
                          {relatedOrderInfo?.route?.type === RouteType.FIXED && (
                            <>
                              {relatedOrderInfo?.route?.code}
                              {relatedOrderInfo?.route?.name && ` (${relatedOrderInfo?.route.name})`}
                            </>
                          )}
                          {relatedOrderInfo?.route?.pickupPoints &&
                            (relatedOrderInfo?.route?.pickupPoints || []).length > 0 && (
                              <>
                                <dt className="whitespace-nowrap text-sm font-medium leading-6 text-gray-900">
                                  {mergeDeliveryAndPickup
                                    ? t("order.list_item.pickup_delivery_point")
                                    : t("order.list_item.pickup_point")}
                                  :
                                </dt>
                                <div className="flex flex-col gap-1 divide-y divide-gray-100">
                                  {relatedOrderInfo.route.pickupPoints.map((item) => (
                                    <dd key={item.id} className="flex flex-row flex-wrap items-start gap-1 pt-1">
                                      <span>
                                        - {item.contactName}
                                        {item.contactName && item.contactPhoneNumber && ", "}
                                        <Link
                                          useDefaultStyle
                                          href={`tel:${item.contactPhoneNumber}`}
                                          color="secondary"
                                          className="!font-normal !text-gray-500 hover:underline"
                                        >
                                          {item.contactPhoneNumber}
                                        </Link>
                                        {(item.contactName || item.contactPhoneNumber) &&
                                          getDetailRoutePointAddress(item) &&
                                          ". "}
                                      </span>
                                      <span className="max-w-[90%] whitespace-break-spaces break-words text-left !text-gray-500">
                                        {getDetailRoutePointAddress(item)}
                                      </span>
                                    </dd>
                                  ))}
                                </div>
                              </>
                            )}
                          {!mergeDeliveryAndPickup &&
                            relatedOrderInfo?.route?.deliveryPoints &&
                            (relatedOrderInfo.route.deliveryPoints || []).length > 0 && (
                              <>
                                <dt className="whitespace-nowrap text-sm font-medium leading-6 text-gray-900">
                                  {t("order.list_item.delivery_point")}:
                                </dt>
                                <div className="flex flex-col gap-1 divide-y divide-gray-100">
                                  {relatedOrderInfo.route.deliveryPoints.map((item) => (
                                    <dd key={item.id} className="flex flex-row flex-wrap items-start gap-1 pt-1">
                                      <span>
                                        - {item.contactName}
                                        {item.contactName && item.contactPhoneNumber && ", "}
                                        <Link
                                          useDefaultStyle
                                          href={`tel:${item.contactPhoneNumber}`}
                                          color="secondary"
                                          className="!font-normal !text-gray-500 hover:underline"
                                        >
                                          {item.contactPhoneNumber}
                                        </Link>
                                        {(item.contactName || item.contactPhoneNumber) &&
                                          getDetailAddress(item.address) &&
                                          ". "}
                                      </span>
                                      <span className="max-w-[90%] whitespace-break-spaces break-words text-left !text-gray-500">
                                        {getDetailAddress(item.address)}
                                      </span>
                                    </dd>
                                  ))}
                                </div>
                              </>
                            )}
                        </DescriptionProperty2>

                        {/* Notes */}
                        <DescriptionProperty2
                          loading={isLoading}
                          multiline
                          className="pt-2"
                          label={t("order.list_item.note")}
                        >
                          {relatedOrderInfo?.notes}
                        </DescriptionProperty2>

                        {/* Created By */}
                        <DescriptionProperty2
                          loading={isLoading}
                          type="profile"
                          className="block items-center pt-2 2xl:hidden"
                          label={t("common.new")}
                        >
                          <ProfileInfo
                            user={order.createdByUser}
                            description={<DateTimeLabel value={order.createdAt} type="datetime" />}
                          />
                        </DescriptionProperty2>
                      </dl>
                    </div>
                  </li>

                  {/* Operator Info */}
                  <li className="group overflow-hidden rounded-lg p-4 hover:bg-gray-50 lg:col-span-3">
                    <div className="relative flex items-center gap-x-6">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                        <UsersIcon className="h-6 w-6 text-gray-600 group-hover:text-blue-700" aria-hidden="true" />
                      </div>
                      <div className="font-semibold text-gray-900">{t("order.list_item.dispatch_info")}</div>
                    </div>
                    <div className="mt-1">
                      <dl className="divide-y divide-gray-100 xl:divide-y-0">
                        <DescriptionProperty2
                          loading={isLoading}
                          type="profile"
                          className={clsx("block pt-2", {
                            "xl:hidden": !isNamPhongOrg,
                          })}
                          label={t("order.list_item.dispatcher")}
                        >
                          {relatedOrderInfo?.participants?.map((orderParticipant) => (
                            <>
                              <Avatar
                                size="small"
                                avatarURL={getAccountInfo(orderParticipant?.user).avatar}
                                displayName={getAccountInfo(orderParticipant?.user).displayName}
                              />
                            </>
                          ))}
                        </DescriptionProperty2>

                        {!isLoading && (relatedOrderInfo?.trips || []).length === 0 && (
                          <div className="py-2">
                            <div className="text-center">
                              <p className="mt-1 text-sm font-medium text-gray-500">
                                {t("order.list_item.dispatch_empty")}
                              </p>
                              <div className="mt-3">
                                {!order.isDraft &&
                                  currentStatus?.value !== OrderStatusType.CANCELED &&
                                  (canDetail() || isEdit) &&
                                  canFindOrderTrip() && (
                                    <Button as={Link} href={`${orgLink}/orders/${order.code}?tab=dispatch-vehicle`}>
                                      {t("order.list_item.dispatch")}
                                    </Button>
                                  )}
                              </div>
                            </div>
                          </div>
                        )}
                        {!isLoading && (relatedOrderInfo?.trips || []).length > 0 && (
                          <div className="py-2">
                            <div className="flex flex-wrap gap-x-2 gap-y-1">
                              <dt className="whitespace-nowrap text-sm font-medium leading-6 text-gray-900">
                                {t("order.list_item.dispatch_detail.total_trip")}:
                              </dt>
                              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:mt-0">
                                {relatedOrderInfo?.trips.length} {t("order.list_item.dispatch_detail.trip_unit")}
                              </dd>
                            </div>
                            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                                <TableContainer
                                  variant="paper"
                                  inside
                                  horizontalScroll
                                  verticalScroll
                                  autoHeight
                                  className="mt-3"
                                >
                                  <Table dense>
                                    <TableHead uppercase>
                                      <TableRow>
                                        <TableCell action>
                                          <span className="sr-only">No.</span>
                                        </TableCell>
                                        <TableCell>{t("order.list_item.dispatch_detail.vehicle")}</TableCell>
                                        <TableCell>{t("order.list_item.dispatch_detail.driver")}</TableCell>
                                        <TableCell>{t("order.list_item.dispatch_detail.status")}</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {relatedOrderInfo?.trips.map((trip, tripIdx) => (
                                        <tr key={tripIdx}>
                                          <TableCell>{tripIdx + 1}</TableCell>
                                          <TableCell>
                                            <InfoBox
                                              label={trip.vehicle?.vehicleNumber}
                                              subLabel={trip.vehicle?.idNumber}
                                              emptyLabel={t("common.empty")}
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <Authorization
                                              resource="driver"
                                              action="detail"
                                              fallbackComponent={
                                                <div className="flex flex-col text-left">
                                                  <p className="whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                                    {getFullName(trip.driver?.firstName, trip.driver?.lastName)}
                                                  </p>
                                                  {(trip.driver?.phoneNumber || trip.driver?.email) && (
                                                    <div className="whitespace-nowrap text-xs font-medium text-gray-500 group-hover:text-gray-700">
                                                      {trip.driver?.phoneNumber || trip.driver?.email}
                                                    </div>
                                                  )}
                                                </div>
                                              }
                                            >
                                              <Link
                                                useDefaultStyle
                                                color="secondary"
                                                target="_blank"
                                                href={`${orgLink}/drivers/${encryptId(trip.driver?.id)}`}
                                                className="group inline-flex min-w-max"
                                              >
                                                <div className="flex flex-col text-left">
                                                  <p className="whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                                    {getFullName(trip.driver?.firstName, trip.driver?.lastName)}
                                                  </p>
                                                  {(trip.driver?.phoneNumber || trip.driver?.email) && (
                                                    <div className="whitespace-nowrap text-xs font-medium text-gray-500 group-hover:text-gray-700">
                                                      {trip.driver?.phoneNumber || trip.driver?.email}
                                                    </div>
                                                  )}
                                                </div>
                                              </Link>
                                            </Authorization>
                                          </TableCell>
                                          <TableCell nowrap>{getCurrentTripType(trip)}</TableCell>
                                        </tr>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </div>
                            </div>
                          </div>
                        )}
                      </dl>
                    </div>
                  </li>
                </ul>
              </TableCell>
            </Disclosure.Panel>
          </>
        );
      }}
    </Disclosure>
  );
};

export default OrderListItem;
