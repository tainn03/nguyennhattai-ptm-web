import { ArrowPathIcon, MegaphoneIcon, TruckIcon } from "@heroicons/react/24/outline";
import {
  CustomFieldType,
  NotificationType,
  OrderTripStatusType,
  OrganizationRoleType,
  RouteType,
} from "@prisma/client";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mutate } from "swr";

import {
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, Button, EmptyListSection, TripExpenseModal } from "@/components/molecules";
import {
  ConfirmModal,
  EditOrderTripStatusModal,
  MessageModal,
  OrderShareTripModal,
  QuickUpdateOrderTripStatusModal,
  UpdateBillOfLadingModal,
} from "@/components/organisms";
import { OrderTab } from "@/constants/order";
import { TripStatusUpdateType } from "@/constants/organizationSettingExtended";
import { SendNotificationItem, SendNotificationType } from "@/forms/orderTrip";
import { useAuth, useCustomFieldByType, useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useOrderState } from "@/redux/states";
import {
  deleteOrderTrip,
  deleteOrderTripDriverNotificationSchedule,
  resetTripDriverExpenses,
} from "@/services/client/orderTrip";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { PushNotificationType, TripCanceledNotification } from "@/types/notification";
import { DriverInfo, OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { post } from "@/utils/api";
import { getAccountInfo, getFullName } from "@/utils/auth";
import { equalId } from "@/utils/number";
import { getGeneralDispatchVehicleInfo, getOrderStatusFlags, getOrderTripStatusFlags } from "@/utils/order";
import { ensureString } from "@/utils/string";

import {
  ConfirmResetDriverExpenseModal,
  DispatchVehicleModal,
  DriverNotificationModal,
  OrderTripCustomFieldDisplayModal,
  OrderTripRow,
  TripDriverExpenseDetailModal,
  VehicleListModal,
} from ".";

type OrderTripTableProps = {
  loading?: boolean;
  isEditor: boolean;
};

const OrderTripTable = ({ loading, isEditor }: OrderTripTableProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations();
  const { orgLink, orgId, user, userId, org } = useAuth();
  const { order } = useOrderState();
  const { showNotification } = useNotification();
  const { tripStatusUpdateType } = useOrgSettingExtendedStorage();
  const { canNew, canEdit, canEditOwn } = usePermission("order-trip");

  const [isVehicleModalListOpen, setIsVehicleListModalOpen] = useState(false);
  const [isDispatchVehicleModalOpen, setIsDispatchVehicleModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [isConfirmDeleteScheduleModalOpen, setIsConfirmDeleteScheduleModalOpen] = useState(false);
  const [isNotificationScheduleModalOpen, setIsNotificationScheduleModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdateBillOfLadingModalOpen, setIsUpdateBillOfLadingModalOpen] = useState(false);
  const [isDriverSalaryDetailModalOpen, setIsDriverSalaryDetailModalOpen] = useState(false);
  const [isConfirmResetTripDriverExpenseModalOpen, setIsConfirmResetTripDriverExpenseModalOpen] = useState(false);
  const [isTripDriverExpenseDetailModalOpen, setIsTripDriverExpenseDetailModalOpen] = useState(false);
  const [isCustomFieldDisplayModalOpen, setIsCustomFieldDisplayModalOpen] = useState(false);
  const [selectedTripList, setSelectedTripList] = useState<SendNotificationItem[]>([]);
  const [isSelectedAllTrip, setIsSelectedAllTrip] = useState(false);
  const [isConfirmModalLoading, setIsConfirmModalLoading] = useState(false);
  const { isLoading, customFields } = useCustomFieldByType({ organizationId: orgId, type: CustomFieldType.ORDER_TRIP });

  const selectedOrderTripRef = useRef<Partial<OrderTripInfo>>();
  const orderTripRef = useRef<Partial<OrderTripInfo>>();
  const orderTripStatusRef = useRef<Partial<OrderTripStatusInfo>>();
  const notificationType = useRef<SendNotificationType>("immediate");
  const isOnlyNotificationSchedule = useRef(false);

  const [orderTripShare, setOrderTripShare] = useState<Partial<OrderTripInfo>>();
  const [isShareTripModalOpen, setIsShareTripModalOpen] = useState(false);

  useEffect(() => {
    if (!order?.code) {
      return;
    }

    const tripCode = searchParams.get("tripCode");
    if (tripCode) {
      const trip = (order?.trips || [])?.find((item) => item.code === tripCode);
      if (trip) {
        selectedOrderTripRef.current = { id: trip?.id, driver: { user: { id: trip?.driver?.user?.id } } };
        setIsMessageModalOpen(true);
      }
      router.replace(`${orgLink}/orders/${order?.code}?tab=${OrderTab.DISPATCH_VEHICLE}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, order?.code]);

  const { remainingWeight } = useMemo(() => getGeneralDispatchVehicleInfo({ ...order }), [order]);
  const { isNew, isCanceled } = useMemo(() => getOrderStatusFlags({ ...order }), [order]);

  /**
   * Determines whether the vehicle dispatch is editable.
   */
  const isCannotEditable = useMemo(
    () => isNew || isCanceled || !remainingWeight || remainingWeight <= 0,
    [isCanceled, isNew, remainingWeight]
  );

  /**
   * Filters the trips to show only the new or pending trips.
   */
  const newOrPendingTrips = useMemo(() => {
    const currentTrips = [...(order?.trips || [])];
    return currentTrips.filter((trip) => {
      const { isNew, isPendingConfirmation } = getOrderTripStatusFlags(trip);
      return isNew || isPendingConfirmation;
    });
  }, [order?.trips]);

  /**
   * Determines whether the checkbox should be shown for the trip list.
   */
  const isShowCheckbox = useMemo(() => {
    const currentTrips = [...(order?.trips || [])];
    return !isCanceled && currentTrips.length > 0;
  }, [isCanceled, order?.trips]);

  /**
   * Determines whether the "Send Notification" button should be disabled.
   */
  const isDisabledSendNotificationButton = useMemo(() => {
    const newOrPendingSelectedTrips = [...selectedTripList].filter((trip) => {
      const currentTrips = [...(order?.trips || [])].find((item) => equalId(item.id, trip.id));
      const { isNew: isNewTrip, isPendingConfirmation } = getOrderTripStatusFlags(currentTrips);
      return isNewTrip || isPendingConfirmation;
    });
    return newOrPendingSelectedTrips.length <= 0 || isNew || isCanceled || loading || newOrPendingTrips.length === 0;
  }, [selectedTripList, isNew, isCanceled, loading, newOrPendingTrips.length, order?.trips]);

  /**
   * Opens the edit modal with the specified order trip and its current status.
   * @param {Partial<OrderTripInfo>} orderTrip - The partial order trip information.
   * @param {Partial<OrderTripStatusInfo>} currentStatus - The partial current status of the order trip.
   */
  const handleEditModalOpen = useCallback(
    (orderTrip: Partial<OrderTripInfo>, currentStatus: Partial<OrderTripStatusInfo>) => {
      orderTripRef.current = orderTrip;
      orderTripStatusRef.current = currentStatus;
      setIsEditModalOpen(true);
    },
    []
  );

  /**
   * Closes the edit modal.
   */
  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  /**
   * Handles the updated order trip.
   * @param {number} id - The order trip id.
   */
  const handleUpdatedOrderTrip = useCallback(
    (id: number) => {
      setIsEditModalOpen(false);
      setSelectedTripList((prev) => prev.filter((item) => !equalId(item.id, id)));
      mutate([`order-dispatch-vehicle-info/${order?.code}`, { organizationId: orgId, code: order?.code }]);
    },
    [order?.code, orgId]
  );

  /**
   * Opens the vehicle modal.
   */
  const handleOpenVehicleModal = useCallback(() => {
    if (isCannotEditable) {
      return;
    }
    setIsVehicleListModalOpen(true);
  }, [isCannotEditable]);

  /**
   * Closes the vehicle modal.
   */
  const handleCloseVehicleModal = useCallback(() => {
    setIsVehicleListModalOpen(false);
  }, []);

  /**
   * Opens the dispatch vehicle modal for editing the provided order trip.
   * @param {Partial<OrderTripInfo>} orderTrip - The order trip information to edit.
   */
  const handleEditTrip = useCallback((orderTrip?: Partial<OrderTripInfo>) => {
    selectedOrderTripRef.current = orderTrip;
    setIsDispatchVehicleModalOpen(true);
  }, []);

  /**
   * Closes the dispatch vehicle modal.
   */
  const handleCloseDispatchVehicleModal = useCallback(() => {
    setIsDispatchVehicleModalOpen(false);
    selectedOrderTripRef.current = undefined;
  }, []);

  /**
   * Closes the dispatch vehicle modal.
   */
  const handleConfirmDispatchVehicle = useCallback(() => {
    if (selectedOrderTripRef.current) {
      const selectedTripId = selectedOrderTripRef.current.id;
      setSelectedTripList((prev) => prev.filter((item) => !equalId(item.id, selectedTripId)));
    }
    setIsDispatchVehicleModalOpen(false);
    selectedOrderTripRef.current = undefined;
  }, []);

  /**
   * Opens the message modal for the provided order trip.
   * @param {Partial<OrderTripInfo>} trip - The order trip information.
   * @returns {Function} The function to open the message modal.
   * @param {number} id - The order trip id.
   *
   */
  const handleOpenMessageModal = useCallback(
    (trip: Partial<OrderTripInfo>) => (id: number) => {
      selectedOrderTripRef.current = { id, driver: { user: { id: trip.driver?.user?.id } } };
      setIsMessageModalOpen(true);
    },
    []
  );

  /**
   * Closes the message modal.
   */
  const handleCloseMessageModal = useCallback(() => {
    selectedOrderTripRef.current = undefined;
    setIsMessageModalOpen(false);
  }, []);

  /**
   * Closes the delete confirm modal.
   */
  const handleCancelDelete = useCallback(() => {
    setIsConfirmDeleteModalOpen(false);
    selectedOrderTripRef.current = undefined;
  }, []);

  /**
   * Handles the delete order trip.
   */
  const handleDeleteTrip = useCallback((orderTrip?: Partial<OrderTripInfo>) => {
    selectedOrderTripRef.current = orderTrip;
    setIsConfirmDeleteModalOpen(true);
  }, []);

  /**
   * Handles the confirmation and execution of deleting an order trip.
   * Shows success or error notifications and triggers a data refresh.
   */
  const handleConfirmDeleteTrip = useCallback(async () => {
    if (selectedOrderTripRef?.current) {
      const { error } = await deleteOrderTrip(
        {
          organizationId: orgId,
          id: Number(selectedOrderTripRef.current.id),
          updatedById: userId,
        },
        selectedOrderTripRef.current.updatedAt
      );

      if (error) {
        showNotification({
          color: "error",
          title: t("common.message.delete_error_title"),
          message: t("common.message.delete_error_message", {
            name: selectedOrderTripRef.current?.code,
          }),
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.delete_success_title"),
          message: t("common.message.delete_success_message", {
            name: selectedOrderTripRef.current?.code,
          }),
        });

        // Remove selected trip
        const newList = [...selectedTripList].filter((item) => !equalId(item.id, selectedOrderTripRef?.current?.id));
        setSelectedTripList(newList);

        // Send notification
        const notificationData: TripCanceledNotification = {
          tripCode: ensureString(selectedOrderTripRef.current.code),
          tripId: Number(selectedOrderTripRef.current.id),
          orderCode: ensureString(order?.code),
          fullName: getAccountInfo(user).displayName,
          tripStatus: OrderTripStatusType.CANCELED,
        };

        const receivers: Partial<DriverInfo>[] = [];
        selectedOrderTripRef.current.driver && receivers.push(selectedOrderTripRef?.current.driver);

        const params: PushNotificationType = {
          entity: {
            type: NotificationType.TRIP_STATUS_CHANGED,
            targetId: Number(selectedOrderTripRef.current.id),
          },
          data: notificationData,
          orgMemberRoles: [OrganizationRoleType.MANAGER, OrganizationRoleType.ACCOUNTANT],
          receivers,
          jwt: "",
        };

        post<ApiResult>(`/api${orgLink}/notifications/new`, params);
      }

      handleCancelDelete();
      mutate([`order-dispatch-vehicle-info/${order?.code}`, { organizationId: orgId, code: order?.code }]);
    }
  }, [handleCancelDelete, order?.code, orgId, orgLink, selectedTripList, showNotification, t, user, userId]);

  /**
   * Toggles the selection of a trip item in the notification list.
   * Updates the list of selected items accordingly.
   * @param {SendNotificationItem} data - The trip item to be selected or deselected.
   */
  const handleSelectTrip = useCallback((data: SendNotificationItem) => {
    setSelectedTripList((prevList) => {
      if (prevList.some((item) => equalId(item.id, data.id))) {
        return prevList.filter((item) => !equalId(item.id, data.id));
      } else {
        return [...prevList, data];
      }
    });
  }, []);

  /**
   * Toggles the selection all trip item in the notification list.
   * Updates the list of selected items accordingly.
   * @param {SendNotificationItem} data - All trip item to be selected or deselected.
   */
  const handleSelectAllTrip = useCallback(
    (event: MouseEvent<HTMLInputElement>) => {
      const isChecked = event.target instanceof HTMLInputElement && event.target.checked;
      if (isChecked) {
        const newList: SendNotificationItem[] = (order?.trips || [])
          .filter((trip) => canEdit() || (canEditOwn() && equalId(trip?.createdByUser?.id, userId)) || isEditor)
          .map((trip) => ({
            id: Number(trip.id),
            code: ensureString(trip.code),
            weight: Number(trip?.weight),
            driverFullName: getFullName(trip.driver?.firstName, trip.driver?.lastName),
            driverUserId: Number(trip.driver?.user?.id),
            vehicleNumber: ensureString(trip.vehicle?.vehicleNumber),
            phoneNumber: ensureString(trip.driver?.phoneNumber),
            pickupDate: trip?.pickupDate,
            lastStatusType: trip?.lastStatusType,
            driverNotificationScheduledAt: trip?.driverNotificationScheduledAt,
          }));

        setSelectedTripList(newList);
      } else {
        setSelectedTripList([]);
      }
      setIsSelectedAllTrip(isChecked);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order?.trips, canEdit, canEditOwn]
  );

  /**
   * Opens the confirmation modal for sending notifications.
   */
  const handleOpenNotificationSchedule = useCallback(() => {
    setIsNotificationScheduleModalOpen(true);
  }, []);

  /**
   * Closes the confirmation modal for sending notifications.
   */
  const handleCloseNotificationSchedule = useCallback(() => {
    setIsNotificationScheduleModalOpen(false);
    isOnlyNotificationSchedule.current = false;
  }, []);

  const handleUpdateSchedule = useCallback(
    (processingTrip: SendNotificationItem) => {
      isOnlyNotificationSchedule.current = true;
      setSelectedTripList([processingTrip]);
      handleOpenNotificationSchedule();
    },
    [handleOpenNotificationSchedule]
  );

  const handleCancelDeleteSchedule = useCallback(() => {
    setSelectedTripList([]);
    setIsConfirmDeleteScheduleModalOpen(false);
  }, []);

  const handleConfirmDeleteSchedule = useCallback(async () => {
    setIsConfirmModalLoading(true);
    const result = await deleteOrderTripDriverNotificationSchedule(selectedTripList[0]?.id);

    if (result) {
      showNotification({
        color: "success",
        message: t("order.driver_notification_scheduled_modal.message_delete_schedule_success"),
      });

      mutate([`order-dispatch-vehicle-info/${order?.code}`, { organizationId: orgId, code: order?.code }]);
    } else {
      showNotification({
        color: "error",
        title: t("common.message.error_title"),
        message: t("order.driver_notification_scheduled_modal.message_delete_schedule_error"),
      });
    }
    setIsConfirmModalLoading(false);
    handleCancelDeleteSchedule();
  }, [handleCancelDeleteSchedule, order?.code, orgId, selectedTripList, showNotification, t]);

  /**
   * Handles the delete order trip schedule.
   */
  const handleDeleteSchedule = useCallback((processingTrip: SendNotificationItem) => {
    setSelectedTripList([processingTrip]);
    setIsConfirmDeleteScheduleModalOpen(true);
  }, []);

  /**
   * Handles the confirmation to send notifications for selected trips in an order.
   * Makes an API call to send notifications and updates the data accordingly.
   */
  const handleConfirmSendNotification = useCallback(
    async (processingTrips: SendNotificationItem[]) => {
      setIsConfirmModalLoading(true);
      const newOrPendingSelectedTrips = processingTrips.filter((trip) => {
        const currentTrips = [...(order?.trips || [])].find((item) => equalId(item.id, trip.id));
        const { isNew: isNewTrip, isPendingConfirmation } = getOrderTripStatusFlags(currentTrips);
        if (notificationType.current === "immediate") {
          return trip.driverUserId && (isNewTrip || isPendingConfirmation);
        } else {
          return trip.driverUserId && isNewTrip && !!trip.driverNotificationScheduledAt;
        }
      });
      const result = await post<ApiResult<number>>(`/api${orgLink}/orders/${order?.code}/trips/send-notifications`, {
        orderId: Number(order?.id),
        orderCode: order?.code,
        trips: newOrPendingSelectedTrips,
        fullName: getAccountInfo(user).displayName,
        unitOfMeasure: order?.unit?.code,
        notificationType: notificationType.current,
      });

      setIsConfirmModalLoading(false);
      if (result.status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          message:
            notificationType.current === "immediate"
              ? t("order.vehicle_dispatch.message_send_notification_success")
              : t("order.vehicle_dispatch.message_schedule_notification_success"),
        });

        setSelectedTripList([]);
        setIsSelectedAllTrip(false);
        mutate([`order-dispatch-vehicle-info/${order?.code}`, { organizationId: orgId, code: order?.code }]);
      } else {
        showNotification({
          color: "error",
          title: t("common.message.error_title"),
          message:
            notificationType.current === "immediate"
              ? t("order.vehicle_dispatch.message_send_notification_fail")
              : t("order.vehicle_dispatch.message_schedule_notification_fail"),
        });
      }
      isOnlyNotificationSchedule.current = false;
      setIsNotificationScheduleModalOpen(false);
    },
    [orgLink, order?.code, order?.id, order?.unit?.code, order?.trips, user, showNotification, t, orgId]
  );

  /**
   * Opens the confirmation modal for sending notifications.
   */
  const handleSubmitNotificationSchedule = useCallback(
    (value: SendNotificationItem[], type: SendNotificationType) => {
      setSelectedTripList(value);
      notificationType.current = type;
      handleConfirmSendNotification(value);
    },
    [handleConfirmSendNotification]
  );

  /**
   * This function opens the Update Bill of Lading Modal.
   * @param {Partial<OrderTripInfo>} orderTrip - The order trip information to be updated.
   * @param {Partial<OrderTripStatusInfo>} currentStatus - The current status of the order trip.
   */
  const handleOpenUpdateBillOfLadingModal = useCallback(
    (orderTrip: Partial<OrderTripInfo>, currentStatus: Partial<OrderTripStatusInfo>) => {
      orderTripRef.current = orderTrip;
      orderTripStatusRef.current = currentStatus;
      setIsUpdateBillOfLadingModalOpen(true);
    },
    []
  );

  /**
   * Closes the modal for updating the bill of lading.
   */
  const handleCancelUpdateBillOfLading = useCallback(() => {
    setIsUpdateBillOfLadingModalOpen(false);
  }, []);

  /**
   * Handles the submission of the update bill of lading modal.
   * Closes the edit modal, triggers data mutation, and resets the selected order trip.
   */
  const handleSubmitUpdateBillOfLadingModal = useCallback(() => {
    setIsEditModalOpen(false);
    mutate(["orders-statuses", { organizationId: orgId, code: order?.code }]);
    mutate([`order-dispatch-vehicle-info/${order?.code}`, { organizationId: orgId, code: order?.code }]);
    selectedOrderTripRef.current = undefined;
    setIsUpdateBillOfLadingModalOpen(false);
  }, [order?.code, orgId]);

  /**
   * Opens the driver salary detail modal for the selected order trip.
   * @param {Partial<OrderTripInfo>} trips - Optional parameter for the selected order trip.
   */
  const handleOpenDriverSalaryDetailModal = useCallback((trips?: Partial<OrderTripInfo>) => {
    selectedOrderTripRef.current = trips;
    setIsDriverSalaryDetailModalOpen(true);
  }, []);

  /**
   * Closes the driver salary detail modal.
   */
  const handleCloseDriverSalaryDetailModal = useCallback(() => {
    selectedOrderTripRef.current = undefined;
    setIsDriverSalaryDetailModalOpen(false);
  }, []);

  /**
   * Handles the trip expense modal save event.
   */
  const handleSaveTripExpense = useCallback(() => {
    mutate([`order-dispatch-vehicle-info/${order?.code}`, { organizationId: orgId, code: order?.code }]);
    selectedOrderTripRef.current = undefined;
    setIsDriverSalaryDetailModalOpen(false);
  }, [order?.code, orgId]);

  /**
   * Opens the reset trip driver expense modal.
   */
  const handleOpenResetTripDriverExpenseModal = useCallback(() => {
    setIsConfirmResetTripDriverExpenseModalOpen(true);
  }, []);

  /**
   * Closes the reset trip driver expense modal.
   */
  const handleCloseResetTripDriverExpenseModal = useCallback(() => {
    setIsConfirmResetTripDriverExpenseModalOpen(false);
  }, []);

  /**
   * Handles the reset trip driver expense.
   */
  const handleConfirmResetTripDriverExpense = useCallback(async () => {
    if (selectedTripList.length > 0) {
      setIsConfirmModalLoading(true);
      const orderTripIds = selectedTripList.map((item) => item.id);
      const result = await resetTripDriverExpenses(
        {
          organizationCode: ensureString(org?.code),
          orderCode: ensureString(order?.code),
        },
        {
          orderTripIds,
          routeId: Number(order?.route?.id),
        }
      );
      setIsConfirmModalLoading(false);
      if (result.status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("order.vehicle_dispatch.message_reset_trip_driver_expense_success"),
        });

        setSelectedTripList([]);
        setIsSelectedAllTrip(false);
        mutate([`order-dispatch-vehicle-info/${order?.code}`, { organizationId: orgId, code: order?.code }]);
      } else {
        showNotification({
          color: "error",
          title: t("common.message.error_title"),
          message: t("order.vehicle_dispatch.message_reset_trip_driver_expense_fail"),
        });
      }
      setIsConfirmResetTripDriverExpenseModalOpen(false);
    }
  }, [order?.code, order?.route?.id, org?.code, orgId, selectedTripList, showNotification, t]);

  /**
   * Opens the trip driver expense detail modal.
   * @param {Partial<OrderTripInfo>} trips - The selected order trip.
   */
  const handleOpenTripDriverExpenseDetailModal = useCallback((trips?: Partial<OrderTripInfo>) => {
    selectedOrderTripRef.current = trips;
    setIsTripDriverExpenseDetailModalOpen(true);
  }, []);

  /**
   * Closes the trip driver expense detail modal.
   */
  const handleCloseTripDriverExpenseDetailModal = useCallback(() => {
    selectedOrderTripRef.current = undefined;
    setIsTripDriverExpenseDetailModalOpen(false);
  }, []);

  useEffect(() => {
    if (!isMessageModalOpen && order?.code) {
      mutate([`order-dispatch-vehicle-info/${order?.code}`, { organizationId: orgId, code: order?.code }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMessageModalOpen]);

  useEffect(() => {
    if (!loading) {
      const trips = order?.trips || [];
      const orderOwn = (order?.trips || []).filter(
        (trip) => canEdit() || (canEditOwn() && equalId(trip?.createdByUser?.id, userId))
      );
      if (isSelectedAllTrip) {
        if (canEdit() && selectedTripList.length < trips.length) {
          setIsSelectedAllTrip(false);
        } else if (!canEdit() && canEditOwn() && selectedTripList.length < [orderOwn].length) {
          setIsSelectedAllTrip(false);
        }
      }

      if (!isSelectedAllTrip) {
        if (canEdit() && selectedTripList.length === trips.length) {
          setIsSelectedAllTrip(true);
        } else if (!canEdit() && canEditOwn() && selectedTripList.length === [orderOwn].length) {
          setIsSelectedAllTrip(true);
        }
      }
    }
  }, [isSelectedAllTrip, loading, order?.trips, selectedTripList.length, canEdit, canEditOwn, userId]);

  /**
   * Handles the saving of the order trip status.
   */
  const handleSaveOrderTripStatus = useCallback(() => {
    mutate([`order-dispatch-vehicle-info/${order?.code}`, { organizationId: orgId, code: order?.code }]);
    mutate(["orders-statuses", { organizationId: orgId, code: order?.code }]);
    handleEditModalClose();
  }, [handleEditModalClose, order?.code, orgId]);

  /**
   * Callback function for setting open modal share dialog.
   */
  const handleShare = useCallback((orderTrip: Partial<OrderTripInfo>) => {
    if (orderTrip) {
      setOrderTripShare(orderTrip);
      setIsShareTripModalOpen(true);
    }
  }, []);
  /**
   * Callback function for setting open modal share dialog.
   */
  const handleCloseShareTripOrder = useCallback(() => {
    setOrderTripShare(undefined);
    setIsShareTripModalOpen(false);
  }, []);

  /**
   * Opens the custom field display modal.
   */
  const handleOpenCustomFieldDisplayModal = useCallback((orderTrip?: Partial<OrderTripInfo>) => {
    selectedOrderTripRef.current = orderTrip;
    setIsCustomFieldDisplayModalOpen(true);
  }, []);

  /**
   * Closes the custom field display modal.
   */
  const handleCloseCustomFieldDisplayModal = useCallback(() => {
    selectedOrderTripRef.current = undefined;
    setIsCustomFieldDisplayModalOpen(false);
  }, []);

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-5 2xl:grid-cols-6">
        <div className="space-y-6 lg:col-span-full 2xl:col-span-full">
          <Card>
            <CardHeader
              title={t("order.vehicle_dispatch.vehicle_dispatch_list_of_vehicles")}
              actionComponent={
                <div className="flex flex-col gap-4 md:flex-row">
                  {order?.route?.type === RouteType.FIXED && (
                    <Button
                      icon={ArrowPathIcon}
                      variant="outlined"
                      size="small"
                      disabled={selectedTripList.length <= 0 || isNew || isCanceled || loading}
                      onClick={handleOpenResetTripDriverExpenseModal}
                    >
                      {t("order.vehicle_dispatch.vehicle_dispatch_reset_trip_driver_expense_button")}
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    icon={MegaphoneIcon}
                    onClick={handleOpenNotificationSchedule}
                    disabled={isDisabledSendNotificationButton}
                  >
                    {t("order.vehicle_dispatch.vehicle_dispatch_send_notification")}
                  </Button>

                  <Authorization resource="order-trip" action="new" alwaysAuthorized={isEditor}>
                    <Button
                      disabled={isCannotEditable || loading}
                      size="small"
                      icon={TruckIcon}
                      onClick={handleOpenVehicleModal}
                    >
                      {t("order.vehicle_dispatch.vehicle_dispatch_dispatch_vehicle")}
                    </Button>
                  </Authorization>
                </div>
              }
              subTitle={
                (order?.trips || []).length > 0
                  ? t("order.vehicle_dispatch.trip", { count: (order?.trips || []).length })
                  : ""
              }
              className="!border-b-0"
            />
            <CardContent padding={false}>
              <TableContainer
                horizontalScroll
                verticalScroll
                allowFullscreen
                stickyHeader
                autoHeight
                fullHeight
                className="!mt-0 [&>div>div>div]:!rounded-t-none"
              >
                <Table dense>
                  <TableHead uppercase>
                    <TableRow>
                      <TableCell action>
                        {isShowCheckbox && (
                          <Checkbox label="" value="true" checked={isSelectedAllTrip} onClick={handleSelectAllTrip} />
                        )}
                      </TableCell>
                      <TableCell> {t("order.vehicle_dispatch.vehicle_dispatch_waybill_code")}</TableCell>
                      <TableCell> {t("order.vehicle_dispatch.vehicle_dispatch_vehicle")}</TableCell>
                      <TableCell> {t("order.vehicle_dispatch.vehicle_dispatch_driver")}</TableCell>
                      <TableCell> {t("order.vehicle_dispatch.vehicle_dispatch_schedule.title")}</TableCell>
                      <TableCell className="hidden 2xl:table-cell">
                        {t("order.vehicle_dispatch.vehicle_dispatch_owner")}
                      </TableCell>
                      <TableCell> {t("order.vehicle_dispatch.vehicle_dispatch_weight")}</TableCell>
                      <TableCell>{t("order.vehicle_dispatch.vehicle_dispatch_status")}</TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {t("order.vehicle_dispatch.vehicle_dispatch_date")}
                      </TableCell>
                      <TableCell className="hidden 2xl:table-cell">
                        {t("order.vehicle_dispatch.vehicle_dispatch_create_new")}
                      </TableCell>
                      <TableCell>
                        <span className="sr-only">{t("common.actions")}</span>
                      </TableCell>
                      <TableCell action>
                        <span className="sr-only">{t("common.actions")}</span>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!loading && (order?.trips || []).length > 0 ? (
                      (order?.trips || []).map((item, index) => (
                        <OrderTripRow
                          key={item.id}
                          value={item}
                          customFields={customFields || []}
                          selected={selectedTripList.findIndex((value) => equalId(value.id, item.id)) !== -1}
                          onSelected={handleSelectTrip}
                          onEdit={handleEditTrip}
                          onDelete={handleDeleteTrip}
                          onUpdateStatus={handleEditModalOpen}
                          onOpenMessage={handleOpenMessageModal(item)}
                          onUpdateBillOfLading={handleOpenUpdateBillOfLadingModal}
                          onOpenSalary={handleOpenDriverSalaryDetailModal}
                          onOpenTripDriverExpense={handleOpenTripDriverExpenseDetailModal}
                          onUpdateSchedule={handleUpdateSchedule}
                          onDeleteSchedule={handleDeleteSchedule}
                          onShare={handleShare}
                          onOpenCustomFieldDisplay={handleOpenCustomFieldDisplayModal}
                          actionPlacement={index >= 3 ? "start" : "end"}
                          isEditor={isEditor}
                        />
                      ))
                    ) : (
                      <TableRow hover={false} className="mx-auto max-w-lg">
                        <TableCell colSpan={11} className="px-6 lg:px-8">
                          <EmptyListSection
                            title={t("order.vehicle_dispatch.vehicle_dispatch_not_found_title")}
                            description={t.rich(
                              isCannotEditable
                                ? "order.vehicle_dispatch.need_receive"
                                : canNew() || isEditor
                                ? "order.vehicle_dispatch.vehicle_dispatch_not_found_message"
                                : " ",
                              {
                                strong: (chunks) => <span className="font-semibold">{chunks}</span>,
                              }
                            )}
                            actionLabel={
                              canNew() || isEditor
                                ? t("order.vehicle_dispatch.vehicle_dispatch_dispatch_vehicle")
                                : undefined
                            }
                            onClick={
                              canNew() || isEditor
                                ? loading || isCannotEditable
                                  ? undefined
                                  : handleOpenVehicleModal
                                : undefined
                            }
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Vehicle modal */}
      <VehicleListModal
        open={isVehicleModalListOpen}
        onClose={handleCloseVehicleModal}
        onReOpen={setIsVehicleListModalOpen}
      />

      {/* Dispatch vehicle modal */}
      <DispatchVehicleModal
        open={isDispatchVehicleModalOpen}
        vehicle={selectedOrderTripRef.current?.vehicle}
        editedTrip={selectedOrderTripRef.current}
        onClose={handleCloseDispatchVehicleModal}
        onConfirm={handleConfirmDispatchVehicle}
      />

      {/* Edit order trip modal */}
      {(!tripStatusUpdateType || tripStatusUpdateType === TripStatusUpdateType.DEFAULT) && (
        <EditOrderTripStatusModal
          open={isEditModalOpen}
          orderTrip={orderTripRef.current}
          order={order}
          status={orderTripStatusRef.current}
          onClose={handleEditModalClose}
          onSubmit={handleUpdatedOrderTrip}
        />
      )}

      {/* Message modal component */}
      <MessageModal
        open={isMessageModalOpen}
        orderTripId={Number(selectedOrderTripRef.current?.id)}
        driverUserId={Number(selectedOrderTripRef.current?.driver?.user?.id)}
        onClose={handleCloseMessageModal}
      />

      {/* Delete control vehicle confirm */}
      <ConfirmModal
        open={isConfirmDeleteModalOpen}
        icon="error"
        color="error"
        title={t("common.confirmation.delete_title", { name: selectedOrderTripRef.current?.vehicle?.vehicleNumber })}
        message={t("common.confirmation.delete_message")}
        onClose={handleCancelDelete}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDeleteTrip}
      />

      <ConfirmModal
        open={isConfirmDeleteScheduleModalOpen}
        loading={isConfirmModalLoading}
        icon="error"
        color="error"
        title={t("order.driver_notification_scheduled_modal.confirmation_delete_title", {
          name: selectedTripList?.[0]?.vehicleNumber,
        })}
        message={t("order.driver_notification_scheduled_modal.confirmation_delete_message")}
        onClose={handleCancelDeleteSchedule}
        onCancel={handleCancelDeleteSchedule}
        onConfirm={handleConfirmDeleteSchedule}
      />

      <DriverNotificationModal
        open={isNotificationScheduleModalOpen}
        trips={selectedTripList || []}
        isOnlyNotificationSchedule={isOnlyNotificationSchedule.current}
        loading={isConfirmModalLoading}
        onClose={handleCloseNotificationSchedule}
        onSubmit={handleSubmitNotificationSchedule}
      />

      {/* Update bill of lading modal */}
      <UpdateBillOfLadingModal
        open={isUpdateBillOfLadingModalOpen}
        orderTrip={orderTripRef.current}
        order={order}
        onClose={handleCancelUpdateBillOfLading}
        onSubmit={handleSubmitUpdateBillOfLadingModal}
        currentStatus={orderTripStatusRef.current}
      />

      {/* Trip expense modal */}
      <TripExpenseModal
        open={isDriverSalaryDetailModalOpen}
        id={Number(selectedOrderTripRef.current?.id)}
        onSave={handleSaveTripExpense}
        onClose={handleCloseDriverSalaryDetailModal}
      />

      {/* Confirm reset trip driver expense modal */}
      <ConfirmResetDriverExpenseModal
        open={isConfirmResetTripDriverExpenseModalOpen}
        loading={isConfirmModalLoading}
        routeInfo={{ ...order?.route }}
        customerInfo={{ ...order?.customer }}
        onClose={handleCloseResetTripDriverExpenseModal}
        onConfirm={handleConfirmResetTripDriverExpense}
      />

      {/* Trip driver expense detail modal */}
      <TripDriverExpenseDetailModal
        open={isTripDriverExpenseDetailModalOpen}
        tripCode={ensureString(selectedOrderTripRef.current?.code)}
        tripDriverExpense={selectedOrderTripRef.current?.driverExpenses || []}
        driverCost={selectedOrderTripRef.current?.driverCost || 0}
        onClose={handleCloseTripDriverExpenseDetailModal}
      />

      {/* Edit order trip status modal */}
      {tripStatusUpdateType === TripStatusUpdateType.TIMELINE && orderTripRef.current && (
        <QuickUpdateOrderTripStatusModal
          open={isEditModalOpen}
          orderTripId={Number(orderTripRef.current?.id)}
          onSaved={handleSaveOrderTripStatus}
          onClose={handleEditModalClose}
        />
      )}

      {/* Order share modal */}
      {orderTripShare && isShareTripModalOpen && (
        <OrderShareTripModal
          orderTrip={orderTripShare}
          open={isShareTripModalOpen}
          onClose={handleCloseShareTripOrder}
          onCancel={handleCloseShareTripOrder}
        />
      )}

      {/* Order trip custom field display modal */}
      {!isLoading && customFields.length > 0 && (
        <OrderTripCustomFieldDisplayModal
          open={isCustomFieldDisplayModalOpen}
          orderTrip={{ ...selectedOrderTripRef.current }}
          onClose={handleCloseCustomFieldDisplayModal}
        />
      )}
    </>
  );
};

export default OrderTripTable;
