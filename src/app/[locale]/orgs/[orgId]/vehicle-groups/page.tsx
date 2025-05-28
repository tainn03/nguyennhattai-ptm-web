"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

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
import { useIdParam, usePermission, useSearchConditions, useVehicleGroups } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useVehicleGroupState } from "@/redux/states";
import { VEHICLE_GROUP_UPDATE_SEARCH_CONDITIONS, VEHICLE_GROUP_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { deleteVehicleGroup } from "@/services/client/vehicleGroup";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { VehicleGroupInfo } from "@/types/strapi";
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
    const { searchConditions } = useVehicleGroupState();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("vehicle-group");
    const updateRouteRef = useRef(false);
    const selectedVehicleGroupRef = useRef<VehicleGroupInfo>();

    const { vehicleGroups, isLoading, pagination, mutate } = useVehicleGroups({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("vehicle_group.title"), link: `${orgLink}/vehicle-groups` },
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
          type: VEHICLE_GROUP_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: VEHICLE_GROUP_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with vehicle group data.
     *
     * @param item - The vehicle group data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: VehicleGroupInfo) => () => {
        selectedVehicleGroupRef.current = item;
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
      if (selectedVehicleGroupRef.current?.id && userId) {
        const { error } = await deleteVehicleGroup(
          {
            organizationId: orgId,
            id: selectedVehicleGroupRef.current?.id,
            updatedById: userId,
          },
          selectedVehicleGroupRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedVehicleGroupRef.current.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedVehicleGroupRef.current.name,
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

    return (
      <>
        <PageHeader
          title={t("vehicle_group.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="vehicle-group" action="new">
              <Button as={Link} href={`${orgLink}/vehicle-groups/new`} icon={PlusIcon}>
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
                    label={t("vehicle_group.name")}
                    actionPlacement="right"
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("vehicle_group.status")}
                    actionPlacement="right"
                    {...filterOptions.isActive}
                    onApply={handleFilterApply("isActive")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("vehicle_group.manager")}
                    {...filterOptions.manager}
                    onApply={handleFilterApply("manager")}
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
              {isLoading && vehicleGroups.length === 0 && (
                <SkeletonTableRow rows={10} columns={6} profileColumnIndexes={[2, 3, 4]} />
              )}

              {/* Empty data */}
              {!isLoading && vehicleGroups.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={6} className="px-6 lg:px-8">
                    <EmptyListSection actionLink={`${orgLink}/vehicle-groups/new`} />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {vehicleGroups.map((item, index) => (
                <TableRow key={item.id} flash={Number(item.id) === flashingId} onFlashed={handleFlashed}>
                  <TableCell>
                    <Authorization
                      resource="vehicle-group"
                      action="detail"
                      fallbackComponent={
                        <span className="text-sm font-medium leading-6 text-gray-900">{item.name}</span>
                      }
                    >
                      <Link
                        useDefaultStyle
                        color="secondary"
                        className="cursor-pointer"
                        href={`${orgLink}/vehicle-groups/${encryptId(item.id)}`}
                      >
                        {item.name}
                      </Link>
                    </Authorization>
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={item.isActive ? t("vehicle_group.status_active") : t("vehicle_group.status_inactive")}
                      color={item.isActive ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell>
                    <ProfileInfo
                      user={item.manager?.member}
                      description={item.manager?.phoneNumber || item.manager?.email || item.manager?.username}
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
                  <TableCell action>
                    <Authorization
                      resource="vehicle-group"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          vehicleGroups.length >= 3 &&
                          (vehicleGroups.length - 1 === index || vehicleGroups.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                            ? `${orgLink}/vehicle-groups/${encryptId(item.id)}/edit`
                            : ""
                        }
                        copyLink={canNew() ? `${orgLink}/vehicle-groups/new?copyId=${encryptId(item.id)}` : ""}
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
          title={t("common.confirmation.delete_title", { name: selectedVehicleGroupRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "vehicle-group",
    action: "find",
  }
);
