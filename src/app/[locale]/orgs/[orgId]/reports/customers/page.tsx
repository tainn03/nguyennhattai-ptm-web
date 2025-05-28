"use client";

import { OrderTripStatusType, OrganizationReportType } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiDownload as FiDownloadIcon } from "react-icons/fi";
import { LiaSearchSolid as LiaSearchSolidIcon } from "react-icons/lia";
import { PiNoteBlankThin as PiNoteBlankThinIcon } from "react-icons/pi";

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
import { Authorization, Button, DatePicker, Dropdown, EmptyListSection, PageHeader } from "@/components/molecules";
import Combobox, { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { Pagination } from "@/components/organisms";
import {
  useCustomerOptions,
  useCustomerStatistics,
  useDriverReportsTripStatusWithTypeAndName,
  useIdParam,
  usePermission,
  useSearchConditions,
} from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useCustomerReportState } from "@/redux/states";
import { CUSTOMER_REPORT_UPDATE_SEARCH_CONDITIONS, CUSTOMER_REPORT_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { exportCustomerReport } from "@/services/client/dynamicReport";
import { HttpStatusCode } from "@/types/api";
import { FilterOptions } from "@/types/filter";
import { LocaleType } from "@/types/locale";
import { CustomerInfo } from "@/types/strapi";
import { OrgPageProps, withOrg } from "@/utils/client";
import { endOfDayToISOString, formatDate, startOfDayToISOString, synchronizeDates } from "@/utils/date";
import { getActionPlacement, getFilterRequest, getQueryString } from "@/utils/filter";
import { isNumeric } from "@/utils/number";
import { ensureString } from "@/utils/string";

import { CustomerReportActionMenu } from "./components";

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
    const { canExport } = usePermission("report-statistics-customer");

    const { searchConditions } = useCustomerReportState();
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const [internalFilters, setInternalFilters] = useState(filterOptions);
    const [exportType, setExportType] = useState<OrganizationReportType>();

    const updateRouteRef = useRef(false);

    const { customers, isLoading: isOptionsLoading } = useCustomerOptions({ organizationId: orgId });
    const { driverReports, isLoading: isDriverReportsLoading } = useDriverReportsTripStatusWithTypeAndName({
      organizationId: orgId,
    });

    const { statistics, pagination, isLoading } = useCustomerStatistics({
      startDate: startOfDayToISOString(filterOptions.startDate.filters[0].value as Date),
      endDate: endOfDayToISOString(filterOptions.endDate.filters[0].value as Date),
      ...getFilterRequest(filterOptions),
      organizationId: orgId,
      driverReportIds: filterOptions.tripStatus.filters[0].value as string[],
      customerId: filterOptions.customerId.filters[0].value as string,
    });

    const customerOptions: ComboboxItem[] = useMemo(
      () =>
        customers.map((item: CustomerInfo) => ({
          value: ensureString(item.id),
          label: item.code,
          subLabel: item.name,
        })),
      [customers]
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
        { name: t("report.customers.title"), link: `${orgLink}/reports/customers` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
      setInternalFilters(filterOptions);
      if (updateRouteRef.current) {
        const queryString = getQueryString(filterOptions);
        router.push(`${pathname}${queryString}`);
        dispatch<FilterOptions>({
          type: CUSTOMER_REPORT_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: CUSTOMER_REPORT_UPDATE_SEARCH_QUERY_STRING,
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
        customerId: {
          ...internalFilters.customerId,
          filters: [
            {
              ...internalFilters.customerId.filters[0],
              items: customerOptions,
            },
          ],
        },
        ...(internalFilters.customerId.filters[0].value && {
          pagination: {
            ...filterOptions.pagination,
            page: 1,
          },
        }),
      });
    }, [customerOptions, filterOptions.pagination, internalFilters, setFilterOptions]);

    /**
     * Handle the export of accounts receivable by all customer.
     */
    const handleExport = useCallback(
      (type: OrganizationReportType, customerId?: number) => async () => {
        setExportType(type);
        const { status, data } = await exportCustomerReport({
          ...(customerId ? { customerId } : { isExportList: true }),
          type,
          startDate: startOfDayToISOString(formatDate(filterOptions.startDate.filters[0].value as Date, "YYYY-MM-DD")),
          endDate: startOfDayToISOString(formatDate(filterOptions.endDate.filters[0].value as Date, "YYYY-MM-DD")),
          organizationCode: org.code,
          driverReportIds: filterOptions.tripStatus.filters[0].value as string[],
          locale: locale as LocaleType,
        });

        if (status === HttpStatusCode.BadRequest) {
          showNotification({
            color: "info",
            title: t("report.customers.no_data"),
          });
        } else if (status !== HttpStatusCode.Ok) {
          showNotification({
            color: "error",
            title: t("report.customers.download_error_title"),
            message: t("report.customers.download_error"),
          });
        } else {
          window.open(data);
          showNotification({
            color: "success",
            title: t("report.customers.download_success_title"),
            message: t("report.customers.download_success"),
          });
        }
        setExportType(undefined);
      },
      [filterOptions, locale, org.code, showNotification, t]
    );

    /**
     * Generates the detail link for a customer report.
     *
     * @param {string} id - The customer report ID.
     * @returns {string} - The generated detail link.
     */
    const generateDetailLink = useCallback(
      (id: string) => {
        return t("report.customers.detail_link", {
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

    return (
      <>
        <PageHeader
          title={t("report.customers.title")}
          className="md:items-end"
          actionHorizontal
          description={
            <>
              <CardContent padding={false}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <DatePicker
                      label={t("report.customers.from_date")}
                      selected={internalFilters.startDate.filters[0].value as Date}
                      onChange={handleFilterChange("startDate")}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <DatePicker
                      label={t("report.customers.to_date")}
                      selected={internalFilters.endDate.filters[0].value as Date}
                      onChange={handleFilterChange("endDate")}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <Dropdown
                      loading={isDriverReportsLoading}
                      label={t("report.customers.trip_status")}
                      placeholder={t("report.customers.status_placeholder")}
                      options={driverReportsOptions}
                      onChange={handleFilterChange("tripStatus")}
                      value={internalFilters.tripStatus.filters[0].value as string[]}
                      errorText={
                        !isDriverReportsLoading &&
                        (internalFilters.tripStatus.filters[0].value as string[]).length === 0
                          ? t("report.customers.status_error")
                          : undefined
                      }
                    />
                  </div>

                  <div className="col-span-full flex justify-between gap-4">
                    <Combobox
                      label={t("report.customers.customer_name")}
                      loading={isOptionsLoading}
                      placeholder={t("report.customers.customer_name_placeholder")}
                      items={customerOptions}
                      value={internalFilters.customerId.filters[0].value as string}
                      onChange={handleFilterChange("customerId")}
                      emptyLabel={t("report.customers.customer_name_placeholder")}
                    />
                    <div className="hidden items-end justify-end sm:flex">
                      <Button
                        icon={LiaSearchSolidIcon}
                        onClick={handleApplyFilter}
                        loading={isLoading}
                        disabled={
                          isDriverReportsLoading ||
                          !!exportType ||
                          (internalFilters.tripStatus.filters[0].value as string[]).length === 0
                        }
                      >
                        {t("report.customers.search")}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          }
          actionComponent={
            <Authorization resource="report-statistics-customer" action="export" alwaysAuthorized={canExport()}>
              <Button
                icon={FiDownloadIcon}
                loading={exportType === OrganizationReportType.AGGREGATE_ACCOUNTS_RECEIVABLE}
                disabled={
                  (exportType && exportType !== OrganizationReportType.AGGREGATE_ACCOUNTS_RECEIVABLE) ||
                  isOptionsLoading ||
                  isDriverReportsLoading ||
                  isLoading
                }
                onClick={handleExport(OrganizationReportType.AGGREGATE_ACCOUNTS_RECEIVABLE)}
              >
                {t("report.customers.action_menu.download_summary")}
              </Button>
              <Button
                icon={FiDownloadIcon}
                loading={exportType === OrganizationReportType.ACCOUNTS_RECEIVABLE}
                disabled={
                  (exportType && exportType !== OrganizationReportType.ACCOUNTS_RECEIVABLE) ||
                  isDriverReportsLoading ||
                  isDriverReportsLoading ||
                  isLoading
                }
                onClick={handleExport(OrganizationReportType.ACCOUNTS_RECEIVABLE)}
              >
                {t("report.customers.action_menu.download_report")}
              </Button>
            </Authorization>
          }
        />
        {/* Data */}
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
                <TableCell>{t("report.customers.customer_name")}</TableCell>
                <TableCell>{t("report.customers.contact")}</TableCell>
                <TableCell align="right">{t("report.customers.tax_code")}</TableCell>
                <TableCell align="right">{t("report.customers.total_order")}</TableCell>
                <TableCell align="right">{t("report.customers.total_order_trip")}</TableCell>
                <TableCell align="right">{t("report.customers.total_amount")}</TableCell>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton  */}
              {(isLoading || isOptionsLoading) && statistics.length === 0 && (
                <SkeletonTableRow rows={10} columns={7} profileColumnIndexes={[0]} />
              )}

              {/* Empty data */}
              {!isLoading && !isOptionsLoading && statistics.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={7} className="px-6 lg:px-8">
                    <EmptyListSection description={t("report.customers.no_data")} icon={PiNoteBlankThinIcon} />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {statistics.map((item, index) => (
                <TableRow key={index}>
                  <TableCell skeletonType="profile">
                    <Authorization
                      resource="report-statistics-customer"
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
                  <TableCell align="right">
                    <InfoBox label={item.taxCode} emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell align="right">
                    <NumberLabel value={item.totalOrder} type="numeric" emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell align="right">
                    <NumberLabel value={item.totalTrip} type="numeric" emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell align="right">
                    <NumberLabel
                      value={sanitizeValue(item.totalAmount, Polarity.POSITIVE)}
                      type="currency"
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell action>
                    <Authorization resource="report-statistics-customer" action="export">
                      <CustomerReportActionMenu
                        actionPlacement={getActionPlacement(index, statistics.length)}
                        onExport={handleExport(OrganizationReportType.ACCOUNTS_RECEIVABLE, Number(item.id))}
                      />
                    </Authorization>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </>
    );
  },
  {
    resource: "report-statistics-customer",
    action: ["find"],
  }
);
