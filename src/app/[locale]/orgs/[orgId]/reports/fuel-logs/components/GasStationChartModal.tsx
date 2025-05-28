"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import { PiNoteBlankThin as PiNoteBlankThinIcon } from "react-icons/pi";

import { ModalContent, ModalHeader, TableCell, TableRow } from "@/components/atoms";
import { EmptyListSection, Modal } from "@/components/molecules";
import { useAuth, useFuelLogsGasStationChart } from "@/hooks";
import { formatDate } from "@/utils/date";

import { GasStationsBarChart } from ".";

type GasStationChartModalProps = {
  startDate: Date;
  endDate: Date;
  open: boolean;
  onClose?: () => void;
  onClickColumn: (gasStationId: number) => void;
};

const GasStationChartModal = ({ open, startDate, endDate, onClose, onClickColumn }: GasStationChartModalProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();
  const { fuelLogs, isLoading } = useFuelLogsGasStationChart({ organizationId: Number(orgId), startDate, endDate });
  const labelFormat = useMemo(() => [...new Set(fuelLogs.map(({ gasStation }) => gasStation.name || ""))], [fuelLogs]);

  const size = useMemo(() => {
    if (isLoading) {
      return "3xl";
    }

    const dataSize = labelFormat.length;
    if (dataSize <= 4) {
      return "xl";
    } else if (dataSize <= 6) {
      return "2xl";
    } else if (dataSize <= 15) {
      return "5xl";
    } else if (dataSize <= 22) {
      return "7xl";
    } else {
      return "full";
    }
  }, [isLoading, labelFormat.length]);

  const handleCancelClick = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  return (
    <Modal open={open} onClose={handleCancelClick} showCloseButton size={size}>
      <ModalHeader
        title={t("report.fuel_log.gas_station_chart.title")}
        subTitle={t("report.fuel_log.gas_station_chart.sub_title", {
          startDate: formatDate(startDate, t("common.format.date")),
          endDate: formatDate(endDate, t("common.format.date")),
        })}
      />
      <ModalContent className="space-y-6">
        <div className="flex min-h-[256px] items-center justify-center">
          {fuelLogs.length === 0 ? (
            <TableRow hover={false} className="mx-auto max-w-lg">
              <TableCell colSpan={9} className="px-6 lg:px-8">
                <EmptyListSection description={t("report.fuel_log.no_info")} icon={PiNoteBlankThinIcon} />
              </TableCell>
            </TableRow>
          ) : (
            <GasStationsBarChart
              fuelLogs={fuelLogs}
              isLoading={isLoading}
              onColumnClick={onClickColumn}
              labelFormat={labelFormat}
            />
          )}
        </div>
      </ModalContent>
    </Modal>
  );
};

export default GasStationChartModal;
