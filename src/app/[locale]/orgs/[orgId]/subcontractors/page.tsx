"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { useCallback, useEffect, useRef, useState } from "react";

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
import { ConfirmModal, FilterStatus, Pagination, VehicleListOfSubcontractor } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import { useIdParam, usePermission, useSearchConditions, useSubcontractors } from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useSubcontractorState } from "@/redux/states";
import { SUBCONTRACTOR_UPDATE_SEARCH_CONDITIONS, SUBCONTRACTOR_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { deleteSubcontractor } from "@/services/client/subcontractor";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { SubcontractorInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { encryptId } = useIdParam();
    const { searchConditions } = useSubcontractorState();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();
    const [flashingId, setFlashingId] = useState<number>();
    const [filterOptionsSubcontractor, setFilterOptionsSubcontractor] = useSearchConditions(searchConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("subcontractor");
    const { canFind: canFindVehicle } = usePermission("vehicle");
    const [subcontractorId, setSubcontractorId] = useState(0);
    const [subcontractorName, setSubcontractorName] = useState("");
    const [isDeleteConfirmOpenSubcontractor, setIsDeleteConfirmOpenSubcontractor] = useState(false);

    const updateRouteRef = useRef(false);
    const selectedSubcontractorRef = useRef<SubcontractorInfo>();

    const { isLoading, subcontractors, pagination, mutate } = useSubcontractors({
      organizationId: orgId,
      ...getFilterRequest(filterOptionsSubcontractor),
    });

    useEffect(() => {
      if (subcontractors.length > 0) {
        setSubcontractorId(Number(subcontractors[0].id));
        setSubcontractorName(ensureString(subcontractors[0].name));
      } else {
        setSubcontractorId(0);
        setSubcontractorName("");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subcontractors]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("subcontractor.management"), link: orgLink },
        { name: t("subcontractor.title"), link: `${orgLink}/subcontractors` },
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
        const queryString = getQueryString(filterOptionsSubcontractor);
        router.push(`${pathname}${queryString}`);
        dispatch<FilterOptions>({
          type: SUBCONTRACTOR_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptionsSubcontractor,
        });
        dispatch<string>({
          type: SUBCONTRACTOR_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptionsSubcontractor]);

    /**
     * Handle the deletion of a subcontractor.
     *
     * @param {SubcontractorInfo} item - The subcontractor to be deleted.
     */
    const handleDeleteSubcontractor = useCallback(
      (item: SubcontractorInfo) => () => {
        selectedSubcontractorRef.current = item;
        setIsDeleteConfirmOpenSubcontractor(true);
      },
      []
    );

    /**
     * Callback function for canceling and closing a dialog.
     */
    const handleDeleteCancelSubcontractor = useCallback(() => {
      setIsDeleteConfirmOpenSubcontractor(false);
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirmSubcontractor = useCallback(async () => {
      if (selectedSubcontractorRef.current?.id && userId) {
        const { error } = await deleteSubcontractor(
          {
            organizationId: orgId,
            id: Number(selectedSubcontractorRef.current.id),
            updatedById: userId,
            userId: selectedSubcontractorRef.current?.user?.id ?? null,
          },
          selectedSubcontractorRef.current.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedSubcontractorRef.current?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedSubcontractorRef.current?.name,
            }),
          });
        }
      }
      handleDeleteCancelSubcontractor();
      mutate();
    }, [handleDeleteCancelSubcontractor, mutate, orgId, showNotification, t, userId]);

    /**
     * Callback function for handling page changes.
     *
     * @param page - The new page number to be set in the pagination state.
     */
    const handlePageChangeSubcontractor = useCallback(
      (page: number) => {
        updateRouteRef.current = true;
        setFilterOptionsSubcontractor((prevValue) => ({
          ...prevValue,
          pagination: {
            ...prevValue.pagination,
            page,
          },
        }));
      },
      [setFilterOptionsSubcontractor]
    );

    /**
     * Callback function for handling changes in the page size.
     *
     * @param pageSize - The new page size to be set in the pagination state.
     */
    const handlePageSizeChange = useCallback(
      (pageSize: number) => {
        updateRouteRef.current = true;
        setFilterOptionsSubcontractor((prevValue) => ({
          ...prevValue,
          pagination: {
            ...prevValue.pagination,
            page: 1,
            pageSize,
          },
        }));
      },
      [setFilterOptionsSubcontractor]
    );

    /**
     * Callback function for applying filters to a specific column and updating filter options.
     *
     * @param columnName - The name or identifier of the column to which the filters should be applied.
     * @param filters - An array of filter properties to apply to the column.
     * @param sortType - An optional sorting order ("asc" or "desc") to apply to the column.
     */
    const handleFilterApplySubcontractor = useCallback(
      (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
        updateRouteRef.current = true;
        setFilterOptionsSubcontractor((prevValue) => {
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
    const handleFilterChangeSubcontractor = useCallback((options: FilterOptions) => {
      updateRouteRef.current = true;
      setFilterOptionsSubcontractor(options);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Callback function for handling the end of a flashing event.
     * It clears the currently flashing ID.
     */
    const handleFlashed = useCallback(() => {
      setFlashingId(undefined);
    }, []);

    /**
     * Handles the change of the selected subcontractor. This function updates the state
     * with the selected subcontractor's ID and name, then triggers a re-fetch of the vehicle data.
     * @param subcontractor - The subcontractor to select.
     */
    const handleSelectItem = useCallback(
      (subcontractor: SubcontractorInfo) => () => {
        setSubcontractorId(Number(subcontractor.id));
        setSubcontractorName(ensureString(subcontractor.name));
      },
      []
    );

    return (
      <>
        <PageHeader
          title={t("subcontractor.title")}
          actionHorizontal
          actionComponent={
            <Authorization resource="subcontractor" action="new">
              <Button as={Link} href={`${orgLink}/subcontractors/new`} icon={PlusIcon}>
                {t("common.new")}
              </Button>
            </Authorization>
          }
          description={
            <>
              <QuickSearch
                {...filterOptionsSubcontractor.keywords}
                onSearch={handleFilterApplySubcontractor("keywords")}
              />
              <FilterStatus options={filterOptionsSubcontractor} onChange={handleFilterChangeSubcontractor} />
            </>
          }
        />

        <div className={canFindVehicle() ? "grid h-full grid-cols-1 gap-4 xl:grid-cols-3" : "h-full"}>
          <div className={"relative flex space-x-3 rounded-lg" + canFindVehicle() ? " xl:col-span-2" : ""}>
            <div className="min-w-full">
              <div>
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
                        onPageChange={handlePageChangeSubcontractor}
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
                            label={t("subcontractor.code")}
                            actionPlacement="right"
                            {...filterOptionsSubcontractor.code}
                            onApply={handleFilterApplySubcontractor("code")}
                          />
                        </TableCell>

                        <TableCell>
                          <TableFilterMenu
                            label={t("subcontractor.name")}
                            {...filterOptionsSubcontractor.name}
                            onApply={handleFilterApplySubcontractor("name")}
                          />
                        </TableCell>

                        <TableCell>
                          <TableFilterMenu
                            label={t("subcontractor.phone")}
                            {...filterOptionsSubcontractor.phoneNumber}
                            onApply={handleFilterApplySubcontractor("phoneNumber")}
                          />
                        </TableCell>

                        <TableCell>
                          <TableFilterMenu
                            label={t("subcontractor.tax_code")}
                            {...filterOptionsSubcontractor.taxCode}
                            onApply={handleFilterApplySubcontractor("taxCode")}
                          />
                        </TableCell>
                        <TableCell className="w-48">
                          <TableFilterMenu
                            label={t("subcontractor.status")}
                            actionPlacement="left"
                            {...filterOptionsSubcontractor.isActive}
                            onApply={handleFilterApplySubcontractor("isActive")}
                          />
                        </TableCell>

                        <TableCell action>
                          {/* <span className="sr-only">Actions</span> */}
                          <span className="sr-only">{t("common.actions")}</span>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Loading skeleton */}
                      {isLoading && subcontractors.length === 0 && <SkeletonTableRow rows={10} columns={6} />}

                      {/* Empty data */}
                      {!isLoading && subcontractors.length === 0 && (
                        <TableRow hover={false} className="mx-auto max-w-lg">
                          <TableCell colSpan={6} className="px-6 lg:px-8">
                            <EmptyListSection actionLink={`${orgLink}/subcontractors/new`} />
                          </TableCell>
                        </TableRow>
                      )}

                      {subcontractors.map((item, index) => (
                        <TableRow
                          key={item.id}
                          flash={Number(item.id) === flashingId}
                          onFlashed={handleFlashed}
                          onClick={handleSelectItem(item)}
                          highlight={Number(item.id) === subcontractorId}
                        >
                          <TableCell>{item.code}</TableCell>
                          <TableCell>
                            <Authorization
                              resource="subcontractor"
                              action="detail"
                              fallbackComponent={<span>{item.name || t("common.empty")}</span>}
                            >
                              <Link
                                useDefaultStyle
                                color="secondary"
                                className="cursor-pointer"
                                href={`${orgLink}/subcontractors/${encryptId(item.id)}`}
                              >
                                {item.name || t("common.empty")}
                              </Link>
                            </Authorization>
                          </TableCell>

                          <TableCell>{item.phoneNumber || t("common.empty")}</TableCell>
                          <TableCell>{item.taxCode || t("common.empty")}</TableCell>

                          <TableCell align="left">
                            <Badge
                              label={
                                item.isActive ? t("subcontractor.status_active") : t("subcontractor.status_inactive")
                              }
                              color={item.isActive ? "success" : "error"}
                            />
                          </TableCell>

                          <TableCell action>
                            <Authorization
                              resource="subcontractor"
                              action={["edit", "new", "delete"]}
                              type="oneOf"
                              alwaysAuthorized={
                                (canEditOwn() && equalId(item.createdByUser.id, userId)) ||
                                (canDeleteOwn() && equalId(item.createdByUser.id, userId))
                              }
                            >
                              <MasterActionTable
                                actionPlacement={
                                  subcontractors.length >= 3 &&
                                  (subcontractors.length - 1 === index || subcontractors.length - 2 === index)
                                    ? "start"
                                    : "end"
                                }
                                editLink={
                                  canEdit() || (canEditOwn() && equalId(item.createdByUser.id, userId))
                                    ? `${orgLink}/subcontractors/${encryptId(item.id)}/edit`
                                    : ""
                                }
                                copyLink={canNew() ? `${orgLink}/subcontractors/new?copyId=${encryptId(item.id)}` : ""}
                                onDelete={
                                  canDelete() || (canDeleteOwn() && equalId(item.createdByUser.id, userId))
                                    ? handleDeleteSubcontractor(item)
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
              </div>
            </div>
          </div>
          <Authorization resource="vehicle" action="find">
            <div className="flex flex-col xl:col-span-1">
              <VehicleListOfSubcontractor
                orgLink={orgLink}
                orgId={orgId}
                userId={userId}
                subcontractorName={subcontractorName}
                subcontractorId={subcontractorId}
              />
            </div>
          </Authorization>
        </div>

        <ConfirmModal
          open={isDeleteConfirmOpenSubcontractor}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: selectedSubcontractorRef.current?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancelSubcontractor}
          onCancel={handleDeleteCancelSubcontractor}
          onConfirm={handleDeleteConfirmSubcontractor}
        />
      </>
    );
  },
  {
    resource: "subcontractor",
    action: "find",
  }
);
