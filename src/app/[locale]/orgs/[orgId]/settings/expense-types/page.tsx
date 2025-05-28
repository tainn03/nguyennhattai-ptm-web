"use client";

import { CheckIcon, PlusIcon, XMarkIcon } from "@heroicons/react/20/solid";
import { useAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { deleteExpenseType } from "@/actions/expenseType";
import {
  Badge,
  DateTimeLabel,
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
  ProfileInfo,
  QuickSearch,
  TableFilterMenu,
} from "@/components/molecules";
import { ConfirmModal, FilterStatus, Pagination } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { useExpenseTypes, usePermission, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { expenseTypeAtom } from "@/states";
import { HttpStatusCode } from "@/types/api";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { ExpenseTypeInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { encryptId } from "@/utils/security";
import { getItemString } from "@/utils/storage";

export default withOrg(
  ({ orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const [{ expenseTypeConditions }, setExpenseTypeState] = useAtom(expenseTypeAtom);
    const [filterOptions, setFilterOptions] = useSearchConditions(expenseTypeConditions);

    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEdit, canEditOwn, canNew, canDelete, canDeleteOwn } = usePermission("expense-type");

    const updateRouteRef = useRef(false);
    const selectedExpenseTypeRef = useRef<ExpenseTypeInfo>();

    const { expenseTypes, isLoading, pagination, mutate } = useExpenseTypes({
      ...getFilterRequest(filterOptions),
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("expense_type.title"), link: `${orgLink}/settings/expense-types` },
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
        setExpenseTypeState((prev) => ({
          ...prev,
          expenseTypeSearchQueryString: queryString,
          expenseTypeConditions: filterOptions,
        }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with driver report data.
     *
     * @param item - The driver report data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: ExpenseTypeInfo) => () => {
        selectedExpenseTypeRef.current = item;
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
      if (selectedExpenseTypeRef.current?.id && userId) {
        const { status } = await deleteExpenseType({
          entity: {
            id: selectedExpenseTypeRef.current?.id,
            updatedById: userId,
          },
          lastUpdatedAt: selectedExpenseTypeRef.current?.updatedAt,
        });

        if (status !== HttpStatusCode.Ok) {
          if (status === HttpStatusCode.Exclusive) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: selectedExpenseTypeRef.current?.name }),
            });
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedExpenseTypeRef.current?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedExpenseTypeRef.current?.name,
            }),
          });
          mutate();
        }
      }
      handleDeleteCancel();
    }, [handleDeleteCancel, mutate, showNotification, t, userId]);

    /**
     * Handles the application of filters and sorting for a specific column.
     * Updates the filter options state and resets the pagination to the first page.
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
     * Updates the current page in the pagination filter options.
     * @param page - The new page number to set in the pagination options.
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
     * Updates the filter options to change the page size and resets the current page to 1.
     * @param pageSize - The new number of items to display per page.
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
     * Callback function for handling the end of a flashing event.
     * It clears the currently flashing ID.
     */
    const handleFlashed = useCallback(() => {
      setFlashingId(undefined);
    }, []);

    return (
      <div>
        <PageHeader
          title={t("expense_type.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="expense-type" action="new">
              <Button as={Link} href={`${orgLink}/settings/expense-types/new`} icon={PlusIcon}>
                {t("common.new")}
              </Button>
            </Authorization>
          }
        />

        <TableContainer fullHeight className="!mt-0" horizontalScroll>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="w-16 pl-0">{t("driver_report.checklist_item_no")}</TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="right"
                    label={t("expense_type.name")}
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("expense_type.key")}
                    {...filterOptions.key}
                    onApply={handleFilterApply("key")}
                  />
                </TableCell>
                <TableCell align="center">{t("expense_type.allow_customer_view")}</TableCell>
                <TableCell align="center">{t("expense_type.can_driver_view")}</TableCell>
                <TableCell align="center">{t("expense_type.can_driver_edit")}</TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("expense_type.status")}
                    {...filterOptions.status}
                    onApply={handleFilterApply("status")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("expense_type.create")}
                    {...filterOptions.createdAt}
                    onApply={handleFilterApply("createdAt")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("expense_type.update")}
                    {...filterOptions.updatedAt}
                    actionPlacement="left"
                    onApply={handleFilterApply("updatedAt")}
                  />
                </TableCell>
                <TableCell action>
                  <span className="sr-only">{t("common.action")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && expenseTypes.length === 0 && <SkeletonTableRow rows={10} columns={9} />}

              {/* Empty data */}
              {!isLoading && expenseTypes.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={9} className="px-6 lg:px-8">
                    <EmptyListSection
                      actionLink={canNew() ? `${orgLink}/settings/expense-types/new` : undefined}
                      description={canNew() ? undefined : t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {(expenseTypes || []).map((item: ExpenseTypeInfo, index: number) => (
                <TableRow key={item.id} flash={equalId(item.id, flashingId)} onFlashed={handleFlashed}>
                  <TableCell align="center">{index + 1}</TableCell>
                  <TableCell>
                    <Authorization resource="expense-type" action="detail" fallbackComponent={item.name}>
                      <Link
                        useDefaultStyle
                        color="secondary"
                        href={`${orgLink}/settings/expense-types/${encryptId(item.id)}`}
                      >
                        {item.name}
                      </Link>
                    </Authorization>
                  </TableCell>
                  <TableCell>{item.key}</TableCell>
                  <TableCell className="place-content-center place-items-center">
                    {item.publicToCustomer ? (
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="place-content-center place-items-center">
                    {item.canDriverView ? (
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="place-content-center place-items-center">
                    {item.canDriverEdit ? (
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XMarkIcon className="h-5 w-5 text-red-500" />
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      label={item.isActive ? t("driver_report.status_active") : t("driver_report.status_inactive")}
                      color={item.isActive ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell>
                    <ProfileInfo
                      user={item.createdByUser}
                      description={<DateTimeLabel value={item.createdAt} type="datetime" />}
                    />
                  </TableCell>
                  <TableCell>
                    <ProfileInfo
                      user={item.updatedByUser}
                      description={<DateTimeLabel value={item.updatedAt} type="datetime" />}
                    />
                  </TableCell>
                  <TableCell className="group flex flex-none items-center justify-end gap-x-2">
                    <Authorization
                      resource="expense-type"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          expenseTypes.length >= 3 &&
                          (expenseTypes.length - 1 === index || expenseTypes.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                            ? `${orgLink}/settings/expense-types/${encryptId(item.id)}/edit`
                            : ""
                        }
                        copyLink={canNew() ? `${orgLink}/settings/expense-types/new?copyId=${encryptId(item.id)}` : ""}
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

        <div className="mt-4 px-4">
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
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: selectedExpenseTypeRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    );
  },
  {
    resource: "expense-type",
    action: "find",
  }
);
