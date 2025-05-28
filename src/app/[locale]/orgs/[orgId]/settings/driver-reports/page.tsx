"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Link } from "@/components/atoms";
import { Authorization, Button, PageHeader, QuickSearch } from "@/components/molecules";
import { ConfirmModal, DriverReportTable, FilterStatus } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { useDriverReports, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useDriverReportState } from "@/redux/states";
import { DRIVER_REPORT_UPDATE_SEARCH_CONDITIONS, DRIVER_REPORT_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { deleteDriverReport, updateDisplayOrderDriverReport } from "@/services/client/driverReport";
import { ErrorType } from "@/types";
import { HttpStatusCode } from "@/types/api";
import { FilterOptions, FilterProperty } from "@/types/filter";
import { DriverReportInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { getItemString } from "@/utils/storage";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { searchConditions } = useDriverReportState();
    const [loadingRowId, setLoadingRowId] = useState<number | null>(null);

    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);

    const updateRouteRef = useRef(false);
    const selectedDriverReportRef = useRef<DriverReportInfo>();

    const { isLoading, driverReports, mutate } = useDriverReports({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("driver_report.title"), link: `${orgLink}/settings/driver-reports` },
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
    const handleDelete = useCallback((item: DriverReportInfo) => {
      selectedDriverReportRef.current = item;
      setIsDeleteConfirmOpen(true);
    }, []);

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
      if (selectedDriverReportRef.current?.isSystem) {
        return;
      }

      if (selectedDriverReportRef.current?.id && userId) {
        const { error } = await deleteDriverReport(
          {
            id: Number(selectedDriverReportRef.current?.id),
            organizationId: orgId,
            updatedById: userId,
          },
          selectedDriverReportRef.current?.updatedAt
        );

        if (error) {
          if (error === ErrorType.EXCLUSIVE) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: selectedDriverReportRef.current?.name }),
            });
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedDriverReportRef.current?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedDriverReportRef.current?.name,
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
     * @returns {DriverReportInfo[]} - An array of updated driver report items with adjusted display orders.
     */
    const updateDisplayOrder = useCallback(
      (currentIndex: number, newIndex: number): DriverReportInfo[] => {
        const newList: DriverReportInfo[] = JSON.parse(JSON.stringify(driverReports));

        // Move item from currentIndex to newIndex
        const [removedItem] = newList.splice(currentIndex, 1);
        newList.splice(newIndex, 0, removedItem);

        // Update display orders for all items
        newList.forEach((item, index) => {
          item.displayOrder = index + 1;
        });

        // Filter and return updated items
        return newList.filter((item) => {
          const filterItem = driverReports.find(({ id }) => item.id === id);
          return filterItem && filterItem.displayOrder !== item.displayOrder;
        });
      },
      [driverReports]
    );

    /**
     * Handles the move of a driver report item within the list.
     *
     * @param currentIndex - The current index of the item to be moved.
     * @param newIndex - The new index to which the item should be moved.
     * @returns A function that executes the move operation when invoked.
     */
    const handleMoveItem = useCallback(
      async (currentIndex: number, newIndex: number) => {
        if (currentIndex < 0 || currentIndex > driverReports.length - 1 || currentIndex === newIndex) {
          return;
        }
        setLoadingRowId(driverReports[currentIndex].id);
        const updatedList = updateDisplayOrder(currentIndex, newIndex);

        const status = await updateDisplayOrderDriverReport(orgLink, updatedList);

        if (status !== HttpStatusCode.Ok) {
          showNotification({
            color: "error",
            title: t("common.message.save_error_title"),
            message: t("driver_report.save_error_message"),
          });
        }
        await mutate();
        setLoadingRowId(null);
      },
      [driverReports, updateDisplayOrder, orgLink, mutate, showNotification, t]
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
          title={t("driver_report.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <div className="space-x-4">
              <Authorization resource="workflow" action="new">
                <Button as={Link} href={`${orgLink}/settings/workflows/new`} icon={PlusIcon}>
                  {t("driver_report.workflow")}
                </Button>
              </Authorization>
              <Authorization resource="driver-report" action="new">
                <Button as={Link} href={`${orgLink}/settings/driver-reports/new`} icon={PlusIcon}>
                  {t("driver_report.title")}
                </Button>
              </Authorization>
            </div>
          }
        />

        <DriverReportTable
          allowEdit
          loadingRowId={loadingRowId}
          driverReports={driverReports}
          onMoveItem={handleMoveItem}
          flashingId={flashingId}
          handleFlashed={handleFlashed}
          onDelete={handleDelete}
          loadingRow={isLoading}
        />

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: selectedDriverReportRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    );
  },
  {
    resource: "driver-report",
    action: "find",
  }
);
