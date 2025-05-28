"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Badge,
  Link,
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
  EmptyListSection,
  MasterActionTable,
  PageHeader,
  QuickSearch,
  TableFilterMenu,
} from "@/components/molecules";
import { ConfirmModal, CustomerRouteList, FilterStatus, Pagination } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { useCustomers, useIdParam, usePermission, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useCustomerState } from "@/redux/states";
import {
  CUSTOMER_UPDATE_CUSTOMER_ID,
  CUSTOMER_UPDATE_SEARCH_CONDITIONS,
  CUSTOMER_UPDATE_SEARCH_QUERY_STRING,
  ROUTE_RESET_SEARCH_CONDITIONS,
} from "@/redux/types";
import { deleteCustomer } from "@/services/client/customers";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { CustomerInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { encryptId } = useIdParam();
    const { searchConditions, customerId: selectedCustomerId } = useCustomerState();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const [flashingId, setFlashingId] = useState<number>();
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("customer");
    const { canFind: canFindRoute } = usePermission("customer-route");
    const [customerId, setCustomerId] = useState(0);
    const [customerName, setCustomerName] = useState("");
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const updateRouteRef = useRef(false);
    const selectedCustomerRef = useRef<CustomerInfo>();

    const { isLoading, customers, pagination, mutate } = useCustomers({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });
    useEffect(() => {
      if (customers.length > 0) {
        setCustomerId(Number(customers[0].id));
        setCustomerName(ensureString(customers[0].name));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customers]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("customer.manage"), link: orgLink },
        { name: t("customer.feature"), link: `${orgLink}/customers` },
      ]);

      // Get flashing id from storage
      const id = getItemString(SESSION_FLASHING_ID, {
        security: false,
        remove: true,
      });
      id && setFlashingId(Number(id));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Updating search params.
     */
    useEffect(() => {
      if (updateRouteRef.current) {
        const queryString = getQueryString(filterOptions);
        router.push(`${pathname}${queryString}`);
        dispatch<FilterOptions>({
          type: CUSTOMER_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: CUSTOMER_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Handle the deletion of a customer item.
     *
     * @param item - Handle the deletion of a customer item.
     */
    const handleDelete = useCallback(
      (item: CustomerInfo) => () => {
        selectedCustomerRef.current = item;
        setIsDeleteConfirmOpen(true);
      },
      []
    );

    /**
     * Callback function for canceling and closing a dialog.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (selectedCustomerRef.current?.id && userId) {
        const { error } = await deleteCustomer(
          {
            organizationId: orgId,
            id: Number(selectedCustomerRef.current.id),
            updatedById: userId,
          },
          selectedCustomerRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedCustomerRef.current?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedCustomerRef.current?.name,
            }),
          });
        }
      }
      handleDeleteCancel();
      mutate();
    }, [handleDeleteCancel, mutate, orgId, showNotification, t, userId]);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
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
     * Callback function for handling the end of a flashing event.
     * It clears the currently flashing ID.
     */
    const handleFlashed = useCallback(() => {
      setFlashingId(undefined);
    }, []);

    /**
     * Handles the change of the selected subcontractor. This function updates the state
     * with the selected subcontractor's ID and name, then triggers a re-fetch of the vehicle data.
     * @param subcontractor - The subcontractor to select.
     */
    const handleSelectItem = useCallback(
      (customer: CustomerInfo) => () => {
        const id = Number(customer?.id ?? -1);
        if (id >= 0) {
          setCustomerId(id);
          if (id !== selectedCustomerId) {
            dispatch<number>({
              type: CUSTOMER_UPDATE_CUSTOMER_ID,
              payload: id,
            });
            dispatch({
              type: ROUTE_RESET_SEARCH_CONDITIONS,
            });
          }
        }
        setCustomerName(ensureString(customer.name));
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    return (
      <>
        <PageHeader
          title={t("customer.title")}
          actionHorizontal
          showBorderBottom
          actionComponent={
            <Authorization resource="customer" action="new">
              <Button as={Link} href={`${orgLink}/customers/new`} icon={PlusIcon}>
                {t("common.new")}
              </Button>
            </Authorization>
          }
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
        />

        <div className={canFindRoute() ? "grid grid-cols-1 gap-4 2xl:grid-cols-3" : ""}>
          <div className={"relative flex space-x-3 rounded-lg" + canFindRoute ? " 2xl:col-span-2" : ""}>
            <div className="min-w-full">
              <div className="-mt-8">
                <TableContainer
                  fullHeight
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
                        <TableCell>
                          <TableFilterMenu
                            label={t("customer.id")}
                            actionPlacement="right"
                            {...filterOptions.code}
                            onApply={handleFilterApply("code")}
                          />
                        </TableCell>
                        <TableCell>
                          <TableFilterMenu
                            label={t("customer.name")}
                            {...filterOptions.name}
                            onApply={handleFilterApply("name")}
                          />
                        </TableCell>
                        <TableCell>
                          <TableFilterMenu
                            label={t("customer.representative")}
                            {...filterOptions.contactName}
                            onApply={handleFilterApply("contactName")}
                          />
                        </TableCell>
                        <TableCell>
                          <TableFilterMenu
                            label={t("customer.phone")}
                            {...filterOptions.phoneNumber}
                            onApply={handleFilterApply("phoneNumber")}
                          />
                        </TableCell>
                        <TableCell>
                          <TableFilterMenu
                            label={t("customer.tax_code")}
                            {...filterOptions.taxCode}
                            onApply={handleFilterApply("taxCode")}
                          />
                        </TableCell>
                        <TableCell className="w-fit">
                          <TableFilterMenu
                            label={t("customer.status")}
                            actionPlacement="left"
                            {...filterOptions.isActive}
                            onApply={handleFilterApply("isActive")}
                          />
                        </TableCell>
                        <TableCell action>
                          <span className="sr-only">{t("common.actions")}</span>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Loading skeleton */}
                      {isLoading && customers.length === 0 && <SkeletonTableRow rows={10} columns={7} />}

                      {/* Empty data */}
                      {!isLoading && customers.length === 0 && (
                        <TableRow hover={false} className="mx-auto max-w-lg">
                          <TableCell colSpan={7} className="px-6 lg:px-8">
                            <EmptyListSection
                              actionLink={canNew() ? `${orgLink}/customers/new` : undefined}
                              description={canNew() ? undefined : t("common.empty_list")}
                            />
                          </TableCell>
                        </TableRow>
                      )}

                      {customers.map((item, index) => (
                        <TableRow
                          key={item.id}
                          flash={Number(item.id) === flashingId}
                          onFlashed={handleFlashed}
                          onClick={handleSelectItem(item)}
                          highlight={Number(item.id) === customerId}
                        >
                          <TableCell>{item.code}</TableCell>
                          <TableCell>
                            <Authorization
                              resource="customer"
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
                                {item.name}
                              </Link>
                            </Authorization>
                          </TableCell>
                          <TableCell>{item.contactName || t("common.empty")}</TableCell>
                          <TableCell>{item.phoneNumber || t("common.empty")}</TableCell>
                          <TableCell>{item.taxCode || t("common.empty")}</TableCell>
                          <TableCell align="left" className="w-fit" nowrap>
                            <Badge
                              label={item.isActive ? t("customer.status_active") : t("customer.status_inactive")}
                              color={item.isActive ? "success" : "error"}
                            />
                          </TableCell>
                          <TableCell action>
                            <Authorization
                              resource="customer"
                              action={["edit", "new", "delete"]}
                              type="oneOf"
                              alwaysAuthorized={
                                (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                                (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                              }
                            >
                              <MasterActionTable
                                actionPlacement={
                                  customers.length >= 3 &&
                                  (customers.length - 1 === index || customers.length - 2 === index)
                                    ? "start"
                                    : "end"
                                }
                                editLink={
                                  canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                                    ? `${orgLink}/customers/${encryptId(item.id)}/edit`
                                    : ""
                                }
                                copyLink={canNew() ? `${orgLink}/customers/new?copyId=${encryptId(item.id)}` : ""}
                                onDelete={
                                  canDelete() || (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                                    ? handleDelete(item)
                                    : undefined
                                }
                              />
                            </Authorization>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </div>
          </div>
          <Authorization resource="customer-route" action="find">
            <div className="flex flex-col xl:col-span-1">
              <CustomerRouteList
                orgLink={orgLink}
                orgId={orgId}
                userId={userId}
                customerId={Number(customerId)}
                customerName={customerName}
              />
            </div>
          </Authorization>
        </div>

        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: selectedCustomerRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "customer",
    action: "find",
  }
);
