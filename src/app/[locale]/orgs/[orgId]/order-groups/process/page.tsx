"use client";

import { Disclosure } from "@headlessui/react";
import { ChatBubbleBottomCenterTextIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon } from "@heroicons/react/24/outline";
import { OrderGroupStatusType, OrderTripStatusType } from "@prisma/client";
import { useAtom } from "jotai";
import round from "lodash/round";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BsSend } from "react-icons/bs";
import { useDispatch } from "react-redux";

import { inboundOrderGroup, sendNotificationToOrderGroup } from "@/actions/orderGroup";
import { sendOutboundOrdersToWarehouse } from "@/actions/tms-tap-warehouse";
import { Badge, DateTimeLabel, NumberLabel, SkeletonTableRow, TabPanel, Visible } from "@/components/atoms";
import { InfoBox, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { Authorization, Button, EmptyListSection, PageHeader, QuickSearch, Tabs } from "@/components/molecules";
import { TableFilterMenu } from "@/components/molecules";
import { tripSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import {
  ConfirmModal,
  FilterStatus,
  InboundModal,
  InboundOrderInfoModal,
  MessageModal,
  OrderGroupAction,
  OrderShareModal,
  OutboundModal,
  Pagination,
  QuickUpdateOrderTripStatusModal,
  UpdateBillOfLadingModal,
  VehicleSelectionModal,
} from "@/components/organisms";
import { InboundOrderGroupInputForm } from "@/forms/orderGroup";
import {
  useAuth,
  useIdParam,
  useOrderGroupCountByStatus,
  useOrderGroups,
  usePermission,
  useSearchConditions,
} from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useNotificationState } from "@/redux/states";
import { NOTIFICATION_UPDATE_HAVE_NEW_NOTIFICATION } from "@/redux/types";
import { orderGroupAtom } from "@/states";
import { HttpStatusCode } from "@/types/api";
import { FilterOptions } from "@/types/filter";
import { SortType } from "@/types/filter";
import { FilterProperty } from "@/types/filter";
import { OrderGroupInfo, OrderInfo, OrderTripInfo, VehicleInfo } from "@/types/strapi";
import { OutboundOrderRequest } from "@/types/tms-tap-warehouse";
import { getFullName } from "@/utils/auth";
import { OrgPageProps, withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { formatNumber } from "@/utils/number";
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
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const { encryptId } = useIdParam();
  const { canNew } = usePermission("order");
  const { setBreadcrumb } = useBreadcrumb();

  const [{ vehicleTypeOptions, customerOptions, planOrderGroupSearchConditions }, setPlanOrderGroupSearchConditions] =
    useAtom(orderGroupAtom);
  const { haveNewNotification } = useNotificationState();
  const [filterOptions, setFilterOptions] = useSearchConditions(planOrderGroupSearchConditions);

  const {
    baseCount,
    planCount,
    processedCount,
    mutate: mutateOrderGroupCountByStatus,
  } = useOrderGroupCountByStatus({ organizationId: orgId });
  const {
    orderGroups,
    pagination,
    isLoading,
    mutate: mutateOrderGroups,
  } = useOrderGroups({
    organizationId: orgId,
    includeStatuses: true,
    excludeImportOrders: true,
    lastStatusTypes: [
      OrderGroupStatusType.APPROVED,
      OrderGroupStatusType.TRANSHIPMENT,
      OrderGroupStatusType.IN_STOCK,
      OrderGroupStatusType.INBOUND,
      OrderGroupStatusType.OUTBOUND,
      OrderGroupStatusType.IN_PROGRESS,
      OrderGroupStatusType.DELIVERED,
      OrderGroupStatusType.COMPLETED,
      OrderGroupStatusType.CANCELED,
    ],
    ...getFilterRequest(filterOptions),
  });

  const [openSendNotificationModal, setOpenSendNotificationModal] = useState(false);
  const [openInboundModal, setOpenInboundModal] = useState(false);
  const [openOutboundModal, setOpenOutboundModal] = useState(false);
  const [openVehicleSelectionModal, setOpenVehicleSelectionModal] = useState(false);
  const [openMessageModal, setOpenMessageModal] = useState(false);
  const [openQuickUpdateOrderTripStatusModal, setOpenQuickUpdateOrderTripStatusModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleInfo | null>(null);
  const [openShareModal, setOpenShareModal] = useState(false);
  const [orderShare, setOrderShare] = useState<OrderInfo | null>(null);
  const [openUpdateBillOfLadingModal, setOpenUpdateBillOfLadingModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [openInboundOrderInfoModal, setOpenInboundOrderInfoModal] = useState(false);

  const updateRouteRef = useRef(false);
  const selectedOrderGroupRef = useRef<OrderGroupInfo | null>(null);
  const selectedOrderRef = useRef<Partial<OrderInfo> | null>(null);
  const selectedOrderTripRef = useRef<Partial<OrderTripInfo> | null>(null);
  const isInboundOrderRef = useRef<boolean>(false);
  const processByOrderRef = useRef<number | null>(null);

  /**
   * Updating the breadcrumb navigation.
   */
  useEffect(() => {
    setBreadcrumb([
      { name: t("order.title"), link: `${orgLink}/order-groups/base` },
      { name: t("order_group.title"), link: `${orgLink}/order-groups/base` },
      { name: t("order_group.tabs.processed"), link: `${orgLink}/order-groups/process` },
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
   * Callback function for handling the sending of a notification to an order group.
   */
  const handleSendNotification = useCallback(async () => {
    setOpenSendNotificationModal(false);
    if (!selectedOrderGroupRef.current) {
      showNotification({
        color: "error",
        title: t("order_group.send_notification"),
        message: t("order_group.send_notification_error"),
      });
      return;
    }

    // Set sending status to true
    setIsSending(true);

    // Initialize arrays and variables to store order group data
    const currentOrderIds: number[] = [];
    let totalWeight = 0;
    const uniqueUnit: string[] = [];
    let vehicleNumber = "";
    let driverFullName = "";
    let driverId: number | null = null;

    // Iterate through orders in the selected order group
    for (const order of selectedOrderGroupRef.current?.orders ?? []) {
      if (order.id) {
        // Add order ID to array of current orders
        currentOrderIds.push(order.id);

        // Calculate total weight across all orders
        totalWeight += order.weight ?? 0;

        // Track unique unit codes
        if (order.unit?.code && !uniqueUnit.includes(order.unit?.code)) {
          uniqueUnit.push(order.unit?.code);
        }

        // Get vehicle number from first trip if not already set
        if (!vehicleNumber && order.trips?.[0]?.vehicle?.vehicleNumber) {
          vehicleNumber = order.trips?.[0]?.vehicle?.vehicleNumber;
        }

        // Get driver full name from first trip if not already set
        const driver = order.trips?.[0]?.driver;
        if (!driverFullName && driver) {
          driverFullName = getFullName(driver.firstName, driver.lastName);
          driverId = driver.id ?? null;
        }
      }
    }

    // Send notification to order group
    const { status } = await sendNotificationToOrderGroup({
      orderGroup: { id: selectedOrderGroupRef.current.id, code: selectedOrderGroupRef.current.code },
      currentOrderIds,
      organizationId: orgId,
      fullName: getFullName(user?.detail?.firstName, user?.detail?.lastName),
      vehicleNumber,
      driverId,
      driverFullName,
      weight: totalWeight,
      unitOfMeasure: uniqueUnit.join(", "),
    });

    // Show notification based on the status of the notification
    if (status === HttpStatusCode.Ok) {
      showNotification({
        color: "success",
        title: t("order_group.send_notification"),
        message: t("order_group.send_notification_success"),
      });
    } else {
      showNotification({
        color: "error",
        title: t("order_group.send_notification"),
        message: t("order_group.send_notification_error"),
      });
    }

    selectedOrderGroupRef.current = null;
    setIsSending(false);
    setOpenSendNotificationModal(false);
    mutateOrderGroups();
  }, [orgId, showNotification, t, user?.detail?.firstName, user?.detail?.lastName, mutateOrderGroups]);

  /**
   * Callback function for handling the opening of the send notification modal.
   *
   * @param item - The order group item to be selected.
   */
  const handleOpenSendNotificationModal = useCallback(
    (item: OrderGroupInfo) => () => {
      setOpenSendNotificationModal(true);
      selectedOrderGroupRef.current = item;
    },
    []
  );

  /**
   * Callback function for handling the closing of the send notification modal.
   */
  const handleCloseNotificationModal = useCallback(() => {
    setOpenSendNotificationModal(false);
  }, []);

  /**
   * Callback function for handling the closing of the inbound order info modal.
   */
  const handleCloseInboundOrderInfoModal = useCallback(() => {
    setOpenInboundOrderInfoModal(false);
    processByOrderRef.current = null;
  }, []);

  /**
   * Callback function for handling the opening of the inbound order info modal.
   */
  const handleOpenInboundOrderInfoModal = useCallback(
    (item: OrderInfo) => () => {
      setOpenInboundOrderInfoModal(true);
      processByOrderRef.current = item.id;
    },
    []
  );

  /**
   * Calculate total quantity for an order group by summing weights grouped by unit code
   *
   * @param orderGroup - Array of order info objects to calculate totals for
   * @returns Formatted string of quantities with units (e.g. "100 KG, 50 TON")
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
   * Calculate total cbm for an order group by summing cbm grouped by cbm value
   *
   * @param orderGroup - Array of order info objects to calculate totals for
   * @returns Formatted string of quantities with units (e.g. "100 KG, 50 TON")
   */
  const totalCbm = (orderGroup: Partial<OrderInfo>[]) => {
    return orderGroup.reduce((acc, order) => {
      if (order.cbm) {
        acc += order.cbm;
      }
      return acc;
    }, 0);
  };

  /**
   * Callback function for handling the closing of the inbound modal.
   */
  const handleCloseInboundModal = useCallback(() => {
    setOpenInboundModal(false);
  }, []);

  /**
   * Callback function for handling the creation of an inbound order.
   */
  const handleOpenInboundModal = useCallback(
    (item: OrderGroupInfo) => () => {
      setOpenInboundModal(true);
      selectedOrderGroupRef.current = item;
    },
    []
  );

  /**
   * Handle open vehicle selection modal.
   */
  const handleOpenVehicleSelectionModal = useCallback(() => {
    setOpenInboundModal(false);
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
      setOpenInboundModal(true);
      handleCloseVehicleSelectionModal();
    },
    [handleCloseVehicleSelectionModal, setOpenInboundModal]
  );

  /**
   * Callback function for handling the inbound of an order group.
   */
  const handleInboundOrderGroup = useCallback(
    async (data: InboundOrderGroupInputForm) => {
      const { status } = await inboundOrderGroup(data);

      if (status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("order_group.inbound_order_group_success"),
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("order_group.inbound_order_group_error"),
        });
      }
      selectedOrderGroupRef.current = null;
      setSelectedVehicle(null);
      mutateOrderGroupCountByStatus();
      mutateOrderGroups();
    },
    [mutateOrderGroupCountByStatus, mutateOrderGroups, showNotification, t]
  );

  /**
   * Handle open outbound modal.
   */
  const handleOpenOutboundModal = useCallback(
    (item: OrderGroupInfo) => () => {
      setOpenOutboundModal(true);
      selectedOrderGroupRef.current = item;
    },
    []
  );

  /**
   * Callback function for handling the closing of the outbound modal.
   */
  const handleCloseOutboundModal = useCallback(() => {
    setOpenOutboundModal(false);
    selectedOrderGroupRef.current = null;
  }, []);

  /**
   * Callback function for handling the outbound of an order group.
   */
  const handleOutboundOrderGroup = useCallback(
    async (data: OutboundOrderRequest) => {
      const { status } = await sendOutboundOrdersToWarehouse(data);

      if (status === HttpStatusCode.Ok) {
        showNotification({
          color: "success",
          title: t("common.message.save_success_title"),
          message: t("order_group.outbound_order_group_success"),
        });
      } else {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("order_group.outbound_order_group_error"),
        });
      }
      selectedOrderGroupRef.current = null;
      mutateOrderGroups();
    },
    [mutateOrderGroups, showNotification, t]
  );

  /**
   * Handles opening the message modal for sending a notification to a specific driver.
   * @param {Partial<OrderInfo>} item - The order group information.
   */
  const handleOpenMessageModal = useCallback(
    (item: Partial<OrderInfo>) => () => {
      selectedOrderRef.current = item;
      setOpenMessageModal(true);
    },
    []
  );

  /**
   * Handles closing the message modal.
   */
  const handleCloseMessageModal = useCallback(() => {
    setOpenMessageModal(false);
    selectedOrderRef.current = null;
  }, []);

  /**
   * Handles closing the quick update order trip status modal.
   */
  const handleCloseQuickUpdateOrderTripStatusModal = useCallback(() => {
    setOpenQuickUpdateOrderTripStatusModal(false);
    selectedOrderTripRef.current = null;
  }, []);

  /**
   * Handles opening the quick update order trip status modal.
   * @param {OrderGroupInfo} item - The order group information.
   */
  const handleOpenQuickUpdateOrderTripStatusModal = useCallback(
    (item: Partial<OrderTripInfo> | null, isInboundOrder: boolean) => () => {
      setOpenQuickUpdateOrderTripStatusModal(true);
      selectedOrderTripRef.current = item;
      isInboundOrderRef.current = isInboundOrder;
    },
    []
  );

  /**
   * Handles updating the status of an order trip.
   * @param {number} id - The ID of the order trip to update.
   */
  const handleUpdateOrderTripStatus = useCallback(() => {
    setOpenQuickUpdateOrderTripStatusModal(false);
    selectedOrderTripRef.current = null;
    mutateOrderGroups();
  }, [mutateOrderGroups]);

  /**
   * Handles closing the share order modal.
   */
  const handleCloseShareOrder = useCallback(() => {
    setOpenShareModal(false);
    setOrderShare(null);
  }, []);

  /**
   * Handles opening the share order modal.
   */
  const handleOpenShareOrder = useCallback(
    (order: OrderInfo) => () => {
      setOrderShare(order);
      setOpenShareModal(true);
    },
    []
  );

  /**
   * Handles opening the update bill of lading modal.
   */
  const handleOpenUpdateBillOfLadingModal = useCallback(
    (item: Partial<OrderInfo> | null) => () => {
      setOpenUpdateBillOfLadingModal(true);
      selectedOrderRef.current = item;
      selectedOrderTripRef.current = {
        ...item?.trips?.[0],
        order: { ...item },
      };
    },
    []
  );

  /**
   * Handles closing the update bill of lading modal.
   */
  const handleCloseUpdateBillOfLadingModal = useCallback(() => {
    setOpenUpdateBillOfLadingModal(false);
    selectedOrderRef.current = null;
    selectedOrderTripRef.current = null;
  }, []);

  /**
   * Handles submitting the update bill of lading modal.
   */
  const handleSubmitUpdateBillOfLadingModal = useCallback(() => {
    handleCloseUpdateBillOfLadingModal();
    mutateOrderGroups();
    mutateOrderGroupCountByStatus();
  }, [handleCloseUpdateBillOfLadingModal, mutateOrderGroupCountByStatus, mutateOrderGroups]);

  /**
   * Checks if a notification can be sent for the given order group.
   *
   * A notification can be sent only if:
   * 1. The order group has at least one order with a trip
   * 2. The last status of the all trips is either PENDING_CONFIRMATION or NEW
   *
   * @param orderGroup - The order group to check
   * @returns boolean - True if notification can be sent, false otherwise
   */
  const canSendNotification = useCallback((orderGroup: OrderGroupInfo) => {
    if (!orderGroup?.orders?.[0]?.trips?.[0]) {
      return false;
    }

    return orderGroup.orders.every((order) => {
      return order.trips?.every((trip) => {
        return (
          trip.lastStatusType === OrderTripStatusType.PENDING_CONFIRMATION ||
          trip.lastStatusType === OrderTripStatusType.NEW
        );
      });
    });
  }, []);

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
        <Tabs items={tabItems} selectedTab={Tab.Processed} onTabChange={handleTabChange} />

        <div className="relative mt-4">
          <TabPanel item={tabItems[0]} selectedTab={Tab.Processed}>
            <Fragment />
          </TabPanel>
          <TabPanel item={tabItems[1]} selectedTab={Tab.Processed}>
            <Fragment />
          </TabPanel>

          <TabPanel item={tabItems[2]} selectedTab={Tab.Processed}>
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
                    {/* 1. Action */}
                    <TableCell action>
                      <span className="sr-only">{t("common.empty")}</span>
                    </TableCell>

                    {/* 2. Code */}
                    <TableCell>{t("order_group.code")}</TableCell>

                    {/* 2. Vehicle */}
                    <TableCell>
                      <TableFilterMenu
                        label={t("order_group.vehicle")}
                        {...filterOptions.vehicle}
                        onApply={handleFilterApply("vehicle")}
                      />
                    </TableCell>

                    {/* 3. Vehicle Type */}
                    <TableCell>
                      <TableFilterMenu
                        label={t("order_group.vehicle_type")}
                        {...filterOptions.vehicleType}
                        onApply={handleFilterApply("vehicleType")}
                      />
                    </TableCell>

                    {/* 4. Driver */}
                    <TableCell>
                      <TableFilterMenu
                        label={t("order_group.driver")}
                        {...filterOptions.driver}
                        onApply={handleFilterApply("driver")}
                      />
                    </TableCell>

                    {/* 5. Pickup Date */}
                    <TableCell>
                      <TableFilterMenu
                        label={t("order_group.order_delivery_date")}
                        {...filterOptions.pickupDate}
                        onApply={handleFilterApply("pickupDate")}
                      />
                    </TableCell>

                    {/* 6. Status */}
                    <TableCell>{t("order_group.status")}</TableCell>

                    {/* 7. Customer */}
                    <TableCell>
                      <TableFilterMenu
                        hideSort
                        label={t("order_group.customer")}
                        {...filterOptions.customer}
                        onApply={handleFilterApply("customer")}
                      />
                    </TableCell>

                    {/* 8. Pickup Point */}
                    <TableCell>{t("order_group.pickup_point")}</TableCell>

                    {/* 9. Delivery Point */}
                    <TableCell>{t("order_group.delivery_point")}</TableCell>

                    {/* 10. Load Time */}
                    <TableCell>{t("order_group.load_time")}</TableCell>

                    {/* 11. Delivery Time */}
                    <TableCell>{t("order_group.delivery_time")}</TableCell>

                    {/* 12. Quantity */}
                    <TableCell>{t("order_group.quantity")}</TableCell>

                    {/* 13. CBM */}
                    <TableCell>{t("order_group.cbm")}</TableCell>

                    {/* 14. Action */}
                    <TableCell action />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Loading skeleton */}
                  <Visible when={!!isLoading && orderGroups.length === 0}>
                    <SkeletonTableRow rows={10} columns={15} multilineColumnIndexes={[5, 6, 8, 9]} />
                  </Visible>

                  {/* Empty data */}
                  <Visible when={!isLoading && orderGroups.length === 0}>
                    <TableRow hover={false} className="mx-auto max-w-lg">
                      <TableCell colSpan={15} className="px-6 lg:px-8">
                        <EmptyListSection
                          actionLink={canNew() ? `${orgLink}/orders/new` : undefined}
                          description={canNew() ? undefined : t("common.empty_list")}
                        />
                      </TableCell>
                    </TableRow>
                  </Visible>

                  {orderGroups.map((item, index) => (
                    <Disclosure key={item.id} as={Fragment} defaultOpen={true}>
                      {({ open }) => (
                        <>
                          <TableRow
                            key={item.id}
                            hover
                            className={cn({ "bg-blue-50": open && !item?.orders?.[0]?.processForGroups?.[0]?.id })}
                          >
                            {/* 1. Action */}
                            <Disclosure.Button as={Fragment}>
                              <TableCell action className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                <Visible when={!item?.orders?.[0]?.processForGroups?.[0]?.id}>
                                  {open ? (
                                    <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                  ) : (
                                    <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                  )}
                                </Visible>
                              </TableCell>
                            </Disclosure.Button>

                            {/* 2. Code */}
                            <Disclosure.Button as={Fragment}>
                              <TableCell className="text-xs font-medium text-gray-900">{item.code}</TableCell>
                            </Disclosure.Button>

                            {/* 3. Vehicle */}
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

                            {/* 4. Vehicle Type */}
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

                            {/* 5. Driver */}
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

                            {/* 6. Pickup Date */}
                            <Disclosure.Button as={Fragment}>
                              <TableCell nowrap>
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
                            {/* 7 - 8 - 9 - 10 - 11 - 12. Customer - Route - Pickup Time - Delivery Time  */}
                            {/* If an order has processForGroups field with value (item?.orders?.[0]?.processForGroups?[0]?.id)
                              then it is an internal order used for consolidating orders to warehouse (inbound order) */}
                            <Visible when={!!item?.orders?.[0]?.processForGroups?.[0]?.id}>
                              <Disclosure.Button as={Fragment}>
                                <TableCell colSpan={3}>
                                  <Badge color="purple" label={t("order_group.inbound_order")} />
                                </TableCell>
                              </Disclosure.Button>

                              <Disclosure.Button as={Fragment}>
                                <TableCell colSpan={1}>
                                  <InfoBox
                                    label={joinNonEmptyStrings(
                                      [
                                        item?.orders?.[0]?.route?.deliveryPoints?.[0]?.code,
                                        item?.orders?.[0]?.route?.deliveryPoints?.[0]?.name,
                                      ],
                                      " - "
                                    )}
                                    subLabel={getDetailAddress(item?.orders?.[0]?.route?.deliveryPoints?.[0]?.address)}
                                    emptyLabel={t("common.empty")}
                                    nowrap={false}
                                    className="min-w-[180px] max-w-[240px]"
                                  />
                                </TableCell>
                              </Disclosure.Button>

                              <TableCell colSpan={2}>
                                <Fragment />
                              </TableCell>
                            </Visible>

                            <Visible
                              when={
                                item.lastStatusType === OrderGroupStatusType.INBOUND ||
                                item.lastStatusType === OrderGroupStatusType.IN_STOCK ||
                                item.lastStatusType === OrderGroupStatusType.OUTBOUND
                              }
                              except={!!item?.orders?.[0]?.processForGroups?.[0]?.id}
                            >
                              <TableCell colSpan={6}>
                                {/* If the order group status is inbound, display the inbound warehouse badge */}
                                <Visible when={item.lastStatusType === OrderGroupStatusType.IN_STOCK}>
                                  <Badge
                                    color="success"
                                    label={t("order_group.order_group_in_stock_warehouse", {
                                      warehouseName: item?.warehouse?.name,
                                    })}
                                  />
                                </Visible>

                                {/* If the order group status is inbound, display the inbound warehouse badge */}
                                <Visible when={item.lastStatusType === OrderGroupStatusType.INBOUND}>
                                  <Badge
                                    color="warning"
                                    label={t("order_group.order_group_inbound_warehouse", {
                                      warehouseName: item?.warehouse?.name,
                                    })}
                                  />
                                </Visible>

                                {/* If the order group status is inbound, display the inbound warehouse badge */}
                                <Visible when={item.lastStatusType === OrderGroupStatusType.OUTBOUND}>
                                  <Badge
                                    color="pink"
                                    label={t("order_group.order_group_outbound_warehouse", {
                                      warehouseName: item?.warehouse?.name,
                                    })}
                                  />
                                </Visible>
                                <Button
                                  variant="outlined"
                                  className="ml-5"
                                  onClick={handleOpenInboundOrderInfoModal(item.processByOrder as OrderInfo)}
                                >
                                  {t("common.detail")}
                                </Button>
                              </TableCell>
                            </Visible>

                            {/* If the order group status is not inbound and the order group does not have an inbound order, display an empty cell */}
                            <Visible
                              when={
                                item.lastStatusType !== OrderGroupStatusType.INBOUND &&
                                item.lastStatusType !== OrderGroupStatusType.IN_STOCK &&
                                item.lastStatusType !== OrderGroupStatusType.OUTBOUND &&
                                !item?.orders?.[0]?.processForGroups?.[0]?.id
                              }
                            >
                              <Disclosure.Button as={Fragment}>
                                <TableCell colSpan={6}>
                                  <Fragment />
                                </TableCell>
                              </Disclosure.Button>
                            </Visible>

                            {/* 13. Route */}
                            <Disclosure.Button as={Fragment}>
                              <TableCell className="font-semibold text-gray-900" nowrap>
                                {calculateTotalQuantity(item.orders) || t("common.empty")}
                              </TableCell>
                            </Disclosure.Button>
                            {/* 14. Total CBM */}
                            <Disclosure.Button as={Fragment}>
                              <TableCell className="font-semibold text-gray-900" nowrap>
                                {round(totalCbm(item.orders), 2) || t("common.empty")}
                              </TableCell>
                            </Disclosure.Button>
                            {/* 15. Action */}
                            <TableCell align="right" className="text-right" nowrap>
                              {/* 15.1 Status of the trip */}
                              <div className="float-right flex items-center justify-end gap-4 whitespace-nowrap">
                                <Visible when={!!item?.orders?.[0]?.processForGroups?.[0]?.id}>
                                  <Badge
                                    label={item?.orders?.[0]?.trips?.[0]?.statuses?.[0]?.driverReport?.name ?? ""}
                                    color={
                                      tripSteps.find(
                                        ({ value: tripStep }) =>
                                          tripStep === item?.orders?.[0]?.trips?.[0]?.statuses?.[0]?.driverReport?.type
                                      )?.color
                                    }
                                  />

                                  {/* Open message modal */}
                                  <Authorization resource="order-trip-message" action="find">
                                    <span className="flex flex-1 cursor-pointer items-center whitespace-nowrap">
                                      <div
                                        data-tooltip-id="tooltip"
                                        data-tooltip-content={t("order_group.message")}
                                        className="relative"
                                      >
                                        <ChatBubbleBottomCenterTextIcon
                                          onClick={handleOpenMessageModal(item?.orders?.[0])}
                                          className="h-6 w-6 text-blue-500"
                                          aria-hidden="true"
                                        />
                                        {/* {hasUnreadMessage && (
                                            <div
                                              className="absolute right-0 top-0  -mr-1 -mt-1 h-2.5 w-2.5"
                                              onClick={handleOpenMessage}
                                            >
                                              <span className="relative flex">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-700" />
                                              </span>
                                            </div>
                                          )} */}
                                      </div>
                                    </span>
                                  </Authorization>
                                </Visible>

                                <Visible when={canSendNotification(item)}>
                                  <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                    {/* Send notification to driver */}
                                    <Button
                                      size="small"
                                      variant="text"
                                      shape="circle"
                                      data-tooltip-id="tooltip"
                                      data-tooltip-content={t("order_group.send_notification")}
                                      icon={BsSend}
                                      onClick={handleOpenSendNotificationModal(item)}
                                    />
                                  </div>
                                </Visible>

                                {/* 15.3 Order action */}
                                <OrderGroupAction
                                  actionPlacement={index === 0 ? "end" : "start"}
                                  {...(item?.lastStatusType === OrderGroupStatusType.APPROVED && {
                                    onInbound: handleOpenInboundModal(item),
                                  })}
                                  {...(item?.lastStatusType === OrderGroupStatusType.IN_STOCK && {
                                    onOutbound: handleOpenOutboundModal(item),
                                  })}
                                  {...(item?.orders.length === 1 &&
                                    !!item?.orders?.[0] && {
                                      onShare: handleOpenShareOrder(item?.orders?.[0] as OrderInfo),
                                    })}
                                  {...(item?.lastStatusType === OrderGroupStatusType.IN_PROGRESS &&
                                    !!item?.orders?.[0]?.trips?.[0] && {
                                      onUpdateStatus: handleOpenQuickUpdateOrderTripStatusModal(
                                        item?.orders?.[0]?.trips?.[0],
                                        !!item.processByOrder?.id
                                      ),
                                    })}
                                />
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Panel */}
                          <Visible when={!item?.orders?.[0]?.processForGroups?.[0]?.id}>
                            {(item.orders ?? []).map((order) => (
                              <Disclosure.Panel as={Fragment} key={order.code}>
                                <TableRow>
                                  {/* 1. Action */}
                                  <TableCell colSpan={7} />

                                  {/* 2. Customer */}
                                  <TableCell>
                                    <InfoBox
                                      emptyLabel={t("common.empty")}
                                      as={Link}
                                      nowrap={false}
                                      label={order?.customer?.name}
                                      subLabel={order?.customer?.code}
                                      href={`${orgLink}/customers/${encryptId(order?.customer?.id)}`}
                                      className="min-w-[150px]"
                                    />
                                  </TableCell>

                                  {/* 3. Pickup Point */}
                                  <TableCell nowrap={false} className="min-w-[240px]">
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

                                  {/* 4. Delivery Point */}
                                  <TableCell nowrap={false} className="min-w-[240px]">
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

                                  {/* 5. Pickup time notes */}
                                  <TableCell nowrap={false} className="min-w-[120px] text-xs">
                                    {item.orders?.[0]?.trips?.[0]?.pickupTimeNotes || t("common.empty")}
                                  </TableCell>

                                  {/* 6. Delivery time notes */}
                                  <TableCell nowrap={false} className="min-w-[120px] text-xs">
                                    {item.orders?.[0]?.trips?.[0]?.deliveryTimeNotes || t("common.empty")}
                                  </TableCell>

                                  {/* 7. Weight */}
                                  <TableCell nowrap>
                                    <NumberLabel
                                      value={order?.weight}
                                      unit={order?.unit?.code}
                                      emptyLabel={t("common.empty")}
                                    />
                                  </TableCell>

                                  {/* 8. CBM */}
                                  <TableCell nowrap>
                                    <NumberLabel value={order?.cbm} emptyLabel={t("common.empty")} />
                                  </TableCell>

                                  {/* 9. Action */}
                                  <TableCell align="right" nowrap>
                                    <div className="float-right flex flex-nowrap items-center justify-end gap-4">
                                      {/* Order trip status */}
                                      <Badge
                                        label={order?.trips?.[0]?.statuses?.[0]?.driverReport?.name ?? ""}
                                        color={
                                          tripSteps.find(
                                            ({ value: item }) =>
                                              item === order?.trips?.[0]?.statuses?.[0]?.driverReport?.type
                                          )?.color
                                        }
                                      />

                                      {/* Open message modal */}
                                      <Authorization resource="order-trip-message" action="find">
                                        <span className="flex flex-1 cursor-pointer items-center justify-end">
                                          <div
                                            className="relative"
                                            data-tooltip-id="tooltip"
                                            data-tooltip-content={t("order_group.message")}
                                          >
                                            <ChatBubbleBottomCenterTextIcon
                                              onClick={handleOpenMessageModal(order)}
                                              className="h-6 w-6 text-blue-500"
                                              aria-hidden="true"
                                            />
                                            {/* {hasUnreadMessage && (
                                            <div
                                              className="absolute right-0 top-0  -mr-1 -mt-1 h-2.5 w-2.5"
                                              onClick={handleOpenMessage}
                                            >
                                              <span className="relative flex">
                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-75" />
                                                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-700" />
                                              </span>
                                            </div>
                                          )} */}
                                          </div>
                                        </span>
                                      </Authorization>
                                      <OrderGroupAction
                                        actionPlacement={index === 0 ? "end" : "start"}
                                        {...(order?.trips?.[0] && {
                                          onUpdateStatus: handleOpenQuickUpdateOrderTripStatusModal(
                                            order?.trips?.[0],
                                            !!item.processByOrder?.id
                                          ),
                                        })}
                                        {...(!order?.processForGroups?.[0]?.id && {
                                          onShare: handleOpenShareOrder(order as OrderInfo),
                                        })}
                                        {...((order?.trips?.[0]?.lastStatusType === OrderTripStatusType.DELIVERED ||
                                          order?.trips?.[0]?.lastStatusType === OrderTripStatusType.COMPLETED) && {
                                          onUpdateBillOfLading: handleOpenUpdateBillOfLadingModal(order),
                                        })}
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              </Disclosure.Panel>
                            ))}
                          </Visible>
                        </>
                      )}
                    </Disclosure>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </div>
      </div>

      {/* Send notification modal */}
      <ConfirmModal
        icon="question"
        loading={isSending}
        open={openSendNotificationModal}
        title={t("order_group.send_notification")}
        message={t("order_group.send_notification_message")}
        onConfirm={handleSendNotification}
        onCancel={handleCloseNotificationModal}
      />

      {/* Inbound modal */}
      <InboundModal
        open={openInboundModal}
        onClose={handleCloseInboundModal}
        selectedVehicle={selectedVehicle}
        onPressSelectVehicle={handleOpenVehicleSelectionModal}
        selectedOrderGroup={selectedOrderGroupRef.current}
        onInbound={handleInboundOrderGroup}
      />

      {/* Outbound modal */}
      <OutboundModal
        open={openOutboundModal}
        selectedOrderGroup={selectedOrderGroupRef.current}
        onOutbound={handleOutboundOrderGroup}
        onClose={handleCloseOutboundModal}
      />

      {/* Vehicle selection modal */}
      <VehicleSelectionModal
        open={openVehicleSelectionModal}
        onClose={handleCloseVehicleSelectionModal}
        onSelectVehicle={handleSelectVehicle}
      />

      {/* Message modal component */}
      <MessageModal
        open={openMessageModal}
        orderTripId={Number(selectedOrderRef?.current?.trips?.[0]?.id)}
        driverUserId={Number(selectedOrderRef?.current?.trips?.[0]?.driver?.user?.id)}
        onClose={handleCloseMessageModal}
      />

      {/* Update order trip status modal */}
      <QuickUpdateOrderTripStatusModal
        open={openQuickUpdateOrderTripStatusModal}
        orderTripId={Number(selectedOrderTripRef.current?.id)}
        isInboundOrder={isInboundOrderRef.current}
        onClose={handleCloseQuickUpdateOrderTripStatusModal}
        onSaved={handleUpdateOrderTripStatus}
      />

      {/* Order share modal */}
      <OrderShareModal
        order={orderShare}
        open={openShareModal}
        onClose={handleCloseShareOrder}
        onCancel={handleCloseShareOrder}
      />

      {/* Inbound order modal */}
      <InboundOrderInfoModal
        open={openInboundOrderInfoModal}
        onClose={handleCloseInboundOrderInfoModal}
        orderId={processByOrderRef.current}
      />

      {/* Update bill of lading modal */}
      {!!selectedOrderTripRef.current && !!selectedOrderRef.current && (
        <UpdateBillOfLadingModal
          open={openUpdateBillOfLadingModal}
          orderTrip={selectedOrderTripRef.current}
          order={selectedOrderRef.current}
          currentStatus={selectedOrderTripRef.current?.statuses?.[0]}
          onSubmit={handleSubmitUpdateBillOfLadingModal}
          onClose={handleCloseUpdateBillOfLadingModal}
        />
      )}
    </>
  );
});
