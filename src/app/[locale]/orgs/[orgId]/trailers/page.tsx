"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { TrailerOwnerType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Badge,
  InfoBox,
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
  QuickSearch,
  TableFilterMenu,
} from "@/components/molecules";
import { ConfirmModal, FilterStatus, Pagination } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { useIdParam, usePermission, useSearchConditions } from "@/hooks";
import { useTrailers } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useTrailerState } from "@/redux/states";
import { TRAILER_UPDATE_SEARCH_CONDITIONS, TRAILER_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { getSubcontractorsByIds } from "@/services/client/subcontractor";
import { deleteTrailer } from "@/services/client/trailer";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { SubcontractorInfo, TrailerInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";
import { joinNonEmptyStrings } from "@/utils/string";
import { getDistinctSubcontractorIds } from "@/utils/subcontractor";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { encryptId } = useIdParam();
    const { searchConditions } = useTrailerState();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [subcontractors, setSubcontractors] = useState<SubcontractorInfo[]>();
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("trailer");

    const updateRouteRef = useRef(false);
    const selectedTrailerRef = useRef<TrailerInfo>();
    const { isLoading, trailers, pagination, mutate } = useTrailers({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    const subcontractorIds = useMemo(() => getDistinctSubcontractorIds(trailers), [trailers]);
    const fetchSubcontractors = useCallback(async () => {
      const result = await getSubcontractorsByIds(orgId, subcontractorIds);
      setSubcontractors(result);
    }, [orgId, subcontractorIds]);

    useEffect(() => {
      // Set data for Subcontractors State
      if ((subcontractorIds || []).length > 0) {
        fetchSubcontractors();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subcontractorIds]);

    /**
     * Get subcontractor info with format Code - Name
     * @param id Subcontractor id to get
     * @returns Info string with format Code - Name
     */
    const getSubcontractorInfo = useCallback(
      (id: number) => {
        if (subcontractors) {
          const subcontractor = subcontractors.find((item) => equalId(item.id, id));

          if (subcontractor) {
            return joinNonEmptyStrings([subcontractor?.code, subcontractor?.name], " - ");
          }
        }
        return null;
      },
      [subcontractors]
    );

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("trailer.manage"), link: `${orgLink}` },
        { name: t("trailer.feature"), link: `${orgLink}/trailers` },
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
          type: TRAILER_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: TRAILER_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with merchandise type data.
     *
     * @param item - The vehicle data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: TrailerInfo) => () => {
        selectedTrailerRef.current = item;
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
      if (selectedTrailerRef.current?.id && userId) {
        const { error } = await deleteTrailer(
          {
            organizationId: Number(orgId),
            id: Number(selectedTrailerRef.current.id),
            updatedById: userId,
          },
          selectedTrailerRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedTrailerRef.current?.trailerNumber,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedTrailerRef.current?.trailerNumber,
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
      <div>
        <PageHeader
          title={t("trailer.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="trailer" action="new">
              <Button as={Link} href={`${orgLink}/trailers/new`} icon={PlusIcon}>
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
                    label={t("trailer.trailer_number")}
                    actionPlacement="right"
                    {...filterOptions.trailerNumber}
                    onApply={handleFilterApply("trailerNumber")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("trailer.trailer_id_number")}
                    {...filterOptions.idNumber}
                    onApply={handleFilterApply("idNumber")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("trailer.owner")}
                    {...filterOptions.ownerType}
                    onApply={handleFilterApply("ownerType")}
                  />
                </TableCell>
                <TableCell>{t("trailer.trailer_type")}</TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("trailer.cube_meter")}
                    {...filterOptions.cubicMeterCapacity}
                    onApply={handleFilterApply("cubicMeterCapacity")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("trailer.weight_ton")}
                    {...filterOptions.tonPayloadCapacity}
                    onApply={handleFilterApply("tonPayloadCapacity")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("trailer.weight_pallet")}
                    {...filterOptions.palletCapacity}
                    onApply={handleFilterApply("palletCapacity")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("trailer.vehicle")}
                    {...filterOptions.vehicle}
                    onApply={handleFilterApply("vehicle")}
                  />
                </TableCell>
                <TableCell className="w-48">
                  <TableFilterMenu
                    label={t("trailer.status")}
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
              {isLoading && trailers.length === 0 && <SkeletonTableRow rows={10} columns={10} />}

              {/* Empty data */}
              {!isLoading && trailers.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={10} className="px-6 lg:px-8">
                    <EmptyListSection actionLink={`${orgLink}/trailers/new`} />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {trailers.map((item, index) => (
                <TableRow key={item.id} flash={Number(item.id) === flashingId} onFlashed={handleFlashed}>
                  <TableCell>
                    <Authorization
                      resource="trailer"
                      action="detail"
                      fallbackComponent={
                        <span className="text-sm font-medium leading-6 text-gray-900">{item.trailerNumber}</span>
                      }
                    >
                      <Link
                        useDefaultStyle
                        color="secondary"
                        className="cursor-pointer"
                        href={`${orgLink}/trailers/${encryptId(item.id)}`}
                      >
                        {item.trailerNumber}
                      </Link>
                    </Authorization>
                  </TableCell>

                  <TableCell>{item.idNumber || t("common.empty")}</TableCell>

                  <TableCell>
                    {item.ownerType === TrailerOwnerType.ORGANIZATION ? (
                      t("trailer.organization")
                    ) : (
                      <Authorization
                        resource="subcontractor"
                        action="detail"
                        fallbackComponent={
                          <InfoBox
                            label={t("trailer.subcontractor")}
                            subLabel={getSubcontractorInfo(item.subcontractorId)}
                          />
                        }
                      >
                        <Link
                          useDefaultStyle
                          color="secondary"
                          className="flex cursor-pointer flex-col"
                          href={`${orgLink}/subcontractors/${encryptId(item.subcontractorId)}`}
                        >
                          <InfoBox
                            label={t("trailer.subcontractor")}
                            subLabel={getSubcontractorInfo(item.subcontractorId)}
                          />
                        </Link>
                      </Authorization>
                    )}
                  </TableCell>

                  <TableCell>{item.type?.name || t("common.empty")}</TableCell>

                  <TableCell>
                    <NumberLabel value={Number(item.cubicMeterCapacity)} emptyLabel={t("common.empty")} />
                  </TableCell>

                  <TableCell>
                    <NumberLabel value={Number(item.tonPayloadCapacity)} emptyLabel={t("common.empty")} />
                  </TableCell>

                  <TableCell>
                    <NumberLabel value={Number(item.palletCapacity)} emptyLabel={t("common.empty")} />
                  </TableCell>

                  <TableCell>
                    <Authorization
                      resource="vehicle"
                      action="detail"
                      fallbackComponent={
                        <InfoBox
                          label={item.vehicle?.vehicleNumber}
                          subLabel={item.vehicle?.idNumber}
                          emptyLabel={t("common.empty")}
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

                  <TableCell align="left">
                    <Badge
                      label={item.isActive ? t("trailer.status_active") : t("trailer.status_inactive")}
                      color={item.isActive ? "success" : "error"}
                    />
                  </TableCell>

                  <TableCell action>
                    <Authorization
                      resource="trailer"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          trailers.length >= 3 && (trailers.length - 1 === index || trailers.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))
                            ? `${orgLink}/trailers/${encryptId(item.id)}/edit`
                            : ""
                        }
                        copyLink={canNew() ? `${orgLink}/trailers/new?copyId=${encryptId(item.id)}` : ""}
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
          title={t("common.confirmation.delete_title", { name: selectedTrailerRef.current?.trailerNumber })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    );
  },
  {
    resource: "trailer",
    action: "find",
  }
);
