import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction, useCallback } from "react";

import { SkeletonTableRow, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@/components/atoms";
import { EmptyListSection, TableFilterMenu } from "@/components/molecules";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

import OrderMonitoringTableItem from "./OrderMonitoringTableItem";

type OrderMonitoringTableResultProps = {
  filterOptions: FilterOptions;
  setFilterOptions: Dispatch<SetStateAction<FilterOptions>>;
  isLoading: boolean;
  orders: OrderInfo[];
  organizationId: number;
  orgLink: string;
};

const OrderMonitoringTableResult = ({
  filterOptions,
  setFilterOptions,
  isLoading,
  orders,
  organizationId,
  orgLink,
}: OrderMonitoringTableResultProps) => {
  const t = useTranslations();

  /**
   * Callback function for applying filters to a specific column and updating filter options.
   *
   * @param columnName - The name or identifier of the column to which the filters should be applied.
   * @param filters - An array of filter properties to apply to the column.
   * @param sortType - An optional sorting order ("asc" or "desc") to apply to the column.
   */
  const handleFilterApply = useCallback(
    (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <TableContainer fullHeight>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell action>
              <span className="sr-only">Expanded/Collapsed</span>
            </TableCell>
            <TableCell>
              <TableFilterMenu
                label={t("order_monitoring.list_item.order_code")}
                actionPlacement="right"
                {...filterOptions.orderCodeSort}
                onApply={handleFilterApply("orderCodeSort")}
              />
            </TableCell>
            <TableCell>
              <TableFilterMenu
                label={t("order_monitoring.list_item.customer")}
                actionPlacement="right"
                {...filterOptions.customer}
                onApply={handleFilterApply("customer")}
              />
            </TableCell>
            <TableCell>
              <TableFilterMenu
                label={t("order_monitoring.list_item.order_date")}
                actionPlacement="right"
                {...filterOptions.orderDate}
                onApply={handleFilterApply("orderDate")}
              />
            </TableCell>
            <TableCell>{t("order_monitoring.list_item.finish_date")}</TableCell>
            <TableCell>{t("order_monitoring.list_item.route")}</TableCell>
            <TableCell>{t("order_monitoring.list_item.quantity")}</TableCell>
            <TableCell>{t("order_monitoring.list_item.completed_orders_trip_quantity")}</TableCell>
            <TableCell>{t("order_monitoring.list_item.bill_of_lading_number")}</TableCell>
            <TableCell>
              <TableFilterMenu
                label={t("order_monitoring.list_item.order_monitoring")}
                actionPlacement="left"
                {...filterOptions.lastStatusType}
                onApply={handleFilterApply("lastStatusType")}
              />
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Loading skeleton  */}
          {isLoading && orders.length === 0 && (
            <SkeletonTableRow rows={10} columns={10} profileColumnIndexes={[0]} multilineColumnIndexes={[1]} />
          )}

          {/* Empty data */}
          {!isLoading && orders.length === 0 && (
            <TableRow hover={false} className="mx-auto max-w-lg">
              <TableCell colSpan={10} className="px-6 lg:px-8">
                <EmptyListSection description={t("order_monitoring.no_order_info")} />
              </TableCell>
            </TableRow>
          )}
          {orders.map((order, index) => (
            <OrderMonitoringTableItem key={index} order={order} organizationId={organizationId} orgLink={orgLink} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
export default OrderMonitoringTableResult;
