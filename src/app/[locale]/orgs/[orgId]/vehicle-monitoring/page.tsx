"use client";

import "react-datepicker/dist/react-datepicker.css";

import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react";
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { addMonths, addWeeks, endOfWeek, format, subMonths, subWeeks } from "date-fns";
import getWeek from "date-fns/getWeek";
import vi from "date-fns/locale/vi";
import { useAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiaSearchSolid } from "react-icons/lia";

import { getOrderTripsByDayWithSQL, getTotalOrderTripsCountByDay } from "@/actions/orderTrip";
import { Button, Combobox, DatePicker, PageHeader } from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { Pagination } from "@/components/organisms";
import {
  useAuth,
  useSearchConditions,
  useSubcontractorOptions,
  useVehicleMonitoring,
  useVehicleOptions,
} from "@/hooks";
import { useBreadcrumb } from "@/redux/actions";
import { vehicleMonitoringAtom } from "@/states";
import { SubcontractorInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { formatDate, getClientTimezone } from "@/utils/date";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { getDaysInMonth, getDaysInWeek } from "@/utils/prototype";
import { ensureString } from "@/utils/string";
import { cn } from "@/utils/twcn";

import {
  DoughnutChart,
  OrderTripListModal,
  TimelineDateCellEvent,
  VehicleInfoCell,
  VehicleMonitoringTableHeader,
} from "./components";

enum ViewMode {
  MONTH = "month",
  WEEK = "week",
}

export default function Page() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { orgLink, orgId } = useAuth();
  const { setBreadcrumb } = useBreadcrumb();

  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.WEEK);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const updateRouteRef = useRef(false);
  const [vehicleInfo, setVehicleInfo] = useState<{ vehicleId: number; vehicleNumber: string; date: string }>();
  const [{ vehicleMonitoringConditions }, setVehicleMonitoringState] = useAtom(vehicleMonitoringAtom);
  const [filterOptions, setFilterOptions] = useSearchConditions(vehicleMonitoringConditions);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<string | null>(null);
  const [filterParams, setFilterParams] = useState({
    ...getFilterRequest(filterOptions),
    idVehicle: "",
    idSubcontractor: "",
  });
  const [isLoadingOrderTrip, setIsLoadingOrderTrip] = useState(false);
  const [orderTripData, setOrderTripData] = useState<Record<string, string>[]>([]);
  const [totalCountPerDay, setTotalCountPerDay] = useState<Record<string, string>[]>([]);

  const { vehicles } = useVehicleOptions({ organizationId: orgId });
  const { subcontractors, isLoading: isLoadingSubcontractors } = useSubcontractorOptions({ organizationId: orgId });
  const {
    vehicleMonitoring,
    pagination,
    isLoading: isLoadingVehicles,
  } = useVehicleMonitoring({ ...filterParams, isFetchSubcontractorId: true, isFetchOwnerType: true });

  const isLoading = isLoadingSubcontractors || isLoadingVehicles || isLoadingOrderTrip;

  const vehicleOptions: ComboboxItem[] = useMemo(
    () =>
      vehicles.map((item: VehicleInfo) => ({
        value: ensureString(item.id),
        label: ensureString(item.vehicleNumber),
        subLabel: getFullName(item.driver?.firstName, item.driver?.lastName),
      })),
    [vehicles]
  );

  const subcontractorOptions: ComboboxItem[] = useMemo(
    () =>
      subcontractors.map((item: SubcontractorInfo) => ({
        value: ensureString(item.id),
        label: ensureString(item.code),
        subLabel: ensureString(item.name),
      })),
    [subcontractors]
  );

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: t("order.management"), link: orgLink },
      { name: t("vehicle_monitoring.title"), link: `${orgLink}/reports/vehicle-monitoring` },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Setting the initial filter options based on the URL query parameters.
   */
  useEffect(() => {
    if (updateRouteRef.current) {
      const queryString = getQueryString(filterOptions);
      router.push(`${pathname}${queryString}`);
      setVehicleMonitoringState((prev) => ({
        ...prev,
        searchQueryString: queryString,
        vehicleMonitoringConditions: filterOptions,
      }));
    }
    setFilterParams((prevParams) => ({
      ...prevParams,
      ...getFilterRequest(filterOptions),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions]);

  const daysInView = useMemo(
    () =>
      viewMode === ViewMode.MONTH
        ? getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth() + 1)
        : getDaysInWeek(currentDate),
    [viewMode, currentDate]
  );

  /**
   * Handles the change of the view mode in the vehicle monitoring page.
   *
   * @param newView - The new view mode to set. Can be either "month" or "week".
   */
  const handleViewChange = useCallback((newView: ViewMode) => {
    setViewMode(newView);
  }, []);

  /**
   * Advances the current date to the next period based on the current view mode.
   */
  const handleNext = useCallback(() => {
    setCurrentDate((prevDate) => (viewMode === ViewMode.MONTH ? addMonths(prevDate, 1) : addWeeks(prevDate, 1)));
  }, [viewMode]);

  /**
   * Handles the action of navigating to the previous time period based on the current view mode.
   */
  const handlePrevious = useCallback(() => {
    setCurrentDate((prevDate) => (viewMode === ViewMode.MONTH ? subMonths(prevDate, 1) : subWeeks(prevDate, 1)));
  }, [viewMode]);

  /**
   * Fetches order trips and their total count per day for the vehicles in the monitoring list.
   */
  const fetchOrderTrips = useCallback(async () => {
    if (!vehicleMonitoring) return;
    setIsLoadingOrderTrip(true);
    const vehicleIds = vehicleMonitoring.map((vehicle) => Number(vehicle.id));
    const clientTimezone = getClientTimezone();
    const { data: trips } = await getOrderTripsByDayWithSQL({
      vehicleIds,
      startDate: daysInView[0],
      endDate: daysInView[daysInView.length - 1],
      clientTimezone,
    });
    const { data: totalCountPerDay } = await getTotalOrderTripsCountByDay({
      vehicleIds,
      startDate: daysInView[0],
      endDate: daysInView[daysInView.length - 1],
      clientTimezone,
    });
    setOrderTripData(trips || []);
    setTotalCountPerDay(totalCountPerDay || []);
    setIsLoadingOrderTrip(false);
  }, [vehicleMonitoring, daysInView]);

  /**
   * Fetching the OrderTrip data when vehicleMonitoring and daysInView change.
   */
  useEffect(() => {
    if (vehicleMonitoring.length > 0 && !isLoadingVehicles) {
      fetchOrderTrips();
    }
  }, [vehicleMonitoring, isLoadingVehicles, viewMode, currentDate, fetchOrderTrips]);

  /**
   * Returns the total number of order trips for a specific vehicle on a given day.
   *
   * @param vehicleId - The ID of the vehicle to query.
   * @param day - The target date in "YYYY-MM-DD" format.
   * @returns The total count of trips for that vehicle on that day, or `undefined` if not found.
   */
  const getTotalCountForVehicleAndDay = useCallback(
    (vehicleId: number, day: string) => {
      const totalOrderTripsCountByDay = totalCountPerDay.find(
        (total) => Number(total.vehicleId) === Number(vehicleId) && formatDate(total.day, "YYYY-MM-DD") === day
      );
      return totalOrderTripsCountByDay?.totalCountPerDay;
    },
    [totalCountPerDay]
  );

  /**
   * Transforms the list of vehicles (`vehicleMonitoring`) into a formatted array of resource objects,
   * each containing key details for display such as vehicle ID, name, driver, and owner information.
   */
  const resources = useMemo(() => {
    return vehicleMonitoring.map((vehicle) => {
      const owner =
        subcontractors.find((sub) => Number(sub.id) === Number(vehicle.subcontractorId))?.name || t("common.empty");

      return {
        id: vehicle.id,
        name: vehicle.vehicleNumber,
        ownerType: vehicle.ownerType,
        driver: vehicle.driver ? `${vehicle.driver.lastName} ${vehicle.driver.firstName}` : t("common.empty"),
        owner: owner,
      };
    });
  }, [vehicleMonitoring, subcontractors, t]);

  /**
   * Handles the change of the selected date in the date picker.
   *
   * Updates the `currentDate` state with the newly selected date and closes the date picker.
   *
   * @param {Date} date - The new date selected by the user.
   */
  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
    setIsDatePickerOpen(false);
  }, []);

  /**
   * Handles the search action.
   * Updates the filter parameters based on the current filter options,
   * selected vehicle, and selected subcontractor.
   */
  const handleSearch = useCallback(() => {
    setFilterParams({
      ...getFilterRequest(filterOptions),
      idVehicle: selectedVehicle || "",
      idSubcontractor: selectedSubcontractor || "",
    });
  }, [filterOptions, selectedVehicle, selectedSubcontractor]);

  // Floating UI for custom popup positioning
  const { refs, floatingStyles } = useFloating({
    open: isDatePickerOpen,
    onOpenChange: setIsDatePickerOpen,
    whileElementsMounted: autoUpdate,
    placement: "bottom-start",
    middleware: [offset(10), flip(), shift()],
  });

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
   * Handles changing the page size for pagination.
   * @param {number} pageSize - The new page size to set.
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
   * Handles the action of opening the Order Trip List modal.
   * Updates the vehicle information (vehicleId and day) and sets the modal state to open.
   *
   * @param {number} vehicleId - The ID of the vehicle.
   * @param {string} day - The selected day for the order trip list.
   */
  const handleOpenOrderTripListModal = useCallback(
    (vehicleId: number, vehicleNumber: string, date: string) => () => {
      setVehicleInfo({
        vehicleId,
        vehicleNumber,
        date,
      });
      setOpen(true);
    },
    []
  );

  const handleCloseOrderTripListModal = useCallback(() => {
    setOpen(false);
    setVehicleInfo(undefined);
  }, []);

  return (
    <>
      <PageHeader
        title={t("vehicle_monitoring.title")}
        showBorderBottom={false}
        className="!mb-0 flex-wrap justify-center gap-y-2 sm:!mb-0"
        description={
          <>
            <div className="flex flex-col gap-4">
              <Combobox
                label={t("vehicle_monitoring.vehicle")}
                placeholder={t("vehicle_monitoring.vehicle_placeholder")}
                items={vehicleOptions}
                emptyLabel={t("vehicle_monitoring.vehicle_placeholder")}
                onChange={(value) => setSelectedVehicle(value)}
              />
              <div className="flex flex-nowrap justify-between gap-4">
                <Combobox
                  label={t("report.subcontractors.subcontractor")}
                  placeholder={t("report.subcontractors.subcontractor_placeholder")}
                  items={subcontractorOptions}
                  emptyLabel={t("report.subcontractors.subcontractor_placeholder")}
                  onChange={(value) => setSelectedSubcontractor(value)}
                />
                <div className="flex items-end justify-end">
                  <Button icon={LiaSearchSolid} className="max-w-fit" onClick={handleSearch}>
                    {t("vehicle_monitoring.search")}
                  </Button>
                </div>
              </div>
            </div>
          </>
        }
        actionComponent={<DoughnutChart trips={orderTripData} />}
        actionHorizontal
      />
      <div className="border border-gray-300 py-4 sm:rounded-md">
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap-reverse items-center justify-center gap-4 px-4 sm:flex-nowrap sm:justify-between">
          {/* DatePicker */}
          <div>
            <button
              ref={refs.setReference}
              onClick={() => setIsDatePickerOpen((prev) => !prev)}
              className="flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {viewMode === ViewMode.MONTH
                ? format(currentDate, "MM/yyyy")
                : format(currentDate, t("common.format.fns.date"))}
              <CalendarDaysIcon className="ml-2 h-5 w-5 text-gray-500" />
            </button>

            {isDatePickerOpen && (
              <div ref={refs.setFloating} style={floatingStyles} className="z-50">
                <DatePicker
                  selected={currentDate}
                  onChange={handleDateChange}
                  className="[&>div>div>*:last-child>:first-child>:first-child]:!hidden"
                  inline
                  mask={viewMode === ViewMode.MONTH ? "99/9999" : "99/99/9999"}
                  dateFormat={viewMode === ViewMode.MONTH ? "MM/yyyy" : t("common.format.fns.date")}
                  showMonthYearPicker={viewMode === ViewMode.MONTH}
                />
              </div>
            )}
          </div>

          {/* Display month/year or week/year, along with Next and Previous buttons */}
          <div className="flex items-center space-x-4">
            <button className="rounded-md bg-white px-3 py-2 ring-1 ring-inset ring-gray-300" onClick={handlePrevious}>
              <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-center text-lg font-semibold capitalize">
              {viewMode === ViewMode.MONTH
                ? format(currentDate, "MMMM - yyyy", { locale: vi })
                : t("vehicle_monitoring.timeline.week") +
                  ` ${getWeek(endOfWeek(currentDate), {
                    weekStartsOn: 1,
                  })} - ${format(endOfWeek(currentDate), "yyyy")}`}
              {/* Display week */}
            </span>
            <button className="rounded-md bg-white px-3 py-2 ring-1 ring-inset ring-gray-300" onClick={handleNext}>
              <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex space-x-2">
            <span className="isolate inline-flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => handleViewChange(ViewMode.WEEK)}
                className={cn(
                  "relative inline-flex items-center rounded-l-md px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 focus:z-10",
                  {
                    "bg-blue-500 text-white hover:bg-blue-400": viewMode === ViewMode.WEEK,
                    "bg-white text-gray-700 hover:bg-gray-50": viewMode !== ViewMode.WEEK,
                  }
                )}
              >
                {t("vehicle_monitoring.timeline.week")}
              </button>
              <button
                type="button"
                onClick={() => handleViewChange(ViewMode.MONTH)}
                className={cn(
                  "relative -ml-px inline-flex items-center rounded-r-md px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 focus:z-10",
                  {
                    "bg-blue-500 text-white hover:bg-blue-400": viewMode === ViewMode.MONTH,
                    "bg-white text-gray-700 hover:bg-gray-50": viewMode !== ViewMode.MONTH,
                  }
                )}
              >
                {t("vehicle_monitoring.timeline.month")}
              </button>
            </span>
          </div>
        </div>

        {/* Information display table */}
        <div className="max-h-[70vh] overflow-x-auto overflow-y-auto border-y border-gray-200">
          <table className="min-w-full bg-white">
            <VehicleMonitoringTableHeader daysInView={daysInView} viewMode={viewMode} />

            <tbody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, rowIndex) => (
                    <tr key={`skeleton-${rowIndex}`}>
                      {[...Array(2)].map((_, colIndex) => (
                        <td
                          key={`skeleton-vehicle-${colIndex}`}
                          className={cn("border p-2", {
                            "min-w-[200px] max-w-[200px]": viewMode === ViewMode.MONTH,
                            "min-w-[146px] max-w-[146px]": viewMode === ViewMode.WEEK,
                          })}
                        >
                          <div className="h-10 w-full animate-pulse rounded bg-gray-300" />
                        </td>
                      ))}

                      {daysInView.map((_day, colIndex) => (
                        <td
                          key={`skeleton-day-${colIndex}`}
                          className={cn("border p-2", {
                            "min-w-[200px] max-w-[200px]": viewMode === ViewMode.MONTH,
                            "min-w-[146px] max-w-[146px]": viewMode === ViewMode.WEEK,
                          })}
                        >
                          <div className="h-10 w-full animate-pulse rounded bg-gray-300" />
                        </td>
                      ))}
                    </tr>
                  ))
                : resources.map((resource) => (
                    <tr key={resource.id}>
                      <VehicleInfoCell resource={resource} />
                      {daysInView.map((day) => {
                        const tripsForDay = orderTripData.filter(
                          (trip) =>
                            Number(trip.vehicleId) === Number(resource.id) &&
                            formatDate(trip.pickupDate, "YYYY-MM-DD") === day
                        );
                        return (
                          <td
                            key={day}
                            className={cn("space-y-2 border p-2", {
                              "min-w-[200px] max-w-[200px]": viewMode === ViewMode.MONTH,
                              "min-w-[146px] max-w-[146px]": viewMode === ViewMode.WEEK,
                            })}
                          >
                            {tripsForDay
                              .filter((_, index) => index < 3)
                              .map((trip) => (
                                <TimelineDateCellEvent
                                  key={trip.id}
                                  onClick={handleOpenOrderTripListModal(resource.id, resource.name, day)}
                                  orderTrip={trip}
                                  statusStyles={{
                                    NEW: "bg-blue-100 border-blue-500 text-blue-700",
                                    PENDING_CONFIRMATION: "bg-purple-100 border-purple-500 text-purple-700",
                                    CONFIRMED: "bg-sky-100 border-sky-500 text-sky-700",
                                    WAITING_FOR_PICKUP: "bg-yellow-100 border-yellow-500 text-yellow-700",
                                    WAITING_FOR_DELIVERY: "bg-pink-100 border-pink-500 text-pink-700",
                                    DELIVERED: "bg-teal-100 border-teal-500 text-teal-700",
                                    COMPLETED: "bg-green-100 border-green-500 text-green-700",
                                    CANCELED: "bg-red-100 border-red-500 text-red-700",
                                  }}
                                />
                              ))}
                            {tripsForDay.length > 3 && (
                              <button
                                className="text-xs font-medium text-gray-500"
                                onClick={handleOpenOrderTripListModal(resource.id, resource.name, day)}
                              >
                                + {t("vehicle_monitoring.load_more")} (
                                {Number(getTotalCountForVehicleAndDay(resource.id, day)) - 3})
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 px-4">
          {/* Pagination */}
          {(pagination?.pageCount || 0) > 0 && (
            <Pagination
              showBorderTop={false}
              className="flex-1"
              showPageSizeOptions
              page={pagination?.page}
              total={pagination?.total}
              pageSize={pagination?.pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </div>

      <OrderTripListModal open={open} onClose={handleCloseOrderTripListModal} vehicleInfo={vehicleInfo} />
    </>
  );
}
