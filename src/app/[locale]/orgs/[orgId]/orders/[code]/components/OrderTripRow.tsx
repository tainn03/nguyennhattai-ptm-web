import { Disclosure } from "@headlessui/react";
import {
  BanknotesIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentTextIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { OrderTripStatusType, RouteType, VehicleOwnerType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useMemo } from "react";
import { FiInfo as FiInfoIcon } from "react-icons/fi";
import { LiaShippingFastSolid as LiaShippingFastSolidIcon } from "react-icons/lia";

import {
  Badge,
  Checkbox,
  DateTimeLabel,
  DescriptionImage,
  DescriptionProperty2,
  InfoBox,
  Link,
  NumberLabel,
  TableCell,
  TableRow,
} from "@/components/atoms";
import { Authorization, CopyToClipboard, ProfileInfo } from "@/components/molecules";
import { tripSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import { OrganizationSettingExtendedKey, TripStatusUpdateType } from "@/constants/organizationSettingExtended";
import { SendNotificationItem } from "@/forms/orderTrip";
import { useAuth, useOrganizationSettingExtended, useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { useOrderState } from "@/redux/states";
import { CustomFieldInfo, OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { addDays } from "@/utils/date";
import { equalId } from "@/utils/number";
import { getGeneralDispatchVehicleInfo, getOrderStatusFlags, getOrderTripStatusFlags } from "@/utils/order";
import { encryptId } from "@/utils/security";
import { ensureString } from "@/utils/string";

import { OrderTripActionMenu } from ".";
import OrderTripDriverNotificationStatus from "./OrderTripDriverNotificationStatus";

const DATE_PLACEHOLDER = "--/--/----";
const styleTableCell = "text-sm text-gray-500 whitespace-nowrap";

type OrderTripRowProps = {
  value: Partial<OrderTripInfo>;
  customFields: CustomFieldInfo[];
  actionPlacement?: "end" | "start" | "center";
  selected?: boolean;
  isEditor: boolean;
  onEdit?: (orderTrip?: Partial<OrderTripInfo>) => void;
  onUpdateStatus: (orderTrip: Partial<OrderTripInfo>, currentStatus: Partial<OrderTripStatusInfo>) => void;
  onUpdateBillOfLading?: (orderTrip: Partial<OrderTripInfo>, currentStatus: Partial<OrderTripStatusInfo>) => void;
  onDelete?: (orderTrip?: Partial<OrderTripInfo>) => void;
  onOpenMessage?: (id: number) => void;
  onSelected: (data: SendNotificationItem) => void;
  onOpenSalary?: (orderTrip?: Partial<OrderTripInfo>) => void;
  onOpenTripDriverExpense?: (orderTrip?: Partial<OrderTripInfo>) => void;
  onUpdateSchedule?: (data: SendNotificationItem) => void;
  onDeleteSchedule?: (data: SendNotificationItem) => void;
  onShare?: (orderTrip: Partial<OrderTripInfo>) => void;
  onOpenCustomFieldDisplay?: (orderTrip?: Partial<OrderTripInfo>) => void;
};

const OrderTripRow = ({
  value,
  customFields,
  actionPlacement,
  selected,
  isEditor,
  onEdit,
  onUpdateStatus,
  onUpdateBillOfLading,
  onDelete,
  onOpenMessage,
  onSelected,
  onOpenSalary,
  onUpdateSchedule,
  onDeleteSchedule,
  onOpenTripDriverExpense,
  onShare,
  onOpenCustomFieldDisplay,
}: OrderTripRowProps) => {
  const t = useTranslations();
  const { orgId, userId, orgLink, org } = useAuth();
  const { order } = useOrderState();
  const { tripStatusUpdateType } = useOrgSettingExtendedStorage();

  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();
  const { canFind } = usePermission("order-trip-message");
  const { canDetail: canDetailDriver } = usePermission("driver");
  const { canDetail: canDetailDriverExpense } = usePermission("trip-driver-expense");
  const { canEditOwn } = usePermission("order-trip");

  const { isCanceled: isOrderCanceled } = useMemo(() => getOrderStatusFlags(order), [order]);

  const { currentStatus, isDelivered, isCompleted } = useMemo(() => getOrderTripStatusFlags(value), [value]);

  const { value: isAllowDeleteTripAfterDelivered, isLoading: isLoadingDelivered } =
    useOrganizationSettingExtended<boolean>({
      organizationId: orgId,
      key: OrganizationSettingExtendedKey.ALLOW_DELETE_TRIP_AFTER_DELIVERED,
    });

  const { value: isAllowDeleteTripAfterCompleted, isLoading: isLoadingCompleted } =
    useOrganizationSettingExtended<boolean>({
      organizationId: orgId,
      key: OrganizationSettingExtendedKey.ALLOW_DELETE_TRIP_AFTER_COMPLETED,
    });

  /**
   * This function is used to check if the message is unread.
   */
  const hasUnreadMessage = useMemo(() => {
    if (!value.messages || value.messages.length === 0 || !value.messages[0].readByUsers) {
      return false;
    }
    const result = value.messages[0].readByUsers?.find((item) => equalId(item.id, userId));
    return !result;
  }, [userId, value.messages]);

  /**
   * This function is used to handle the action of editing the trip.
   */
  const handleEditTrip = useCallback(() => {
    !isOrderCanceled && onEdit && onEdit({ ...value });
  }, [isOrderCanceled, onEdit, value]);

  /**
   * This function is used to handle the action of updating the status.
   */
  const handleUpdateStatus = useCallback(() => {
    !isOrderCanceled && onUpdateStatus && currentStatus && onUpdateStatus(value, currentStatus);
  }, [currentStatus, isOrderCanceled, onUpdateStatus, value]);

  /**
   * This function is used to handle the action of opening the message.
   */
  const handleOpenMessage = useCallback(() => {
    onOpenMessage && onOpenMessage(Number(value?.id));
  }, [onOpenMessage, value.id]);

  /**
   * This function is used to handle the action of deleting the trip.
   */
  const handleDeleteTrip = useCallback(() => {
    !isOrderCanceled && onDelete && onDelete(value);
  }, [isOrderCanceled, onDelete, value]);

  const handleFormatSendNotificationItem = useCallback(
    () => ({
      id: Number(value.id),
      code: ensureString(value.code),
      weight: Number(value?.weight),
      driverFullName: getFullName(value.driver?.firstName, value.driver?.lastName),
      driverUserId: Number(value.driver?.user?.id),
      vehicleNumber: ensureString(value.vehicle?.vehicleNumber),
      phoneNumber: ensureString(value.driver?.phoneNumber),
      pickupDate: value?.pickupDate,
      lastStatusType: value?.lastStatusType,
      driverNotificationScheduledAt: value?.driverNotificationScheduledAt,
    }),
    [
      value.code,
      value.driver?.firstName,
      value.driver?.lastName,
      value.driver?.phoneNumber,
      value.driver?.user?.id,
      value?.driverNotificationScheduledAt,
      value.id,
      value?.lastStatusType,
      value?.pickupDate,
      value.vehicle?.vehicleNumber,
      value?.weight,
    ]
  );

  /**
   * This function is used to handle the action of selecting the checkbox.
   */
  const handleSelectCheckBox = useCallback(() => {
    value.id && onSelected(handleFormatSendNotificationItem());
  }, [value.id, onSelected, handleFormatSendNotificationItem]);

  /**
   * This function is used to handle the action of updating the bill of lading.
   */
  const handleUpdateBillOfLading = useCallback(() => {
    onUpdateBillOfLading && (isDelivered || isCompleted) && currentStatus && onUpdateBillOfLading(value, currentStatus);
  }, [currentStatus, isCompleted, isDelivered, onUpdateBillOfLading, value]);

  /**
   * This function is used to handle the action of opening the salary input.
   */
  const handleOpenInputSalary = useCallback(() => {
    !isOrderCanceled && onOpenSalary && onOpenSalary(value);
  }, [isOrderCanceled, onOpenSalary, value]);

  /**
   * This function is used to handle the action of opening the driver expense detail.
   */
  const handleOpenTripDriverExpense = useCallback(() => {
    onOpenTripDriverExpense && onOpenTripDriverExpense(value);
  }, [onOpenTripDriverExpense, value]);

  /**
   * Calculates the bill of lading reminder date based on trip information and organization settings.
   */
  const getBillOfLadingReminderDate = useCallback(() => {
    const minBOLSubmitDays = order?.route?.minBOLSubmitDays || org?.setting?.minBOLSubmitDays;
    if (isDelivered && order?.route?.type === RouteType.FIXED && value.statuses?.[0]?.createdAt && minBOLSubmitDays) {
      return addDays(value.statuses?.[0]?.createdAt, minBOLSubmitDays);
    }
    return null;
  }, [isDelivered, order?.route?.minBOLSubmitDays, order?.route?.type, org?.setting?.minBOLSubmitDays, value.statuses]);

  /**
   * Checks if the update status button is disabled.
   */
  const isDisabledUpdateStatus = useMemo(() => {
    if (tripStatusUpdateType === TripStatusUpdateType.TIMELINE) {
      return isCompleted;
    } else {
      return isDelivered || isCompleted;
    }
  }, [isCompleted, isDelivered, tripStatusUpdateType]);

  /**
   * This function is used to handle the action update schedule
   */
  const handleUpdateSchedule = useCallback(() => {
    onUpdateSchedule && onUpdateSchedule(handleFormatSendNotificationItem());
  }, [handleFormatSendNotificationItem, onUpdateSchedule]);

  /**
   * This function is used to handle the action delete schedule
   */
  const handleDeleteSchedule = useCallback(() => {
    onDeleteSchedule && onDeleteSchedule(handleFormatSendNotificationItem());
  }, [handleFormatSendNotificationItem, onDeleteSchedule]);

  /**
   * This function is used to handle the action of sharing the trip.
   */
  const handleShare = useCallback(() => {
    onShare && onShare(value);
  }, [onShare, value]);

  /**
   * This function is used to handle the action of opening the custom field display.
   */
  const handleCustomFieldDisplay = useCallback(() => {
    onOpenCustomFieldDisplay && onOpenCustomFieldDisplay(value);
  }, [onOpenCustomFieldDisplay, value]);

  return (
    <Disclosure key={value.id} as={Fragment}>
      {({ open }) => (
        <>
          <TableRow hover={!open}>
            <TableCell
              action
              className={clsx({
                "bg-blue-50": open,
              })}
            >
              {!isOrderCanceled && (
                <Authorization
                  resource="order-trip"
                  action="edit"
                  alwaysAuthorized={(canEditOwn() && equalId(value?.createdByUser?.id, userId)) || isEditor}
                  fallbackComponent={<Checkbox className="cursor-not-allowed pl-3" label="" disabled />}
                >
                  <Checkbox label="" checked={selected} onClick={handleSelectCheckBox} />
                </Authorization>
              )}
            </TableCell>
            <Disclosure.Button
              as="td"
              className={clsx("pr-5", styleTableCell, {
                "bg-blue-50": open,
              })}
            >
              <span className="flex items-baseline pr-4 font-semibold text-blue-700 hover:text-blue-600 2xl:pr-0">
                {value.code}
                <CopyToClipboard value={ensureString(value.code)} />
              </span>
            </Disclosure.Button>
            <Disclosure.Button
              as="td"
              className={clsx(styleTableCell, {
                "bg-blue-50": open,
              })}
            >
              <Authorization
                resource="vehicle"
                action="detail"
                fallbackComponent={
                  <InfoBox
                    label={value.vehicle?.vehicleNumber}
                    subLabel={value.vehicle?.idNumber || value.vehicle?.model}
                    className="text-left"
                  />
                }
              >
                <Link
                  useDefaultStyle
                  color="secondary"
                  target="_blank"
                  href={`${orgLink}/vehicles/${encryptId(value.vehicle?.id)}`}
                  className="group inline-flex min-w-max"
                >
                  <InfoBox
                    href={`${orgLink}/vehicles/${encryptId(value.vehicle?.id)}`}
                    label={value.vehicle?.vehicleNumber}
                    subLabel={value.vehicle?.idNumber || value.vehicle?.model}
                    className="text-left"
                  />
                </Link>
              </Authorization>
            </Disclosure.Button>
            <Disclosure.Button
              as="td"
              className={clsx(styleTableCell, {
                "bg-blue-50": open,
              })}
            >
              <Authorization
                resource="driver"
                action="detail"
                alwaysAuthorized={canDetailDriver()}
                fallbackComponent={
                  <InfoBox
                    label={getFullName(value.driver?.firstName, value.driver?.lastName)}
                    subLabel={value.driver?.phoneNumber || value.driver?.email}
                    emptyLabel={t("common.empty")}
                    className="min-w-max"
                  />
                }
              >
                <InfoBox
                  as={Link}
                  href={`${orgLink}/drivers/${encryptId(value.driver?.id)}`}
                  label={getFullName(value.driver?.firstName, value.driver?.lastName)}
                  subLabel={value.driver?.phoneNumber || value.driver?.email}
                  className="min-w-max"
                  emptyLabel={t("common.empty")}
                />
              </Authorization>
            </Disclosure.Button>
            <Disclosure.Button
              as="td"
              className={clsx(styleTableCell, {
                "bg-blue-50": open,
              })}
            >
              <OrderTripDriverNotificationStatus trip={value} />
            </Disclosure.Button>
            <Disclosure.Button
              as="td"
              className={clsx("hidden 2xl:table-cell", styleTableCell, {
                "bg-blue-50": open,
              })}
            >
              {value.vehicle?.ownerType === VehicleOwnerType.ORGANIZATION
                ? t("order.vehicle_dispatch.vehicle_dispatch_company")
                : t("order.vehicle_dispatch.vehicle_dispatch_subcontractor")}
            </Disclosure.Button>
            <Disclosure.Button
              as="td"
              className={clsx(styleTableCell, {
                "bg-blue-50": open,
              })}
            >
              <NumberLabel value={Number(value.weight)} unit={getGeneralDispatchVehicleInfo(order).unitCode} />
            </Disclosure.Button>
            <Disclosure.Button
              as="td"
              className={clsx({
                "bg-blue-50": open,
              })}
            >
              <Badge
                color={tripSteps.find(({ value: item }) => item === currentStatus?.type)?.color}
                label={ensureString(currentStatus?.driverReport?.name)}
              />
            </Disclosure.Button>
            <Disclosure.Button
              as="td"
              className={clsx("hidden xl:table-cell", styleTableCell, {
                "bg-blue-50": open,
              })}
            >
              <DateTimeLabel
                value={ensureString(value.pickupDate)}
                type={organizationOrderRelatedDateFormat}
                emptyLabel={DATE_PLACEHOLDER}
              />
              <br />
              <DateTimeLabel
                value={ensureString(value.deliveryDate)}
                type={organizationOrderRelatedDateFormat}
                emptyLabel={DATE_PLACEHOLDER}
              />
            </Disclosure.Button>
            <Disclosure.Button as={Fragment}>
              <TableCell
                nowrap
                className={clsx("hidden 2xl:table-cell", {
                  "bg-blue-50": open,
                })}
              >
                <ProfileInfo
                  user={value.createdByUser}
                  description={
                    <>
                      <DateTimeLabel
                        value={ensureString(value.createdAt)}
                        type="datetime"
                        emptyLabel={DATE_PLACEHOLDER}
                      />
                    </>
                  }
                />
              </TableCell>
            </Disclosure.Button>
            <TableCell
              className={clsx({
                "bg-blue-50": open,
              })}
            >
              <div className="flex flex-row items-center justify-end gap-x-2">
                {customFields.length > 0 && (
                  <span className="flex flex-1 cursor-pointer items-center">
                    <div className="relative">
                      <FiInfoIcon
                        onClick={handleCustomFieldDisplay}
                        className="h-6 w-6 text-gray-400"
                        aria-hidden="true"
                      />
                    </div>
                  </span>
                )}
                <Authorization resource="order-trip-message" action="find" alwaysAuthorized={canFind()}>
                  <span className="flex flex-1 cursor-pointer items-center justify-end">
                    <div className="relative right-0">
                      <ChatBubbleBottomCenterTextIcon
                        onClick={handleOpenMessage}
                        className="h-6 w-6 text-gray-400"
                        aria-hidden="true"
                      />
                      {hasUnreadMessage && (
                        <div className="absolute right-0 top-0  -mr-1 -mt-1 h-2.5 w-2.5" onClick={handleOpenMessage}>
                          <span className="relative flex">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-700" />
                          </span>
                        </div>
                      )}
                    </div>
                  </span>
                </Authorization>
              </div>
            </TableCell>
            <TableCell
              action
              className={clsx({
                "bg-blue-50": open,
              })}
            >
              <OrderTripActionMenu
                actionPlacement={actionPlacement}
                disabled={isOrderCanceled || isLoadingDelivered || isLoadingCompleted}
                onDelete={
                  (isDelivered && !isAllowDeleteTripAfterDelivered) || (isCompleted && !isAllowDeleteTripAfterCompleted)
                    ? undefined
                    : handleDeleteTrip
                }
                onEdit={handleEditTrip}
                onUpdateStatus={isDisabledUpdateStatus ? undefined : handleUpdateStatus}
                onUpdateBillOfLading={isDelivered || isCompleted ? handleUpdateBillOfLading : undefined}
                onInputSalary={handleOpenInputSalary}
                onUpdateSchedule={handleUpdateSchedule}
                onDeleteSchedule={value.driverNotificationScheduledAt ? handleDeleteSchedule : undefined}
                onShare={handleShare}
                isEditor={isEditor}
                flagEditOwn={equalId(value?.createdByUser?.id, userId)}
                isVisibleNotificationSchedule={value.lastStatusType === OrderTripStatusType.NEW}
              />
            </TableCell>
          </TableRow>

          <Disclosure.Panel as="tr">
            <TableCell colSpan={12} className="px-0 py-0">
              <ul role="list" className="grid grid-cols-1 gap-x-6 gap-y-4 !pl-3 lg:grid-cols-12 xl:gap-x-8">
                <Authorization resource="trip-driver-expense" action="find">
                  <li className="group overflow-hidden rounded-lg p-4 hover:bg-gray-50 lg:col-span-4">
                    <div className="relative flex items-center gap-x-6">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                        <BanknotesIcon className="h-6 w-6 text-gray-600 group-hover:text-blue-700" aria-hidden="true" />
                      </div>
                      <div className="font-semibold text-gray-900">
                        {t("order.vehicle_dispatch.vehicle_dispatch_driver_salary")}
                      </div>
                    </div>
                    <div className="mt-1">
                      <dl className="divide-y divide-gray-100">
                        <DescriptionProperty2 label={t("order.vehicle_dispatch.vehicle_dispatch_driver_salary")}>
                          <NumberLabel
                            value={Number(value.driverCost)}
                            type="currency"
                            emptyLabel={t("common.empty")}
                          />
                          {!!value.driverCost && canDetailDriverExpense() && (
                            <div className="inline cursor-pointer space-x-1 pl-2 text-sm text-blue-700 hover:text-blue-500">
                              <InformationCircleIcon className="ml-1 inline h-5 w-5" aria-hidden="true" />
                              <span onClick={handleOpenTripDriverExpense}>
                                {t("order.vehicle_dispatch.trip_driver_expense.view_detail")}
                              </span>
                            </div>
                          )}
                        </DescriptionProperty2>
                        <DescriptionProperty2 label={t("order.vehicle_dispatch.vehicle_dispatch_subcontractor_cost")}>
                          <NumberLabel
                            value={Number(value.subcontractorCost)}
                            type="currency"
                            emptyLabel={t("common.empty")}
                          />
                        </DescriptionProperty2>
                        <DescriptionProperty2 label={t("order.vehicle_dispatch.vehicle_dispatch_toll_fees")}>
                          <NumberLabel
                            value={Number(value.bridgeToll)}
                            type="currency"
                            emptyLabel={t("common.empty")}
                          />
                        </DescriptionProperty2>
                        <DescriptionProperty2 label={t("order.vehicle_dispatch.vehicle_dispatch_other_costs")}>
                          <NumberLabel value={Number(value.otherCost)} type="currency" emptyLabel={t("common.empty")} />
                        </DescriptionProperty2>
                      </dl>
                    </div>
                  </li>
                </Authorization>

                <Authorization resource="bill-of-lading" action="find">
                  <li className="group overflow-hidden rounded-lg p-4 hover:bg-gray-50 lg:col-span-4">
                    <div className="relative flex items-center gap-x-6">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                        <DocumentTextIcon
                          className="h-6 w-6 text-gray-600 group-hover:text-blue-700"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="font-semibold text-gray-900">
                        {t("order.vehicle_dispatch.vehicle_dispatch_document_details")}
                      </div>
                    </div>
                    <div className="mt-1">
                      <dl className="divide-y divide-gray-100">
                        <DescriptionProperty2 label={t("order.vehicle_dispatch.vehicle_dispatch_document_number")}>
                          {value.billOfLading}
                        </DescriptionProperty2>
                        {isDelivered && order?.route?.type === RouteType.FIXED && (
                          <DescriptionProperty2 label={t("order.vehicle_dispatch.bill_of_lading_submit_date")}>
                            <DateTimeLabel
                              value={getBillOfLadingReminderDate()}
                              emptyLabel={DATE_PLACEHOLDER}
                              type="date"
                            />
                          </DescriptionProperty2>
                        )}
                        <DescriptionProperty2
                          type="image"
                          label={t("order.vehicle_dispatch.vehicle_dispatch_document_image")}
                        >
                          {(value?.billOfLadingImages?.length || 0) > 0 && (
                            <div className="flex flex-col gap-4">
                              {value.billOfLadingImages?.map((item) => <DescriptionImage key={item.id} file={item} />)}
                            </div>
                          )}
                        </DescriptionProperty2>
                      </dl>
                    </div>
                  </li>
                </Authorization>

                <li className="group overflow-hidden rounded-lg p-4 hover:bg-gray-50 lg:col-span-4">
                  <div className="relative flex items-center gap-x-6">
                    <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                      <LiaShippingFastSolidIcon
                        className="h-6 w-6 text-gray-600 group-hover:text-blue-700"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="font-semibold text-gray-900">
                      {t("order.vehicle_dispatch.vehicle_dispatch_trip_details")}
                    </div>
                  </div>
                  <div className="mt-1">
                    <dl className="divide-y divide-gray-100">
                      <DescriptionProperty2
                        className="block 2xl:hidden"
                        label={t("order.vehicle_dispatch.vehicle_dispatch_vehicle_size")}
                      >
                        {value.vehicle?.ownerType === VehicleOwnerType.ORGANIZATION
                          ? t("order.vehicle_dispatch.vehicle_dispatch_company")
                          : t("order.vehicle_dispatch.vehicle_dispatch_subcontractor")}
                      </DescriptionProperty2>
                      <DescriptionProperty2
                        className="block 2xl:hidden"
                        label={t("order.vehicle_dispatch.vehicle_dispatch_pickup_date")}
                      >
                        <DateTimeLabel
                          value={ensureString(value.pickupDate)}
                          type={organizationOrderRelatedDateFormat}
                          emptyLabel={DATE_PLACEHOLDER}
                        />
                      </DescriptionProperty2>
                      <DescriptionProperty2
                        className="block 2xl:hidden"
                        label={t("order.vehicle_dispatch.vehicle_dispatch_delivery_date")}
                      >
                        <DateTimeLabel
                          value={ensureString(value.deliveryDate)}
                          type={organizationOrderRelatedDateFormat}
                          emptyLabel={DATE_PLACEHOLDER}
                        />
                      </DescriptionProperty2>
                      <DescriptionProperty2
                        className="block 2xl:hidden"
                        label={t("order.vehicle_dispatch.vehicle_dispatch_create_new")}
                      >
                        <ProfileInfo
                          user={value.createdByUser}
                          description={
                            <>
                              <DateTimeLabel
                                value={ensureString(value.createdAt)}
                                type="datetime"
                                emptyLabel={DATE_PLACEHOLDER}
                              />
                            </>
                          }
                        />
                      </DescriptionProperty2>
                      <DescriptionProperty2 multiline label={t("order.vehicle_dispatch.vehicle_dispatch_note")}>
                        {value.notes}
                      </DescriptionProperty2>
                    </dl>
                  </div>
                </li>
              </ul>
            </TableCell>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
};
export default OrderTripRow;
