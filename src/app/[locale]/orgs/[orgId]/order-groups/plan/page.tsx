"use client";

import { Disclosure } from "@headlessui/react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon } from "@heroicons/react/24/outline";
import { OrderGroupStatusType } from "@prisma/client";
import { useAtom } from "jotai";
import round from "lodash/round";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineArrowUpTray, HiPlus } from "react-icons/hi2";
import { useDispatch } from "react-redux";

import {
  addMoreOrderToOrderGroup,
  exportOrderGroupsPlanAcion,
  removeOrderFromOrderGroup,
  updateOrderScheduler,
} from "@/actions/orderGroup";
import { createOrderGroupStatus } from "@/actions/orderGroupStatus";
import { DateTimeLabel, NumberLabel, SkeletonTableRow, TabPanel } from "@/components/atoms";
import { InfoBox, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import {
  Authorization,
  Button,
  EmptyListSection,
  OrderMenu,
  PageHeader,
  QuickSearch,
  Tabs,
} from "@/components/molecules";
import { TableFilterMenu } from "@/components/molecules";
import {
  AddMoreOrderModal,
  ConfirmModal,
  FilterStatus,
  OrderGroupAction,
  OrderSchedulerModal,
  OrderShareModal,
  Pagination,
  VehicleSelectionModal,
} from "@/components/organisms";
import { OrderScheduleInputForm } from "@/forms/orderGroup";
import { useIdParam, useOrderGroupCountByStatus, useOrderGroups, usePermission, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useNotificationState } from "@/redux/states";
import { NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION } from "@/redux/types";
import { orderGroupAtom } from "@/states";
import { HttpStatusCode } from "@/types/api";
import { FilterOptions } from "@/types/filter";
import { SortType } from "@/types/filter";
import { FilterProperty } from "@/types/filter";
import { OrderGroupInfo, OrderInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { OrgPageProps, withOrg } from "@/utils/client";
import { getClientTimezone } from "@/utils/date";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId, formatNumber } from "@/utils/number";
import { ensureString, getDetailAddress, joinNonEmptyStrings } from "@/utils/string";
import { cn } from "@/utils/twcn";

enum Tab {
  Base = "base",
  Plan = "plan",
  Processed = "process",
}

export default withOrg(({ orgLink, orgId }: OrgPageProps) => {
  const t = useTranslations();
  const router = useRouter();
  const dispatch = useDispatch();
  const pathname = usePathname();
  const { encryptId } = useIdParam();
  const { showNotification } = useNotification();
  const { canNew } = usePermission("order");
  const { setBreadcrumb } = useBreadcrumb();

  const [{ vehicleTypeOptions, customerOptions, planOrderGroupSearchConditions }, setPlanOrderGroupSearchConditions] =
    useAtom(orderGroupAtom);
  const { haveNewNotification } = useNotificationState();
  const [filterOptions, setFilterOptions] = useSearchConditions(planOrderGroupSearchConditions);
  const [openAddMoreOrderModal, setOpenAddMoreOrderModal] = useState(false);
  const [openRemoveOrderModal, setOpenRemoveOrderModal] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [openCancelOrderGroupModal, setOpenCancelOrderGroupModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [openOrderSchedulerModal, setOpenOrderSchedulerModal] = useState(false);
  const [openVehicleSelectionModal, setOpenVehicleSelectionModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInfo | null>(null);
  const [selectedOrderGroup, setSelectedOrderGroup] = useState<OrderGroupInfo | null>(null);
  const [isShareConfirmOpen, setIsShareConfirmOpen] = useState(false);
  const [isExportOrderGroupsLoading, setIsExportOrderGroupsLoading] = useState(false);
  const [orderShare, setOrderShare] = useState<OrderInfo | null>(null);

  const {
    baseCount,
    planCount,
    processedCount,
    mutate: mutateOrderGroupCountByStatus,
  } = useOrderGroupCountByStatus({
    organizationId: orgId,
  });

  const {
    orderGroups,
    pagination,
    isLoading,
    mutate: mutateOrderGroups,
  } = useOrderGroups({
    organizationId: orgId,
    lastStatusTypes: [OrderGroupStatusType.PLAN],
    ...getFilterRequest(filterOptions),
  });

  const [isApproving, setIsApproving] = useState(false);
  const [openConfirmApproveModal, setOpenConfirmApproveModal] = useState(false);

  const selectedOrderGroupRef = useRef<OrderGroupInfo | null>(null);
  const selectedOrderRef = useRef<Partial<OrderInfo> | null>(null);
  const updateRouteRef = useRef(false);

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: t("order.title"), link: `${orgLink}/order-groups/base` },
      { name: t("order_group.title"), link: `${orgLink}/order-groups/base` },
      { name: t("order_group.tabs.plan"), link: `${orgLink}/order-groups/plan` },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (haveNewNotification) {
      dispatch({
        type: NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION,
        payload: false,
      });
      mutateOrderGroups();
      mutateOrderGroupCountByStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haveNewNotification]);

  useEffect(() => {
    setFilterOptions((prev) => ({
      ...prev,
      vehicleType: {
        ...prev.vehicleType,
        filters: [
          {
            ...prev.vehicleType?.filters[0],
            items: vehicleTypeOptions,
          },
        ],
      },
      customer: {
        ...prev.customer,
        filters: [
          {
            ...prev.customer?.filters[0],
            items: customerOptions,
          },
        ],
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleTypeOptions, customerOptions]);

  /**
   * Callback function for handling tab changes.
   *
   * @param tab - The new tab to be set in the router.
   */
  const handleTabChange = useCallback(
    (tab: string) => {
      router.push(`${orgLink}/order-groups/${tab}`);
    },
    [orgLink, router]
  );

  /**
   * Tab items.
   */
  const tabItems = useMemo(
    () => [
      {
        value: Tab.Base,
        label: t("order_group.tabs.base"),
        badge: ensureString(baseCount),
      },
      {
        value: Tab.Plan,
        label: t("order_group.tabs.plan"),
        badge: ensureString(planCount),
      },
      {
        value: Tab.Processed,
        label: t("order_group.tabs.processed"),
        badge: ensureString(processedCount),
      },
    ],
    [baseCount, planCount, processedCount, t]
  );

  /**
   * Updating search params.
   */
  useEffect(() => {
    if (updateRouteRef.current) {
      const queryString = getQueryString(filterOptions);
      router.push(`${pathname}${queryString}`);
      setPlanOrderGroupSearchConditions((prev) => ({
        ...prev,
        planOrderGroupSearchConditions: filterOptions,
        planOrderGroupSearchQueryString: queryString,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions]);

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
   * Callback function for applying filters to a specific column and updating filter options.
   *
   * @param columnName - The name or identifier of the column to which the filters should be applied.
   * @param filters - An array of filter properties to apply to the column.
   * @param sortType - An optional sorting order ("asc" or "desc") to apply to the column.
   */
  const handleFilterApply = useCallback(
    (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
      updateRouteRef.current = true;
      setFilterOptions((prevValue) => {
        const { pagination, ...values } = prevValue;
        const newValue: FilterOptions = {
          pagination: {
            ...pagination,
            page: 1,
          },
        };
        Object.keys(values).forEach((key) => {
          let value = values[key];
          if (sortType) {
            value.sortType = undefined;
          }
          if (columnName === key) {
            value = {
              ...value,
              filters,
              sortType,
            };
          }
          newValue[key] = value;
        });
        return newValue;
      });
    },
    [setFilterOptions]
  );

  /**
   * Callback function for handling changes in filter options.
   *
   * @param options - The new filter options to set.
   */
  const handleFilterChange = useCallback((options: FilterOptions) => {
    updateRouteRef.current = true;
    setFilterOptions(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Callback function for handling the closing of the confirm approve modal.
   */
  const handleCloseConfirmApproveModal = useCallback(() => {
    setOpenConfirmApproveModal(false);
  }, []);

  /**
   * Callback function for handling the opening of the confirm approve modal.
   */
  const handleOpenConfirmApproveModal = useCallback(
    (orderGroup: OrderGroupInfo) => () => {
      setOpenConfirmApproveModal(true);
      selectedOrderGroupRef.current = orderGroup;
    },
    []
  );

  /**
   * Callback function for handling the approval of an order group.
   */
  const handleApproveOrderGroup = useCallback(async () => {
    if (!selectedOrderGroupRef.current) {
      showNotification({
        color: "error",
        title: t("common.message.save_error_title"),
        message: t("order_group.approve_failed"),
      });
      return;
    }

    setIsApproving(true);
    const { status } = await createOrderGroupStatus({
      organizationId: orgId,
      group: { id: selectedOrderGroupRef.current.id },
      type: OrderGroupStatusType.APPROVED,
    });

    if (status === HttpStatusCode.Ok) {
      showNotification({
        color: "success",
        title: t("common.message.save_success_title"),
        message: t("order_group.approve_success"),
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.save_error_title"),
        message: t("order_group.approve_failed"),
      });
    }

    handleCloseConfirmApproveModal();
    mutateOrderGroupCountByStatus();
    mutateOrderGroups();
    selectedOrderGroupRef.current = null;
    setIsApproving(false);
  }, [orgId, handleCloseConfirmApproveModal, mutateOrderGroupCountByStatus, mutateOrderGroups, showNotification, t]);

  /**
   * Callback function for handling the closing of the add more order modal.
   */
  const handleCloseAddMoreOrderModal = useCallback(() => {
    setOpenAddMoreOrderModal(false);
  }, []);

  /**
   * Callback function for handling the opening of the add more order modal.
   *
   * @param orderGroup - The order group to be added to the modal.
   */
  const handleOpenAddMoreOrderModal = useCallback(
    (orderGroup: OrderGroupInfo) => () => {
      selectedOrderGroupRef.current = orderGroup;
      setOpenAddMoreOrderModal(true);
    },
    []
  );

  /**
   * Callback function for handling the addition of more orders to an order group.
   *
   * @param orderSchedule - The order schedule to be added to the order group.
   */
  const handleAddMoreOrder = useCallback(
    async (orderSchedule: OrderScheduleInputForm) => {
      if (!selectedOrderGroupRef.current) {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("order_group.approve_failed"),
        });
        return;
      }

      const currentOrderIds = (selectedOrderGroupRef.current?.orders ?? []).map((order) => Number(order.id));
      const { status } = await addMoreOrderToOrderGroup({
        orderGroup: { id: selectedOrderGroupRef.current?.id },
        currentOrderIds,
        schedule: orderSchedule,
      });

      if (status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("common.message.save_success_message", { name: selectedOrderGroupRef.current?.code }),
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("common.message.save_error_message", { name: selectedOrderGroupRef.current?.code }),
        });
      }

      selectedOrderGroupRef.current = null;
      mutateOrderGroups();
      mutateOrderGroupCountByStatus();
    },
    [mutateOrderGroupCountByStatus, mutateOrderGroups, showNotification, t]
  );

  /**
   * Handle share order.
   * @param order - The order to be shared.
   */
  const handleShare = useCallback(
    (order: OrderInfo) => () => {
      setOrderShare(order);
      setIsShareConfirmOpen(true);
    },
    []
  );

  /**
   * Handle close share order.
   */
  const handleCloseShareOrder = useCallback(() => {
    setIsShareConfirmOpen(false);
  }, []);

  /**
   * Callback function for handling the removal of an order from an order group.
   */
  const handleOpenRemoveOrderModal = useCallback(
    (order: Partial<OrderInfo>, orderGroup: OrderGroupInfo) => () => {
      setOpenRemoveOrderModal(true);
      selectedOrderRef.current = order;
      selectedOrderGroupRef.current = orderGroup;
    },
    []
  );

  /**
   * Callback function for handling the closing of the remove order modal.
   */
  const handleCloseRemoveOrderModal = useCallback(() => {
    setOpenRemoveOrderModal(false);
    selectedOrderRef.current = null;
    selectedOrderGroupRef.current = null;
  }, []);

  /**
   * Callback function for handling the removal of an order from an order group.
   */
  const handleRemoveOrder = useCallback(async () => {
    if (!selectedOrderGroupRef.current?.id || !selectedOrderRef.current?.id) {
      showNotification({
        color: "error",
        title: t("common.message.save_error_title"),
        message: t("order_group.remove_order_failed"),
      });
      return;
    }

    setIsRemoving(true);

    const currentOrderIds = (selectedOrderGroupRef.current?.orders ?? []).filter(
      (order) => !equalId(order.id, selectedOrderRef.current?.id)
    );
    const { status } = await removeOrderFromOrderGroup({
      removedOrderIds: [selectedOrderRef.current?.id],
      remainingOrderCount: currentOrderIds.length,
      currentDate: new Date(),
      clientTimezone: getClientTimezone(),
    });

    if (status === HttpStatusCode.Ok) {
      showNotification({
        color: "success",
        title: t("common.message.save_success_title"),
        message: t("order_group.remove_order_success"),
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.save_error_title"),
        message: t("order_group.remove_order_failed"),
      });
    }

    setIsRemoving(false);
    selectedOrderRef.current = null;
    selectedOrderGroupRef.current = null;
    mutateOrderGroups();
    mutateOrderGroupCountByStatus();
    setOpenRemoveOrderModal(false);
  }, [mutateOrderGroupCountByStatus, mutateOrderGroups, showNotification, t]);

  /**
   * Callback function for handling the cancellation of an order group.
   */
  const handleCancelOrderGroup = useCallback(async () => {
    if (!selectedOrderGroupRef.current?.id) {
      showNotification({
        color: "error",
        title: t("common.message.save_error_title"),
        message: t("order_group.cancel_failed"),
      });
      return;
    }

    setIsCancelling(true);
    const currentOrderIds = (selectedOrderGroupRef.current?.orders ?? []).map((order) => Number(order.id));
    const { status } = await removeOrderFromOrderGroup({
      removedOrderIds: currentOrderIds || [],
      remainingOrderCount: 0,
      currentDate: new Date(),
      clientTimezone: getClientTimezone(),
    });

    if (status === HttpStatusCode.Ok) {
      showNotification({
        color: "success",
        title: t("common.message.save_success_title"),
        message: t("order_group.cancel_success"),
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.save_error_title"),
        message: t("order_group.cancel_failed"),
      });
    }

    setIsCancelling(false);
    selectedOrderGroupRef.current = null;
    mutateOrderGroups();
    mutateOrderGroupCountByStatus();
    setOpenCancelOrderGroupModal(false);
  }, [mutateOrderGroupCountByStatus, mutateOrderGroups, showNotification, t]);

  /**
   * Callback function for handling the opening of the cancel order group modal.
   *
   * @param orderGroup - The order group to be cancelled.
   */
  const handleOpenCancelOrderGroupModal = useCallback(
    (orderGroup: OrderGroupInfo) => () => {
      setOpenCancelOrderGroupModal(true);
      selectedOrderGroupRef.current = orderGroup;
    },
    []
  );

  /**
   * Callback function for handling the closing of the cancel order group modal.
   */
  const handleCloseCancelOrderGroupModal = useCallback(() => {
    setOpenCancelOrderGroupModal(false);
    selectedOrderGroupRef.current = null;
  }, []);

  /**
   * Callback function for handling the opening of the order scheduler modal.
   */
  const handleOpenOrderSchedulerModal = useCallback(
    (orderGroup: OrderGroupInfo) => () => {
      setOpenOrderSchedulerModal(true);
      setSelectedOrderGroup(orderGroup);
      setSelectedVehicle({
        ...orderGroup.orders?.[0]?.trips?.[0]?.vehicle,
        driver: {
          ...orderGroup.orders?.[0]?.trips?.[0]?.driver,
        },
      } as VehicleInfo);
    },
    []
  );

  /**
   * Callback function for handling the closing of the order scheduler modal.
   */
  const handleCloseOrderSchedulerModal = useCallback(() => {
    setOpenOrderSchedulerModal(false);
    setSelectedOrderGroup(null);
    setSelectedVehicle(null);
  }, []);

  /**
   * Handle open vehicle selection modal.
   */
  const handleOpenVehicleSelectionModal = useCallback(() => {
    setOpenOrderSchedulerModal(false);
    setOpenVehicleSelectionModal(true);
  }, []);

  /**
   * Callback function for handling the closing of the vehicle selection modal.
   */
  const handleCloseVehicleSelectionModal = useCallback(() => {
    setOpenVehicleSelectionModal(false);
  }, []);

  /**
   * Callback function for handling the selection of a vehicle.
   */
  const handleSelectVehicle = useCallback(
    (vehicle: VehicleInfo) => {
      setSelectedVehicle(vehicle);
      setOpenOrderSchedulerModal(true);
      handleCloseVehicleSelectionModal();
    },
    [handleCloseVehicleSelectionModal, setOpenOrderSchedulerModal]
  );

  /**
   * Handle create order scheduler.
   */
  const handleUpdateOrderScheduler = useCallback(
    async (schedule: OrderScheduleInputForm) => {
      const { status } = await updateOrderScheduler(schedule);
      if (status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("order_group.order_scheduler_updated"),
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("order_group.order_scheduler_updated_error"),
        });
      }
      setSelectedOrderGroup(null);
      setSelectedVehicle(null);
      mutateOrderGroupCountByStatus();
      mutateOrderGroups();
    },
    [mutateOrderGroupCountByStatus, mutateOrderGroups, showNotification, t]
  );

  /**
   * Handle export order groups plan click.
   */
  const handleExportOrderGroupsPlanClick = useCallback(async () => {
    setIsExportOrderGroupsLoading(true);
    const { status, data } = await exportOrderGroupsPlanAcion({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });
    setIsExportOrderGroupsLoading(false);
    if (status === HttpStatusCode.Ok && data) {
      window.open(data);
    } else {
      showNotification({
        color: "error",
        title: t("order_group.export_plan_error_title"),
        message: t("order_group.export_plan_error_message"),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions, orgId]);

  /**
   * Calculate total quantity.
   * @param orderGroup - The order group to be calculated.
   * @returns The total quantity.
   */
  const calculateTotalQuantity = (orderGroup: Partial<OrderInfo>[]) => {
    const groupedQuantities = orderGroup.reduce(
      (acc, order) => {
        if (order.unit?.code) {
          if (!acc[order.unit?.code]) {
            acc[order.unit?.code] = 0;
          }
          acc[order.unit?.code] += order.weight ?? 0;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(groupedQuantities)
      .map(([unit, quantity]) => `${formatNumber(quantity)} ${unit}`)
      .join(", ");
  };

  /**
   * Calculate total cbm.
   * @param orderGroup - The order group to be calculated.
   * @returns The total cbm.
   */
  const totalCbm = (orderGroup: Partial<OrderInfo>[]) => {
    return orderGroup.reduce((acc, order) => {
      if (order.cbm) {
        acc += order.cbm;
      }
      return acc;
    }, 0);
  };

  return (
    <>
      <PageHeader
        title={t("order_group.title")}
        actionHorizontal
        showBorderBottom={false}
        description={
          <>
            <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
            <FilterStatus className="mt-2" options={filterOptions} onChange={handleFilterChange} />
          </>
        }
        actionComponent={
          <div className="flex flex-col items-end justify-end gap-y-6">
            <div className="flex items-center gap-x-4">
              <Button
                icon={HiOutlineArrowUpTray}
                className="w-fit"
                loading={isExportOrderGroupsLoading}
                onClick={handleExportOrderGroupsPlanClick}
              >
                {t("order_group.export_schedule")}
              </Button>

              <Authorization resource="order" action="new" alwaysAuthorized={canNew()}>
                <Button as={Link} href={`${orgLink}/orders/new`} icon={PlusIcon} className="w-fit">
                  {t("common.new")}
                </Button>
              </Authorization>
            </div>
          </div>
        }
      />
      <div>
        <Tabs items={tabItems} selectedTab={Tab.Plan} onTabChange={handleTabChange} />

        <div className="relative mt-4">
          <TabPanel item={tabItems[0]} selectedTab={Tab.Plan}>
            <Fragment />
          </TabPanel>
          <TabPanel item={tabItems[1]} selectedTab={Tab.Plan}>
            <TableContainer
              horizontalScroll
              verticalScroll
              allowFullscreen
              stickyHeader
              autoHeight
              footer={
                (pagination?.pageCount || 0) > 0 && (
                  <Pagination
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
                    <TableCell action>
                      <span className="sr-only">{t("common.empty")}</span>
                    </TableCell>
                    <TableCell>
                      <TableFilterMenu
                        actionPlacement="right"
                        label={t("order_group.vehicle")}
                        {...filterOptions.vehicle}
                        onApply={handleFilterApply("vehicle")}
                      />
                    </TableCell>
                    <TableCell>
                      <TableFilterMenu
                        label={t("order_group.vehicle_type")}
                        {...filterOptions.vehicleType}
                        onApply={handleFilterApply("vehicleType")}
                      />
                    </TableCell>
                    <TableCell>
                      <TableFilterMenu
                        label={t("order_group.driver")}
                        {...filterOptions.driver}
                        onApply={handleFilterApply("driver")}
                      />
                    </TableCell>
                    <TableCell>
                      <TableFilterMenu
                        hideSort
                        label={t("order_group.order_delivery_date")}
                        {...filterOptions.pickupDate}
                        onApply={handleFilterApply("pickupDate")}
                      />
                    </TableCell>

                    <TableCell>
                      <TableFilterMenu
                        hideSort
                        label={t("order_group.customer")}
                        {...filterOptions.customer}
                        onApply={handleFilterApply("customer")}
                      />
                    </TableCell>
                    <TableCell>{t("order_group.pickup_point")}</TableCell>
                    <TableCell>{t("order_group.delivery_point")}</TableCell>
                    <TableCell>{t("order_group.load_time")}</TableCell>
                    <TableCell>{t("order_group.delivery_time")}</TableCell>
                    <TableCell>{t("order_group.quantity")}</TableCell>
                    <TableCell>{t("order_group.cbm")}</TableCell>
                    <TableCell action />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Loading skeleton */}
                  {isLoading && orderGroups.length === 0 && (
                    <SkeletonTableRow rows={10} columns={12} multilineColumnIndexes={[4, 5, 7, 8]} />
                  )}

                  {/* Empty data */}
                  {!isLoading && orderGroups.length === 0 && (
                    <TableRow hover={false} className="mx-auto max-w-lg">
                      <TableCell colSpan={12} className="px-6 lg:px-8">
                        <EmptyListSection
                          actionLink={canNew() ? `${orgLink}/orders/new` : undefined}
                          description={canNew() ? undefined : t("common.empty_list")}
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {orderGroups.map((item, index) => (
                    <Disclosure key={item.id} as={Fragment} defaultOpen={true}>
                      {({ open }) => (
                        <>
                          <TableRow key={item.id} hover className={cn({ "bg-blue-50": open })}>
                            <Disclosure.Button as={Fragment}>
                              <TableCell action className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                {open ? (
                                  <ChevronUpIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                )}
                              </TableCell>
                            </Disclosure.Button>
                            <Disclosure.Button as={Fragment}>
                              <TableCell>
                                <InfoBox
                                  as={Link}
                                  href={`${orgLink}/vehicles/${encryptId(item.orders?.[0]?.trips?.[0]?.vehicle?.id)}`}
                                  label={item.orders?.[0]?.trips?.[0]?.vehicle?.vehicleNumber}
                                  emptyLabel={t("common.empty")}
                                />
                              </TableCell>
                            </Disclosure.Button>
                            <Disclosure.Button as={Fragment}>
                              <TableCell>
                                <InfoBox
                                  as={Link}
                                  href={`${orgLink}/settings/vehicle-types/${encryptId(
                                    item.orders?.[0]?.trips?.[0]?.vehicle?.type?.id
                                  )}`}
                                  label={item.orders?.[0]?.trips?.[0]?.vehicle?.type?.name}
                                  emptyLabel={t("common.empty")}
                                />
                              </TableCell>
                            </Disclosure.Button>
                            <Disclosure.Button as={Fragment}>
                              <TableCell>
                                <InfoBox
                                  emptyLabel={t("common.empty")}
                                  href={`${orgLink}/drivers/${encryptId(item.orders?.[0]?.trips?.[0]?.driver?.id)}`}
                                  label={getFullName(
                                    item.orders?.[0]?.trips?.[0]?.driver?.firstName,
                                    item.orders?.[0]?.trips?.[0]?.driver?.lastName
                                  )}
                                  subLabel={item.orders?.[0]?.trips?.[0]?.driver?.phoneNumber}
                                />
                              </TableCell>
                            </Disclosure.Button>
                            <Disclosure.Button as={Fragment}>
                              <TableCell>
                                <DateTimeLabel
                                  type="date"
                                  value={item.orders?.[0]?.trips?.[0]?.pickupDate}
                                  emptyLabel={t("common.empty")}
                                />
                                <br />
                                <DateTimeLabel
                                  type="date"
                                  value={item.orders?.[0]?.trips?.[0]?.deliveryDate}
                                  emptyLabel={t("common.empty")}
                                />
                              </TableCell>
                            </Disclosure.Button>
                            <Disclosure.Button as={Fragment}>
                              <TableCell colSpan={5}>
                                <Fragment />
                              </TableCell>
                            </Disclosure.Button>
                            <TableCell className="font-semibold text-gray-900" nowrap>
                              {calculateTotalQuantity(item.orders) || t("common.empty")}
                            </TableCell>
                            <TableCell className="font-semibold text-gray-900" nowrap>
                              {round(totalCbm(item.orders), 2) || t("common.empty")}
                            </TableCell>
                            <TableCell colSpan={3} align="right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="small"
                                  shape="circle"
                                  variant="text"
                                  icon={CheckIcon}
                                  onClick={handleOpenConfirmApproveModal(item)}
                                  loading={isApproving}
                                  data-tooltip-id="tooltip"
                                  data-tooltip-content={t("order_group.approve")}
                                />
                                <Button
                                  disabled={isApproving}
                                  shape="circle"
                                  variant="text"
                                  size="small"
                                  icon={HiPlus}
                                  data-tooltip-id="tooltip"
                                  data-tooltip-content={t("order_group.add_order")}
                                  onClick={handleOpenAddMoreOrderModal(item)}
                                />
                                <OrderGroupAction
                                  actionPlacement={index === 0 ? "end" : "start"}
                                  onEdit={handleOpenOrderSchedulerModal(item)}
                                  onCancel={handleOpenCancelOrderGroupModal(item)}
                                />
                              </div>
                            </TableCell>
                          </TableRow>

                          {(item.orders ?? []).map((order) => (
                            <Disclosure.Panel as={Fragment} key={order.code}>
                              <TableRow>
                                <TableCell colSpan={5} />
                                <TableCell>
                                  <InfoBox
                                    as={Link}
                                    label={order?.customer?.name}
                                    subLabel={order?.customer?.code}
                                    href={`${orgLink}/orders/${order?.code}`}
                                    emptyLabel={t("common.empty")}
                                  />
                                </TableCell>
                                <TableCell nowrap={false}>
                                  <InfoBox
                                    label={joinNonEmptyStrings(
                                      [order?.route?.pickupPoints?.[0]?.code, order?.route?.pickupPoints?.[0]?.name],
                                      " - "
                                    )}
                                    nowrap={false}
                                    subLabel={getDetailAddress(order?.route?.pickupPoints?.[0]?.address)}
                                    emptyLabel={t("common.empty")}
                                    className="min-w-[180px] max-w-[240px]"
                                  />
                                </TableCell>
                                <TableCell nowrap={false}>
                                  <InfoBox
                                    label={joinNonEmptyStrings(
                                      [
                                        order?.route?.deliveryPoints?.[0]?.code,
                                        order?.route?.deliveryPoints?.[0]?.name,
                                      ],
                                      " - "
                                    )}
                                    subLabel={getDetailAddress(order?.route?.deliveryPoints?.[0]?.address)}
                                    emptyLabel={t("common.empty")}
                                    nowrap={false}
                                    className="min-w-[180px] max-w-[240px]"
                                  />
                                </TableCell>
                                <TableCell nowrap={false} className="min-w-[120px] text-xs">
                                  {order?.trips?.[0]?.pickupTimeNotes || t("common.empty")}
                                </TableCell>
                                <TableCell nowrap={false} className="min-w-[120px] text-xs">
                                  {order?.trips?.[0]?.deliveryTimeNotes || t("common.empty")}
                                </TableCell>
                                <TableCell nowrap>
                                  <NumberLabel
                                    value={order?.weight}
                                    unit={order?.unit?.code}
                                    emptyLabel={t("common.empty")}
                                  />
                                </TableCell>
                                <TableCell nowrap>
                                  <NumberLabel value={order?.cbm} emptyLabel={t("common.empty")} />
                                </TableCell>
                                <TableCell action>
                                  <div className="flex items-center justify-end gap-2">
                                    <OrderMenu
                                      order={order as OrderInfo}
                                      onCanceled={handleOpenRemoveOrderModal(order, item)}
                                      isVisibleDelete={false}
                                      onShare={handleShare(order as OrderInfo)}
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            </Disclosure.Panel>
                          ))}
                        </>
                      )}
                    </Disclosure>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel item={tabItems[2]} selectedTab={Tab.Plan}>
            <Fragment />
          </TabPanel>
        </div>
      </div>

      {/* Confirm approve order group */}
      <ConfirmModal
        loading={isApproving}
        icon="question"
        open={openConfirmApproveModal}
        title={t("order_group.approve")}
        message={t("order_group.approve_message")}
        onConfirm={handleApproveOrderGroup}
        onCancel={handleCloseConfirmApproveModal}
      />

      {/* Add more order modal */}
      <AddMoreOrderModal
        open={openAddMoreOrderModal}
        onClose={handleCloseAddMoreOrderModal}
        selectedOrderGroup={selectedOrderGroupRef.current}
        onAdd={handleAddMoreOrder}
      />

      {/* Confirm remove order modal */}
      <ConfirmModal
        loading={isRemoving}
        icon="question"
        open={openRemoveOrderModal}
        title={t("order_group.remove_order")}
        message={t("order_group.remove_order_message")}
        onConfirm={handleRemoveOrder}
        onCancel={handleCloseRemoveOrderModal}
      />

      {/* Cancel order group modal */}
      <ConfirmModal
        loading={isCancelling}
        icon="warning"
        open={openCancelOrderGroupModal}
        title={t("order_group.cancel")}
        message={t("order_group.cancel_message")}
        onConfirm={handleCancelOrderGroup}
        onCancel={handleCloseCancelOrderGroupModal}
      />

      {/* Order share modal */}
      <OrderShareModal
        order={orderShare}
        open={isShareConfirmOpen}
        onClose={handleCloseShareOrder}
        onCancel={handleCloseShareOrder}
      />

      {/* Order scheduler modal */}
      <OrderSchedulerModal
        isEdit
        open={openOrderSchedulerModal}
        selectedOrderGroup={selectedOrderGroup}
        selectedVehicle={selectedVehicle}
        onPressSelectVehicle={handleOpenVehicleSelectionModal}
        onUpdate={handleUpdateOrderScheduler}
        onClose={handleCloseOrderSchedulerModal}
      />

      {/* Vehicle selection modal */}
      <VehicleSelectionModal
        open={openVehicleSelectionModal}
        onClose={handleCloseVehicleSelectionModal}
        onSelectVehicle={handleSelectVehicle}
      />
    </>
  );
});
