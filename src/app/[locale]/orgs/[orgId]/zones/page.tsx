"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { useAtom } from "jotai";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { LuMapPin } from "react-icons/lu";

import { deleteZone } from "@/actions/zone";
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
import { useIdParam, usePermission, useSearchConditions, useZones } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { zoneAtom } from "@/states";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { ZoneInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";

export default withOrg(
  ({ orgLink, userId, orgId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const { encryptId } = useIdParam();

    const { setBreadcrumb } = useBreadcrumb();
    const { showNotificationBasedOnStatus } = useNotification(t);
    const [{ searchConditions }, setSearchConditions] = useAtom(zoneAtom);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("zone");

    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const updateRouteRef = useRef(false);
    const selectedZoneRef = useRef<ZoneInfo>();

    const { isLoading, zones, pagination, mutate } = useZones({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("zone.manage"), link: orgLink },
        { name: t("zone.name"), link: `${orgLink}/zones` },
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
        setSearchConditions((prev) => ({
          ...prev,
          searchQueryString: queryString,
          searchConditions: filterOptions,
        }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with zone data.
     *
     * @param item - The zone data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: ZoneInfo) => () => {
        selectedZoneRef.current = item;
        setIsDeleteConfirmOpen(true);
      },
      []
    );

    /**
     * Callback function for canceling and closing a dialog.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
      selectedZoneRef.current = undefined;
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      const selectedZone = selectedZoneRef.current;

      if (selectedZone?.id && userId) {
        const { status } = await deleteZone({
          id: Number(selectedZone.id),
          organizationId: orgId,
          updatedAt: selectedZone.updatedAt,
        });

        showNotificationBasedOnStatus(status, selectedZone.name);
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

    return (
      <>
        <PageHeader
          title={t("zone.name")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="zone" action="new">
              <Button as={Link} href={`${orgLink}/zones/new`} icon={PlusIcon}>
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
                <TableCell className="pl-5 text-left">
                  <TableFilterMenu
                    label={t("zone.name")}
                    actionPlacement="right"
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>

                <TableCell>
                  <TableFilterMenu
                    label={t("zone.parent")}
                    actionPlacement="center"
                    {...filterOptions.parent}
                    onApply={handleFilterApply("parent")}
                  />
                </TableCell>

                <TableCell>
                  <TableFilterMenu
                    label={t("zone.adjacent_zones")}
                    actionPlacement="center"
                    {...filterOptions.adjacentZones}
                    onApply={handleFilterApply("adjacentZones")}
                  />
                </TableCell>

                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("zone.status")}
                    actionPlacement="left"
                    {...filterOptions.status}
                    onApply={handleFilterApply("status")}
                  />
                </TableCell>

                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("zone.updated_by")}
                    actionPlacement="left"
                    {...filterOptions.updatedAt}
                    onApply={handleFilterApply("updatedAt")}
                  />
                </TableCell>

                <TableCell className=" text-right" action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && zones.length === 0 && <SkeletonTableRow rows={10} columns={6} />}

              {/* Empty data */}
              {!isLoading && zones.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={6} className="px-6 lg:px-8">
                    <EmptyListSection actionLink={`${orgLink}/zones/new`} />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {zones.map((item, index) => (
                <TableRow key={item.id} flash={Number(item.id) === flashingId} onFlashed={handleFlashed}>
                  <TableCell>
                    <Authorization
                      resource="zone"
                      action="detail"
                      fallbackComponent={
                        <span className="text-sm font-medium leading-6 text-gray-900">{item.name}</span>
                      }
                    >
                      <Link useDefaultStyle color="secondary" href={`${orgLink}/zones/${encryptId(item.id)}`}>
                        <span className="text-sm font-medium leading-6 text-gray-900">
                          {item.name || t("common.empty")}
                        </span>
                      </Link>
                    </Authorization>
                  </TableCell>
                  <TableCell>{item.parent?.name || t("common.empty")}</TableCell>
                  <TableCell>
                    {(item.adjacentZones ?? []).length > 0 ? (
                      <div className="mx-auto max-w-lg">
                        <div className="space-y-2">
                          {(item.adjacentZones || []).map(
                            (adjacentZone, index) =>
                              index < 4 && (
                                <div key={index} className="flex items-center space-x-2">
                                  <LuMapPin className="me-2 inline-block h-3 w-3 flex-shrink-0 text-teal-600" />
                                  <span className="text-xs text-gray-500">
                                    {index < 3 && adjacentZone.name}
                                    {index === 3 && (
                                      <span
                                        data-tooltip-id="tooltip"
                                        data-tooltip-html={(item.adjacentZones || [])
                                          .slice(3)
                                          .map((adjacentZone) => adjacentZone.name)
                                          .join("<br/>")}
                                        className="text-xs text-gray-500"
                                      >
                                        ...
                                      </span>
                                    )}
                                  </span>
                                </div>
                              )
                          )}
                        </div>
                      </div>
                    ) : (
                      t("common.empty")
                    )}
                  </TableCell>
                  <TableCell align="left">
                    <Badge
                      label={item.isActive ? t("zone.status_active") : t("zone.status_inactive")}
                      color={item.isActive ? "success" : "error"}
                    />
                  </TableCell>

                  <TableCell>
                    <ProfileInfo
                      emptyLabel={t("common.empty")}
                      user={item.updatedByUser}
                      description={<DateTimeLabel value={item.updatedAt} type="datetime" />}
                    />
                  </TableCell>

                  <TableCell action>
                    <Authorization
                      resource="zone"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          zones.length >= 3 && (zones.length - 1 === index || zones.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                            ? `${orgLink}/zones/${encryptId(item.id)}/edit`
                            : ""
                        }
                        copyLink={canNew() ? `${orgLink}/zones/new?copyId=${encryptId(item.id)}` : ""}
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

        {/* Delete confirmation modal */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: selectedZoneRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "zone",
    action: "find",
  }
);
