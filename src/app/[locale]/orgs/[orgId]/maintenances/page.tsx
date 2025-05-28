"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { MaintenanceTypeType } from "@prisma/client";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
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
import { useIdParam, useMaintenances, usePermission, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useMaintenanceState } from "@/redux/states";
import { MAINTENANCE_UPDATE_SEARCH_CONDITIONS, MAINTENANCE_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { deleteMaintenance } from "@/services/client/maintenance";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { MaintenanceInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
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
    const { searchConditions } = useMaintenanceState();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canDetail, canEditOwn, canDelete, canDeleteOwn } = usePermission("maintenance");
    const updateRouteRef = useRef(false);
    const selectedMaintenanceRef = useRef<MaintenanceInfo>();

    const { isLoading, maintenances, pagination, mutate } = useMaintenances({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("maintenance.manage"), link: orgLink },
        { name: t("maintenance.title"), link: `${orgLink}/maintenances` },
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
          type: MAINTENANCE_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: MAINTENANCE_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with maintenances data.
     *
     * @param item - The maintenances data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: MaintenanceInfo) => () => {
        selectedMaintenanceRef.current = item;
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
     * Get maintenance name
     */
    const getMaintenanceLicense = useMemo(() => {
      return `${selectedMaintenanceRef.current?.type} ${
        selectedMaintenanceRef.current?.type === MaintenanceTypeType.VEHICLE
          ? selectedMaintenanceRef.current?.vehicle
            ? `-  ${selectedMaintenanceRef.current?.vehicle?.vehicleNumber}`
            : ""
          : selectedMaintenanceRef.current?.trailer
          ? `-  ${selectedMaintenanceRef.current?.trailer?.trailerNumber}`
          : ""
      }`;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMaintenanceRef.current]);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (selectedMaintenanceRef.current?.id && userId) {
        const { error } = await deleteMaintenance(
          {
            organizationId: orgId,
            id: selectedMaintenanceRef.current?.id,
            updatedById: userId,
          },
          selectedMaintenanceRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: getMaintenanceLicense,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: getMaintenanceLicense,
            }),
          });
        }
      }
      handleDeleteCancel();
      mutate();
    }, [getMaintenanceLicense, handleDeleteCancel, mutate, orgId, showNotification, t, userId]);

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

    return (
      <>
        <PageHeader
          title={t("maintenance.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="maintenance" action="new">
              <Button as={Link} href={`${orgLink}/maintenances/new`} icon={PlusIcon}>
                {t("common.new")}
              </Button>
            </Authorization>
          }
        />

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
                    label={t("maintenance.transportation_type")}
                    {...filterOptions.type}
                    onApply={handleFilterApply("type")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("maintenance.license_plates")}
                    actionPlacement="right"
                    hideSort
                    {...filterOptions.license}
                    onApply={handleFilterApply("license")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("maintenance.estimate_cost")}
                    actionPlacement="center"
                    {...filterOptions.estimateCost}
                    onApply={handleFilterApply("estimateCost")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("maintenance.actual_cost")}
                    actionPlacement="center"
                    {...filterOptions.actualCost}
                    onApply={handleFilterApply("actualCost")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("common.created_info")}
                    {...filterOptions.createdAt}
                    onApply={handleFilterApply("createdAt")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("common.updated_info")}
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
              {isLoading && maintenances.length === 0 && (
                <SkeletonTableRow rows={10} columns={7} profileColumnIndexes={[4, 5]} />
              )}

              {/* Empty data */}
              {!isLoading && maintenances.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={7} className="px-6 lg:px-8">
                    <EmptyListSection
                      actionLink={canNew() ? `${orgLink}/maintenances/new` : undefined}
                      description={canNew() ? undefined : t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {maintenances.map((item, index) => (
                <TableRow key={item.id} flash={Number(item.id) === flashingId} onFlashed={handleFlashed}>
                  <TableCell>
                    <Authorization
                      alwaysAuthorized={canDetail()}
                      fallbackComponent={
                        <span className="text-sm font-medium leading-6 text-gray-900">
                          {item.type === MaintenanceTypeType.VEHICLE
                            ? t("maintenance.vehicle")
                            : t("maintenance.trailer")}
                        </span>
                      }
                    >
                      <Link
                        useDefaultStyle
                        color="secondary"
                        className="cursor-pointer"
                        href={`${orgLink}/maintenances/${encryptId(item.id)}`}
                      >
                        {item.type === MaintenanceTypeType.VEHICLE
                          ? t("maintenance.vehicle")
                          : t("maintenance.trailer")}
                      </Link>
                    </Authorization>
                  </TableCell>
                  <TableCell>
                    <div>
                      {(item?.vehicle || item?.trailer) && (
                        <p className="whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-gray-900">
                          {item.type === MaintenanceTypeType.VEHICLE
                            ? `${item?.vehicle?.vehicleNumber}`
                            : `${item?.trailer?.trailerNumber}`}
                        </p>
                      )}
                      {(item?.vehicle?.driver || item?.trailer?.vehicle) && (
                        <div className="whitespace-nowrap text-xs font-medium text-gray-500 group-hover:text-gray-700">
                          {item.type === MaintenanceTypeType.VEHICLE
                            ? t("maintenance.driver", {
                                label: getFullName(item?.vehicle?.driver?.firstName, item?.vehicle?.driver?.lastName),
                              })
                            : t("maintenance.connect", { label: item?.trailer.vehicle?.vehicleNumber })}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <NumberLabel value={Number(item.estimateCost)} type="currency" emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell align="center">
                    <NumberLabel value={Number(item.actualCost)} type="currency" emptyLabel={t("common.empty")} />
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
                  <TableCell action>
                    <Authorization
                      resource="maintenance"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          maintenances.length >= 3 &&
                          (maintenances.length - 1 === index || maintenances.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                            ? `${orgLink}/maintenances/${encryptId(item.id)}/edit`
                            : ""
                        }
                        copyLink={canNew() ? `${orgLink}/maintenances/new?copyId=${encryptId(item.id)}` : ""}
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

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: getMaintenanceLicense })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "maintenance",
    action: "find",
  }
);
