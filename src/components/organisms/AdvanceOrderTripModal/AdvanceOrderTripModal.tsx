"use client";

import endOfMonth from "date-fns/endOfMonth";
import startOfMonth from "date-fns/startOfMonth";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { TbHandClick as TbHandClickIcon } from "react-icons/tb";

import {
  InfoBox,
  ModalContent,
  ModalHeader,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Button, Combobox, DatePicker, EmptyListSection, Modal } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { Pagination } from "@/components/organisms";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAdvanceOrderTrips, useAuth } from "@/hooks";
import { OrderTripInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";

type AdvanceOrderTripModalProps = {
  open: boolean;
  driverId?: number | null;
  month?: Date | null;
  driverOptions: ComboboxItem[];
  onClose: () => void;
  onSelected: (trip: OrderTripInfo, month: Date | null, driverId: number | null) => void;
};

const AdvanceOrderTripModal = ({
  open,
  driverId,
  month,
  driverOptions,
  onClose,
  onSelected,
}: AdvanceOrderTripModalProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState<Date | null>(month || null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(driverId || null);
  const [tripPaginationState, setTripPaginationState] = useState({ page: 1, pageSize: PAGE_SIZE_OPTIONS[0] });

  const { isLoading, orderTrips, pagination } = useAdvanceOrderTrips({
    organizationId: orgId,
    ...(selectedDriverId && { driverId: selectedDriverId }),
    ...(selectedMonth && {
      startDate: startOfMonth(selectedMonth).toISOString(),
      endDate: endOfMonth(selectedMonth).toISOString(),
    }),
    page: tripPaginationState.page,
    pageSize: tripPaginationState.pageSize,
  });

  useEffect(() => {
    if (open) {
      setSelectedMonth(month || null);
      setSelectedDriverId(driverId || null);
    }
  }, [open, month, driverId]);

  const handleDateChange = useCallback((date: Date | null) => {
    setSelectedMonth(date);
  }, []);

  const handleDriverChange = useCallback((value: string) => {
    setSelectedDriverId(value ? Number(value) : null);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setTripPaginationState((prev) => ({ ...prev, page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setTripPaginationState((prev) => ({ ...prev, pageSize }));
  }, []);

  const handleSelectTrip = useCallback(
    (trip: OrderTripInfo, month: Date | null, driverId: number | null) => () => {
      onSelected(trip, month, driverId);
    },
    [onSelected]
  );

  return (
    <Modal open={open} size="4xl" showCloseButton onClose={onClose} onDismiss={onClose}>
      <ModalHeader title={t("components.advance_order_trip_modal.title")} />
      <ModalContent padding={false}>
        <div className="mx-4 mt-4 grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <DatePicker
              required
              label={t("advance.month")}
              placeholder={t("advance.month_placeholder")}
              name="monthOfTrip"
              disabled={isLoading}
              selected={selectedMonth}
              onChange={handleDateChange}
              showMonthYearPicker
              dateFormat="MM/yyyy"
              mask="99/9999"
            />
          </div>

          <div className="sm:col-span-3">
            <Combobox
              label={t("advance.driver")}
              items={driverOptions}
              placeholder={t("advance.select_driver")}
              disabled={isLoading}
              value={ensureString(selectedDriverId)}
              onChange={handleDriverChange}
            />
          </div>
        </div>

        <TableContainer className="!mt-4" variant="paper" fullHeight>
          <Table dense={!isLoading}>
            <TableHead>
              <TableRow>
                <TableCell>{t(t("components.advance_order_trip_modal.trip_code"))}</TableCell>
                <TableCell>{t(t("components.advance_order_trip_modal.customer"))}</TableCell>
                <TableCell>{t(t("components.advance_order_trip_modal.route"))}</TableCell>
                <TableCell className="w-[120px]">
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && orderTrips.length === 0 && <SkeletonTableRow rows={10} columns={4} />}

              {!isLoading && orderTrips.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={4} className="px-6 lg:px-8">
                    <EmptyListSection description={t("common.empty_list")} />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {orderTrips.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="w-fit !pl-4 text-sm font-medium leading-6 !text-neutral-700">
                    {item.code}
                  </TableCell>
                  <TableCell>
                    <InfoBox
                      label={item.order?.customer?.code}
                      subLabel={item.order?.customer?.name}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <InfoBox
                      label={item.order?.route?.code}
                      subLabel={item.order?.route?.name}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end pr-4">
                      <Button
                        size="small"
                        variant="outlined"
                        icon={TbHandClickIcon}
                        iconPlacement="end"
                        data-tooltip-id="tooltip"
                        data-tooltip-content={t("components.advance_order_trip_modal.select_trip_tooltip")}
                        onClick={handleSelectTrip(item, selectedMonth, selectedDriverId)}
                      >
                        {t("components.advance_order_trip_modal.select_trip")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {(pagination?.pageCount || 0) > 0 && (
          <Pagination
            className="mt-4 px-4 pb-4 sm:p-6"
            showPageSizeOptions
            page={pagination?.page}
            total={pagination?.total}
            pageSize={pagination?.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </ModalContent>
    </Modal>
  );
};

export default AdvanceOrderTripModal;
