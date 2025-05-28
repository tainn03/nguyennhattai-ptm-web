"use client";

import { OrderTripStatusType } from "@prisma/client";
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
  useDriverReportsTripStatusWithTypeAndName,
  useIdParam,
  usePermission,
  useSearchConditions,
  useSubcontractorCosts,
  useSubcontractorOptions,
} from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useSubcontractorCostState } from "@/redux/states";
import {
  SUBCONTRACTOR_COST_UPDATE_SEARCH_CONDITIONS,
  SUBCONTRACTOR_COST_UPDATE_SEARCH_QUERY_STRING,
} from "@/redux/types";
import { exportSubcontractorCosts } from "@/services/client/dynamicReport";
import { HttpStatusCode } from "@/types/api";
import { FilterOptions } from "@/types/filter";
import { LocaleType } from "@/types/locale";
import { SubcontractorInfo } from "@/types/strapi";
import { OrgPageProps, withOrg } from "@/utils/client";
import { endOfDayToISOString, formatDate, startOfDayToISOString, synchronizeDates } from "@/utils/date";
import { getActionPlacement, getFilterRequest, getQueryString } from "@/utils/filter";
import { isNumeric } from "@/utils/number";
import { ensureString } from "@/utils/string";
import { calculateSubcontractorBalance } from "@/utils/subcontractor";

import { SubcontractorCostActionMenu } from "./components";

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
    const { canExport } = usePermission("report-statistics-subcontractor");

    const { searchConditions } = useSubcontractorCostState();
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const [internalFilters, setInternalFilters] = useState(filterOptions);
    const [isExporting, setIsExporting] = useState(false);

    const updateRouteRef = useRef(false);

    const { subcontractors, isLoading: isOptionsLoading } = useSubcontractorOptions({ organizationId: orgId });
    const { driverReports, isLoading: isDriverReportsLoading } = useDriverReportsTripStatusWithTypeAndName({
      organizationId: orgId,
    });

    const { costInfo, pagination, isLoading } = useSubcontractorCosts({
      ...getFilterRequest(filterOptions),
      organizationId: orgId,
      driverReportIds: filterOptions.tripStatus.filters[0].value as string[],
      subcontractorId: filterOptions.subcontractorId.filters[0].value as string,
      startDate: startOfDayToISOString(filterOptions.startDate.filters[0].value as Date),
      endDate: endOfDayToISOString(filterOptions.endDate.filters[0].value as Date),
    });

    const subcontractorOptions: ComboboxItem[] = useMemo(
      () =>
        subcontractors.map((item: SubcontractorInfo) => ({
          value: ensureString(item.id),
          label: ensureString(item.code),
          subLabel: ensureString(item.name),
        })),
      [subcontractors]
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
        { name: t("report.subcontractors.title"), link: `${orgLink}/reports/subcontractor` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      setInternalFilters(filterOptions);
      if (updateRouteRef.current) {
        const queryString = getQueryString(filterOptions);
        router.push(`${pathname}${queryString}`);
        dispatch<FilterOptions>({
          type: SUBCONTRACTOR_COST_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: SUBCONTRACTOR_COST_UPDATE_SEARCH_QUERY_STRING,
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
        subcontractorId: {
          ...internalFilters.subcontractorId,
          filters: [
            {
              ...internalFilters.subcontractorId.filters[0],
              items: subcontractorOptions,
            },
          ],
        },
        ...(internalFilters.subcontractorId.filters[0].value && {
          pagination: {
            ...filterOptions.pagination,
            page: 1,
          },
        }),
      });
    }, [setFilterOptions, internalFilters, subcontractorOptions, filterOptions.pagination]);

    /**
     * Handle the export of subcontractor cost.
     */
    const handleExport = useCallback(
      (subcontractorId?: number) => async () => {
        setIsExporting(true);
        const { status, data } = await exportSubcontractorCosts({
          ...(subcontractorId ? { subcontractorId } : { isExportList: true }),
          organizationCode: org.code,
          driverReportIds: filterOptions.tripStatus.filters[0].value as string[],
          startDate: startOfDayToISOString(filterOptions.startDate.filters[0].value as Date),
          endDate: endOfDayToISOString(filterOptions.endDate.filters[0].value as Date),
          locale: locale as LocaleType,
        });

        if (status === HttpStatusCode.BadRequest) {
          showNotification({
            color: "info",
            title: t("report.subcontractors.no_data"),
          });
        } else if (status !== HttpStatusCode.Ok) {
          showNotification({
            color: "error",
            title: t("report.subcontractors.download_error_title"),
            message: t("report.subcontractors.download_error"),
          });
        } else {
          window.open(data);
          showNotification({
            color: "success",
            title: t("report.subcontractors.download_success_title"),
            message: t("report.subcontractors.download_success"),
          });
        }
        setIsExporting(false);
      },
      [
        filterOptions.endDate.filters,
        filterOptions.startDate.filters,
        filterOptions.tripStatus.filters,
        locale,
        org.code,
        showNotification,
        t,
      ]
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
     * Generates the detail link for a subcontractor.
     *
     * @param {string} id - The ID of the subcontractor.
     * @returns {string} - The detail link for the subcontractor.
     */
    const generateDetailLink = useCallback(
      (id: string) => {
        return t("report.subcontractors.detail_link", {
          orgLink,
          encryptedId: encryptId(Number(id)),
          startDate: formatDate(filterOptions.startDate.filters[0].value as Date, "YYYY-MM-DD"),
          endDate: formatDate(filterOptions.endDate.filters[0].value as Date, "YYYY-MM-DD"),
          status: (filterOptions.tripStatus.filters[0].value as string[]).join(","),
        });
      },
      [filterOptions.startDate, filterOptions.endDate, filterOptions.tripStatus, encryptId, orgLink, t]
    );

    return (
      <>
        <PageHeader
          title={t("report.subcontractors.title")}
          className="md:items-end"
          description={
            <>
              <CardContent padding={false}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <DatePicker
                      label={t("report.subcontractors.from_date")}
                      selected={internalFilters.startDate.filters[0].value as Date}
                      onChange={handleFilterChange("startDate")}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <DatePicker
                      label={t("report.subcontractors.to_date")}
                      selected={internalFilters.endDate.filters[0].value as Date}
                      onChange={handleFilterChange("endDate")}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Dropdown
                      loading={isDriverReportsLoading}
                      label={t("report.subcontractors.status")}
                      placeholder={t("report.subcontractors.status_placeholder")}
                      options={driverReportsOptions}
                      onChange={handleFilterChange("tripStatus")}
                      value={internalFilters.tripStatus.filters[0].value as string[]}
                      errorText={
                        !isDriverReportsLoading &&
                        (internalFilters.tripStatus.filters[0].value as string[]).length === 0
                          ? t("report.subcontractors.status_error")
                          : undefined
                      }
                    />
                  </div>

                  <div className="col-span-full flex justify-between gap-4">
                    <Combobox
                      label={t("report.subcontractors.subcontractor")}
                      loading={isOptionsLoading}
                      placeholder={t("report.subcontractors.subcontractor_placeholder")}
                      items={subcontractorOptions}
                      value={internalFilters.subcontractorId.filters[0].value as string}
                      onChange={handleFilterChange("subcontractorId")}
                      emptyLabel={t("report.subcontractors.subcontractor_placeholder")}
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
                        {t("report.subcontractors.search")}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          }
          actionHorizontal
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
              <Authorization resource="report-statistics-subcontractor" action="export" alwaysAuthorized={canExport()}>
                <Button
                  onClick={handleExport()}
                  icon={PiMicrosoftExcelLogo}
                  loading={isExporting}
                  disabled={isLoading || isDriverReportsLoading}
                >
                  {t("report.subcontractors.download")}
                </Button>
              </Authorization>
            </div>
          }
        />

        <TableContainer allowFullscreen fullHeight horizontalScroll verticalScroll stickyHeader autoHeight>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("report.subcontractors.name")}</TableCell>
                <TableCell>{t("report.subcontractors.phone_number")}</TableCell>
                <TableCell align="right">{t("report.subcontractors.total_order_trip")}</TableCell>
                <TableCell align="right">{t("report.subcontractors.advance_total_cost")}</TableCell>
                <TableCell align="right">{t("report.subcontractors.total_amount")}</TableCell>
                <TableCell align="right">{t("report.subcontractors.total_payment")}</TableCell>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton  */}
              {(isLoading || isOptionsLoading) && costInfo.length === 0 && (
                <SkeletonTableRow rows={10} columns={7} profileColumnIndexes={[0]} multilineColumnIndexes={[1]} />
              )}

              {/* Empty data */}
              {!isLoading && !isOptionsLoading && costInfo.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={7} className="px-6 lg:px-8">
                    <EmptyListSection
                      description={t("report.subcontractors.detail.no_subcontractor_info")}
                      icon={PiNoteBlankThinIcon}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {costInfo.map((item, index) => {
                const balance = calculateSubcontractorBalance(item);
                return (
                  <TableRow key={index}>
                    <TableCell>
                      <Authorization
                        resource="report-statistics-subcontractor"
                        action="detail"
                        fallbackComponent={
                          <InfoBox label={item.code} subLabel={item.name} emptyLabel={t("common.empty")} />
                        }
                      >
                        <InfoBox
                          as={Link}
                          href={generateDetailLink(item.id)}
                          label={item.code}
                          subLabel={item.name}
                          emptyLabel={t("common.empty")}
                        />
                      </Authorization>
                    </TableCell>
                    <TableCell>
                      <InfoBox label={item.phoneNumber} subLabel={item.email} emptyLabel={t("common.empty")} />
                    </TableCell>
                    <TableCell loading={isLoading} className="w-44" align="right">
                      <NumberLabel
                        value={sanitizeValue(item.totalTrip, Polarity.POSITIVE)}
                        emptyLabel={t("common.empty")}
                      />
                    </TableCell>
                    <TableCell loading={isLoading} className="w-44" align="right">
                      <NumberLabel value={sanitizeValue(item.advanceTotalCost)} emptyLabel={t("common.empty")} />
                    </TableCell>
                    <TableCell loading={isLoading} align="right">
                      <NumberLabel
                        value={sanitizeValue(item.subcontractorCostTotal, Polarity.POSITIVE)}
                        emptyLabel={t("common.empty")}
                        type="currency"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <span
                        className={clsx("font-medium", {
                          "text-blue-700": balance >= 0,
                          "text-red-700": balance < 0,
                        })}
                      >
                        <NumberLabel value={balance} emptyLabel={t("common.empty")} type="currency" />
                      </span>
                    </TableCell>
                    <TableCell action loading={isLoading}>
                      <Authorization resource="report-statistics-subcontractor" action="export">
                        <SubcontractorCostActionMenu
                          actionPlacement={getActionPlacement(index, costInfo.length)}
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

        {(pagination?.pageCount || 0) > 0 && (
          <Pagination
            className="mt-4"
            showPageSizeOptions
            page={pagination?.page}
            total={pagination?.total}
            pageSize={pagination?.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </>
    );
  },
  {
    resource: "report-statistics-subcontractor",
    action: ["find"],
  }
);
