"use client";

import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { OrderStatusType } from "@prisma/client";
import moment from "moment";
import { useTranslations } from "next-intl";
import { ChangeEvent, Fragment, useCallback, useEffect, useState } from "react";

import { Button, CheckboxGroup, DatePicker, TextField } from "@/components/molecules";
import { CheckboxItem } from "@/components/molecules/CheckboxGroup/CheckboxGroup";
import { FilterOptions } from "@/types/filter";
import { synchronizeDates } from "@/utils/date";
import { ensureString } from "@/utils/string";

export type OrderListModalFilterOptions = {
  orderDateFromFilter: Date | null;
  orderDateToFilter: Date | null;
  unitOfMeasureName: string;
  merchandiseName: string;
  customerName: string;
  orderStatus: CheckboxItem[];
};

export type OrderFilterModalProps = {
  open: boolean;
  onClose?: () => void;
  onConfirm?: (filter: OrderListModalFilterOptions) => void;
  filterOptions: FilterOptions;
};

const OrderFilterModal = ({ open, onClose, onConfirm, filterOptions }: OrderFilterModalProps) => {
  const t = useTranslations();
  const [internalFilterOptions, setInternalFilterOptions] = useState<FilterOptions>(filterOptions);
  const [selectedFromDate, setSelectedFromDate] = useState<Date | null>(new Date());
  const [selectedToDate, setSelectedToDate] = useState<Date | null>(moment(new Date()).add(7, "days").toDate());

  const [unit, setUnit] = useState<string>("");
  const [merchandise, setMerchandise] = useState<string>("");
  const [customer, setCustomer] = useState<string>("");

  const OrderStatusOption: CheckboxItem[] = [
    {
      label: t("order.status.draft"),
      value: "isDraft",
      checked: false,
    },
    {
      label: t("order.status.new"),
      value: OrderStatusType.NEW,
      checked: false,
    },
    {
      label: t("order.status.received"),
      value: OrderStatusType.RECEIVED,
      checked: false,
    },
    {
      label: t("order.status.in_progress"),
      value: OrderStatusType.IN_PROGRESS,
      checked: false,
    },
    {
      label: t("order.status.completed"),
      value: OrderStatusType.COMPLETED,
      checked: false,
    },
    {
      label: t("order.status.canceled"),
      value: OrderStatusType.CANCELED,
      checked: false,
    },
  ];

  const [orderStatus, setOrderStatus] = useState<CheckboxItem[]>(OrderStatusOption);

  useEffect(() => {
    setInternalFilterOptions(filterOptions);
  }, [filterOptions]);

  const handleInputInit = useCallback(() => {
    setSelectedFromDate((internalFilterOptions["orderDateFromFilter"].filters[0].value as Date) || new Date());
    setSelectedToDate((internalFilterOptions["orderDateToFilter"].filters[0].value as Date) || new Date());

    internalFilterOptions["unitOfMeasureName"]?.filters[0]?.value &&
      setUnit(internalFilterOptions["unitOfMeasureName"].filters[0].value as string);

    internalFilterOptions["merchandiseName"]?.filters[0]?.value &&
      setMerchandise(internalFilterOptions["merchandiseName"].filters[0]?.value as string);

    internalFilterOptions["customerName"]?.filters[0]?.value &&
      setCustomer(internalFilterOptions["customerName"].filters[0].value as string);

    internalFilterOptions["orderStatus"]?.filters[0]?.value &&
      setOrderStatus(internalFilterOptions["orderStatus"].filters[0].value as CheckboxItem[]);
  }, [internalFilterOptions]);

  useEffect(() => {
    open && handleInputInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, internalFilterOptions]);

  const handleInputChange = useCallback(
    (type: string) => (value: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      switch (type) {
        case "unitOfMeasureName":
          setUnit(ensureString(value.target.value));
          break;
        case "merchandise":
          setMerchandise(ensureString(value.target.value));
          break;
        case "customer":
          setCustomer(ensureString(value.target.value));
          break;
        default:
          break;
      }
    },
    []
  );

  const handleDateChange = useCallback(
    (type: string) => (date: Date | null) => {
      // Synchronize the dates if the user selects a new date range
      const start = selectedFromDate as Date;
      const end = selectedToDate as Date;

      let columnName = "";
      switch (type) {
        case "orderDateFromFilter":
          columnName = "startDate";

          break;
        case "orderDateToFilter":
          columnName = "endDate";
          break;
        default:
          break;
      }
      const { from, to } = synchronizeDates(start, end, columnName, date as Date, true);
      // Update the internal filters with the new date range
      setSelectedFromDate(from);
      setSelectedToDate(to);
    },
    [selectedFromDate, selectedToDate]
  );

  const handleDateCheckboxGroup = useCallback((itemCheckbox: CheckboxItem[]) => {
    setOrderStatus(itemCheckbox);
  }, []);

  const handleClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    const objectFilter: OrderListModalFilterOptions = {
      orderDateFromFilter: selectedFromDate,
      orderDateToFilter: selectedToDate,
      unitOfMeasureName: unit,
      merchandiseName: merchandise,
      customerName: customer,
      orderStatus,
    };

    onConfirm && onConfirm(objectFilter);
  }, [customer, merchandise, onConfirm, orderStatus, selectedFromDate, selectedToDate, unit]);

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full sm:pl-16">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col divide-y divide-gray-200 bg-white shadow-xl">
                    <div className="h-0 flex-1 overflow-y-auto">
                      <div className="bg-blue-700 px-4 py-6 sm:px-6">
                        <div className="flex items-center justify-between">
                          <Dialog.Title className="text-base font-semibold leading-6 text-white">
                            {t("order.filter_modal.title")}
                          </Dialog.Title>
                          <div className="ml-3 flex h-7 items-center">
                            <Button icon={XMarkIcon} onClick={handleClose} />
                          </div>
                        </div>
                        <div className="mt-1">
                          <p className="text-sm text-blue-300">
                            {t.rich("order.filter_modal.description", {
                              strong: (chunk) => <strong>{chunk}</strong>,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col justify-between">
                        <div className="divide-y divide-gray-200 px-4 sm:px-6">
                          <div className="space-y-6 py-6">
                            <span className="text-base font-semibold leading-6">{t("order.filter_modal.order")}</span>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div className="col-span-1">
                                <DatePicker
                                  label={t("order.filter_modal.date_from")}
                                  selected={selectedFromDate}
                                  onChange={handleDateChange("orderDateFromFilter")}
                                />
                              </div>

                              <div className="col-span-1">
                                <DatePicker
                                  label={t("order.filter_modal.date_to")}
                                  selected={selectedToDate}
                                  onChange={handleDateChange("orderDateToFilter")}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div className="col-span-full">
                                <TextField
                                  label={t("order.filter_modal.unit_of_measure")}
                                  id="unit"
                                  name="unit"
                                  value={unit}
                                  onChange={handleInputChange("unitOfMeasureName")}
                                  placeholder={t("order.filter_modal.unit_of_measure_placeholder")}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div className="col-span-full">
                                <CheckboxGroup
                                  label={t("order.status.title")}
                                  name="checkboxDirectionColumn"
                                  direction="column"
                                  items={orderStatus.map((item) => ({
                                    ...item,
                                    ...(item.subLabel && { subLabel: t(item.subLabel) }),
                                    label: item.label && t(item.label),
                                  }))}
                                  onChange={handleDateCheckboxGroup}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6 py-6">
                            <span className="text-base font-semibold leading-6">
                              {t("order.filter_modal.merchandise")}
                            </span>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div className="col-span-full">
                                <TextField
                                  id="merchandise"
                                  name="merchandise"
                                  value={merchandise}
                                  onChange={handleInputChange("merchandise")}
                                  placeholder={t("order.filter_modal.merchandise_placeholder")}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6 py-6">
                            <span className="text-base font-semibold leading-6">
                              {t("order.filter_modal.customer")}
                            </span>

                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div className="col-span-full">
                                <TextField
                                  id="customer"
                                  name="customer"
                                  value={customer}
                                  onChange={handleInputChange("customer")}
                                  placeholder={t("order.filter_modal.customer_placeholder")}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 justify-end gap-4 px-4 py-4">
                      <Button variant="outlined" color="secondary" onClick={handleClose}>
                        {t("order.filter_modal.cancel")}
                      </Button>
                      <Button onClick={handleConfirm}>{t("order.filter_modal.apply")}</Button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default OrderFilterModal;
