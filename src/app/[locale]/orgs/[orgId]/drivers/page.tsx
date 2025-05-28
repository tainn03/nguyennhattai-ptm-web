"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Badge,
  DateTimeLabel,
  InfoBox,
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
import { useDrivers, useIdParam, usePermission, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useDriverState } from "@/redux/states";
import { DRIVER_UPDATE_SEARCH_CONDITIONS, DRIVER_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { deleteDriver } from "@/services/client/driver";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { DriverInfo } from "@/types/strapi";
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
    const { searchConditions } = useDriverState();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();

    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("driver");

    const updateRouteRef = useRef(false);
    const selectedDriverRef = useRef<DriverInfo>();

    const { isLoading, drivers, pagination, mutate } = useDrivers({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("driver.manage"), link: orgLink },
        { name: t("driver.title"), link: `${orgLink}/drivers` },
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
          type: DRIVER_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: DRIVER_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with driver data.
     *
     * @param item - The driver data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: DriverInfo) => () => {
        selectedDriverRef.current = item;
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
      if (selectedDriverRef.current?.id && userId) {
        const { error } = await deleteDriver(
          {
            organizationId: orgId,
            id: Number(selectedDriverRef.current.id),
            updatedById: userId,
          },
          selectedDriverRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("driver.delete_error_message", {
              name: getFullName(selectedDriverRef.current?.firstName, selectedDriverRef.current?.lastName),
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("driver.delete_success_message", {
              name: getFullName(selectedDriverRef.current?.firstName, selectedDriverRef.current?.lastName),
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

    return (
      <>
        <PageHeader
          title={t("driver.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="driver" action="new">
              <Button as={Link} href={`${orgLink}/drivers/new`} icon={PlusIcon}>
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
                    label={t("driver.name")}
                    actionPlacement="right"
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("driver.vehicle")}
                    actionPlacement="right"
                    {...filterOptions.vehicleNumber}
                    onApply={handleFilterApply("vehicleNumber")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    align="right"
                    label={t("driver.phone")}
                    {...filterOptions.phoneNumber}
                    onApply={handleFilterApply("phoneNumber")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("driver.driver_license_type")}
                    {...filterOptions.licenseType}
                    onApply={handleFilterApply("licenseType")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("driver.license_number_short")}
                    align="right"
                    {...filterOptions.licenseNumber}
                    onApply={handleFilterApply("licenseNumber")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("driver.status")}
                    align="center"
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
              {isLoading && drivers.length === 0 && (
                <SkeletonTableRow rows={10} columns={9} profileColumnIndexes={[6, 7]} />
              )}

              {/* Empty data */}
              {!isLoading && drivers.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={9} className="px-6 lg:px-8">
                    <EmptyListSection
                      actionLink={canNew() ? `${orgLink}/drivers/new` : undefined}
                      description={canNew() ? undefined : t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {drivers.map((item, index) => (
                <TableRow key={item.id} flash={Number(item.id) === flashingId} onFlashed={handleFlashed}>
                  <TableCell>
                    <Authorization
                      resource="driver"
                      action="detail"
                      fallbackComponent={
                        <span className="text-sm font-medium leading-6 text-gray-900">
                          {getFullName(item.firstName, item.lastName)}
                        </span>
                      }
                    >
                      <Link
                        useDefaultStyle
                        color="secondary"
                        className="cursor-pointer"
                        href={`${orgLink}/drivers/${encryptId(item.id)}`}
                      >
                        {getFullName(item.firstName, item.lastName)}
                      </Link>
                    </Authorization>
                  </TableCell>
                  <TableCell>
                    <Authorization
                      resource="vehicle"
                      action="detail"
                      fallbackComponent={
                        <InfoBox
                          emptyLabel={t("common.empty")}
                          label={item.vehicle?.vehicleNumber}
                          subLabel={item.vehicle?.idNumber}
                        />
                      }
                    >
                      <InfoBox
                        as={Link}
                        label={item.vehicle?.vehicleNumber}
                        subLabel={item.vehicle?.idNumber}
                        href={`${orgLink}/vehicles/${encryptId(item.vehicle?.id)}`}
                        emptyLabel={t("common.empty")}
                      />
                    </Authorization>
                  </TableCell>
                  <TableCell align="right">{item.phoneNumber || t("common.empty")}</TableCell>
                  <TableCell>{item.licenseType?.name || t("common.empty")}</TableCell>
                  <TableCell align="right">{item.licenseNumber || t("common.empty")}</TableCell>
                  <TableCell align="center">
                    <Badge
                      label={item.isActive ? t("driver.status_active") : t("driver.status_inactive")}
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
                      resource="driver"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          drivers.length >= 3 && (drivers.length - 1 === index || drivers.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser.id, userId))
                            ? `${orgLink}/drivers/${encryptId(item.id)}/edit`
                            : ""
                        }
                        copyLink={canNew() ? `${orgLink}/drivers/new?copyId=${encryptId(item.id)}` : ""}
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

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("driver.delete_title", {
            name: getFullName(selectedDriverRef.current?.firstName, selectedDriverRef.current?.lastName),
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
    resource: "driver",
    action: "find",
  }
);
