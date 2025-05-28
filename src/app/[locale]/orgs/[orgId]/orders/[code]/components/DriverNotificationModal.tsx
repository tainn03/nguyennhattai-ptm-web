"use client";

import { OrderTripStatusType } from "@prisma/client";
import moment from "moment";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DateTimeLabel,
  InfoBox,
  ModalActions,
  ModalContent,
  ModalHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Button, DatePicker, Modal } from "@/components/molecules";
import RadioGroup, { RadioItem } from "@/components/molecules/RadioGroup/RadioGroup";
import { SendNotificationItem, SendNotificationType } from "@/forms/orderTrip";
import { useOrgSettingExtendedStorage } from "@/hooks";
import { calculateDateDifferenceInDays, isAfterDate, isBeforeDate, isValidDate, parseDate } from "@/utils/date";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { cn } from "@/utils/twcn";

const DATE_PLACEHOLDER = "--/--/----";

type DriverNotificationModalProps = {
  open: boolean;
  trips: SendNotificationItem[];
  isOnlyNotificationSchedule?: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (value: SendNotificationItem[], type: SendNotificationType) => void;
};

export const DriverNotificationModal = ({
  open,
  trips = [],
  isOnlyNotificationSchedule,
  loading,
  onClose,
  onSubmit,
}: DriverNotificationModalProps) => {
  const t = useTranslations();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();

  const [notificationType, setNotificationType] = useState<SendNotificationType>("immediate");
  const [processingTrips, setProcessingTrips] = useState<(SendNotificationItem & { messageError?: string })[]>([]);

  useEffect(() => {
    if (open) {
      setNotificationType(isOnlyNotificationSchedule ? "scheduled" : "immediate");
    }
  }, [isOnlyNotificationSchedule, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let scheduledTrips = trips;
    if (notificationType === "scheduled") {
      scheduledTrips = trips.map((trip) => {
        let driverNotificationScheduledAt: Date | null = null;
        let messageError = "";
        if (!trip.driverUserId) {
          messageError = t("order.driver_notification_scheduled_modal.notification_error_unregistered_driver");
        } else {
          const diffDays = trip.pickupDate ? calculateDateDifferenceInDays(trip.pickupDate, new Date(), true) : 0;

          if (diffDays > 0) {
            const backOneDay = moment(trip.pickupDate).add(-1, "days");
            const isAfterNowDate = isAfterDate(backOneDay.toDate());

            driverNotificationScheduledAt = backOneDay
              .set("hours", isAfterNowDate ? 7 : moment().get("hour") + 2)
              .set("minutes", 0)
              .set("seconds", 0)
              .toDate();
          }
          if (driverNotificationScheduledAt) {
            messageError = handleGetMessageError(trip.pickupDate as Date, driverNotificationScheduledAt);
          }
        }

        return {
          ...trip,
          ...(trip.lastStatusType === OrderTripStatusType.NEW && {
            driverNotificationScheduledAt: trip.driverNotificationScheduledAt || driverNotificationScheduledAt,
          }),
          messageError,
        };
      });
    } else {
      scheduledTrips = trips.map((trip) => {
        return {
          ...trip,
          ...(!trip.driverUserId && {
            messageError: t("order.driver_notification_scheduled_modal.notification_error_unregistered_driver"),
          }),
        };
      });
    }
    setProcessingTrips(scheduledTrips);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notificationType]);

  const handleGetMessageError = useCallback(
    (pickupDate: Date, selectedDate?: Date | null) => {
      if (!selectedDate) {
        return t("order.driver_notification_scheduled_modal.notification_date_is_required");
      }

      // Check selected day is before today
      if (moment(selectedDate).isSameOrBefore(new Date())) {
        return t("order.driver_notification_scheduled_modal.cannot_send_notification_before_today");
      }

      const diffDate = calculateDateDifferenceInDays(
        moment(selectedDate).format("YYYY-MM-DD"),
        moment(pickupDate).format("YYYY-MM-DD")
      );

      if (diffDate === 0) {
        return t("order.driver_notification_scheduled_modal.cannot_send_notification_equal_pickup_date");
      }

      if (diffDate >= 1) {
        return t("order.driver_notification_scheduled_modal.cannot_send_notification_greater_than_pickup_date");
      }

      return "";
    },
    [t]
  );

  const canSubmit = useMemo(() => {
    if (notificationType === "immediate") {
      return (
        processingTrips.filter(
          (item) =>
            (item.lastStatusType === OrderTripStatusType.NEW ||
              item.lastStatusType === OrderTripStatusType.PENDING_CONFIRMATION) &&
            !item.messageError
        ).length > 0
      );
    }

    // Check valid scheduled trips
    return (
      processingTrips.filter(
        (item) =>
          item.lastStatusType === OrderTripStatusType.NEW && !item.messageError && item.driverNotificationScheduledAt
      ).length > 0
    );
  }, [notificationType, processingTrips]);

  const notificationRadioOptions: RadioItem[] = useMemo(
    () => [
      {
        value: "immediate",
        label: t("order.driver_notification_scheduled_modal.immediate"),
      },
      {
        value: "scheduled",
        label: t("order.driver_notification_scheduled_modal.schedule"),
      },
    ],
    [t]
  );

  /**
   * Handle save
   */
  const handleSave = useCallback(() => {
    const savingTrips: SendNotificationItem[] = [];
    for (const processingTrip of processingTrips) {
      const { messageError: _messageError, ...otherProps } = processingTrip;
      savingTrips.push({ ...otherProps });
    }

    onSubmit && onSubmit(savingTrips, notificationType);
  }, [onSubmit, processingTrips, notificationType]);

  const handleRadioChange = useCallback((item: RadioItem) => {
    setNotificationType(item.value as SendNotificationType);
  }, []);

  const handleDateChange = useCallback(
    (id: number) => (selectedDate: Date | null) => {
      const validatedTrips = processingTrips.map((item) => {
        if (equalId(item.id, id)) {
          return {
            ...item,
            driverNotificationScheduledAt: selectedDate,
            messageError: handleGetMessageError(item.pickupDate as Date, selectedDate),
          };
        }
        return item;
      });
      setProcessingTrips(validatedTrips);
    },
    [handleGetMessageError, processingTrips]
  );

  const handleClose = useCallback(() => {
    if (loading) {
      return;
    }

    setNotificationType("immediate");
    onClose && onClose();
  }, [loading, onClose]);

  return (
    <Modal open={open} size="3xl" showCloseButton allowOverflow onClose={handleClose} onDismiss={handleClose}>
      <ModalHeader title={t("order.driver_notification_scheduled_modal.title")} />
      <ModalContent>
        <div className="flex flex-col gap-3">
          {!isOnlyNotificationSchedule && (
            <RadioGroup
              name="type"
              value={notificationType}
              items={notificationRadioOptions}
              onChange={handleRadioChange}
            />
          )}
          <p className="text-base font-medium">
            {t("order.driver_notification_scheduled_modal.table_send_notification")}
          </p>
          <TableContainer className="-mx-6" variant="paper" inside>
            <Table dense>
              <TableHead uppercase>
                <TableRow>
                  <TableCell align="center">{t("order.driver_notification_scheduled_modal.no")}</TableCell>
                  <TableCell align="center">{t("order.driver_notification_scheduled_modal.trip_code")}</TableCell>
                  <TableCell>{t("order.driver_notification_scheduled_modal.driver")}</TableCell>
                  <TableCell align="center">{t("order.driver_notification_scheduled_modal.pickup_date")}</TableCell>
                  <TableCell className={cn({ hidden: notificationType === "immediate" })}>
                    {t("order.driver_notification_scheduled_modal.scheduled_date")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processingTrips.map((trip, index) => {
                  const isNew = trip.lastStatusType === OrderTripStatusType.NEW;
                  const isPendingConfirmation = trip.lastStatusType === OrderTripStatusType.PENDING_CONFIRMATION;
                  const isError = !!trip.messageError;
                  const isBeforeToday = trip.pickupDate && isBeforeDate(trip.pickupDate, true);
                  const isScheduled = notificationType === "scheduled";
                  const isImmediate = notificationType === "immediate";
                  const isDisabled =
                    (isImmediate && !isNew && !isPendingConfirmation) ||
                    (isScheduled && (!isNew || isBeforeToday)) ||
                    isError;
                  return (
                    <TableRow key={`driver-notification-${trip.id}-${index}`}>
                      <TableCell
                        className={cn("max-w-2", {
                          "cursor-not-allowed opacity-50": isDisabled,
                        })}
                        align="center"
                      >
                        {index + 1}
                      </TableCell>
                      <TableCell
                        className={cn("max-w-44", {
                          "cursor-not-allowed opacity-50": isDisabled,
                        })}
                        align="center"
                      >
                        {trip.code}
                      </TableCell>
                      <TableCell
                        className={cn({
                          "[&>div>:first-child]:cursor-not-allowed [&>div>:first-child]:opacity-50": isDisabled,
                          "[&>div>:nth-child(2)]:cursor-not-allowed [&>div>:nth-child(2)]:opacity-50":
                            isDisabled && trip?.phoneNumber,
                        })}
                      >
                        <InfoBox
                          label={trip.driverFullName}
                          subLabel={trip?.phoneNumber}
                          subLabel2={
                            isImmediate &&
                            isError && (
                              <p className="mt-1 whitespace-break-spaces text-xs font-normal text-red-600">
                                {trip.messageError}
                              </p>
                            )
                          }
                        />
                      </TableCell>
                      <TableCell
                        className={cn("max-w-56", {
                          "cursor-not-allowed opacity-50": isDisabled,
                        })}
                        align="center"
                      >
                        <DateTimeLabel
                          value={ensureString(trip.pickupDate)}
                          type={organizationOrderRelatedDateFormat}
                          emptyLabel={DATE_PLACEHOLDER}
                        />
                      </TableCell>
                      <TableCell className={cn({ hidden: isImmediate })}>
                        <DatePicker
                          className={cn({
                            hidden:
                              isPendingConfirmation ||
                              isBeforeToday ||
                              !trip.driverUserId ||
                              (!trip.driverNotificationScheduledAt && isError),
                          })}
                          required
                          name="driverNotificationScheduledAt"
                          dateFormat="dd/MM/yyyy HH:mm"
                          mask="99/99/9999 99:99"
                          showTimeSelect
                          onChange={handleDateChange(trip.id)}
                          disabled={loading}
                          selected={
                            isValidDate(trip.driverNotificationScheduledAt)
                              ? parseDate(trip.driverNotificationScheduledAt)
                              : undefined
                          }
                        />
                        {isError && (
                          <p className="mt-1 whitespace-break-spaces text-xs font-normal text-red-600">
                            {trip.messageError}
                          </p>
                        )}
                        {!isError && isBeforeToday && (
                          <p className="whitespace-break-spaces text-xs font-normal text-red-600">
                            {t(
                              isBeforeDate(trip.pickupDate!)
                                ? "order.driver_notification_scheduled_modal.cannot_send_notification_less_than_today"
                                : "order.driver_notification_scheduled_modal.cannot_send_notification_in_today"
                            )}
                          </p>
                        )}
                        {!isError && !isBeforeToday && isPendingConfirmation && (
                          <p className="mt-1 whitespace-break-spaces text-xs font-normal text-green-600">
                            {t("order.driver_notification_scheduled_modal.notification_sent_waiting_confirmation")}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      </ModalContent>
      <ModalActions align="right">
        <Button type="button" variant="outlined" color="secondary" disabled={loading} onClick={handleClose}>
          {t("common.cancel")}
        </Button>
        <Button disabled={!canSubmit} loading={loading} onClick={handleSave}>
          {notificationType === "immediate" ? t("common.send") : t("common.save")}
        </Button>
      </ModalActions>
    </Modal>
  );
};
export default DriverNotificationModal;
