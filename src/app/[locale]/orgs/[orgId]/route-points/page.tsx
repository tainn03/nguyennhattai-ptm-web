"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { useAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { deleteRoutePoint } from "@/actions/routePoint";
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
import { ConfirmModal, FilterStatus, Pagination } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { RoutePointTimeRange } from "@/forms/routePoint";
import { useIdParam, usePermission, useRoutePoints, useSearchConditions } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { routePointAtom } from "@/states";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { RoutePointInfo, VehicleTypeInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { safeParseArray } from "@/utils/object";
import { getItemString } from "@/utils/storage";

export default withOrg(
  ({ orgLink, userId, orgId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const { encryptId } = useIdParam();

    const { setBreadcrumb } = useBreadcrumb();
    const { showNotificationBasedOnStatus } = useNotification(t);
    const [{ searchConditions }, setRoutePointAtom] = useAtom(routePointAtom);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canDelete } = usePermission("route-point");

    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const updateRouteRef = useRef(false);
    const selectedRoutePointRef = useRef<RoutePointInfo>();

    const { isLoading, routePoints, pagination, mutate } = useRoutePoints({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("route_point.manage"), link: orgLink },
        { name: t("route_point.title"), link: `${orgLink}/route-points` },
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
        setRoutePointAtom((prev) => ({
          ...prev,
          searchQueryString: queryString,
          searchConditions: filterOptions,
        }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with route points data.
     *
     * @param item - The route points data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: RoutePointInfo) => () => {
        selectedRoutePointRef.current = item;
        setIsDeleteConfirmOpen(true);
      },
      []
    );

    /**
     * Callback function for canceling and closing a dialog.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
      selectedRoutePointRef.current = undefined;
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      const selectedRoutePoint = selectedRoutePointRef.current;

      if (selectedRoutePoint?.id && userId) {
        const { status } = await deleteRoutePoint({
          id: Number(selectedRoutePoint.id),
          organizationId: orgId,
          updatedAt: selectedRoutePoint.updatedAt,
        });

        showNotificationBasedOnStatus(status, selectedRoutePoint.name);
        mutate();
      }
      handleDeleteCancel();
    }, [handleDeleteCancel, mutate, orgId, showNotificationBasedOnStatus, userId]);

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
      [setFilterOptions]
    );

    /**
     * Callback function for handling changes in filter options.
     *
     * @param options - The new filter options to set.
     */
    const handleFilterChange = useCallback(
      (options: FilterOptions) => {
        updateRouteRef.current = true;
        setFilterOptions(options);
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

    /**
     * Renders the vehicle types data.
     *
     * @param vehicleTypes - The vehicle types data to render.
     * @returns The rendered vehicle types data.
     */
    const renderEntityNames = useCallback(
      (entities: Partial<VehicleTypeInfo>[] | Partial<RoutePointInfo>[], key: string) => {
        const entityNames = entities.map((v) => v.name);
        if (entityNames.length > 3) {
          return (
            <>
              {entityNames.slice(0, 3).map((vehicleType, index) => (
                <div key={`${key}-${index}`}>{vehicleType}</div>
              ))}
              <div data-tooltip-id="tooltip" data-tooltip-html={`${entityNames.slice(3).join("<br />")}`}>
                ...
              </div>
            </>
          );
        } else if (entityNames.length > 0) {
          return entityNames.map((v, index) => <div key={`${key}-${index}`}>{v}</div>);
        }
        return t("common.empty");
      },
      [t]
    );

    return (
      <>
        <PageHeader
          title={t("route_point.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="route-point" action="new">
              <Button as={Link} href={`${orgLink}/route-points/new`} icon={PlusIcon}>
                {t("common.new")}
              </Button>
            </Authorization>
          }
        />

        <TableContainer
          horizontalScroll
          verticalScroll
          allowFullscreen
          stickyHeader
          autoHeight
          fullHeight
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
                    label={t("route_point.code")}
                    actionPlacement="right"
                    {...filterOptions.code}
                    onApply={handleFilterApply("code")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("route_point.name")}
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("route_point.zone")}
                    {...filterOptions.zone}
                    onApply={handleFilterApply("zone")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("route_point.nearby_points")}
                    {...filterOptions.adjacentPoints}
                    onApply={handleFilterApply("adjacentPoints")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("route_point.pickup_time")}
                    {...filterOptions.pickupTimes}
                    onApply={handleFilterApply("pickupTimes")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("route_point.delivery_time")}
                    {...filterOptions.deliveryTimes}
                    onApply={handleFilterApply("deliveryTimes")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("route_point.vehicle_type")}
                    {...filterOptions.vehicleTypes}
                    onApply={handleFilterApply("vehicleTypes")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("common.status")}
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
              {isLoading && routePoints.length === 0 && <SkeletonTableRow rows={10} columns={9} />}

              {/* Empty data */}
              {!isLoading && routePoints.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={9} className="px-6 lg:px-8">
                    <EmptyListSection
                      actionLink={`${orgLink}/route-points/new`}
                      description={canNew() ? undefined : t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {Array.isArray(routePoints) &&
                routePoints.map((item: RoutePointInfo, index) => (
                  <TableRow key={item.id} flash={Number(item.id) === flashingId} onFlashed={handleFlashed}>
                    <TableCell className="text-sm font-medium text-gray-900">
                      <Link
                        useDefaultStyle
                        color="secondary"
                        className="cursor-pointer"
                        href={`${orgLink}/route-points/${encryptId(item.id)}`}
                      >
                        {item.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Authorization
                        resource="route-point"
                        action="detail"
                        fallbackComponent={<span className="text-sm font-medium text-gray-900">{item.name}</span>}
                      >
                        <Link
                          useDefaultStyle
                          color="secondary"
                          className="cursor-pointer"
                          href={`${orgLink}/route-points/${encryptId(item.id)}`}
                        >
                          {item.name}
                        </Link>
                      </Authorization>
                    </TableCell>
                    <TableCell>
                      <Authorization
                        resource="zone"
                        action="detail"
                        fallbackComponent={
                          <span className="text-sm font-medium text-gray-900">
                            {item.zone?.name || t("common.empty")}
                          </span>
                        }
                      >
                        <div className="truncate">{item.zone?.name || t("common.empty")}</div>
                      </Authorization>
                    </TableCell>
                    <TableCell className="truncate">
                      {renderEntityNames(item.adjacentPoints, "adjacent-points")}
                    </TableCell>
                    <TableCell className="truncate">
                      {safeParseArray(item.pickupTimes)?.length
                        ? safeParseArray<RoutePointTimeRange>(item.pickupTimes).map((time, index) => (
                            <div key={index}>
                              {time?.start?.slice(0, 5)} - {time?.end?.slice(0, 5)}
                            </div>
                          ))
                        : t("common.empty")}
                    </TableCell>
                    <TableCell className="truncate">
                      {safeParseArray(item.deliveryTimes)?.length
                        ? safeParseArray<RoutePointTimeRange>(item.deliveryTimes).map((time, index) => (
                            <div key={index}>
                              {time?.start?.slice(0, 5)} - {time?.end?.slice(0, 5)}
                            </div>
                          ))
                        : t("common.empty")}
                    </TableCell>
                    <TableCell>{renderEntityNames(item.vehicleTypes, "vehicle-types")}</TableCell>
                    <TableCell>
                      <Badge
                        label={item.isActive ? t("route_point.status_active") : t("route_point.status_inactive")}
                        color={item.isActive ? "success" : "error"}
                      />
                    </TableCell>
                    <TableCell action>
                      <Authorization resource="route-point" action={["edit", "new", "delete"]} type="oneOf">
                        <MasterActionTable
                          actionPlacement={
                            routePoints.length >= 3 &&
                            (routePoints.length - 1 === index || routePoints.length - 2 === index)
                              ? "start"
                              : "end"
                          }
                          editLink={`${orgLink}/route-points/${encryptId(item.id)}/edit`}
                          copyLink={canNew() ? `${orgLink}/route-points/new?copyId=${encryptId(item.id)}` : ""}
                          onDelete={canDelete() ? handleDelete(item) : undefined}
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
          title={t("common.confirmation.delete_title", { name: selectedRoutePointRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "route-point",
    action: "find",
  }
);
