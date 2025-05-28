"use client";

import { OrderTripStatusType } from "@prisma/client";
import { HttpStatusCode } from "axios";
import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiaSearchSolid as LiaSearchSolidIcon } from "react-icons/lia";
import { PiNoteBlankThin as PiNoteBlankThinIcon } from "react-icons/pi";
import { PiMicrosoftExcelLogo } from "react-icons/pi";

import {
  CardContent,
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
  Dropdown,
  EmptyListSection,
  PageHeader,
} from "@/components/molecules";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { Pagination } from "@/components/organisms";
import {
  useDriverOptions,
  useDriverReportsTripStatusWithTypeAndName,
  useDriverSalaries,
  useIdParam,
  useSearchConditions,
} from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useDriverSalaryState } from "@/redux/states";
import { DRIVER_SALARY_UPDATE_SEARCH_CONDITIONS, DRIVER_SALARY_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { exportDriverSalaries } from "@/services/client/dynamicReport";
import { FilterOptions } from "@/types/filter";
import { LocaleType } from "@/types/locale";
import { DriverInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps, withOrg } from "@/utils/client";
import { endOfDayToISOString, formatDate, startOfDayToISOString, synchronizeDates } from "@/utils/date";
import { calculateDriverActualSalaryOrBalance } from "@/utils/driver";
import { getActionPlacement, getFilterRequest, getQueryString } from "@/utils/filter";
import { isNumeric } from "@/utils/number";
import { ensureString } from "@/utils/string";

import { DriverSalaryActionMenu } from "./components";

const enum Polarity {
  NEGATIVE = "NEGATIVE",
  POSITIVE = "POSITIVE",
}

export default withOrg(
  ({ org, orgId, orgLink }: OrgPageProps) => {
    const t = useTranslations();
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { setBreadcrumb } = useBreadcrumb();
    const { encryptId } = useIdParam();
    const { showNotification } = useNotification();

    const { searchConditions } = useDriverSalaryState();
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const [internalFilters, setInternalFilters] = useState(filterOptions);
    const [isExporting, setIsExporting] = useState(false);

    const updateRouteRef = useRef(false);

    const { drivers, isLoading: isOptionsLoading } = useDriverOptions({ organizationId: orgId });
    const { driverReports, isLoading: isDriverReportsLoading } = useDriverReportsTripStatusWithTypeAndName({
      organizationId: orgId,
    });

    const { driverSalaries, pagination, isLoading } = useDriverSalaries({
      ...getFilterRequest(filterOptions),
      startDate: startOfDayToISOString(filterOptions.startDate.filters[0].value as Date),
      endDate: endOfDayToISOString(filterOptions.endDate.filters[0].value as Date),
      organizationId: orgId,
      driverReportIds: filterOptions.tripStatus.filters[0].value as string[],
      driverId: filterOptions.driverId.filters[0].value as string,
    });

    const driverOptions: ComboboxItem[] = useMemo(
      () =>
        drivers.map((item: DriverInfo) => ({
          value: ensureString(item.id),
          label: getFullName(item.firstName, item.lastName),
          subLabel: ensureString(item.vehicle?.vehicleNumber),
        })),
      [drivers]
    );

    const driverReportsOptions: Record<string, string | number>[] = useMemo(
      () =>
        driverReports.map((item) => ({
          value: item.id,
          label: item.name,
        })),
      [driverReports]
    );

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("report.feature"), link: `${orgLink}/dashboard` },
        { name: t("report.drivers.title"), link: `${orgLink}/reports/drivers` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      setInternalFilters(filterOptions);
      if (updateRouteRef.current) {
        const queryString = getQueryString(filterOptions);
        router.push(`${pathname}${queryString}`);
        dispatch<FilterOptions>({
          type: DRIVER_SALARY_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: DRIVER_SALARY_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
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
    const updateInternalFilterOptions = useCallback((valueFilterFormat: unknown, keyToUpdate: string) => {
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
                  value: valueFilterFormat as Date | string | string[],
                },
              ],
            };
          }
          newValue[key] = value;
        });
        return newValue;
      });
    }, []);

    useEffect(() => {
      if (
        !isDriverReportsLoading &&
        driverReports.length > 0 &&
        (filterOptions.tripStatus.filters[0].value as string[]).length === 0
      ) {
        const driverReportIds = driverReports
          .filter(({ type }) => type === OrderTripStatusType.DELIVERED || type === OrderTripStatusType.COMPLETED)
          .map(({ id }) => ensureString(id));
        updateInternalFilterOptions(driverReportIds, "tripStatus");
        setFilterOptions({
          ...internalFilters,
          tripStatus: {
            ...internalFilters.tripStatus,
            filters: [
              {
                ...internalFilters.tripStatus.filters[0],
                value: driverReportIds,
              },
            ],
          },
        });
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDriverReportsLoading]);

    /**
     * It updates the internal filters with the new value and, if necessary, adjusts the corresponding date filter.
     *
     * @param {string} columnName - The name of the column that the filter belongs to.
     * @param {string} type - The type of the filter (e.g., "date" or "text").
     * @returns {Function} A function that takes the new filter value and updates the internal filters.
     */
    const handleFilterChange = useCallback(
      (columnName: string) => (value: unknown) => {
        updateRouteRef.current = true;
        // Update the internal filters with the new date range
        updateInternalFilterOptions(value, columnName);

        // Synchronize the dates if the user selects a new date range
        const start = internalFilters.startDate.filters[0].value as Date;
        const end = internalFilters.endDate.filters[0].value as Date;
        const { from, to } = synchronizeDates(start, end, columnName, value as Date);

        // Update the internal filters with the new value
        updateInternalFilterOptions(from, "startDate");
        updateInternalFilterOptions(to, "endDate");
      },
      [internalFilters, updateInternalFilterOptions]
    );

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
     * Apply the internal filters to the actual filter options.
     * This function is called when the user finishes setting up the filters and clicks on the "Apply" button.
     */
    const handleApplyFilter = useCallback(() => {
      updateRouteRef.current = true;
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
        ...(internalFilters.driverId.filters[0].value && {
          pagination: {
            ...filterOptions.pagination,
            page: 1,
          },
        }),
      });
    }, [driverOptions, filterOptions.pagination, internalFilters, setFilterOptions]);

    /**
     * Handle the export of driver salaries.
     */
    const handleExport = useCallback(
      (driverId?: number) => async () => {
        setIsExporting(true);
        const { status, data } = await exportDriverSalaries({
          ...(driverId ? { driverId } : { isExportList: true }),
          organizationCode: org.code,
          driverReportIds: filterOptions.tripStatus.filters[0].value as string[],
          startDate: startOfDayToISOString(formatDate(filterOptions.startDate.filters[0].value as Date, "YYYY-MM-DD")),
          endDate: startOfDayToISOString(formatDate(filterOptions.endDate.filters[0].value as Date, "YYYY-MM-DD")),
          locale: locale as LocaleType,
        });

        if (status === HttpStatusCode.BadRequest) {
          showNotification({
            color: "info",
            title: t("report.drivers.no_data"),
          });
        } else if (status !== HttpStatusCode.Ok) {
          showNotification({
            color: "error",
            title: t("report.drivers.download_error_title"),
            message: t("report.drivers.download_error"),
          });
        } else {
          window.open(data);
          showNotification({
            color: "success",
            title: t("report.drivers.download_success_title"),
            message: t("report.drivers.download_success"),
          });
        }
        setIsExporting(false);
      },
      [filterOptions, locale, org.code, showNotification, t]
    );

    /**
     * Sanitizes a numeric value based on the specified polarity.
     *
     * @param {number} value - The numeric value to be sanitized.
     * @param {Polarity} [polarity=Polarity.NEGATIVE] - The desired polarity for the return value. Default is negative.
     * @returns {number | null} - Returns the sanitized value with the appropriate polarity or null if the input is not numeric or zero.
     */
    const sanitizeValue = useCallback((value: number | string, polarity: Polarity = Polarity.NEGATIVE) => {
      if (isNumeric(value) && Number(value) !== 0) {
        return polarity === Polarity.NEGATIVE ? -value : value;
      }
      return null;
    }, []);

    /**
     * Generates the detail link for a driver salary report.
     *
     * @param {string} id - The driver salary report ID.
     * @returns {string} - The generated detail link.
     */
    const generateDetailLink = useCallback(
      (id: string) => {
        return t("report.drivers.detail_link", {
          orgLink,
          encryptedId: encryptId(Number(id)),
          startDate: formatDate(filterOptions.startDate.filters[0].value as Date, "YYYY-MM-DD"),
          endDate: formatDate(filterOptions.endDate.filters[0].value as Date, "YYYY-MM-DD"),
          status: (filterOptions.tripStatus.filters[0].value as string[]).join(","),
        });
      },
      [
        t,
        orgLink,
        encryptId,
        filterOptions.startDate.filters,
        filterOptions.endDate.filters,
        filterOptions.tripStatus.filters,
      ]
    );

    return (
      <>
        <PageHeader
          title={t("report.drivers.title")}
          className="md:items-end"
          actionHorizontal
          description={
            <>
              <CardContent padding={false}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <DatePicker
                      label={t("report.drivers.from_date")}
                      selected={internalFilters.startDate.filters[0].value as Date}
                      onChange={handleFilterChange("startDate")}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <DatePicker
                      label={t("report.drivers.to_date")}
                      selected={internalFilters.endDate.filters[0].value as Date}
                      onChange={handleFilterChange("endDate")}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Dropdown
                      loading={isDriverReportsLoading}
                      label={t("report.drivers.status")}
                      placeholder={t("report.drivers.status_placeholder")}
                      options={driverReportsOptions}
                      onChange={handleFilterChange("tripStatus")}
                      value={internalFilters.tripStatus.filters[0].value as string[]}
                      errorText={
                        !isDriverReportsLoading &&
                        (internalFilters.tripStatus.filters[0].value as string[]).length === 0
                          ? t("report.drivers.status_error")
                          : undefined
                      }
                    />
                  </div>

                  <div className="col-span-full flex justify-between gap-4">
                    <Combobox
                      label={t("report.drivers.driver")}
                      loading={isOptionsLoading}
                      placeholder={t("report.drivers.driver_placeholder")}
                      items={driverOptions}
                      value={internalFilters.driverId.filters[0].value as string}
                      onChange={handleFilterChange("driverId")}
                      emptyLabel={t("report.drivers.driver_placeholder")}
                    />
                    <div className="hidden items-end justify-end sm:flex">
                      <Button
                        icon={LiaSearchSolidIcon}
                        onClick={handleApplyFilter}
                        loading={isLoading}
                        disabled={
                          isDriverReportsLoading ||
                          isExporting ||
                          (internalFilters.tripStatus.filters[0].value as string[]).length === 0
                        }
                      >
                        {t("report.drivers.search")}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          }
          actionComponent={
            <div className="flex gap-x-4">
              <Button
                className="block sm:hidden"
                icon={LiaSearchSolidIcon}
                onClick={handleApplyFilter}
                disabled={
                  isDriverReportsLoading ||
                  isExporting ||
                  (internalFilters.tripStatus.filters[0].value as string[]).length === 0
                }
                loading={isLoading}
              >
                {t("report.drivers.search")}
              </Button>
              <Authorization resource="report-statistics-driver" action="export">
                <Button
                  onClick={handleExport()}
                  icon={PiMicrosoftExcelLogo}
                  loading={isExporting}
                  disabled={isLoading || isDriverReportsLoading}
                >
                  {t("report.drivers.download")}
                </Button>
              </Authorization>
            </div>
          }
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
                <TableCell>{t("report.drivers.driver")}</TableCell>
                <TableCell>{t("report.drivers.vehicle")}</TableCell>
                <TableCell align="right">{t("report.drivers.total_trip")}</TableCell>
                <TableCell align="right">{t("report.drivers.total_income_per_trip")}</TableCell>
                <TableCell align="right">{t("report.drivers.advance_salary")}</TableCell>
                <TableCell align="right">{t("report.drivers.advance_total_cost")}</TableCell>
                <TableCell align="right">{t("report.drivers.security_deposit")}</TableCell>
                <TableCell align="right">{t("report.drivers.union_dues")}</TableCell>
                <TableCell align="right">{t("report.drivers.basic_salary")}</TableCell>
                <TableCell align="right">{t("report.drivers.total_actual_salary")}</TableCell>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton  */}
              {(isLoading || isOptionsLoading) && driverSalaries.length === 0 && (
                <SkeletonTableRow rows={10} columns={11} profileColumnIndexes={[0]} multilineColumnIndexes={[1]} />
              )}

              {/* Empty data */}
              {!isLoading && !isOptionsLoading && driverSalaries.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={11} className="px-6 lg:px-8">
                    <EmptyListSection
                      description={t("report.drivers.detail.no_driver_info")}
                      icon={PiNoteBlankThinIcon}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {driverSalaries.map((item, index) => {
                const actualSalary = calculateDriverActualSalaryOrBalance(item);
                return (
                  <TableRow key={index}>
                    <TableCell loading={isLoading} skeletonType="profile">
                      <Authorization
                        resource="report-statistics-driver"
                        action="detail"
                        fallbackComponent={
                          <InfoBox
                            label={getFullName(item.firstName, item.lastName)}
                            subLabel={item.phoneNumber}
                            emptyLabel={t("common.empty")}
                          />
                        }
                      >
                        <InfoBox
                          as={Link}
                          href={generateDetailLink(item.id)}
                          label={getFullName(item.firstName, item.lastName)}
                          subLabel={item.phoneNumber}
                          emptyLabel={t("common.empty")}
                        />
                      </Authorization>
                    </TableCell>
                    <TableCell loading={isLoading} skeletonType="multiline">
                      <InfoBox
                        label={item.vehicleNumber}
                        subLabel={item.trailerNumber}
                        emptyLabel={t("common.empty")}
                      />
                    </TableCell>
                    <TableCell loading={isLoading} align="right">
                      <NumberLabel value={item.totalTrip} emptyLabel={t("common.empty")} />
                    </TableCell>
                    <TableCell loading={isLoading} align="right">
                      <NumberLabel value={item.tripSalaryTotal} emptyLabel={t("common.empty")} type="currency" />
                    </TableCell>
                    <TableCell loading={isLoading} align="right">
                      <NumberLabel
                        value={sanitizeValue(item.salaryAdvance)}
                        emptyLabel={t("common.empty")}
                        type="currency"
                      />
                    </TableCell>
                    <TableCell loading={isLoading} align="right">
                      <NumberLabel
                        value={sanitizeValue(item.advanceTotalCost)}
                        emptyLabel={t("common.empty")}
                        type="currency"
                      />
                    </TableCell>
                    <TableCell loading={isLoading} align="right">
                      <NumberLabel
                        value={sanitizeValue(item.securityDeposit)}
                        emptyLabel={t("common.empty")}
                        type="currency"
                      />
                    </TableCell>
                    <TableCell loading={isLoading} className="w-44" align="right">
                      <NumberLabel
                        value={sanitizeValue(item.unionDues)}
                        emptyLabel={t("common.empty")}
                        type="currency"
                      />
                    </TableCell>
                    <TableCell loading={isLoading} className="w-44" align="right">
                      <NumberLabel value={item.basicSalary} type="currency" emptyLabel={t("common.empty")} />
                    </TableCell>
                    <TableCell loading={isLoading} className="w-44" align="right">
                      <span
                        className={clsx("font-medium", {
                          "text-blue-700": actualSalary >= 0,
                          "text-red-700": actualSalary < 0,
                        })}
                      >
                        <NumberLabel value={actualSalary} type="currency" emptyLabel={t("common.empty")} />
                      </span>
                    </TableCell>
                    <TableCell loading={isLoading} action>
                      <Authorization resource="report-statistics-driver" action="export">
                        <DriverSalaryActionMenu
                          actionPlacement={getActionPlacement(index, driverSalaries.length)}
                          onExport={handleExport(Number(item.id))}
                        />
                      </Authorization>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  },
  {
    resource: "report-statistics-driver",
    action: ["find"],
  }
);
