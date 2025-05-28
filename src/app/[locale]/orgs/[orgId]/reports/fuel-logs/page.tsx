"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { HttpStatusCode } from "axios";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoStatsChart } from "react-icons/io5";
import { LiaSearchSolid } from "react-icons/lia";
import { PiNoteBlankThin as PiNoteBlankThinIcon } from "react-icons/pi";
import { PiMicrosoftExcelLogo } from "react-icons/pi";

import {
  CardContent,
  DateTimeLabel,
  InfoBox,
  Link,
  NumberLabel,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import {
  Authorization,
  Button,
  Combobox,
  DatePicker,
  EmptyListSection,
  MasterActionTable,
  PageHeader,
  ProfileInfo,
} from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { SelectItem } from "@/components/molecules/Select/Select";
import { ConfirmModal, FilterStatus, Pagination } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import {
  useDriverOptions,
  useFuelLogs,
  useGasStationOptions,
  useIdParam,
  useOrgSettingExtendedStorage,
  usePermission,
  useSearchConditions,
  useVehicleOptions,
} from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useFuelLogState } from "@/redux/states";
import { FUEL_LOG_UPDATE_SEARCH_CONDITIONS, FUEL_LOG_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { exportHistoryFuelLogs } from "@/services/client/dynamicReport";
import { deleteFuelLog } from "@/services/client/fuelLog";
import { FilterOptions } from "@/types/filter";
import { LocaleType } from "@/types/locale";
import { DriverInfo, FuelLogInfo, GasStationInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps, withOrg } from "@/utils/client";
import { formatDate, startOfDayToISOString, synchronizeDates } from "@/utils/date";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";
import { ensureString, getDetailAddress } from "@/utils/string";

import { FuelLogsBarChart, GasStationChartModal } from "./components";

export default withOrg(
  ({ org, orgId, orgLink, userId }: OrgPageProps) => {
    const router = useRouter();
    const t = useTranslations();
    const locale = useLocale();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { setBreadcrumb } = useBreadcrumb();
    const { encryptId } = useIdParam();
    const { showNotification } = useNotification();

    const { searchConditions } = useFuelLogState();
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const [internalFilters, setInternalFilters] = useState(filterOptions);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isGasStationChartModalOpen, setIsGasStationChartModalOpen] = useState(false);
    const [flashingId, setFlashingId] = useState<number>();
    const [readyToFilter, setReadyToFilter] = useState(false);
    const selectedFuelLogRef = useRef<FuelLogInfo>();
    const updateRouteRef = useRef(false);
    const [isLoadingExport, setIsLoadingExport] = useState<boolean>(false);
    const { useFuelCostManagement } = useOrgSettingExtendedStorage();

    const { fuelLogs, pagination, isLoading, mutate } = useFuelLogs({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("report-statistics-fuel-log");

    const { drivers, isLoading: isDriverOptionsLoading } = useDriverOptions({ organizationId: orgId });
    const { vehicles, isLoading: isVehicleOptionsLoading } = useVehicleOptions({ organizationId: orgId });
    const { gasStations, isLoading: isGasStationOptionsLoading } = useGasStationOptions({ organizationId: orgId });

    const driverOptions: ComboboxItem[] = useMemo(
      () =>
        drivers.map((item: DriverInfo) => ({
          value: ensureString(item.id),
          label: getFullName(item.firstName, item.lastName),
        })),
      [drivers]
    );

    const vehicleOptions: ComboboxItem[] = useMemo(
      () =>
        vehicles.map((item) => ({
          value: ensureString(item.id),
          label: item.vehicleNumber,
        })),
      [vehicles]
    );

    const gasStationOptions: ComboboxItem[] = useMemo(
      () =>
        gasStations.map((item: GasStationInfo) => ({
          value: ensureString(item.id),
          label: item.name,
          subLabel: getDetailAddress(item.address),
        })),
      [gasStations]
    );

    useEffect(() => {
      const cloneFilterOptions = { ...filterOptions };

      // Set properties items for item driver Options
      cloneFilterOptions.driverId = {
        ...cloneFilterOptions.driverId,
        filters: [
          {
            ...cloneFilterOptions.driverId.filters[0],
            items: driverOptions,
          },
        ],
      };

      // Set properties items for item vehicle Options
      cloneFilterOptions.vehicleId = {
        ...cloneFilterOptions.vehicleId,
        filters: [
          {
            ...cloneFilterOptions.vehicleId.filters[0],
            items: vehicleOptions,
          },
        ],
      };

      // Set properties items for item gas Station Options
      cloneFilterOptions.gasStationId = {
        ...cloneFilterOptions.gasStationId,
        filters: [
          {
            ...cloneFilterOptions.gasStationId.filters[0],
            hideSelectedSubLabel: true,
            items: gasStationOptions,
          },
        ],
      };

      setInternalFilters(cloneFilterOptions);
    }, [driverOptions, filterOptions, gasStationOptions, vehicleOptions]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("report.feature"), link: `${orgLink}/dashboard` },
        { name: t("report.fuel_log.title"), link: `${orgLink}/reports/fuel-logs` },
      ]);

      // Get flashing id from storage
      const id = getItemString(SESSION_FLASHING_ID, {
        security: false,
        remove: true,
      });
      id && setFlashingId(Number(id));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      const queryString = getQueryString(filterOptions);
      if (updateRouteRef.current) {
        router.push(`${pathname}${queryString}`);
        dispatch<FilterOptions>({
          type: FUEL_LOG_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: FUEL_LOG_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      router.push(`${pathname}${queryString}`);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * It updates the internal filters with the new value and, if necessary, adjusts the corresponding date filter.
     *
     * @param {string} columnName - The name of the column that the filter belongs to.
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
                    optionSelected,
                  },
                ],
              };
            }
            newValue[key] = value;
          });
          return newValue;
        });
      },
      []
    );

    /**
     * It updates the internal filters with the new value and, if necessary, adjusts the corresponding date filter.
     *
     * @param {string} columnName - The name of the column that the filter belongs to.
     * @param {string} type - The type of the filter (e.g., "date" or "text").
     * @returns {Function} A function that takes the new filter value and updates the internal filters.
     */
    const handleFilterChange = useCallback(
      (columnName: string, type: string) => (value: unknown) => {
        updateRouteRef.current = true;

        let valueFilterFormat: Date | string;
        let optionSelected: ComboboxItem | SelectItem | undefined = undefined;
        switch (type) {
          case "date":
            valueFilterFormat = value as Date;
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

        // Update the internal filters with the new date range
        updateInternalFilterOptions(valueFilterFormat, columnName, optionSelected);

        // Synchronize the dates if the user selects a new date range
        const start = internalFilters.startDate.filters[0].value as Date;
        const end = internalFilters.endDate.filters[0].value as Date;
        const { from, to } = synchronizeDates(start, end, columnName, valueFilterFormat as Date);

        // Update the internal filters with the new value
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
      setFilterOptions({
        ...internalFilters,
        driverId: {
          ...internalFilters.driverId,
          filters: [
            {
              ...internalFilters.driverId.filters[0],
              items: driverOptions,
            },
          ],
        },
        vehicleId: {
          ...internalFilters.vehicleId,
          filters: [
            {
              ...internalFilters.vehicleId.filters[0],
              items: vehicleOptions,
            },
          ],
        },
        gasStationId: {
          ...internalFilters.gasStationId,
          filters: [
            {
              ...internalFilters.gasStationId.filters[0],
              items: gasStationOptions,
            },
          ],
        },
      });
    }, [driverOptions, gasStationOptions, internalFilters, setFilterOptions, vehicleOptions]);

    /**
     * Callback function for opening a dialog with driver data.
     *
     * @param item - The driver data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: FuelLogInfo) => () => {
        selectedFuelLogRef.current = item;
        setIsDeleteConfirmOpen(true);
      },
      []
    );

    /**
     * Callback function for canceling and closing a dialog.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (selectedFuelLogRef.current?.id && userId) {
        const { error } = await deleteFuelLog(
          {
            organizationId: orgId,
            id: Number(selectedFuelLogRef.current.id),
            updatedById: userId,
          },
          selectedFuelLogRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("report.fuel_log.delete_error_message"),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("report.fuel_log.delete_success_message", {
              vehicleNumber: selectedFuelLogRef.current.vehicle.vehicleNumber,
            }),
          });
        }
      }
      handleDeleteCancel();
      mutate();
    }, [handleDeleteCancel, mutate, orgId, showNotification, t, userId]);

    /**
     * Callback function for handling the end of a flashing event.
     * It clears the currently flashing ID.
     */
    const handleFlashed = useCallback(() => {
      setFlashingId(undefined);
    }, []);

    /**
     * Callback function for handling page changes.
     *
     * @param page - The new page number to be set in the pagination state.
     */
    const handlePageChange = useCallback(
      (page: number) => {
        updateRouteRef.current = true;
        setFilterOptions((prevValue) => ({
          ...prevValue,
          pagination: {
            ...prevValue.pagination,
            page,
          },
        }));
      },
      [setFilterOptions]
    );

    /**
     * Callback function for handling changes in the page size.
     *
     * @param pageSize - The new page size to be set in the pagination state.
     */
    const handlePageSizeChange = useCallback(
      (pageSize: number) => {
        updateRouteRef.current = true;
        setFilterOptions((prevValue) => ({
          ...prevValue,
          pagination: {
            ...prevValue.pagination,
            page: 1,
            pageSize,
          },
        }));
      },
      [setFilterOptions]
    );

    /**
     * Opens the gas station chart modal.
     */
    const handleOpenGasStationChartModal = useCallback(() => {
      setIsGasStationChartModalOpen(true);
    }, []);

    /**
     * Closes the gas station chart modal.
     */
    const handleCloseGasStationChartModal = useCallback(() => {
      setIsGasStationChartModalOpen(false);
    }, []);

    /**
     * Handles click on a column in the gas station chart.
     * @param gasStationId The ID of the gas station clicked
     */
    const handleClickColumnGasStationChart = useCallback(
      (gasStationId: number) => {
        updateInternalFilterOptions(ensureString(gasStationId), "gasStationId");
        setReadyToFilter(true);
        setIsGasStationChartModalOpen(false);
      },
      [updateInternalFilterOptions]
    );

    /**
     * Callback function for handling changes in filter options.
     *
     * @param options - The new filter options to set.
     */
    const handleFilterStatusChange = useCallback((options: FilterOptions) => {
      updateRouteRef.current = true;
      setInternalFilters(options);
      setFilterOptions(options);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      readyToFilter && handleApplyFilter();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readyToFilter, isGasStationChartModalOpen]);

    /**
     * Handle the export of accounts receivable by all customer.
     */
    const handleExport = useCallback(async () => {
      setIsLoadingExport(true);
      const { status, data } = await exportHistoryFuelLogs({
        startDate: startOfDayToISOString(formatDate(filterOptions.startDate.filters[0].value as Date, "YYYY-MM-DD")),
        endDate: startOfDayToISOString(formatDate(filterOptions.endDate.filters[0].value as Date, "YYYY-MM-DD")),
        organizationCode: org.code,
        driverId: filterOptions.driverId.filters[0]?.optionSelected?.value as string,
        vehicleId: filterOptions.vehicleId.filters[0]?.optionSelected?.value as string,
        gasStationId: filterOptions.gasStationId.filters[0].value as string,
        locale: locale as LocaleType,
      });
      setIsLoadingExport(false);
      if (status === HttpStatusCode.BadRequest) {
        showNotification({
          color: "info",
          title: t("report.fuel_log.no_data"),
        });
      } else if (status !== HttpStatusCode.Ok) {
        showNotification({
          color: "error",
          title: t("report.fuel_log.download_error_title"),
          message: t("report.fuel_log.download_error"),
        });
      } else {
        window.open(data);
        showNotification({
          color: "success",
          title: t("report.fuel_log.download_success_title"),
          message: t("report.fuel_log.download_success"),
        });
      }
    }, [filterOptions, locale, org.code, showNotification, t]);

    return (
      <>
        <PageHeader
          title={t("report.fuel_log.title")}
          className="md:items-end"
          description={
            <>
              <CardContent
                padding={false}
                className="flex flex-col justify-between gap-x-3 gap-y-4 lg:flex-nowrap xl:flex-row"
              >
                <div className="max-w-none flex-shrink-0 xl:max-w-[50%]">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <DatePicker
                        label={t("report.fuel_log.from_date")}
                        selected={internalFilters.startDate.filters[0].value as Date}
                        onChange={handleFilterChange("startDate", "date")}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <DatePicker
                        label={t("report.fuel_log.to_date")}
                        selected={internalFilters.endDate.filters[0].value as Date}
                        onChange={handleFilterChange("endDate", "date")}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Combobox
                        label={t("report.fuel_log.vehicle")}
                        placeholder={t("report.fuel_log.select_all")}
                        value={(internalFilters.vehicleId.filters[0].optionSelected?.value as string) ?? null}
                        onChange={handleFilterChange("vehicleId", "combobox")}
                        items={internalFilters.vehicleId.filters[0].items ?? []}
                        emptyLabel={t("report.fuel_log.select_all")}
                        loading={isVehicleOptionsLoading}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Combobox
                        label={t("report.fuel_log.driver")}
                        placeholder={t("report.fuel_log.select_all")}
                        value={(internalFilters.driverId.filters[0].optionSelected?.value as string) ?? null}
                        onChange={handleFilterChange("driverId", "combobox")}
                        items={internalFilters.driverId.filters[0].items ?? []}
                        emptyLabel={t("report.fuel_log.select_all")}
                        loading={isDriverOptionsLoading}
                      />
                    </div>
                    <div className="flex justify-between gap-4 sm:col-span-4">
                      <Combobox
                        label={t("report.fuel_log.gas_station")}
                        placeholder={t("report.fuel_log.select_all")}
                        value={(internalFilters.gasStationId.filters[0].optionSelected?.value as string) ?? null}
                        onChange={handleFilterChange("gasStationId", "combobox")}
                        items={internalFilters.gasStationId.filters[0].items ?? []}
                        emptyLabel={t("report.fuel_log.select_all")}
                        hideSelectedSubLabel
                        loading={isGasStationOptionsLoading}
                      />
                      <Button
                        icon={LiaSearchSolid}
                        onClick={handleApplyFilter}
                        loading={isLoading}
                        className="mt-8 max-w-fit"
                      >
                        {t("report.fuel_log.search")}
                      </Button>
                    </div>
                    <div className="col-span-full flex items-center justify-between">
                      <Link
                        useDefaultStyle
                        className="inline-block cursor-pointer"
                        href=""
                        onClick={handleOpenGasStationChartModal}
                      >
                        <div className="flex items-center">
                          <div className="mr-2 text-lg text-blue-700">
                            <IoStatsChart />
                          </div>
                          <span className="text-md">{t("report.fuel_log.gas_station_chart.name")}</span>
                        </div>
                      </Link>
                    </div>
                    <div className="col-span-full">
                      <FilterStatus options={filterOptions} onChange={handleFilterStatusChange} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-y-1">
                  <div className="h-full max-h-[16rem] w-full">
                    <FuelLogsBarChart
                      orgLink={orgLink}
                      filterOptions={filterOptions}
                      isLoading={isLoading}
                      fuelLogs={fuelLogs}
                    />
                  </div>
                  <Authorization resource="report-statistics-fuel-log" action="export">
                    <Button
                      className="w-fit self-end"
                      icon={PiMicrosoftExcelLogo}
                      loading={isLoadingExport}
                      disabled={isLoadingExport || isLoading}
                      onClick={handleExport}
                    >
                      {t("report.customers.action_menu.download")}
                    </Button>
                  </Authorization>
                </div>
              </CardContent>
            </>
          }
          descriptionClassName="max-w-full"
        />

        <TableContainer
          horizontalScroll
          verticalScroll
          allowFullscreen
          stickyHeader
          autoHeight
          fullHeight
          footer={
            (pagination?.pageCount || 0) > 0 && (
              <Pagination
                className="mt-4"
                showPageSizeOptions
                page={pagination?.page}
                total={pagination?.total}
                pageSize={pagination?.pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            )
          }
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="min-w-[8rem]">{t("report.fuel_log.vehicle")}</TableCell>
                <TableCell className="min-w-[10rem]">{t("report.fuel_log.driver")}</TableCell>
                <TableCell>{t("report.fuel_log.gas_station")}</TableCell>
                <TableCell align="right">{t("report.fuel_log.liters")}</TableCell>
                {useFuelCostManagement && <TableCell align="right">{t("report.fuel_log.fuel_cost")}</TableCell>}
                <TableCell align="right">{t("report.fuel_log.odometer_reading")}</TableCell>
                <TableCell align="right" className="w-44 !whitespace-break-spaces">
                  {t("report.fuel_log.average_consumption")}
                </TableCell>
                <TableCell align="center">{t("report.fuel_log.log_date")}</TableCell>
                <TableCell colSpan={2}>
                  <div className="flex items-center justify-between">
                    {t("report.fuel_log.confirmed")}
                    <Authorization resource="report-statistics-fuel-log" action="new">
                      <Button
                        variant="outlined"
                        size="small"
                        as={Link}
                        href={`${orgLink}/reports/fuel-logs/new`}
                        icon={PlusIcon}
                      >
                        {t("common.new")}
                      </Button>
                    </Authorization>
                  </div>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton  */}
              {isLoading && fuelLogs.length === 0 && (
                <SkeletonTableRow rows={10} columns={9} profileColumnIndexes={[0]} />
              )}

              {/* Empty data */}
              {!isLoading && fuelLogs.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={9} className="px-6 lg:px-8">
                    <EmptyListSection description={t("report.fuel_log.no_info")} icon={PiNoteBlankThinIcon} />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {fuelLogs.map((item, index) => (
                <TableRow key={index} flash={equalId(item.id, flashingId)} onFlashed={handleFlashed}>
                  <TableCell>
                    <Authorization
                      resource="report-statistics-fuel-log"
                      action="detail"
                      fallbackComponent={
                        <InfoBox
                          label={item.vehicle?.vehicleNumber}
                          subLabel={item.vehicle?.idNumber}
                          emptyLabel={t("common.empty")}
                        />
                      }
                    >
                      <InfoBox
                        as={Link}
                        href={`${orgLink}/reports/fuel-logs/${encryptId(Number(item.id))}?startDate=${formatDate(
                          filterOptions.startDate.filters[0].value as Date,
                          t("common.format.date")
                        )}&endDate=${formatDate(
                          filterOptions.endDate.filters[0].value as Date,
                          t("common.format.date")
                        )}`}
                        label={item.vehicle?.vehicleNumber}
                        subLabel={item.vehicle?.idNumber}
                        emptyLabel={t("common.empty")}
                      />
                    </Authorization>
                  </TableCell>
                  <TableCell>
                    <Authorization
                      resource="report-statistics-fuel-log"
                      action="detail"
                      fallbackComponent={
                        <InfoBox
                          label={getFullName(item.driver?.firstName, item.driver?.lastName)}
                          subLabel={item.driver?.phoneNumber}
                          emptyLabel={t("common.empty")}
                        />
                      }
                    >
                      <InfoBox
                        as={Link}
                        href={`${orgLink}/reports/fuel-logs/${encryptId(Number(item.id))}?startDate=${formatDate(
                          filterOptions.startDate.filters[0].value as Date,
                          t("common.format.date")
                        )}&endDate=${formatDate(
                          filterOptions.endDate.filters[0].value as Date,
                          t("common.format.date")
                        )}`}
                        label={getFullName(item.driver?.firstName, item.driver?.lastName)}
                        subLabel={item.driver?.phoneNumber}
                        emptyLabel={t("common.empty")}
                      />
                    </Authorization>
                  </TableCell>
                  <TableCell>{item.gasStation?.name}</TableCell>
                  <TableCell align="right">
                    <NumberLabel value={item.liters} emptyLabel={t("common.empty")} />
                  </TableCell>
                  {useFuelCostManagement && (
                    <TableCell align="right">
                      <NumberLabel value={item.fuelCost} type="currency" emptyLabel="-" />
                    </TableCell>
                  )}
                  <TableCell align="right">
                    <NumberLabel value={item.odometerReading} emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell align="right">
                    <NumberLabel value={item.averageConsumption} emptyLabel="-" />
                  </TableCell>
                  <TableCell align="center">
                    <DateTimeLabel value={ensureString(item.date)} type="datetime" emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell>
                    <ProfileInfo
                      user={item.confirmationBy}
                      description={<DateTimeLabel value={item.confirmationAt as Date} type="datetime" />}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell action className="w-14">
                    <Authorization
                      resource="report-statistics-fuel-log"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          fuelLogs.length >= 3 && (fuelLogs.length - 1 === index || fuelLogs.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                            ? `${orgLink}/reports/fuel-logs/${encryptId(item.id)}/edit`
                            : ""
                        }
                        copyLink={canNew() ? `${orgLink}/reports/fuel-logs/new?copyId=${encryptId(item.id)}` : ""}
                        onDelete={
                          canDelete() || (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                            ? handleDelete(item)
                            : undefined
                        }
                      />
                    </Authorization>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: t("report.fuel_log.info") })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />

        {/* Gas station chart modal */}
        <GasStationChartModal
          open={isGasStationChartModalOpen}
          startDate={internalFilters.startDate.filters[0].value as Date}
          endDate={internalFilters.endDate.filters[0].value as Date}
          onClose={handleCloseGasStationChartModal}
          onClickColumn={handleClickColumnGasStationChart}
        />
      </>
    );
  },
  {
    resource: "report-statistics-fuel-log",
    action: ["find"],
  }
);
