"use client";

import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { ChangeEvent, useMemo, useState } from "react";
import { useCallback, useRef } from "react";

import {
  Checkbox,
  DateTimeLabel,
  DescriptionProperty2,
  InfoBox,
  ModalActions,
  ModalContent,
  ModalHeader,
  NumberLabel,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Button, EmptyListSection, Modal, QuickSearch, TableFilterMenu } from "@/components/molecules";
import { FilterStatus, Pagination } from "@/components/organisms";
import { OrderScheduleInputForm, TripScheduleInputForm } from "@/forms/orderGroup";
import { useAuth, useBaseOrders, usePermission, useSearchConditions } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { orderGroupAtom } from "@/states";
import { AnyType } from "@/types";
import { SortType } from "@/types/filter";
import { FilterProperty } from "@/types/filter";
import { FilterOptions } from "@/types/filter";
import { OrderGroupInfo, OrderInfo } from "@/types/strapi";
import { hasFilter as utilHasFilter } from "@/utils/filter";
import { getFilterRequest } from "@/utils/filter";
import { equalId, formatNumber } from "@/utils/number";
import { getDetailAddress } from "@/utils/string";
import { cn } from "@/utils/twcn";

type AddMoreOrderModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (orderSchedule: OrderScheduleInputForm) => Promise<void>;
  selectedOrderGroup: OrderGroupInfo | null;
};

export default function AddMoreOrderModal({ open, selectedOrderGroup, onClose, onAdd }: AddMoreOrderModalProps) {
  const t = useTranslations();
  const { orgLink, orgId } = useAuth();
  const { showNotification } = useNotification();
  const { canNew } = usePermission("order");
  const [{ baseSearchConditions }] = useAtom(orderGroupAtom);
  const [filterOptions, setFilterOptions] = useSearchConditions(baseSearchConditions);

  const { orders, pagination, isLoading, mutate } = useBaseOrders({
    organizationId: orgId,
    ...getFilterRequest(filterOptions),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<OrderInfo[]>([]);
  const updateRouteRef = useRef(false);

  /**
   * Callback function for handling selection/deselection of all orders.
   *
   * @param e - The checkbox change event
   */
  const handleSelectAllOrders = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedOrders(orders);
      } else {
        setSelectedOrders([]);
      }
    },
    [orders, setSelectedOrders]
  );

  /**
   * Callback function for handling order selection.
   *
   * @param order - The order to be selected/deselected
   * @returns A callback function that updates the selected orders state
   */
  const handleSelectOrder = useCallback(
    (order: OrderInfo) => () => {
      if (selectedOrders.find((o) => equalId(o.id, order.id))) {
        setSelectedOrders((prev) => prev.filter((o) => o.id !== order.id));
      } else {
        setSelectedOrders((prev) => [...prev, order]);
      }
    },
    [selectedOrders, setSelectedOrders]
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

  const totalQuantity = useMemo(() => {
    const groupedQuantities = selectedOrders.reduce(
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
  }, [selectedOrders]);

  const totalCbm = useMemo(() => {
    return selectedOrders.reduce((acc, order) => {
      if (order.cbm) {
        acc += order.cbm;
      }
      return acc;
    }, 0);
  }, [selectedOrders]);

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
   * Callback function for handling adding more orders.
   */
  const handleAddMoreOrder = useCallback(async () => {
    const firstTrip = selectedOrderGroup?.orders?.[0]?.trips?.[0];
    if (!firstTrip) {
      showNotification({
        color: "error",
        title: t("order_group.error_empty_order_title"),
        message: t("order_group.error_empty_order_message"),
      });
      onClose();
      return;
    }

    const tripSchedules: TripScheduleInputForm[] = [];
    setIsSubmitting(true);
    selectedOrders.forEach((order) => {
      if (!order.route?.id || !firstTrip.pickupDate || !firstTrip.deliveryDate) {
        showNotification({
          color: "error",
          title: t("common.message.save_error_title"),
          message: t("common.message.save_error_unknown", { name: selectedOrderGroup?.code }),
        });
        return;
      }

      tripSchedules.push({
        orderId: order.id,
        orderCode: order.code,
        routeId: order.route.id,
        weight: order.weight ?? 0,
        pickupDate: firstTrip.pickupDate,
        deliveryDate: firstTrip.deliveryDate,
        pickupTimeNotes: (order.meta as AnyType)?.pickupTimeNotes ?? null,
        deliveryTimeNotes: (order.meta as AnyType)?.deliveryTimeNotes ?? null,
      });
    });

    if (firstTrip.driver?.id && firstTrip.vehicle?.id) {
      const orderSchedule: OrderScheduleInputForm = {
        organizationId: Number(orgId),
        driverId: firstTrip.driver.id,
        vehicleId: firstTrip.vehicle.id,
        driverExpenseRate: firstTrip.vehicle.type?.driverExpenseRate ?? 100,
        trips: tripSchedules,
      };

      await onAdd(orderSchedule);
    } else {
      showNotification({
        color: "error",
        title: t("common.message.save_error_title"),
        message: t("common.message.save_error_unknown", { name: selectedOrderGroup?.code }),
      });
    }
    setIsSubmitting(false);
    setSelectedOrders([]);
    mutate();
    onClose();
  }, [
    onAdd,
    mutate,
    onClose,
    orgId,
    selectedOrderGroup?.code,
    selectedOrderGroup?.orders,
    selectedOrders,
    showNotification,
    t,
  ]);

  /**
   * Check if there are any active filters in the filter options.
   *
   * @returns {boolean} True if there are active filters, false otherwise.
   */
  const hasFilter = useMemo(() => {
    return Object.keys(filterOptions).some(
      (key) => filterOptions[key].filters.some((item) => utilHasFilter(item)) || filterOptions[key].sortType
    );
  }, [filterOptions]);

  return (
    <Modal open={open} onClose={onClose} size="7xl" showCloseButton>
      <ModalHeader
        title={t("order_group.add_more_order_title", { orderGroupCode: selectedOrderGroup?.code })}
        actionComponentClassName="mr-10"
        actionComponent={<QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />}
      />
      <ModalContent padding={false} className="max-h-[calc(100vh-240px)] overflow-y-auto overflow-x-hidden">
        <DescriptionProperty2 label={t("components.order_scheduler_modal.total_weight")} className="px-4 pt-6">
          {totalQuantity}
        </DescriptionProperty2>
        <DescriptionProperty2 label={t("components.order_scheduler_modal.total_cbm")} className="px-4 pb-4">
          <NumberLabel value={totalCbm} />
        </DescriptionProperty2>

        {hasFilter && (
          <div className="p-4 pt-0">
            <FilterStatus className="!mt-0" options={filterOptions} onChange={handleFilterChange} />
          </div>
        )}

        <TableContainer fullHeight horizontalScroll inside className="!mt-0" variant="paper">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell action>
                  <Checkbox
                    label=""
                    checked={!isLoading && orders.length > 0 && selectedOrders.length === orders.length}
                    onChange={handleSelectAllOrders}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="right"
                    label={t("order_group.customer")}
                    {...filterOptions.customer}
                    onApply={handleFilterApply("customer")}
                  />
                </TableCell>
                {/* <TableCell>
                  <TableFilterMenu
                    label={t("order_group.route")}
                    {...filterOptions.route}
                    onApply={handleFilterApply("route")}
                  />
                </TableCell> */}
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
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="left"
                    label={t("order_group.cbm")}
                    {...filterOptions.cbm}
                    onApply={handleFilterApply("cbm")}
                  />
                </TableCell>
                <TableCell action />
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && orders.length === 0 && (
                <SkeletonTableRow rows={10} columns={9} multilineColumnIndexes={[1, 2, 5]} />
              )}

              {/* Empty data */}
              {!isLoading && orders.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={9} className="px-6 lg:px-8">
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
                  <TableCell className="max-w-[240px]">
                    <InfoBox
                      label={order.customer?.name}
                      subLabel={order.customer?.code}
                      nowrap={false}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  {/* <TableCell className="max-w-[240px]">
                    <InfoBox
                      label={order.route?.name}
                      subLabel={order.route?.code}
                      nowrap={false}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell> */}
                  <TableCell>
                    <InfoBox
                      label={order?.route?.pickupPoints?.[0]?.name}
                      subLabel={
                        order?.route?.pickupPoints?.[0]?.code !== order?.route?.pickupPoints?.[0]?.name &&
                        order?.route?.pickupPoints?.[0]?.name
                      }
                      subLabel2={getDetailAddress(order?.route?.pickupPoints?.[0]?.address)}
                      emptyLabel={t("common.empty")}
                      nowrap={false}
                      className="min-w-[180px] max-w-[240px]"
                    />
                  </TableCell>
                  <TableCell>
                    <InfoBox
                      label={order?.route?.deliveryPoints?.[0]?.name}
                      subLabel={
                        order?.route?.deliveryPoints?.[0]?.code !== order?.route?.deliveryPoints?.[0]?.name &&
                        order?.route?.deliveryPoints?.[0]?.name
                      }
                      subLabel2={getDetailAddress(order?.route?.deliveryPoints?.[0]?.address)}
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
                    <NumberLabel value={order.weight} unit={order.unit?.code} />
                  </TableCell>
                  <TableCell>
                    <NumberLabel value={order.cbm} emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell>
                    {/* <OrderAction
                        detailLink={`${orgLink}/orders/${order.code}`}
                        copyLink={`${orgLink}/orders/new`}
                        onShare={() => setOpenOrderShareModal(true)}
                        onCancel={() => setOpenConfirmModal(true)}
                        onDelete={() => setOpenDeleteModal(true)}
                    /> */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ModalContent>

      <ModalActions
        className={cn("flex flex-nowrap gap-4", {
          "justify-between": pagination?.pageCount,
          "justify-end": !pagination?.pageCount,
        })}
      >
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

        <div className="flex items-center gap-4">
          <Button variant="outlined" color="secondary" onClick={onClose} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddMoreOrder}
            disabled={selectedOrders.length === 0}
            loading={isSubmitting}
          >
            {t("order_group.add_more_order")}
          </Button>
        </div>
      </ModalActions>
    </Modal>
  );
}
