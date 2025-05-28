"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { FaRoute as FaRouteIcon } from "react-icons/fa";
import { TbPigMoney as TbPigMoneyIcon } from "react-icons/tb";

import {
  Badge,
  DateTimeLabel,
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
  EmptyListSection,
  MasterActionTable,
  ProfileInfo,
  QuickSearch,
  TableFilterMenu,
} from "@/components/molecules";
import { ConfirmModal, FilterStatus, Pagination } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { useIdParam, useOrgSettingExtendedStorage, usePermission, useRoutes, useSearchConditions } from "@/hooks";
import { useDispatch, useNotification } from "@/redux/actions";
import { useRouteState } from "@/redux/states";
import { ROUTE_UPDATE_SEARCH_CONDITIONS, ROUTE_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { deleteRoute } from "@/services/client/route";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { RouteInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";
import { getDetailAddress } from "@/utils/string";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations();
    const dispatch = useDispatch();
    const { originId: customerId, encryptId } = useIdParam({ name: "customerId" });
    const { searchConditions } = useRouteState();
    const { showNotification } = useNotification();
    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("customer-route");
    const updateRouteRef = useRef(false);
    const selectedRouteRef = useRef<RouteInfo>();

    const { mergeDeliveryAndPickup } = useOrgSettingExtendedStorage();
    const { isLoading, routes, pagination, mutate } = useRoutes({
      organizationId: orgId,
      customerId: customerId || undefined,
      ...getFilterRequest(filterOptions),
    });

    useEffect(() => {
      // Get flashing id from storage
      const id = getItemString(SESSION_FLASHING_ID, {
        security: false,
        remove: true,
      });
      id && setFlashingId(Number(id));
    }, []);

    /**
     * Updating search params.
     */
    useEffect(() => {
      if (updateRouteRef.current) {
        const queryString = getQueryString(filterOptions);
        router.push(`${pathname}${queryString}`);
        dispatch<FilterOptions>({
          type: ROUTE_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: ROUTE_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with maintenance type data.
     *
     * @param item - The maintenance type data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: RouteInfo) => () => {
        selectedRouteRef.current = item;
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
      if (selectedRouteRef.current?.id && userId) {
        const { error } = await deleteRoute(
          {
            organizationId: orgId,
            id: Number(selectedRouteRef.current.id),
            updatedById: userId,
          },
          selectedRouteRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedRouteRef.current?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedRouteRef.current?.name,
            }),
          });
        }
      }
      handleDeleteCancel();
      mutate();
    }, [userId, handleDeleteCancel, mutate, orgId, showNotification, t]);

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

    const formattedStringDisplay = useCallback(
      (items: Array<string | undefined>) => {
        const validItems = items.filter((item) => item !== null && item !== undefined && item.trim() !== "");
        if (validItems.length === 0) {
          return <>{t("common.empty")}</>;
        }
        return validItems.map((item, index) => (
          <Fragment key={index}>
            {validItems.length > 1 && index === 0 ? <span className="font-semibold">{item}</span> : <span>{item}</span>}
            {index < validItems.length - 1 && ", "}
          </Fragment>
        ));
      },
      [t]
    );

    return (
      <>
        <div className="mt-4 text-gray-500 max-sm:px-4">
          <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
          <FilterStatus options={filterOptions} onChange={handleFilterChange} />
        </div>

        <TableContainer allowFullscreen fullHeight horizontalScroll verticalScroll stickyHeader autoHeight>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableFilterMenu
                    label={t("customer.route.id")}
                    actionPlacement="right"
                    {...filterOptions.code}
                    onApply={handleFilterApply("code")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("customer.route.name")}
                    actionPlacement="right"
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell className="min-w-[14.5rem]">
                  {mergeDeliveryAndPickup
                    ? t("customer.route.pickup_delivery_point")
                    : t("customer.route.pickup_point")}
                </TableCell>
                {!mergeDeliveryAndPickup && (
                  <TableCell className="min-w-[14.5rem]">{t("customer.route.delivery_point")}</TableCell>
                )}
                <TableCell>{t("customer.route.driver_expense")}</TableCell>
                <TableCell nowrap>
                  <TableFilterMenu
                    label={t("customer.route.status")}
                    align="center"
                    {...filterOptions.isActive}
                    onApply={handleFilterApply("isActive")}
                  />
                </TableCell>
                <TableCell nowrap>
                  <TableFilterMenu
                    label={t("common.edit")}
                    actionPlacement="left"
                    {...filterOptions.updatedAt}
                    onApply={handleFilterApply("updatedAt")}
                  />
                </TableCell>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && routes.length === 0 && (
                <SkeletonTableRow
                  rows={10}
                  columns={mergeDeliveryAndPickup ? 7 : 8}
                  profileColumnIndexes={mergeDeliveryAndPickup ? [5] : [6]}
                />
              )}

              {/* Empty data */}
              {!isLoading && routes.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={mergeDeliveryAndPickup ? 7 : 8} className="px-6 lg:px-8">
                    <EmptyListSection
                      actionLink={canNew() ? `${orgLink}/customers/${encryptId(customerId)}/routes/new` : undefined}
                      description={canNew() ? undefined : t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {routes.map((item, index) => (
                <TableRow key={item.id} flash={equalId(item.id, flashingId)} onFlashed={handleFlashed}>
                  <TableCell className="max-w-[10rem] ">
                    <Authorization
                      resource="customer-route"
                      action="detail"
                      fallbackComponent={
                        <span className="whitespace-normal text-sm font-medium leading-6 text-gray-700">
                          {item.name}
                        </span>
                      }
                    >
                      <Link
                        useDefaultStyle
                        color="secondary"
                        className="cursor-pointer whitespace-normal text-gray-700"
                        href={`${orgLink}/customers/${encryptId(customerId)}/routes/${encryptId(item.id)}`}
                      >
                        {item.code}
                      </Link>
                    </Authorization>
                  </TableCell>
                  <TableCell nowrap={false} className="max-w-fit">
                    <span>{item.name}</span>
                  </TableCell>
                  <TableCell nowrap={false} className="max-w-md">
                    <div className="mx-auto max-w-lg">
                      <div className="space-y-2">
                        {(item.pickupPoints || []).map((pickupPoint, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <FaRouteIcon className="me-2 inline-block h-3 w-3 flex-shrink-0 text-teal-600" />
                            <span className="text-xs text-gray-500">
                              {formattedStringDisplay([
                                pickupPoint.code,
                                pickupPoint.name,
                                getDetailAddress(pickupPoint.address),
                              ])}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                  {!mergeDeliveryAndPickup && (
                    <TableCell nowrap={false} className="max-w-md">
                      <div className="mx-auto max-w-lg">
                        <div className="space-y-2">
                          {(item.deliveryPoints || []).map((deliveryPoint, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <FaRouteIcon className="me-2 inline-block h-3 w-3 flex-shrink-0 text-teal-600" />
                              <span className="text-xs text-gray-500">
                                {formattedStringDisplay([
                                  deliveryPoint.code,
                                  deliveryPoint.name,
                                  getDetailAddress(deliveryPoint.address),
                                ])}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="max-w-fit">
                    {(item.driverExpenses || []).length > 0 ? (
                      <ul className="max-w-md list-inside space-y-1 text-xs text-gray-500">
                        {item.driverExpenses.some((de) => de.amount !== 0)
                          ? item.driverExpenses.map(
                              (de) =>
                                de.amount !== 0 && (
                                  <li key={de.id} className="flex items-center">
                                    <TbPigMoneyIcon className="me-2 inline-block h-4 w-4 flex-shrink-0 text-amber-500" />
                                    {de.driverExpense?.name}: <NumberLabel type="currency" value={de.amount} />
                                  </li>
                                )
                            )
                          : "-"}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell align="center" nowrap>
                    <Badge
                      label={item.isActive ? t("customer.route.status_active") : t("customer.route.status_inactive")}
                      color={item.isActive ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell nowrap>
                    <ProfileInfo
                      user={item.updatedByUser}
                      description={<DateTimeLabel value={item.createdAt} type="datetime" />}
                    />
                  </TableCell>
                  <TableCell action>
                    <Authorization
                      resource="customer-route"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          routes.length >= 3 && (routes.length - 1 === index || routes.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                            ? `${orgLink}/customers/${encryptId(customerId)}/routes/${encryptId(item.id)}/edit`
                            : ""
                        }
                        copyLink={
                          canNew()
                            ? `${orgLink}/customers/${encryptId(customerId)}/routes/new?copyId=${encryptId(item.id)}`
                            : ""
                        }
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

        {/* Pagination */}
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

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", {
            name: selectedRouteRef.current?.name,
          })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "customer-route",
    action: "find",
  }
);
