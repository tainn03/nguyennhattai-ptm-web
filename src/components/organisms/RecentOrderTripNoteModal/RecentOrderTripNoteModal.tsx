"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Button, Combobox, EmptyListSection, Modal } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import Pagination from "@/components/organisms/Pagination/Pagination";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useAuth, useCustomerOptions, useRecentOrderTripNotes } from "@/hooks";
import { CustomerInfo } from "@/types/strapi";
import { ensureString } from "@/utils/string";

type RecentOrderTripNoteModalProps = {
  open: boolean;
  customerId: number | null;
  onSelect: (note: string | null) => void;
  onClose: () => void;
};
const RecentOrderTripNoteModal = ({ open, customerId, onSelect, onClose }: RecentOrderTripNoteModalProps) => {
  const { orgId } = useAuth();
  const t = useTranslations();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(customerId);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const { isLoading, orderTrips, pagination } = useRecentOrderTripNotes({
    organizationId: orgId,
    customerId: selectedCustomerId || null,
    page,
    pageSize,
  });
  const { customers, isLoading: isOptionsLoading } = useCustomerOptions({ organizationId: orgId });

  const customerOptions: ComboboxItem[] = useMemo(
    () =>
      customers.map((item: CustomerInfo) => ({ value: ensureString(item.id), label: item.code, subLabel: item.name })),
    [customers]
  );

  useEffect(() => {
    if (!isOptionsLoading && customerId) {
      setSelectedCustomerId(customerId);
    }
  }, [customerId, isOptionsLoading]);

  const handleComboboxChange = useCallback((value: string) => {
    setSelectedCustomerId(value ? Number(value) : null);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setPage(page);
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPageSize(pageSize);
  }, []);

  const handleSelect = useCallback(
    (note: string | null) => () => {
      onSelect(note);
      onClose();
    },
    [onClose, onSelect]
  );

  return (
    <Modal open={open} size="5xl" showCloseButton onClose={onClose} onDismiss={onClose}>
      <ModalHeader title={t("components.recent_order_trip_note_modal.title")} />
      <ModalContent padding={false}>
        <div className="ml-4 mt-4 flex max-w-[22rem] justify-between gap-4">
          <Combobox
            label={t("components.recent_order_trip_note_modal.customer")}
            loading={isOptionsLoading}
            placeholder={t("components.recent_order_trip_note_modal.customer_name_placeholder")}
            items={customerOptions}
            value={ensureString(selectedCustomerId)}
            onChange={handleComboboxChange}
            emptyLabel={t("report.customers.customer_name_placeholder")}
          />
        </div>

        <TableContainer className="!mt-4" variant="paper" fullHeight>
          <Table dense={!isLoading}>
            <TableHead>
              <TableRow>
                <TableCell>{t(t("components.recent_order_trip_note_modal.trip_code"))}</TableCell>
                <TableCell>{t(t("components.recent_order_trip_note_modal.route"))}</TableCell>
                <TableCell>{t(t("components.recent_order_trip_note_modal.note"))}</TableCell>
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
                      label={item.order?.route?.code || t("components.recent_order_trip_note_modal.non_fixed_route")}
                      subLabel={item.order?.route?.name}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell nowrap={false}>{item.notes}</TableCell>
                  <TableCell>
                    <div className="flex justify-end pr-4">
                      <Button
                        size="small"
                        variant="outlined"
                        icon={TbHandClickIcon}
                        onClick={handleSelect(item.notes)}
                        iconPlacement="end"
                        data-tooltip-id="tooltip"
                        data-tooltip-content={t("components.recent_order_trip_note_modal.using_note")}
                      >
                        {t("components.recent_order_trip_note_modal.using")}
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

export default RecentOrderTripNoteModal;
