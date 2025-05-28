"use client";

import { MinusIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import {
  Link,
  ModalContent,
  ModalHeader,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, Button, EmptyListSection, Modal, QuickSearch, TableFilterMenu } from "@/components/molecules";
import { FilterStatus, Pagination } from "@/components/organisms";
import { useAuth, useAvailableCustomersForGroup, useSearchConditions } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useCustomerState } from "@/redux/states";
import { updateCustomerListInCustomerGroup } from "@/services/client/customerGroup";
import { ErrorType } from "@/types";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { CustomerGroupInfo, CustomerInfo } from "@/types/strapi";
import { getFilterRequest } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { encryptId } from "@/utils/security";

type CustomerGroupModalProps = {
  customerGroup: Partial<CustomerGroupInfo>;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

const CustomerGroupModal = ({ open, onClose, onSubmit, customerGroup }: CustomerGroupModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink, userId } = useAuth();
  const { availableCustomerSearchConditions } = useCustomerState();
  const { showNotification } = useNotification();
  const [filterOptions, setFilterOptions] = useSearchConditions(availableCustomerSearchConditions);
  const [selectedCustomer, setSelectedCustomer] = useState<Partial<CustomerInfo> | null>(null);

  const { isLoading, customers, pagination, mutate } = useAvailableCustomersForGroup({
    organizationId: orgId,
    ...getFilterRequest(filterOptions),
  });

  /**
   * Handles closing the component.
   */
  const handleClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  /**
   * Handles changing the page number for pagination.
   * This function is called when the page number is changed.
   * @param {number} page - The new page number to set.
   */
  const handlePageChange = useCallback(
    (page: number) => {
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
   * Handles applying filters and sort for a specific column.
   * This function is called when filters or sort are applied to a column.
   * @param {string} columnName - The name of the column for which filters or sort are applied.
   * @returns {Function} A function that takes filters, sort type, and applies them to the column.
   */
  const handleFilterApply = useCallback(
    (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
      // Update the filter options state based on the applied filters and sort for the specified column
      setFilterOptions((prevValue) => {
        const { pagination, ...values } = prevValue;
        const newValue: FilterOptions = {
          pagination: {
            ...pagination,
            page: 1,
          },
        };
        // Iterate over previous filter options
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

  /**
   * Handles the change in filter options.
   * @param {FilterOptions} options - The updated filter options.
   */
  const handleFilterChange = useCallback((options: FilterOptions) => {
    setFilterOptions(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handles adding a vehicle to the vehicle group.
   * This function is executed when a vehicle is selected to be added.
   * @param {VehicleInfo} vehicle - The vehicle to be added.
   */
  const handleCustomerGroupModification = useCallback(
    (customer: CustomerInfo, isRemove = false) =>
      async () => {
        // Set the selected vehicle state
        setSelectedCustomer(customer);
        let modifiedCustomers = customerGroup.customers || [];
        if (isRemove) {
          modifiedCustomers = modifiedCustomers.filter((c) => !equalId(c.id, customer.id));
        } else {
          modifiedCustomers.push(customer);
        }

        // Update the customer group with the new customer list
        const result = await updateCustomerListInCustomerGroup({
          id: Number(customerGroup.id),
          organizationId: Number(orgId),
          updatedById: Number(userId),
          customers: modifiedCustomers,
        });

        // Handle errors or success based on the result
        if (result.error) {
          // Show an error notification based on the error type
          if (result.error === ErrorType.EXCLUSIVE) {
            showNotification({
              color: "error",
              title: t("common.message.save_error_title"),
              message: t("common.message.save_error_exclusive", { name: customer.name }),
            });
          } else {
            showNotification({
              color: "error",
              title: isRemove ? t("common.message.delete_error_title") : t("common.message.save_error_title"),
              message: isRemove
                ? t("common.message.delete_error_message", { name: customer.name })
                : t("common.message.save_error_unknown", { name: customer.name }),
            });
          }
        } else {
          // Show a success notification
          showNotification({
            color: "success",
            title: isRemove ? t("common.message.delete_success_title") : t("common.message.save_success_title"),
            message: isRemove
              ? t("common.message.delete_success_message", { name: customer.name })
              : t("common.message.save_success_message", { name: customer.name }),
          });

          mutate(); // Refresh the data
          onSubmit(); // Trigger the onSubmit function
        }
        setSelectedCustomer(null); // Reset the selected customer state
      },
    [customerGroup.id, customerGroup.customers, orgId, userId, showNotification, t, mutate, onSubmit]
  );

  return (
    <>
      <Modal open={open} size="7xl" showCloseButton onClose={handleClose} onDismiss={handleClose}>
        <ModalHeader
          title={
            <div className="flex flex-col">
              <span>{t("customer_group.customers_title")}</span>
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </div>
          }
          actionComponentClassName="mr-8"
          actionComponent={<QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />}
        />
        <ModalContent padding={false}>
          <TableContainer
            fullHeight
            horizontalScroll
            verticalScroll
            stickyHeader
            autoHeight
            variant="paper"
            inside
            footer={
              (pagination?.pageCount || 0) > 0 && (
                <Pagination
                  className="mt-4 px-4 pb-4 sm:p-6"
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
            <Table dense={!isLoading}>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableFilterMenu
                      label={t("customer.id")}
                      align="left"
                      className="pl-2 text-xs text-gray-500 [&>span]:uppercase"
                      actionPlacement="right"
                      {...filterOptions.code}
                      onApply={handleFilterApply("code")}
                    />
                  </TableCell>
                  <TableCell>
                    <TableFilterMenu
                      label={t("customer.name")}
                      className="pl-2 text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.name}
                      onApply={handleFilterApply("name")}
                    />
                  </TableCell>
                  <TableCell>
                    <TableFilterMenu
                      label={t("customer.email")}
                      className="pl-2 text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.email}
                      onApply={handleFilterApply("email")}
                    />
                  </TableCell>
                  <TableCell>
                    <TableFilterMenu
                      label={t("customer.phone_number")}
                      className="pl-2 text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.phoneNumber}
                      onApply={handleFilterApply("phoneNumber")}
                    />
                  </TableCell>
                  <TableCell>
                    <TableFilterMenu
                      label={t("customer.representative")}
                      className="pl-2 text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.contactName}
                      onApply={handleFilterApply("contactName")}
                    />
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && customers.length === 0 && <SkeletonTableRow rows={10} columns={6} />}

                {!isLoading && customers.length === 0 && (
                  <TableRow hover={false} className="mx-auto max-w-lg">
                    <TableCell colSpan={6} className="px-6 lg:px-8">
                      <EmptyListSection description={t("customer_group.customer_empty_list")} />
                    </TableCell>
                  </TableRow>
                )}

                {/* Data */}
                {customers.map((item) => {
                  const isGroupAdded = (item.customerGroups || []).some((group) => equalId(group.id, customerGroup.id));
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.code || t("common.empty")}</TableCell>
                      <TableCell>
                        <Authorization
                          resource="customer-group"
                          action="detail"
                          fallbackComponent={
                            <span className="text-sm font-medium leading-6 text-gray-900">{item.name}</span>
                          }
                        >
                          <Link
                            useDefaultStyle
                            color="secondary"
                            className="cursor-pointer"
                            href={`${orgLink}/customers/${encryptId(item.id)}`}
                          >
                            <div className="flex flex-col text-left">{item.name}</div>
                          </Link>
                        </Authorization>
                      </TableCell>
                      <TableCell>{item.email || t("common.empty")}</TableCell>
                      <TableCell>{item.phoneNumber || t("common.empty")}</TableCell>
                      <TableCell>{item.contactName || t("common.empty")}</TableCell>
                      <TableCell align="right" className="!pr-4" action>
                        <Button
                          size="small"
                          className="min-w-full"
                          loading={!!selectedCustomer?.id && equalId(selectedCustomer.id, item.id)}
                          disabled={!!selectedCustomer?.id && !equalId(selectedCustomer.id, item.id)}
                          variant="outlined"
                          color={isGroupAdded ? "error" : "primary"}
                          icon={isGroupAdded ? MinusIcon : PlusIcon}
                          onClick={handleCustomerGroupModification(item, isGroupAdded)}
                        >
                          {isGroupAdded ? t("common.delete") : t("customer_group.add")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CustomerGroupModal;
