"use client";

import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { OrderTripStatusType } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getOrderTripDataToQuickUpdate } from "@/actions/orderTripStatus";
import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Authorization, Button, Loading, Modal } from "@/components/molecules";
import { EditOrderTripStatusModal, OrderTripStatusProcess, UpdateBillOfLadingModal } from "@/components/organisms";
import { UpdateBillOfLadingForm, UpdateStatusInputForm } from "@/forms/orderTrip";
import { useAuth, useDriverReportsTripStatusWithTypeAndName } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { updateBillOfLading, updateOrderTripStatus } from "@/services/client/orderTrip";
import { HttpStatusCode } from "@/types/api";
import { LocaleType } from "@/types/locale";
import { DriverReportInfo, OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";
import { equalId } from "@/utils/number";
import { getGeneralDispatchVehicleInfo, getOrderTripStatusFlags } from "@/utils/order";

type QuickUpdateOrderTripStatusModalProps = {
  open: boolean;
  orderTripId: number;
  isInboundOrder?: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export const QuickUpdateOrderTripStatusModal = ({
  open,
  orderTripId,
  isInboundOrder,
  onSaved,
  onClose,
}: QuickUpdateOrderTripStatusModalProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const { orgId, orgLink, user } = useAuth();
  const { showNotification } = useNotification();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isUpdateBillOfLadingModalOpen, setIsUpdateBillOfLadingModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailUpdate, setIsDetailUpdate] = useState(false);
  const [isLoadingOrderTrip, setIsLoadingOrderTrip] = useState(false);

  const [selectedStep, setSelectedStep] = useState<DriverReportInfo>();
  const [orderTrip, setOrderTrip] = useState<Partial<OrderTripInfo>>({});
  const [currentStatus, setCurrentStatus] = useState<Partial<OrderTripStatusInfo> | null>(null);

  const needUpdateStepsRef = useRef<DriverReportInfo[]>([]);

  const { isLoading: isDriverReportLoading, driverReports } = useDriverReportsTripStatusWithTypeAndName({
    organizationId: orgId,
    ...(!isInboundOrder && {
      excludedTypes: [OrderTripStatusType.WAREHOUSE_GOING_TO_PICKUP, OrderTripStatusType.WAREHOUSE_PICKED_UP],
    }),
  });

  const fetchOrderTripData = useCallback(async () => {
    if (open && orderTripId && orgId) {
      setIsLoadingOrderTrip(true);
      const { data } = await getOrderTripDataToQuickUpdate({ id: orderTripId, organizationId: orgId });
      if (data) {
        setOrderTrip(data);
        const result = getOrderTripStatusFlags(data, true);
        setCurrentStatus(result?.currentStatus);
      } else {
        showNotification({
          color: "error",
          message: t("order.trip.edit_status.message.fetch_failed", { tripCode: orderTripId }),
        });
      }
      setIsLoadingOrderTrip(false);
    }
  }, [open, orderTripId, orgId, showNotification, t]);

  useEffect(() => {
    fetchOrderTripData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderTripId]);

  const order = useMemo(() => orderTrip.order, [orderTrip.order]);

  const { remainingWeight } = useMemo(() => getGeneralDispatchVehicleInfo({ ...order }), [order]);

  const tripSteps = useMemo(
    () => driverReports.filter((step) => step.type !== OrderTripStatusType.CANCELED),
    [driverReports]
  );

  const toggleEditModal = useCallback(() => setIsEditModalOpen((prev) => !prev), []);

  const toggleConfirmModal = useCallback(() => setIsConfirmModalOpen((prev) => !prev), []);

  const toggleUpdateBillOfLadingModal = useCallback(() => {
    setIsUpdateBillOfLadingModalOpen((prev) => !prev);
  }, []);

  const orderTripInfo = useMemo(
    () => ({
      id: orderTrip?.id,
      code: orderTrip?.code,
      orderDate: order?.createdAt,
      updatedAt: orderTrip?.updatedAt,
      driver: orderTrip?.driver,
      fullName: getAccountInfo(user).displayName,
      vehicle: { vehicleNumber: orderTrip?.vehicle?.vehicleNumber },
      weight: orderTrip?.weight,
      unitOfMeasure: order?.unit?.code,
      orderId: order?.id,
      orderCode: order?.code,
      locale,
    }),
    [
      locale,
      order?.code,
      order?.createdAt,
      order?.id,
      order?.unit?.code,
      orderTrip?.code,
      orderTrip?.driver,
      orderTrip?.id,
      orderTrip?.updatedAt,
      orderTrip?.vehicle?.vehicleNumber,
      orderTrip?.weight,
      user,
    ]
  );

  const handleUpdate = useCallback(
    async (targetStep: DriverReportInfo, needUpdateSteps: DriverReportInfo[], isDetailUpdate: boolean) => {
      if (isDetailUpdate) {
        setSelectedStep(targetStep);
        needUpdateStepsRef.current = needUpdateSteps;
        targetStep.type === OrderTripStatusType.COMPLETED ? toggleUpdateBillOfLadingModal() : toggleEditModal();
        toggleConfirmModal();
        return;
      }

      const resultUpdate = [];
      const mergedSteps = [...needUpdateSteps, targetStep];

      setIsLoading(true);
      setIsDetailUpdate(false);
      for (const step of mergedSteps) {
        let updateOrderTripStatusResult;
        if (step.type === OrderTripStatusType.COMPLETED) {
          updateOrderTripStatusResult = await updateBillOfLading(orgLink, {
            id: orderTrip?.id,
            code: orderTrip?.code,
            billOfLading: "",
            billOfLadingImages: [],
            order: { id: order?.id, code: order?.code },
            status: { type: OrderTripStatusType.DELIVERED, notes: "" },
            totalTrips: (order?.trips || []).length,
            remainingWeightCapacity: remainingWeight,
            orderTripStatusOrder: orderTrip?.statuses?.length || 0,
            lastUpdatedAt: orderTrip?.updatedAt,
            deleteImage: [],
            billOfLadingReceived: null,
            fullName: getAccountInfo(user).displayName,
            driver: orderTrip?.driver,
            locale: locale as LocaleType,
            ignoreCheckExclusives: true,
          });
        } else {
          updateOrderTripStatusResult = await updateOrderTripStatus(orgLink, {
            ...orderTripInfo,
            driverReportName: step.name,
            driverReportId: step.id,
            status: step.type,
          });
        }
        updateOrderTripStatusResult.status === HttpStatusCode.Ok && resultUpdate.push(updateOrderTripStatusResult.data);
      }

      if (resultUpdate.length === mergedSteps.length) {
        showNotification({
          color: "success",
          message: t("order.trip.edit_status.message.update_success", { tripCode: orderTrip?.code }),
        });
      } else {
        showNotification({
          color: "error",
          message: t("order.trip.edit_status.message.error", { tripCode: orderTrip?.code }),
        });
      }

      setIsLoading(false);
      toggleConfirmModal();
      onSaved();
    },
    [
      locale,
      onSaved,
      order?.code,
      order?.id,
      order?.trips,
      orderTrip?.code,
      orderTrip?.driver,
      orderTrip?.id,
      orderTrip?.statuses?.length,
      orderTrip?.updatedAt,
      orderTripInfo,
      orgLink,
      remainingWeight,
      showNotification,
      t,
      toggleConfirmModal,
      toggleEditModal,
      toggleUpdateBillOfLadingModal,
      user,
    ]
  );

  const handleSaved = useCallback(
    async (data: UpdateStatusInputForm | UpdateBillOfLadingForm) => {
      const resultUpdate = [];
      setIsLoading(true);
      setIsDetailUpdate(true);
      for (const step of needUpdateStepsRef.current) {
        const updateOrderTripStatusResult = await updateOrderTripStatus(orgLink, {
          ...orderTripInfo,
          driverReportName: step.name,
          driverReportId: step.id,
          status: step.type,
        });
        updateOrderTripStatusResult.status === HttpStatusCode.Ok && resultUpdate.push(updateOrderTripStatusResult.data);
      }

      if (data.billOfLading) {
        const updatedStatusResult = await updateBillOfLading(orgLink, {
          ...data,
          status: { type: OrderTripStatusType.DELIVERED, notes: (data as UpdateBillOfLadingForm).status?.notes },
          ignoreCheckExclusives: true,
        } as UpdateBillOfLadingForm);
        updatedStatusResult.status === HttpStatusCode.Ok && resultUpdate.push(updatedStatusResult.data);
      } else {
        const updatedStatusResult = await updateOrderTripStatus(orgLink, data as UpdateStatusInputForm);
        updatedStatusResult.status === HttpStatusCode.Ok && resultUpdate.push(updatedStatusResult.data);
      }

      if (resultUpdate.length === needUpdateStepsRef.current.length + 1) {
        showNotification({
          color: "success",
          message: t("order.trip.edit_status.message.update_success", { tripCode: orderTrip?.code }),
        });
      } else {
        showNotification({
          color: "error",
          message: t("order.trip.edit_status.message.error", { tripCode: orderTrip?.code }),
        });
      }

      setIsLoading(false);
      selectedStep?.type === OrderTripStatusType.COMPLETED ? toggleUpdateBillOfLadingModal() : toggleEditModal();
      onSaved();
    },
    [
      selectedStep?.type,
      toggleUpdateBillOfLadingModal,
      toggleEditModal,
      onSaved,
      orgLink,
      orderTripInfo,
      showNotification,
      t,
      orderTrip?.code,
    ]
  );

  const renderAutoCompleteSteps = useCallback(() => {
    const displaySteps = tripSteps.filter((item) => item.type !== OrderTripStatusType.PENDING_CONFIRMATION);
    const currentIndex = displaySteps.findIndex(({ id }) => equalId(id, currentStatus?.driverReport?.id));
    const selectedIndex = displaySteps.findIndex(({ id }) => equalId(id, selectedStep?.id));

    return selectedIndex - currentIndex > 1 ? (
      <>
        <p className="py-2 text-sm text-gray-500">{t("order.trip.edit_status.system_auto_complete_previous_status")}</p>
        {(displaySteps || []).slice(currentIndex + 1, selectedIndex).map(function (item) {
          return (
            <p className="text-sm text-gray-500" key={item.id}>
              - {item.name}
            </p>
          );
        })}
      </>
    ) : null;
  }, [tripSteps, t, currentStatus?.driverReport?.id, selectedStep?.id]);

  const handleConfirm = useCallback(
    (isDetailUpdate: boolean) => () => {
      if (selectedStep) {
        const currentIndex = driverReports.findIndex(({ id }) => equalId(id, currentStatus?.driverReport?.id));
        const selectedIndex = driverReports.findIndex(({ id }) => equalId(id, selectedStep?.id));
        const needUpdateStep = driverReports.slice(currentIndex + 1, selectedIndex);
        handleUpdate(selectedStep, needUpdateStep, isDetailUpdate);
      }
    },
    [currentStatus?.driverReport?.id, driverReports, handleUpdate, selectedStep]
  );

  const handleOpenConfirmModal = useCallback(
    (step: DriverReportInfo) => {
      setSelectedStep(step);
      toggleConfirmModal();
    },
    [toggleConfirmModal]
  );

  const handleClose = useCallback(() => {
    setCurrentStatus(null);
    setSelectedStep(undefined);
    setOrderTrip({});
    onClose();
  }, [onClose]);

  return (
    <>
      <Modal open={open} size="6xl" showCloseButton onClose={handleClose}>
        <form>
          <ModalHeader
            subTitle={t("order.trip.edit_status.sub_title")}
            title={t("order.trip.edit_status.title_with_code", { tripCode: orderTrip?.code })}
          />
          <ModalContent className="min-h-[154px] overflow-x-auto sm:!px-8">
            {isDriverReportLoading || isLoadingOrderTrip ? (
              <Loading />
            ) : (
              <OrderTripStatusProcess
                loading={isLoading}
                driverReports={driverReports}
                orderTrip={orderTrip}
                onSelectedStep={handleOpenConfirmModal}
              />
            )}
          </ModalContent>
          <ModalActions align="right">
            <Button type="button" variant="outlined" color="secondary" onClick={handleClose} disabled={isLoading}>
              {t("common.cancel")}
            </Button>
          </ModalActions>
        </form>
      </Modal>

      {!isLoadingOrderTrip && order && orderTrip && (
        <>
          {/* Edit order trip modal */}
          <EditOrderTripStatusModal
            open={isEditModalOpen}
            isPromised={true}
            isInboundOrder={isInboundOrder}
            loading={isLoading}
            orderTrip={orderTrip}
            order={order}
            status={{ driverReport: selectedStep }}
            onClose={toggleEditModal}
            onSaved={handleSaved}
          />

          {/* Update bill of lading modal */}
          <UpdateBillOfLadingModal
            open={isUpdateBillOfLadingModalOpen}
            isPromised={true}
            loading={isLoading}
            orderTrip={orderTrip}
            order={order}
            currentStatus={{ driverReport: selectedStep }}
            onClose={toggleUpdateBillOfLadingModal}
            onSaved={handleSaved}
          />

          <Modal
            open={isConfirmModalOpen}
            divider={false}
            className="sm:!max-w-lg"
            onDismiss={isLoading ? undefined : toggleConfirmModal}
            onClose={isLoading ? undefined : toggleConfirmModal}
          >
            <ModalContent className="px-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <QuestionMarkCircleIcon className="h-6 w-6 text-blue-700" aria-hidden="true" />
              </div>

              <div className="mt-3 text-left sm:mt-5">
                <h3 className="text-base font-semibold leading-6 text-gray-900">
                  {t("order.trip.edit_status.confirm_change_status_title", { tripCode: orderTrip?.code })}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {t("order.trip.edit_status.confirm_change_status_message", {
                      tripCode: orderTrip?.code,
                      status: selectedStep?.name,
                    })}
                  </p>
                  {renderAutoCompleteSteps()}
                </div>
              </div>
            </ModalContent>

            <ModalActions className="border-t border-gray-300 py-4 pt-0 sm:py-6">
              <Button variant="outlined" color="secondary" onClick={toggleConfirmModal} disabled={isLoading}>
                {t("common.cancel")}
              </Button>
              <Authorization
                resource="bill-of-lading"
                action="edit"
                alwaysAuthorized={selectedStep?.type !== OrderTripStatusType.COMPLETED}
              >
                <Button
                  loading={isLoading && isDetailUpdate}
                  disabled={isLoading && !isDetailUpdate}
                  onClick={handleConfirm(true)}
                  variant="outlined"
                >
                  {selectedStep?.type === OrderTripStatusType.COMPLETED
                    ? t("order.trip.edit_status.bill_of_lading_update_label")
                    : t("order.trip.edit_status.detail_update_label")}
                </Button>
              </Authorization>
              <Button
                loading={isLoading && !isDetailUpdate}
                disabled={isLoading && isDetailUpdate}
                onClick={handleConfirm(false)}
              >
                {t("common.yes")}
              </Button>
            </ModalActions>
          </Modal>
        </>
      )}
    </>
  );
};
export default memo(QuickUpdateOrderTripStatusModal);
