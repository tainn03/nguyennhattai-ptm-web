import { OrderStatusType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiaSearchSolid } from "react-icons/lia";

import { Button, Combobox, DatePicker, TextField } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { SelectItem } from "@/components/molecules/Select/Select";
import { useCustomerOptionsOrderMonitoring, useDriverOptionsOrderMonitoring } from "@/hooks";
import { FilterOptions } from "@/types/filter";
import { CustomerInfo, DriverInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { synchronizeDates } from "@/utils/date";
import { ensureString } from "@/utils/string";

export type OrderMonitoringFormSearchProps = {
  orgId: number;
  filterOptions: FilterOptions;
  onSearch: (filterOptions: FilterOptions) => void;
  isLoading: boolean;
};

const OrderMonitoringFormSearch = ({ orgId, filterOptions, onSearch, isLoading }: OrderMonitoringFormSearchProps) => {
  const t = useTranslations();

  const updateOrderMonitoringFormRef = useRef(false);

  const OrderStatusOption: ComboboxItem[] = [
    {
      label: t("order.status.draft"),
      value: "isDraft",
    },
    {
      label: t("order.status.new"),
      value: OrderStatusType.NEW,
    },
    {
      label: t("order.status.received"),
      value: OrderStatusType.RECEIVED,
    },
    {
      label: t("order.status.in_progress"),
      value: OrderStatusType.IN_PROGRESS,
    },
    {
      label: t("order.status.completed"),
      value: OrderStatusType.COMPLETED,
    },
    {
      label: t("order.status.canceled"),
      value: OrderStatusType.CANCELED,
    },
  ];

  // Value Form In Screen
  const [internalFilters, setInternalFilters] = useState(filterOptions);

  const { drivers } = useDriverOptionsOrderMonitoring({ organizationId: orgId });

  const { customers } = useCustomerOptionsOrderMonitoring({ organizationId: orgId });

  const driverOptions: ComboboxItem[] = useMemo(
    () =>
      drivers.map((item: DriverInfo) => ({
        value: ensureString(item.id),
        label: getFullName(item.firstName, item.lastName),
        subLabel: ensureString(item.vehicle?.vehicleNumber),
      })),
    [drivers]
  );

  const customerOptions: ComboboxItem[] = useMemo(
    () =>
      customers.map((item: CustomerInfo) => ({
        value: ensureString(item.id),
        label: item.code,
        subLabel: item.name,
      })),
    [customers]
  );

  useEffect(() => {
    const cloneFilterOptions = { ...filterOptions };

    // set properties items for item driver
    cloneFilterOptions.driverId = {
      ...cloneFilterOptions.driverId,
      filters: [
        {
          ...cloneFilterOptions.driverId.filters[0],
          items: driverOptions,
        },
      ],
    };

    // set properties items for item customer
    cloneFilterOptions.customerId = {
      ...cloneFilterOptions.customerId,
      filters: [
        {
          ...cloneFilterOptions.customerId.filters[0],
          items: customerOptions,
        },
      ],
    };

    // set properties items for item order status
    cloneFilterOptions.orderStatus = {
      ...cloneFilterOptions.orderStatus,
      filters: [
        {
          ...cloneFilterOptions.orderStatus.filters[0],
          items: OrderStatusOption,
        },
      ],
    };

    // Update value in form
    setInternalFilters(cloneFilterOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions, driverOptions, customerOptions]);

  const handleSearchData = useCallback(
    (options: FilterOptions) => {
      updateOrderMonitoringFormRef.current = true;
      onSearch(options);
    },
    [onSearch]
  );

  /**
   * It updates the internal filters with the new value and, if necessary, adjusts the corresponding date filter.
   *
   * @param {Date | string} valueFilterFormat - The new filter value, formatted based on its type.
   * @param {string} keyToUpdate - The key in the internal filters that should be updated.
   * @param {ComboboxItem | SelectItem} optionSelected - The option selected in the internal filters.
   */
  const updateInternalFilterOptions = useCallback(
    (valueFilterFormat: Date | string, keyToUpdate: string, optionSelected?: ComboboxItem | SelectItem) => {
      setInternalFilters((prevValue) => {
        const { ...values } = prevValue;
        const newValue: FilterOptions = {};

        // If the current key is the one to update
        Object.keys(values).forEach((key) => {
          let value = values[key];
          if (key === keyToUpdate) {
            value = {
              ...value,
              filters: [
                {
                  ...value.filters[0],
                  value: valueFilterFormat,
                  ...(optionSelected && { optionSelected }),
                },
              ],
            };
          }
          newValue[key] = value;
        });
        return newValue;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * It updates the internal filters with the new value and, if necessary, adjusts the corresponding date filter.
   *
   * @param {string} columnName - The name of the column that the filter belongs to.
   * @param {string} type - The type of the filter (e.g., "date" or "text").
   * @returns {Function} A function that takes the new filter value and updates the internal filters.
   */
  const handleChangeFormCondition = useCallback(
    (columnName: string, type: string) => (value: unknown) => {
      updateOrderMonitoringFormRef.current = true;

      let valueFilterFormat: Date | string | ComboboxItem;
      let optionSelected: ComboboxItem | SelectItem | undefined = undefined;
      switch (type) {
        case "date":
          valueFilterFormat = (value as Date) ?? new Date();
          break;
        case "text":
          valueFilterFormat = value as string;
          break;
        case "combobox":
          valueFilterFormat = value as string;
          optionSelected = internalFilters[columnName].filters[0]?.items?.find(
            (option) => ensureString(option.value) === valueFilterFormat
          ) as ComboboxItem;

          break;
        default:
          valueFilterFormat = "";
          break;
      }

      // Update the internal filters with the new value
      updateInternalFilterOptions(valueFilterFormat, columnName, optionSelected);

      // Synchronize the dates if the user selects a new date range
      const start = internalFilters.startDate.filters[0].value as Date;
      const end = internalFilters.endDate.filters[0].value as Date;
      const { from, to } = synchronizeDates(start, end, columnName, valueFilterFormat as Date);

      // Update the internal filters with the new date range
      updateInternalFilterOptions(from, "startDate");
      updateInternalFilterOptions(to, "endDate");
    },
    [internalFilters, updateInternalFilterOptions]
  );

  /**
   * Apply the internal filters to the actual filter options.
   * This function is called when the user finishes setting up the filters and clicks on the "Apply" button.
   */
  const handleApplyFilter = useCallback(() => {
    handleSearchData(internalFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalFilters, handleSearchData]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <DatePicker
          label={t("order_monitoring.from_date")}
          selected={internalFilters.startDate.filters[0].value as Date}
          onChange={handleChangeFormCondition("startDate", "date")}
        />
      </div>
      <div className="sm:col-span-3">
        <DatePicker
          label={t("order_monitoring.to_date")}
          selected={internalFilters.endDate.filters[0].value as Date}
          onChange={handleChangeFormCondition("endDate", "date")}
        />
      </div>
      <div className="sm:col-span-3">
        <TextField
          className="sm:w-full sm:text-sm sm:leading-6"
          type="text"
          label={t("order_monitoring.order_code")}
          value={internalFilters.orderCode.filters[0].value as string}
          onChange={(event) => {
            handleChangeFormCondition("orderCode", "text")(event?.target.value);
          }}
          placeholder={t("order_monitoring.order_code_placeholder")}
        />
      </div>
      <div className="sm:col-span-3">
        <Combobox
          label={t("order_monitoring.driver")}
          items={internalFilters.driverId.filters[0].items ?? []}
          value={(internalFilters.driverId.filters[0].optionSelected?.value as string) ?? null}
          onChange={handleChangeFormCondition("driverId", "combobox")}
          placeholder={t("order_monitoring.driver_placeholder")}
        />
      </div>
      <div className="sm:col-span-3">
        <Combobox
          label={t("order_monitoring.customer_name")}
          items={internalFilters.customerId.filters[0].items ?? []}
          value={(internalFilters.customerId.filters[0].optionSelected?.value as string) ?? null}
          onChange={handleChangeFormCondition("customerId", "combobox")}
          placeholder={t("order_monitoring.customer_name_placeholder")}
        />
      </div>
      <div className="flex justify-between gap-4 sm:col-span-3">
        <Combobox
          label={t("order_monitoring.order_status")}
          items={internalFilters.orderStatus.filters[0].items ?? []}
          value={(internalFilters.orderStatus.filters[0].optionSelected?.value as string) ?? null}
          onChange={handleChangeFormCondition("orderStatus", "combobox")}
          placeholder={t("order_monitoring.order_status_placeholder")}
        />
        <div className="flex items-end justify-end">
          <Button icon={LiaSearchSolid} className="mt-8 max-w-fit" onClick={handleApplyFilter} loading={isLoading}>
            {t("order_monitoring.search")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderMonitoringFormSearch;
