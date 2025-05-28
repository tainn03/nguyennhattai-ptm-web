"use client";

import isBefore from "date-fns/isBefore";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { ModalActions, ModalContent, ModalHeader } from "@/components/atoms";
import { Button, DatePicker, Modal } from "@/components/molecules";

export type WorkTimeModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (newTime: { start: string; end: string }) => void;
};

const WorkTimeModal = ({ open, onClose, onConfirm }: WorkTimeModalProps) => {
  const t = useTranslations();
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [isInvalidTimeRange, setIsInvalidTimeRange] = useState(false);

  /**
   * Handles the confirm action.
   */
  const handleConfirm = useCallback(() => {
    if (startTime && endTime) {
      if (isBefore(endTime, startTime)) {
        setIsInvalidTimeRange(true);
        return;
      }

      onConfirm({
        start: startTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
        end: endTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      });
      setStartTime(null);
      setEndTime(null);
      setIsInvalidTimeRange(false);
    } else {
      onClose();
    }
  }, [endTime, onClose, onConfirm, startTime]);

  /**
   * Handles the date change.
   * @param type - The type of the date.
   * @param date - The date to set.
   */
  const handleDateChange = useCallback(
    (type: "start" | "end") => (date: Date | null) => {
      if (type === "start") {
        setStartTime(date);
      } else {
        setEndTime(date);
      }
    },
    []
  );

  return (
    <Modal open={open} onClose={onClose} showCloseButton allowOverflow>
      <ModalHeader title={t("route_point.work_time")} />
      <ModalContent className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <DatePicker
          mask="99:99"
          selected={startTime}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={15}
          timeCaption={t("route_point.from")}
          dateFormat="HH:mm"
          label={t("route_point.from")}
          name="start-time"
          required
          onChange={handleDateChange("start")}
        />
        <DatePicker
          mask="99:99"
          selected={endTime}
          showTimeSelect
          showTimeSelectOnly
          timeIntervals={15}
          timeCaption={t("route_point.to")}
          dateFormat="HH:mm"
          label={t("route_point.to")}
          name="end-time"
          required
          onChange={handleDateChange("end")}
          errorText={isInvalidTimeRange ? t("common.message.invalid_time_range_message") : ""}
        />
      </ModalContent>
      <ModalActions>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleConfirm}>{t("common.save")}</Button>
      </ModalActions>
    </Modal>
  );
};

export default WorkTimeModal;
