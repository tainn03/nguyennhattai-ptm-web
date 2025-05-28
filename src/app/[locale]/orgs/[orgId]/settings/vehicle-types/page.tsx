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
import { useIdParam, usePermission, useSearchConditions, useVehicleTypes } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useVehicleTypeState } from "@/redux/states";
import { VEHICLE_TYPE_UPDATE_SEARCH_CONDITIONS, VEHICLE_TYPE_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { deleteVehicleType } from "@/services/client/vehicleType";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { VehicleTypeInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const { encryptId } = useIdParam();
    const dispatch = useDispatch();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const { searchConditions } = useVehicleTypeState();
    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("vehicle-type");
    const updateRouteRef = useRef(false);
    const selectedVehicleTypeRef = useRef<VehicleTypeInfo>();

    const { isLoading, vehicleTypes, pagination, mutate } = useVehicleTypes({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("vehicle_type.title"), link: `${orgLink}/settings/vehicle-types` },
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
          type: VEHICLE_TYPE_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: VEHICLE_TYPE_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with vehicle type data.
     *
     * @param item - The vehicle type data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: VehicleTypeInfo) => () => {
        selectedVehicleTypeRef.current = item;
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
      if (selectedVehicleTypeRef.current?.id && userId) {
        const { error } = await deleteVehicleType(
          {
            organizationId: orgId,
            id: Number(selectedVehicleTypeRef.current.id),
            updatedById: userId,
          },
          selectedVehicleTypeRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedVehicleTypeRef.current?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedVehicleTypeRef.current?.name,
            }),
          });
        }
      }
      mutate();
      handleDeleteCancel();
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
          title={t("vehicle_type.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="vehicle-type" action="new">
              <Button as={Link} href={`${orgLink}/settings/vehicle-types/new`} icon={PlusIcon}>
                {t("common.new")}
              </Button>
            </Authorization>
          }
        />

        <TableContainer fullHeight>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableFilterMenu
                    label={t("vehicle_type.name")}
                    actionPlacement="right"
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("vehicle_type.status")}
                    {...filterOptions.isActive}
                    onApply={handleFilterApply("isActive")}
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
              {isLoading && vehicleTypes.length === 0 && (
                <SkeletonTableRow rows={10} columns={5} profileColumnIndexes={[2, 3]} />
              )}

              {/* Empty data */}
              {!isLoading && vehicleTypes.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={5} className="px-6 lg:px-8">
                    <EmptyListSection
                      actionLink={canNew() ? `${orgLink}/settings/vehicle-types/new` : undefined}
                      description={canNew() ? undefined : t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {vehicleTypes.map((item, index) => (
                <TableRow key={item.id} flash={Number(item.id) === flashingId} onFlashed={handleFlashed}>
                  <TableCell>
                    <Authorization
                      resource="vehicle-type"
                      action="detail"
                      fallbackComponent={
                        <span className="text-sm font-medium leading-6 text-gray-900">{item.name}</span>
                      }
                    >
                      <Link
                        useDefaultStyle
                        color="secondary"
                        className="cursor-pointer"
                        href={`${orgLink}/settings/vehicle-types/${encryptId(item.id)}`}
                      >
                        {item.name}
                      </Link>
                    </Authorization>
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={item.isActive ? t("vehicle_type.status_active") : t("vehicle_type.status_inactive")}
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
                  <TableCell action>
                    <Authorization
                      resource="vehicle-type"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          vehicleTypes.length >= 3 &&
                          (vehicleTypes.length - 1 === index || vehicleTypes.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser.id, userId))
                            ? `${orgLink}/settings/vehicle-types/${encryptId(item.id)}/edit`
                            : ""
                        }
                        copyLink={canNew() ? `${orgLink}/settings/vehicle-types/new?copyId=${encryptId(item.id)}` : ""}
                        onDelete={
                          canDelete() || (canDeleteOwn() && equalId(item.createdByUser.id, userId))
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
          title={t("common.confirmation.delete_title", { name: selectedVehicleTypeRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "vehicle-type",
    action: "find",
  }
);
