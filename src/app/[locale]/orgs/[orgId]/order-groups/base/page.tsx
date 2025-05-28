"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { OrderParticipantRole } from "@prisma/client";
import { useAtom } from "jotai";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { ChangeEvent, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HiOutlineArrowDownTray } from "react-icons/hi2";
import { useDispatch } from "react-redux";
import { mutate } from "swr";

import { createOrderScheduler } from "@/actions/orderGroup";
import { deleteOrders } from "@/actions/orders";
import { TabPanel, VisibleWithSetting } from "@/components/atoms";
import {
  Checkbox,
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
import { Authorization, Button, OrderMenu, PageHeader, QuickSearch, Tabs } from "@/components/molecules";
import { EmptyListSection, TableFilterMenu } from "@/components/molecules";
import {
  ConfirmModal,
  DeleteOrderModal,
  FilterStatus,
  OrderSchedulerModal,
  OrderShareModal,
  VehicleSelectionModal,
} from "@/components/organisms";
import { Pagination } from "@/components/organisms";
import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { OrderScheduleInputForm } from "@/forms/orderGroup";
import {
  useBaseOrders,
  useOrderGroupCountByStatus,
  useOrgSettingExtendedStorage,
  usePermission,
  useSearchConditions,
} from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useNotificationState } from "@/redux/states";
import { NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION } from "@/redux/types";
import { orderGroupAtom } from "@/states";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterOptions } from "@/types/filter";
import { SortType } from "@/types/filter";
import { FilterProperty } from "@/types/filter";
import { ImportedOrder } from "@/types/importedOrder";
import { CustomerInfo, OrderInfo, VehicleInfo } from "@/types/strapi";
import { put } from "@/utils/api";
import { OrgPageProps, withOrg } from "@/utils/client";
import { getClientTimezone } from "@/utils/date";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { ensureString, getDetailAddress, isTrue, joinNonEmptyStrings } from "@/utils/string";
import { cn } from "@/utils/twcn";

import { BaseOrderMenu, ImportedOrderPreviewModal, OrderImportModal } from "./components";

enum Tab {
  Base = "base",
  Plan = "plan",
  Processed = "process",
}

export default withOrg(({ orgLink, orgId, user, userId }: OrgPageProps) => {
  const t = useTranslations();
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { canNew } = usePermission("order");

  const { enableCbmField } = useOrgSettingExtendedStorage();
  const { haveNewNotification } = useNotificationState();
  const [
    { customerOptions, zoneOptions, unitOfMeasuresOptions, baseSearchConditions, selectedOrders },
    setOrderGroupState,
  ] = useAtom(orderGroupAtom);
  const [filterOptions, setFilterOptions] = useSearchConditions(baseSearchConditions);
  const [openOrderImportModal, setOpenOrderImportModal] = useState(false);
  const [openImportedOrderPreviewModal, setOpenImportedOrderPreviewModal] = useState(false);
  const [openShareModal, setOpenShareModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openDeleteManyOrdersModal, setOpenDeleteManyOrdersModal] = useState(false);
  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderShare, setOrderShare] = useState<OrderInfo | null>(null);
  const [importedOrders, setImportedOrders] = useState<{ orders: ImportedOrder[]; customer: CustomerInfo }>();
  const selectedCodeRef = useRef<OrderInfo>();

  const {
    baseCount,
    planCount,
    processedCount,
    mutate: mutateOrderGroupCountByStatus,
  } = useOrderGroupCountByStatus({
    organizationId: orgId,
  });

  const {
    orders,
    pagination,
    isLoading,
    mutate: mutateBaseOrders,
  } = useBaseOrders({
    organizationId: orgId,
    ...getFilterRequest(filterOptions),
  });

  const [openOrderSchedulerModal, setOpenOrderSchedulerModal] = useState(false);
  const [openVehicleSelectionModal, setOpenVehicleSelectionModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInfo | null>(null);

  const updateRouteRef = useRef(false);

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: t("order.title"), link: `${orgLink}/order-groups/base` },
      { name: t("order_group.title"), link: `${orgLink}/order-groups/base` },
      { name: t("order_group.tabs.base"), link: `${orgLink}/order-groups/base` },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (haveNewNotification) {
      dispatch({
        type: NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION,
        payload: false,
      });
      mutateBaseOrders();
      mutateOrderGroupCountByStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [haveNewNotification]);

  useEffect(() => {
    setFilterOptions((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        filters: [
          {
            ...prev.customer?.filters[0],
            items: customerOptions,
          },
        ],
      },
      pickupPoint: {
        ...prev.pickupPoint,
        filters: [
          {
            ...prev.pickupPoint?.filters[0],
          },
          {
            ...prev.pickupPoint?.filters[1],
            items: zoneOptions,
          },
          {
            ...prev.pickupPoint?.filters[2],
            items: zoneOptions,
          },
        ],
      },
      deliveryPoint: {
        ...prev.deliveryPoint,
        filters: [
          {
            ...prev.deliveryPoint?.filters[0],
          },
          {
            ...prev.deliveryPoint?.filters[1],
            items: zoneOptions,
          },
          {
            ...prev.deliveryPoint?.filters[2],
            items: zoneOptions,
          },
        ],
      },
      weight: {
        ...prev.weight,
        filters: [
          {
            ...prev.weight?.filters[0],
          },
          {
            ...prev.weight?.filters[1],
            items: unitOfMeasuresOptions,
          },
        ],
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitOfMeasuresOptions, zoneOptions, customerOptions]);

  /**
   * Handle share order.
   * @param order - The order to be shared.
   */
  const handleShare = useCallback((order: OrderInfo) => {
    setOrderShare(order);
    setOpenShareModal(true);
  }, []);

  /**
   * Handle close share order.
   */
  const handleCloseShareOrder = useCallback(() => {
    setOpenShareModal(false);
  }, []);

  /**
   * Callback function for canceling and closing a dialog.
   */
  const handleCloseDeleteModal = useCallback(() => {
    setOpenDeleteModal(false);
  }, []);

  /**
   * Callback function for opening a dialog.
   *
   * @param order The order to be deleted.
   */
  const handleOpenDeleteModal = useCallback((order: OrderInfo) => {
    selectedCodeRef.current = order;
    setOpenDeleteModal(true);
  }, []);

  /**
   * Handles the confirmation of deletion.
   * Sends a delete request, and displays a notification based on the result.
   */
  const handleConfirmDelete = useCallback(
    async (order: OrderInfo) => {
      if (order.code === selectedCodeRef.current?.code) {
        setIsProcessing(true);
        const result = await put<ApiResult<OrderInfo>>(`/api${orgLink}/orders/${order.code}/delete`, {
          order: {
            id: Number(selectedCodeRef.current.id),
            code: order.code,
            updatedByUser: user,
            trips: order.trips,
          },
          lastUpdatedAt: selectedCodeRef.current.updatedAt,
        });

        if (result.status !== HttpStatusCode.Ok) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedCodeRef.current?.code,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedCodeRef.current?.code,
            }),
          });
        }
        setOpenDeleteModal(false);
        mutateBaseOrders();
        mutateOrderGroupCountByStatus();
        setIsProcessing(false);
      } else {
        showNotification({
          color: "error",
          message: t("order.list_item.not_matched_message"),
        });
      }
    },
    [mutateBaseOrders, mutateOrderGroupCountByStatus, orgLink, showNotification, t, user]
  );

  /**
   * Callback function for opening a dialog.
   *
   * @param order The order to be canceled.
   */
  const handleOpenCancelModal = useCallback((order: OrderInfo) => {
    selectedCodeRef.current = order;
    setOpenCancelModal(true);
  }, []);

  /**
   * Callback function for canceling and closing a dialog.
   */
  const handleCloseCancelModal = useCallback(() => {
    setOpenCancelModal(false);
  }, []);

  /**
   * Handle the confirmation of order cancellation.
   * This function is called with an optional OrderInfo object to confirm the cancellation of an order.
   * @param {OrderInfo} [_order] - The order to cancel. If not provided, the function will use the currently selected order.
   */
  const handleConfirmCancel = useCallback(async () => {
    setIsProcessing(true);
    const order = selectedCodeRef.current;
    let result: ApiResult<OrderInfo> | undefined;
    if (order) {
      result = await put<ApiResult<OrderInfo>>(`/api${orgLink}/orders/${order.code}/cancel`, {
        order: {
          id: Number(order.id),
          code: order.code,
          updatedByUser: user,
          trips: order.trips,
        },
        lastUpdatedAt: order.updatedAt,
      });
    }

    setIsProcessing(false);
    if (!result) {
      return;
    }

    if (result.status !== HttpStatusCode.Ok) {
      // Handle different error types
      let message = "";
      switch (result.message) {
        case ErrorType.EXCLUSIVE:
          message = t("common.message.save_error_exclusive", { name: order?.code });
          break;
        case ErrorType.UNKNOWN:
          message = t("common.message.save_error_unknown", { name: order?.code });
          break;
        default:
          break;
      }

      // Show an error notification
      showNotification({
        color: "error",
        title: t("order.cancel_error_title"),
        message,
      });
    } else {
      // Show a success notification and navigate to the maintenance types page
      showNotification({
        color: "success",
        title: t("order.cancel_success_title"),
        message: t("order.cancel_success_message", { orderCode: order?.code }),
      });
    }
    setOpenCancelModal(false);
    mutateBaseOrders();
    mutateOrderGroupCountByStatus();
  }, [mutateBaseOrders, mutateOrderGroupCountByStatus, orgLink, showNotification, t, user]);

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
   * Callback function for handling selection/deselection of all orders.
   *
   * @param e - The checkbox change event
   */
  const handleSelectAllOrders = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const currentOrders = selectedOrders;
      if (e.target.checked) {
        const uniqueOrders = [...new Set([...currentOrders, ...orders])];
        setOrderGroupState((prev) => ({
          ...prev,
          selectedOrders: uniqueOrders,
        }));
      } else {
        const uniqueOrders = selectedOrders.filter((order) => !orders.some((o) => equalId(o.id, order.id)));
        setOrderGroupState((prev) => ({
          ...prev,
          selectedOrders: uniqueOrders,
        }));
      }
    },
    [orders, selectedOrders, setOrderGroupState]
  );

  /**
   * Callback function for handling order selection.
   *
   * @param order - The order to be selected/deselected
   * @returns A callback function that updates the selected orders state
   */
  const handleSelectOrder = useCallback(
    (order: OrderInfo) => () => {
      const currentOrders = selectedOrders;
      if (currentOrders.some((o) => equalId(o.id, order.id))) {
        setOrderGroupState((prev) => ({
          ...prev,
          selectedOrders: currentOrders.filter((o) => o.id !== order.id),
        }));
      } else {
        const uniqueOrders = [...new Set([...currentOrders, order])];
        setOrderGroupState((prev) => ({
          ...prev,
          selectedOrders: uniqueOrders,
        }));
      }
    },
    [selectedOrders, setOrderGroupState]
  );

  /**
   * Check if all orders are selected.
   */
  const isCheckedAll = useMemo(() => {
    if (isLoading || orders.length === 0 || !pagination) {
      return false;
    }
    return orders.every((order) => selectedOrders.some((selectedOrder) => equalId(selectedOrder.id, order.id)));
  }, [isLoading, orders, selectedOrders, pagination]);

  /**
   * Handle open order scheduler modal.
   */
  const handleOpenOrderSchedulerModal = useCallback(() => {
    setOpenOrderSchedulerModal(true);
  }, []);

  /**
   * Handle close order scheduler modal.
   */
  const handleCloseOrderSchedulerModal = useCallback(() => {
    setOpenOrderSchedulerModal(false);
  }, []);

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

  const isUserEditor = (order: OrderInfo) => {
    const participant = order.participants.find((item) => equalId(item.user?.id, userId));
    return (
      participant &&
      (participant.role === OrderParticipantRole.EDITOR || participant.role === OrderParticipantRole.OWNER)
    );
  };

  const isUserViewer = (order: OrderInfo) => {
    const participant = order.participants.find((item) => equalId(item.user?.id, userId));
    return participant && participant.role === OrderParticipantRole.VIEWER;
  };

  /**
   * Updating search params.
   */
  useEffect(() => {
    if (updateRouteRef.current) {
      const queryString = getQueryString(filterOptions);
      router.push(`${pathname}${queryString}`);
      setOrderGroupState((prev) => ({
        ...prev,
        baseSearchQueryString: queryString,
        baseSearchConditions: filterOptions,
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
   * Handle open vehicle selection modal.
   */
  const handleOpenVehicleSelectionModal = useCallback(() => {
    setOpenOrderSchedulerModal(false);
    setOpenVehicleSelectionModal(true);
  }, []);

  /**
   * Handle close vehicle selection modal.
   */

  const handleCloseVehicleSelectionModal = useCallback(() => {
    setOpenVehicleSelectionModal(false);
  }, []);

  /**
   * Handle select vehicle.
   */
  const handleSelectVehicle = useCallback(
    (vehicle: VehicleInfo) => {
      setSelectedVehicle(vehicle);
      handleOpenOrderSchedulerModal();
      handleCloseVehicleSelectionModal();
    },
    [handleOpenOrderSchedulerModal, handleCloseVehicleSelectionModal]
  );

  /**
   * Handle create order scheduler.
   */
  const handleCreateOrderScheduler = useCallback(
    async (schedule: OrderScheduleInputForm) => {
      const { status } = await createOrderScheduler(schedule);
      if (status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("order_group.order_scheduler_created"),
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("order_group.order_scheduler_created_error"),
        });
      }
      setOrderGroupState((prev) => ({ ...prev, selectedOrders: [] }));
      setSelectedVehicle(null);
      mutateOrderGroupCountByStatus();
      mutateBaseOrders();
    },
    [mutateOrderGroupCountByStatus, mutateBaseOrders, showNotification, t, setOrderGroupState]
  );

  /**
   * Handle close order import modal.
   */
  const handleCloseOrderImportModal = useCallback(() => {
    setOpenOrderImportModal(false);
  }, []);

  /**
   * Handle open order import modal.
   */
  const handleOpenOrderImportModal = useCallback(() => {
    setOpenOrderImportModal(true);
  }, []);

  /**
   * Handle uploaded order.
   */
  const handleUploadedOrder = useCallback((data: ImportedOrder[], customer: CustomerInfo) => {
    setImportedOrders({ orders: data, customer });
    setOpenImportedOrderPreviewModal(true);
  }, []);

  /**
   * Handle close imported order preview modal.
   */
  const handleCloseImportedOrderPreviewModal = useCallback(() => {
    setOpenImportedOrderPreviewModal(false);
  }, []);

  /**
   * Handle confirm imported order.
   */
  const handleConfirmImportedOrder = useCallback(() => {
    setOpenOrderImportModal(false);
    setOpenImportedOrderPreviewModal(false);
    showNotification({
      color: "success",
      title: t("order_group.import_order_success_title"),
      message: t("order_group.import_order_success_message"),
    });
    mutateBaseOrders();
    mutateOrderGroupCountByStatus();

    // Reload zone options data to ensure the latest information is available
    mutate(["zone-options", { organizationId: orgId }]);
  }, [mutateBaseOrders, mutateOrderGroupCountByStatus, orgId, showNotification, t]);

  /**
   * Handle close delete many orders modal.
   */
  const handleCloseDeleteManyOrdersModal = useCallback(() => {
    setOpenDeleteManyOrdersModal(false);
  }, []);

  /**
   * Handle confirm delete many orders.
   */
  const handleOpenDeleteManyOrdersModal = useCallback(() => {
    setOpenDeleteManyOrdersModal(true);
  }, []);

  /**
   * Handle confirm delete many orders.
   */
  const handleConfirmDeleteManyOrders = useCallback(async () => {
    setIsProcessing(true);
    const orderIds = selectedOrders.map((order) => Number(order.id));
    const { status } = await deleteOrders({ clientTimezone: getClientTimezone(), orderIds });
    if (status === HttpStatusCode.Ok) {
      showNotification({
        color: "success",
        title: t("common.message.delete_success_title"),
        message: t("common.message.delete_success_message", {
          name: `${selectedOrders.length} ${t("order_group.order")}`,
        }),
      });
    } else {
      showNotification({
        color: "error",
        title: t("common.message.delete_error_title"),
        message: t("common.message.delete_error_message", {
          name: `${selectedOrders.length} ${t("order_group.order")}`,
        }),
      });
    }

    setOrderGroupState((prev) => ({ ...prev, selectedOrders: [] }));
    mutateOrderGroupCountByStatus();
    mutateBaseOrders();
    setOpenDeleteManyOrdersModal(false);
    setIsProcessing(false);
  }, [mutateBaseOrders, mutateOrderGroupCountByStatus, selectedOrders, setOrderGroupState, showNotification, t]);

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
              <Button icon={HiOutlineArrowDownTray} className="w-fit" onClick={handleOpenOrderImportModal}>
                {t("order_group.import_order")}
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
        <Tabs items={tabItems} selectedTab={Tab.Base} onTabChange={handleTabChange} />

        <div className="relative mt-4">
          <TabPanel item={tabItems[0]} selectedTab={Tab.Base}>
            <div className="grid w-full grid-cols-1 gap-4 2xl:grid-cols-12">
              <div
                className={cn("col-span-full -mt-3", {
                  "2xl:col-span-9": selectedOrders.length > 0,
                })}
              >
                <TableContainer
                  horizontalScroll
                  verticalScroll
                  allowFullscreen
                  stickyHeader
                  autoHeight
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
                        <TableCell action>
                          <Checkbox label="" checked={isCheckedAll} onChange={handleSelectAllOrders} />
                        </TableCell>
                        <TableCell>
                          <TableFilterMenu
                            actionPlacement="center"
                            label={t("order_group.customer")}
                            {...filterOptions.customer}
                            onApply={handleFilterApply("customer")}
                          />
                        </TableCell>
                        <TableCell>
                          <TableFilterMenu
                            hideSort
                            label={t("order_group.pickup_point")}
                            {...filterOptions.pickupPoint}
                            onApply={handleFilterApply("pickupPoint")}
                          />
                        </TableCell>
                        <TableCell>
                          <TableFilterMenu
                            hideSort
                            label={t("order_group.delivery_point")}
                            {...filterOptions.deliveryPoint}
                            onApply={handleFilterApply("deliveryPoint")}
                          />
                        </TableCell>
                        <TableCell>
                          <TableFilterMenu
                            label={t("order_group.order_delivery_date")}
                            {...filterOptions.orderDate}
                            onApply={handleFilterApply("orderDate")}
                          />
                        </TableCell>
                        <TableCell>
                          <TableFilterMenu
                            actionPlacement="left"
                            label={t("order_group.quantity")}
                            {...filterOptions.weight}
                            onApply={handleFilterApply("weight")}
                          />
                        </TableCell>
                        <VisibleWithSetting settingKey={OrganizationSettingExtendedKey.ENABLE_CBM_FIELD} expect={true}>
                          <TableCell>
                            <TableFilterMenu
                              actionPlacement="left"
                              label={t("order_group.cbm")}
                              {...filterOptions.cbm}
                              onApply={handleFilterApply("cbm")}
                            />
                          </TableCell>
                        </VisibleWithSetting>
                        <TableCell action className="w-10">
                          <span className="sr-only">{t("common.actions")}</span>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Loading skeleton */}
                      {isLoading && orders.length === 0 && (
                        <SkeletonTableRow
                          rows={10}
                          columns={isTrue(enableCbmField) ? 7 : 6}
                          multilineColumnIndexes={[1, 2, 3, 4]}
                        />
                      )}

                      {/* Empty data */}
                      {!isLoading && orders.length === 0 && (
                        <TableRow hover={false} className="mx-auto max-w-lg">
                          <TableCell colSpan={isTrue(enableCbmField) ? 8 : 7} className="px-6 lg:px-8">
                            <EmptyListSection
                              actionLink={canNew() ? `${orgLink}/orders/new` : undefined}
                              description={canNew() ? undefined : t("common.empty_list")}
                            />
                          </TableCell>
                        </TableRow>
                      )}

                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell action>
                            <Checkbox
                              label=""
                              checked={
                                !isLoading &&
                                orders.length > 0 &&
                                selectedOrders.find((o) => equalId(o.id, order.id)) !== undefined
                              }
                              onChange={handleSelectOrder(order)}
                            />
                          </TableCell>
                          <TableCell>
                            <InfoBox
                              label={order.customer?.name}
                              subLabel={order.customer?.code}
                              emptyLabel={t("common.empty")}
                              nowrap={false}
                              className="min-w-[180px] max-w-[240px]"
                            />
                          </TableCell>
                          <TableCell nowrap={false}>
                            <InfoBox
                              label={joinNonEmptyStrings(
                                [order?.route?.pickupPoints?.[0]?.code, order?.route?.pickupPoints?.[0]?.name],
                                " - "
                              )}
                              subLabel={getDetailAddress(order?.route?.pickupPoints?.[0]?.address)}
                              emptyLabel={t("common.empty")}
                              nowrap={false}
                              className="min-w-[180px] max-w-[240px]"
                            />
                          </TableCell>
                          <TableCell nowrap={false}>
                            <InfoBox
                              label={joinNonEmptyStrings(
                                [order?.route?.deliveryPoints?.[0]?.code, order?.route?.deliveryPoints?.[0]?.name],
                                " - "
                              )}
                              subLabel={getDetailAddress(order?.route?.deliveryPoints?.[0]?.address)}
                              emptyLabel={t("common.empty")}
                              nowrap={false}
                              className="min-w-[180px] max-w-[240px]"
                            />
                          </TableCell>
                          <TableCell>
                            <DateTimeLabel value={order.orderDate} type="date" emptyLabel={t("common.empty")} />
                            <br />
                            <DateTimeLabel value={order.deliveryDate} type="date" emptyLabel={t("common.empty")} />
                          </TableCell>
                          <TableCell>
                            <NumberLabel value={order.weight} unit={order.unit?.code} emptyLabel={t("common.empty")} />
                          </TableCell>
                          <VisibleWithSetting
                            settingKey={OrganizationSettingExtendedKey.ENABLE_CBM_FIELD}
                            expect={true}
                          >
                            <TableCell>
                              <NumberLabel value={order.cbm} emptyLabel={t("common.empty")} />
                            </TableCell>
                          </VisibleWithSetting>

                          <TableCell action>
                            <OrderMenu
                              order={order}
                              onCanceled={handleOpenCancelModal}
                              onDeleted={handleOpenDeleteModal}
                              isEdit={isUserEditor(order)}
                              isView={isUserViewer(order)}
                              onShare={() => handleShare(order)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>

              {/* Menu */}
              <div className="mt-2 2xl:col-span-3">
                <BaseOrderMenu
                  selectedOrders={selectedOrders}
                  onPlan={handleOpenOrderSchedulerModal}
                  onDelete={handleOpenDeleteManyOrdersModal}
                />
              </div>
            </div>
          </TabPanel>
          <TabPanel item={tabItems[1]} selectedTab={Tab.Base}>
            <Fragment />
          </TabPanel>
          <TabPanel item={tabItems[2]} selectedTab={Tab.Base}>
            <Fragment />
          </TabPanel>
        </div>
      </div>

      {/* Order scheduler modal */}
      <OrderSchedulerModal
        open={openOrderSchedulerModal}
        onClose={handleCloseOrderSchedulerModal}
        onPressSelectVehicle={handleOpenVehicleSelectionModal}
        selectedVehicle={selectedVehicle}
        onCreate={handleCreateOrderScheduler}
      />

      {/* Vehicle selection modal */}
      <VehicleSelectionModal
        open={openVehicleSelectionModal}
        onClose={handleCloseVehicleSelectionModal}
        onSelectVehicle={handleSelectVehicle}
      />

      {/* Order import modal */}
      <OrderImportModal
        open={openOrderImportModal}
        onClose={handleCloseOrderImportModal}
        onUploaded={handleUploadedOrder}
      />

      {/* Imported order preview modal */}
      <ImportedOrderPreviewModal
        open={openImportedOrderPreviewModal}
        onClose={handleCloseImportedOrderPreviewModal}
        onConfirm={handleConfirmImportedOrder}
        orders={importedOrders?.orders ?? []}
        customer={importedOrders?.customer}
      />

      {/* Order share modal */}
      <OrderShareModal
        order={orderShare}
        open={openShareModal}
        onClose={handleCloseShareOrder}
        onCancel={handleCloseShareOrder}
      />

      {/* Cancel confirm modal */}
      <ConfirmModal
        open={openCancelModal}
        loading={isProcessing}
        icon="question"
        title={t("order.details.confirm_cancel_title")}
        message={t("order.details.confirm_cancel_message")}
        onClose={handleCloseCancelModal}
        onCancel={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
      />

      {/* Delete confirm modal */}
      <DeleteOrderModal
        open={openDeleteModal}
        order={selectedCodeRef.current as OrderInfo}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />

      {/* Delete orders modal */}
      <ConfirmModal
        color="error"
        open={openDeleteManyOrdersModal}
        loading={isProcessing}
        icon="warning"
        title={t("order_group.confirm_delete_orders_title")}
        message={t("order_group.confirm_delete_orders_message", {
          numOfOrders: selectedOrders.length,
        })}
        onClose={handleCloseDeleteManyOrdersModal}
        onCancel={handleCloseDeleteManyOrdersModal}
        onConfirm={handleConfirmDeleteManyOrders}
      />
    </>
  );
});
