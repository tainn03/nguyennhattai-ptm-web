"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { BiArrowToBottom, BiArrowToTop, BiDownArrowAlt, BiUpArrowAlt } from "react-icons/bi";

import { Badge, DateTimeLabel, Link, SkeletonList } from "@/components/atoms";
import {
  Authorization,
  Button,
  EmptyListSection,
  MasterActionTable,
  PageHeader,
  QuickSearch,
} from "@/components/molecules";
import { ConfirmModal, FilterStatus } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { useDriverExpenses, useIdParam, usePermission, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useDriverExpenseState } from "@/redux/states";
import { DRIVER_REPORT_UPDATE_SEARCH_CONDITIONS, DRIVER_REPORT_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { deleteDriverExpense } from "@/services/client/driverExpense";
import { ErrorType } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { FilterOptions, FilterProperty } from "@/types/filter";
import { DriverExpenseInfo } from "@/types/strapi";
import { put } from "@/utils/api";
import { getAccountInfo } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { encryptId } = useIdParam();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { searchConditions } = useDriverExpenseState();

    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("driver-expense");

    const updateRouteRef = useRef(false);
    const selectedDriverExpenseRef = useRef<DriverExpenseInfo>();

    const { isLoading, driverExpenses, mutate } = useDriverExpenses({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    useEffect(() => {
      if (flashingId) {
        setTimeout(() => {
          setFlashingId(undefined);
        }, 5000);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flashingId]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("driver_expense.title"), link: `${orgLink}/settings/driver-expenses` },
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
          type: DRIVER_REPORT_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: DRIVER_REPORT_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with driver report data.
     *
     * @param item - The driver report data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: DriverExpenseInfo) => () => {
        selectedDriverExpenseRef.current = item;
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
      if (selectedDriverExpenseRef.current?.isSystem) {
        return;
      }

      if (selectedDriverExpenseRef.current?.id && userId) {
        const { error } = await deleteDriverExpense(
          {
            id: Number(selectedDriverExpenseRef.current?.id),
            organizationId: orgId,
            updatedById: userId,
          },
          selectedDriverExpenseRef.current?.updatedAt
        );

        if (error) {
          if (error === ErrorType.EXCLUSIVE) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: selectedDriverExpenseRef.current?.name }),
            });
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedDriverExpenseRef.current?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedDriverExpenseRef.current?.name,
            }),
          });
        }
      }
      handleDeleteCancel();
      mutate();
    }, [handleDeleteCancel, mutate, orgId, showNotification, t, userId]);

    /**
     * Callback function for applying filters to a specific column and updating filter options.
     *
     * @param columnName - The name or identifier of the column to which the filters should be applied.
     * @param filters - An array of filter properties to apply to the column.
     * @param sortType - An optional sorting order ("asc" or "desc") to apply to the column.
     */
    const handleFilterApply = useCallback(
      (columnName: string) => (filters: FilterProperty[]) => {
        updateRouteRef.current = true;
        setFilterOptions((prevValue) => {
          const newValue: FilterOptions = {};
          Object.keys(prevValue).forEach((key) => {
            let value = prevValue[key];
            if (columnName === key) {
              value = {
                ...value,
                filters,
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
     * Updates the display order of items by swapping the positions of two items in the list.
     *
     * @param {number} currentIndex - The current index of the item being moved.
     * @param {number} newIndex - The new index where the item should be placed.
     * @returns {DriverExpenseInfo[]} - An array of updated driver report items with adjusted display orders.
     */
    const updateDisplayOrder = useCallback(
      (currentIndex: number, newIndex: number): DriverExpenseInfo[] => {
        const newList: DriverExpenseInfo[] = JSON.parse(JSON.stringify(driverExpenses));

        // Move item from currentIndex to newIndex
        const [removedItem] = newList.splice(currentIndex, 1);
        newList.splice(newIndex, 0, removedItem);

        // Update display orders for all items
        newList.forEach((item, index) => {
          item.displayOrder = index + 1;
        });

        // Filter and return updated items
        return newList.filter((item) => {
          const filterItem = driverExpenses.find(({ id }) => item.id === id);
          return filterItem && filterItem.displayOrder !== item.displayOrder;
        });
      },
      [driverExpenses]
    );

    /**
     * Handles the move of a driver report item within the list.
     *
     * @param currentIndex - The current index of the item to be moved.
     * @param newIndex - The new index to which the item should be moved.
     * @returns A function that executes the move operation when invoked.
     */
    const handleMoveItem = useCallback(
      (currentIndex: number, newIndex: number) => async () => {
        if (currentIndex < 0 || currentIndex > driverExpenses.length - 1 || currentIndex === newIndex) {
          return;
        }

        const updatedList = updateDisplayOrder(currentIndex, newIndex);
        const { status } = await put<ApiResult>(`/api${orgLink}/settings/driver-expenses`, {
          driverExpenses: updatedList.map((item) => ({
            id: Number(item.id),
            displayOrder: item.displayOrder,
          })),
        });

        if (status !== HttpStatusCode.Ok) {
          showNotification({
            color: "error",
            title: t("common.message.save_error_title"),
            message: t("driver_expense.save_error_message"),
          });
        }
        mutate();
      },
      [driverExpenses.length, mutate, orgLink, showNotification, updateDisplayOrder, t]
    );

    return (
      <div>
        <PageHeader
          title={t("driver_expense.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="driver-expense" action="new">
              <Button as={Link} href={`${orgLink}/settings/driver-expenses/new`} icon={PlusIcon}>
                {t("common.new")}
              </Button>
            </Authorization>
          }
        />

        <div className="min-h-[50vh] border-y py-4 sm:rounded-md sm:border-x">
          <ul role="list" className="divide-y divide-gray-100">
            {/* Loading skeleton */}
            {isLoading && driverExpenses.length === 0 && <SkeletonList count={6} />}

            {/* Empty data */}
            {!isLoading && driverExpenses.length === 0 && (
              <EmptyListSection
                actionLink={canNew() ? `${orgLink}/settings/driver-expenses/new` : undefined}
                description={canNew() ? undefined : t("common.empty_list")}
              />
            )}

            {/* Data */}
            {driverExpenses.map((item, index) => (
              <li
                key={item.id}
                className={clsx("flex items-center justify-between gap-x-6 px-4 py-5 hover:bg-gray-50", {
                  "animate-pulse !bg-green-600/10 duration-200": flashingId === Number(item.id),
                })}
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-x-3">
                    <Authorization
                      resource="driver-expense"
                      action="detail"
                      fallbackComponent={
                        <span className="text-sm font-medium leading-6 text-gray-900">{item.name}</span>
                      }
                    >
                      <Link
                        useDefaultStyle
                        color="secondary"
                        href={`${orgLink}/settings/driver-expenses/${encryptId(item.id)}`}
                      >
                        {item.name}
                        <span className="ml-3 text-gray-500">{item.key}</span>
                      </Link>
                    </Authorization>
                    <Badge
                      color={item.isActive ? "success" : "error"}
                      label={item.isActive ? t("driver_expense.status_active") : t("driver_expense.status_inactive")}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                    <p>
                      {t.rich("driver_expense.updated_information", {
                        updatedAt: () => (
                          <span className="italic">
                            <DateTimeLabel value={item.updatedAt} type="datetime" />
                          </span>
                        ),
                        updatedBy: () => (
                          <span
                            // href={`/users/profile/${encryptId(item.updatedByUser?.id)}`}
                            className="text-sm font-medium italic leading-6 text-gray-500 hover:text-gray-800"
                          >
                            {getAccountInfo(item.updatedByUser).displayName}
                          </span>
                        ),
                      })}
                      {item.isSystem && (
                        <span className="italic text-gray-500"> - {t("driver_expense.data_type_system")}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="group flex flex-none items-center gap-x-2">
                  {!item.isSystem && (
                    <>
                      {index !== 0 && canEdit() && (
                        <>
                          <div
                            onClick={handleMoveItem(index, 0)}
                            title={t("driver_expense.move_to_top")}
                            className="hidden rounded-md py-1.5 text-sm font-semibold text-gray-400 hover:cursor-pointer group-hover:text-gray-900 sm:block"
                          >
                            <BiArrowToTop aria-hidden="true" className="h-6 w-6" />
                          </div>
                          <div
                            onClick={handleMoveItem(index, index - 1)}
                            title={t("driver_expense.move_upward")}
                            className="hidden rounded-md py-1.5 text-sm font-semibold text-gray-400 hover:cursor-pointer group-hover:text-gray-900 sm:block"
                          >
                            <BiUpArrowAlt aria-hidden="true" className="h-6 w-6" />
                          </div>
                        </>
                      )}
                      {index !== driverExpenses.length - 1 && canEdit() && (
                        <>
                          <div
                            onClick={handleMoveItem(index, index + 1)}
                            title={t("driver_expense.move_downward")}
                            className="hidden rounded-md py-1.5 text-sm font-semibold text-gray-400 hover:cursor-pointer group-hover:text-gray-900 sm:block"
                          >
                            <BiDownArrowAlt aria-hidden="true" className="h-6 w-6" />
                          </div>
                          <div
                            onClick={handleMoveItem(index, driverExpenses.length - 1)}
                            title={t("driver_expense.move_to_bottom")}
                            className="hidden rounded-md py-1.5 text-sm font-semibold text-gray-400 hover:cursor-pointer group-hover:text-gray-900 sm:block"
                          >
                            <BiArrowToBottom aria-hidden="true" className="h-6 w-6" />
                          </div>
                        </>
                      )}
                    </>
                  )}

                  <Authorization
                    resource="driver-expense"
                    action={["edit", "new", "delete"]}
                    type="oneOf"
                    alwaysAuthorized={
                      (canEditOwn() && equalId(item.createdByUser.id, userId)) ||
                      (canDeleteOwn() && equalId(item.createdByUser.id, userId))
                    }
                  >
                    <MasterActionTable
                      actionPlacement={
                        driverExpenses.length >= 3 &&
                        (driverExpenses.length - 1 === index || driverExpenses.length - 2 === index)
                          ? "start"
                          : "end"
                      }
                      editLink={
                        canEdit() || (canEditOwn() && equalId(item.createdByUser.id, userId))
                          ? `${orgLink}/settings/driver-expenses/${encryptId(item.id)}/edit`
                          : ""
                      }
                      copyLink={canNew() ? `${orgLink}/settings/driver-expenses/new?copyId=${encryptId(item.id)}` : ""}
                      onDelete={
                        !item.isSystem && (canDelete() || (canDeleteOwn() && equalId(item.createdByUser.id, userId)))
                          ? handleDelete(item)
                          : undefined
                      }
                    />
                  </Authorization>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: selectedDriverExpenseRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    );
  },
  {
    resource: "driver-expense",
    action: "find",
  }
);
