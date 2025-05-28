"use client";
import { OrderStatusType, OrganizationRoleType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import colors from "tailwindcss/colors";

import { CardContent } from "@/components/atoms";
import { PageHeader } from "@/components/molecules";
import { FilterStatus, Pagination } from "@/components/organisms";
import {
  useOrderMonitoring,
  useOrderMonitoringChart,
  useOrganizationsByUserId,
  usePermission,
  useSearchConditions,
} from "@/hooks";
import { useBreadcrumb } from "@/redux/actions";
import { useDispatch } from "@/redux/actions";
import { useOrderMonitoringState, useOrderState } from "@/redux/states";
import { ORDER_MONITORING_UPDATE_SEARCH_CONDITIONS, ORDER_MONITORING_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { FilterOptions } from "@/types/filter";
import { OrderMonitoringChart } from "@/types/report";
import { OrgPageProps, withOrg } from "@/utils/client";
import { addMonths, isDateEqualOrAfter, isExceedOneMonth, minusMonths } from "@/utils/date";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { ensureString } from "@/utils/string";

import { OrderMonitoringDoughnutChart, OrderMonitoringFormSearch, OrderMonitoringTableResult } from "./components";

export default withOrg(
  ({ orgId, orgLink, userId }: OrgPageProps) => {
    const router = useRouter();
    const t = useTranslations();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { setBreadcrumb } = useBreadcrumb();
    const { searchQueryString } = useOrderState();
    const updateOrderMonitoringRef = useRef(false);
    const { canFind } = usePermission("order");

    // Search condition in screen
    const { searchConditions } = useOrderMonitoringState();

    // Search condition for call api search
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const [isDispatcher, setIsDispatcher] = useState(false);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("order.management"), link: orgLink },
        { name: t("order_monitoring.title"), link: `${orgLink}/order_monitoring${searchQueryString}` },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const { organizationMembers } = useOrganizationsByUserId({ id: userId });

    useEffect(() => {
      if (organizationMembers.length === 1) {
        if (
          organizationMembers[0]?.role?.type === OrganizationRoleType.DISPATCHER ||
          !organizationMembers[0]?.role?.type
        ) {
          if (!canFind()) {
            setIsDispatcher(true);
          }
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [organizationMembers]);

    const { orders, pagination, isLoading } = useOrderMonitoring({
      organizationId: orgId,
      isDispatcher: isDispatcher,
      userIdOwner: userId,
      ...getFilterRequest(filterOptions),
    });

    const { dataChart } = useOrderMonitoringChart({
      organizationId: orgId,
      isDispatcher: isDispatcher,
      userIdOwner: userId,
      ...getFilterRequest(filterOptions),
    });

    useEffect(() => {
      const queryString = getQueryString(filterOptions);
      if (updateOrderMonitoringRef.current) {
        router.push(`${pathname}${queryString}`);
        dispatch<FilterOptions>({
          type: ORDER_MONITORING_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: ORDER_MONITORING_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      router.push(`${pathname}${queryString}`);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Handle display data chart doughnut
     */
    const propChart = useMemo(() => {
      if (dataChart && dataChart.length > 0) {
        const listStatus = [
          OrderStatusType.NEW,
          OrderStatusType.RECEIVED,
          OrderStatusType.IN_PROGRESS,
          OrderStatusType.COMPLETED,
          OrderStatusType.CANCELED,
          null,
        ];

        const prop: OrderMonitoringChart[] = [];

        listStatus.map((item) => {
          switch (item) {
            case OrderStatusType.NEW:
              {
                const cntNew = dataChart.filter((item) => item.lastStatusType === OrderStatusType.NEW).length;
                if (cntNew > 0) {
                  prop.push({
                    label: t("order.status.new"),
                    color: colors.blue[700],
                    lastStatusType: OrderStatusType.NEW,
                    cntByLastStatusType: cntNew,
                  });
                }
              }
              break;

            case OrderStatusType.RECEIVED:
              {
                const cntReceived = dataChart.filter((item) => item.lastStatusType === OrderStatusType.RECEIVED).length;
                if (cntReceived > 0) {
                  prop.push({
                    label: t("order.status.received"),
                    color: colors.purple[700],
                    lastStatusType: OrderStatusType.RECEIVED,
                    cntByLastStatusType: cntReceived,
                  });
                }
              }
              break;

            case OrderStatusType.IN_PROGRESS:
              {
                const cntInProgress = dataChart.filter(
                  (item) => item.lastStatusType === OrderStatusType.IN_PROGRESS
                ).length;
                if (cntInProgress > 0) {
                  prop.push({
                    label: t("order.status.in_progress"),
                    color: colors.yellow[600],
                    lastStatusType: OrderStatusType.IN_PROGRESS,
                    cntByLastStatusType: cntInProgress,
                  });
                }
              }
              break;

            case OrderStatusType.COMPLETED:
              {
                const cntCompleted = dataChart.filter(
                  (item) => item.lastStatusType === OrderStatusType.COMPLETED
                ).length;
                if (cntCompleted > 0) {
                  prop.push({
                    label: t("order.status.completed"),
                    color: colors.green[600],
                    lastStatusType: OrderStatusType.COMPLETED,
                    cntByLastStatusType: cntCompleted,
                  });
                }
              }
              break;

            case OrderStatusType.CANCELED:
              {
                const cntCanceled = dataChart.filter((item) => item.lastStatusType === OrderStatusType.CANCELED).length;
                if (cntCanceled > 0) {
                  prop.push({
                    label: t("order.status.canceled"),
                    color: colors.red[600],
                    lastStatusType: OrderStatusType.CANCELED,
                    cntByLastStatusType: cntCanceled,
                  });
                }
              }
              break;
            default:
              {
                // Count number of order with isDraft
                const cntDraft = dataChart.filter((item) => item.isDraft === true).length;
                if (cntDraft > 0) {
                  prop.push({
                    label: t("order.status.draft"),
                    color: colors.gray[500],
                    lastStatusType: "DRAFT",
                    cntByLastStatusType: cntDraft,
                  });
                }
              }
              break;
          }

          return item;
        });

        return prop;
      } else {
        return [];
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataChart]);

    /**
     * Callback function for handling page changes.
     *
     * @param page - The new page number to be set in the pagination state.
     */
    const handlePageChange = useCallback(
      (page: number) => {
        updateOrderMonitoringRef.current = true;
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
        updateOrderMonitoringRef.current = true;
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
     * Handles changes in filter options.
     * Updates the route reference and sets the filter options based on the provided options.
     * @param {FilterOptions} options - The updated filter options.
     */
    const handleFilterChange = useCallback(
      (options: FilterOptions) => {
        // In case: delete filter status of start date
        if (options["startDate"].filters[0].value === "") {
          const start = new Date();
          let end = options["endDate"].filters[0].value as Date;
          // If [startDate] large than [endDate] then set add 1 month for [endDate]
          if (!isDateEqualOrAfter(start, end) || isExceedOneMonth(start, end)) {
            end = addMonths(start, 1) ?? new Date();
          }

          options["startDate"].filters[0].value = start;
          options["endDate"].filters[0].value = end;
        }

        // In case: delete filter status of end date
        if (options["endDate"].filters[0].value === "") {
          let start = options["startDate"].filters[0].value as Date;
          const end = new Date();
          // If [endDate] small than [startDate] then set minus add 1 month for [startDate]
          if (!isDateEqualOrAfter(start, end) || isExceedOneMonth(start, end)) {
            start = minusMonths(end as Date, 1) ?? new Date();
          }

          options["startDate"].filters[0].value = start;
          options["endDate"].filters[0].value = end;
        }

        // Handle search data
        setFilterOptions(options);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    return (
      <>
        <PageHeader
          title={t("order_monitoring.title")}
          description={
            <div className="max-w-[700px]">
              <CardContent padding={false}>
                <OrderMonitoringFormSearch
                  orgId={orgId}
                  filterOptions={filterOptions}
                  onSearch={setFilterOptions}
                  isLoading={isLoading}
                />
              </CardContent>
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </div>
          }
          actionHorizontal
          actionComponent={
            <div className="flex min-h-[190px] w-full justify-center">
              <OrderMonitoringDoughnutChart
                title={t("order_monitoring.chart.title")}
                labels={propChart.map((item) => item.label)}
                textCenter={t("order_monitoring.chart.textCenter")}
                backgroundColor={propChart.map((item) => item.color)}
                values={propChart.map((item) => item.cntByLastStatusType)}
                width={180}
                height={180}
              />

              {/* RENDER LEGENDS FOR CHART */}
              <div className="ml-5 flex h-full items-center">
                <CardContent padding={false}>
                  <ul role="list" className="float-left">
                    {propChart.map((item, index) => {
                      const color = item.color;
                      return (
                        <li key={index} className="mb-1 flex items-center">
                          <span
                            className={clsx("inline-flex min-w-[30px] px-2 py-1 ring-1 ring-inset")}
                            style={{ backgroundColor: color }}
                          />
                          <span className={clsx("ml-3 text-xs md:whitespace-nowrap")}>{ensureString(item.label)}</span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </div>
            </div>
          }
        />
        {/* Data Search */}
        <OrderMonitoringTableResult
          filterOptions={filterOptions}
          setFilterOptions={setFilterOptions}
          isLoading={isLoading}
          orders={orders}
          organizationId={orgId}
          orgLink={orgLink}
        />

        {/* Pagination */}
        <Pagination
          className="mt-4"
          showPageSizeOptions
          page={pagination?.page}
          total={pagination?.total}
          pageSize={pagination?.pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </>
    );
  },
  {
    resource: "order-monitoring",
    action: ["find"],
  }
);
