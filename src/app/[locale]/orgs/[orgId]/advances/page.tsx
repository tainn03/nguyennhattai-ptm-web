"use client";

import { PlusIcon } from "@heroicons/react/20/solid";
import { AdvanceStatus, AdvanceType } from "@prisma/client";
import isEmpty from "lodash/isEmpty";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiaSearchSolid } from "react-icons/lia";

import {
  CardContent,
  DateTimeLabel,
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
  CheckboxGroup,
  Combobox,
  DatePicker,
  EmptyListSection,
  MasterActionTable,
  PageHeader,
  ProfileInfo,
} from "@/components/molecules";
import { CheckboxItem } from "@/components/molecules/CheckboxGroup/CheckboxGroup";
import { ComboboxItem } from "@/components/molecules/Combobox/Combobox";
import { SelectItem } from "@/components/molecules/Select/Select";
import { ConfirmModal, FilterStatus, Pagination } from "@/components/organisms";
import { SESSION_FLASHING_ID } from "@/constants/storage";
import {
  useAdvances,
  useDriverOptions,
  useIdParam,
  usePermission,
  useSearchConditions,
  useSubcontractorOptions,
} from "@/hooks";
import { useBreadcrumb, useDispatch, useNotification } from "@/redux/actions";
import { useAdvanceState } from "@/redux/states";
import { ADVANCE_UPDATE_SEARCH_CONDITIONS, ADVANCE_UPDATE_SEARCH_QUERY_STRING } from "@/redux/types";
import { deleteAdvance } from "@/services/client/advance";
import { FilterOptions } from "@/types/filter";
import { AdvanceInfo, DriverInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { addMonths, endOfMonth, startOfMonth } from "@/utils/date";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId, formatCurrency } from "@/utils/number";
import { getItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";

import { AdvanceProcess } from "./components";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const { encryptId } = useIdParam();
    const { searchConditions } = useAdvanceState();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification } = useNotification();

    const [flashingId, setFlashingId] = useState<number>();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useSearchConditions(searchConditions);
    const [internalFilters, setInternalFilters] = useState(filterOptions);
    const { canNew, canEditOwn, canDeleteOwn, canEdit, canDelete } = usePermission("advance");

    const updateRouteRef = useRef(false);
    const selectedAdvanceRef = useRef<AdvanceInfo>();

    const { drivers } = useDriverOptions({ organizationId: orgId });
    const { subcontractors } = useSubcontractorOptions({ organizationId: orgId });

    const { isLoading, advances, pagination, mutate } = useAdvances({
      organizationId: orgId,
      ...getFilterRequest(filterOptions),
    });

    const driverOptions: ComboboxItem[] = useMemo(
      () =>
        drivers.map((item: DriverInfo) => ({
          value: ensureString(item.id),
          label: getFullName(item.firstName, item.lastName),
          subLabel: ensureString(item.vehicle?.vehicleNumber),
        })),
      [drivers]
    );

    const subcontractorOptions: ComboboxItem[] = useMemo(
      () =>
        subcontractors.map((item) => ({
          value: ensureString(item.id),
          label: ensureString(item.code),
          subLabel: ensureString(item.name),
        })),
      [subcontractors]
    );

    useEffect(() => {
      const currentFilterOptions = { ...filterOptions };

      currentFilterOptions.driverId = {
        ...currentFilterOptions.driverId,
        filters: [
          {
            ...currentFilterOptions.driverId.filters[0],
            items: driverOptions,
          },
        ],
      };

      currentFilterOptions.subcontractorId = {
        ...currentFilterOptions.subcontractorId,
        filters: [
          {
            ...currentFilterOptions.subcontractorId.filters[0],
            items: subcontractorOptions,
          },
        ],
      };

      setInternalFilters(currentFilterOptions);
    }, [driverOptions, filterOptions, subcontractorOptions]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("advance.management"), link: orgLink },
        { name: t("advance.title"), link: `${orgLink}/advances` },
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
          type: ADVANCE_UPDATE_SEARCH_CONDITIONS,
          payload: filterOptions,
        });
        dispatch<string>({
          type: ADVANCE_UPDATE_SEARCH_QUERY_STRING,
          payload: queryString,
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Callback function for opening a dialog with advance data.
     *
     * @param item - The advance data to display in the dialog.
     */
    const handleDelete = useCallback(
      (item: AdvanceInfo) => () => {
        selectedAdvanceRef.current = item;
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
     * Gets the display name of an advance item.
     *
     * @param item - The advance item to get the display name of.
     * @returns The display name of the advance item.
     */
    const getDisplayName = useCallback((item?: AdvanceInfo) => {
      if (isEmpty(item)) {
        return "";
      }
      return item.type === AdvanceType.DRIVER
        ? `${item.driver?.lastName ?? ""} ${item.driver?.firstName}`
        : item.subcontractor?.name;
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      const advanceCurrent = selectedAdvanceRef.current;
      if (advanceCurrent?.id && userId) {
        const { error } = await deleteAdvance(
          {
            organizationId: orgId,
            id: Number(advanceCurrent.id),
            updatedById: userId,
          },
          advanceCurrent.updatedAt
        );

        const amount = formatCurrency(ensureString(advanceCurrent?.amount));
        const displayName = getDisplayName(advanceCurrent);
        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: t("advance.display_name_amount", {
                amount: amount,
                name: displayName,
              }),
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: t("advance.display_name_amount", {
                amount: amount,
                name: displayName,
              }),
            }),
          });
        }
      }
      handleDeleteCancel();
      mutate();
    }, [getDisplayName, handleDeleteCancel, mutate, orgId, showNotification, t, userId]);

    /**
     * It updates the internal filters with the new value and, if necessary, adjusts the corresponding date filter.
     *
     * @param {string} columnName - The name of the column that the filter belongs to.
     * @param {Date | string} valueFilterFormat - The new filter value, formatted based on its type.
     * @param {string} keyToUpdate - The key in the internal filters that should be updated.
     */
    const updateFilter = useCallback(
      (
        columnName: string,
        valueFilterFormat: Date | CheckboxItem[] | string,
        keyToUpdate: string,
        optionSelected?: ComboboxItem | SelectItem
      ) => {
        setInternalFilters((prevValue) => {
          const { ...values } = prevValue;
          const newValue: FilterOptions = {};

          // If the current key is the one to update
          Object.keys(values).forEach((key) => {
            let value = values[key];
            if (key === keyToUpdate) {
              value = {
                ...value,
                filters: [
                  {
                    ...value.filters[0],
                    value:
                      key === columnName
                        ? valueFilterFormat
                        : (key === "endDate"
                            ? endOfMonth(valueFilterFormat as Date)
                            : startOfMonth(valueFilterFormat as Date)) || undefined,
                    optionSelected: optionSelected,
                  },
                ],
              };
            }
            newValue[key] = value;
          });
          return newValue;
        });
      },
      []
    );

    /**
     * It updates the internal filters with the new value and, if necessary, adjusts the corresponding date filter.
     *
     * @param {string} columnName - The name of the column that the filter belongs to.
     * @param {string} type - The type of the filter (e.g., "date" or "text").
     * @param {unknown} value - The new filter value.
     * @returns {Function} A function that takes the new filter value and updates the internal filters.
     */
    const handleFilterChange = useCallback(
      (columnName: string, type: string) => (value: unknown) => {
        updateRouteRef.current = true;

        let valueFilterFormat: Date | CheckboxItem[] | string;
        let optionSelected: ComboboxItem | SelectItem | undefined = undefined;
        switch (type) {
          case "checkbox":
            valueFilterFormat = value as CheckboxItem[];
            break;
          case "date":
            valueFilterFormat = value as Date;
            break;
          case "text":
            valueFilterFormat = value as string;
            break;
          case "combobox":
            valueFilterFormat = value as string;
            optionSelected = internalFilters[columnName].filters[0]?.items?.find(
              (option) => ensureString(option.value) === valueFilterFormat
            ) as ComboboxItem;

            break;
          default:
            valueFilterFormat = "";
            break;
        }

        // Update the filter for the current column
        updateFilter(columnName, valueFilterFormat, columnName, optionSelected);

        // If the filter is for the start date, adjust the end date filter
        if (columnName === "startDate") {
          updateFilter(columnName, valueFilterFormat, "endDate");
        }
      },

      [internalFilters, updateFilter]
    );

    useEffect(() => {
      const startDate = internalFilters.startDate.filters[0].value as Date;
      const endDate = internalFilters.endDate.filters[0].value as Date;
      if (!endDate || !startDate) {
        updateFilter("startDate", startOfMonth(new Date())!, "startDate");
        updateFilter("endDate", endOfMonth(new Date())!, "endDate");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [internalFilters.endDate.filters, internalFilters.startDate.filters]);

    /**
     * This function handles the input event for the end date input field.
     * @param {ChangeEvent<HTMLInputElement>} event - The input event from the end date input field.
     */
    const handleInputEndDate = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      event.preventDefault();
    }, []);

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
     * Callback function for handling changes in filter options.
     *
     * @param options - The new filter options to set.
     */
    const handleFilterStatusChange = useCallback((options: FilterOptions) => {
      updateRouteRef.current = true;
      setFilterOptions(options);
      setInternalFilters(options);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Apply the internal filters to the actual filter options.
     * This function is called when the user finishes setting up the filters and clicks on the "Apply" button.
     */
    const handleApplyFilter = useCallback(() => {
      updateRouteRef.current = true;
      setFilterOptions(internalFilters);
    }, [internalFilters, setFilterOptions]);

    /**
     * Callback function for handling the end of a flashing event.
     * It clears the currently flashing ID.
     */
    const handleFlashed = useCallback(() => {
      setFlashingId(undefined);
    }, []);

    const editLink = useCallback(
      (item: AdvanceInfo) => {
        if (canEdit() || (canEditOwn() && equalId(item.createdByUser?.id, userId))) {
          if (item.status !== AdvanceStatus.REJECTED) {
            return `advances/${encryptId(item.id)}/edit`;
          }
        }

        return;
      },
      [canEdit, canEditOwn, encryptId, userId]
    );

    return (
      <>
        <PageHeader
          title={t("advance.title")}
          description={
            <>
              <CardContent padding={false} className="lg:min-w-[48rem]">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <DatePicker
                      label={t("advance.advance_from")}
                      selected={internalFilters.startDate.filters[0].value as Date}
                      onChange={handleFilterChange("startDate", "date")}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <DatePicker
                      label={t("advance.advance_to")}
                      selected={internalFilters.endDate.filters[0].value as Date}
                      onChange={handleFilterChange("endDate", "date")}
                      minDate={internalFilters.startDate.filters[0].value as Date}
                      maxDate={addMonths(internalFilters.startDate.filters[0].value as Date, 1)}
                      onChangeRaw={handleInputEndDate}
                      allowInput={false}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Combobox
                      label={t("advance.driver")}
                      placeholder={t("advance.all")}
                      value={(internalFilters.driverId.filters[0].optionSelected?.value as string) ?? null}
                      onChange={handleFilterChange("driverId", "combobox")}
                      items={internalFilters.driverId.filters[0].items ?? []}
                      emptyLabel={t("advance.all")}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Combobox
                      label={t("advance.subcontractor")}
                      placeholder={t("advance.all")}
                      value={(internalFilters.subcontractorId.filters[0].optionSelected?.value as string) ?? null}
                      onChange={handleFilterChange("subcontractorId", "combobox")}
                      items={internalFilters.subcontractorId.filters[0].items ?? []}
                      emptyLabel={t("advance.all")}
                    />
                  </div>
                  <div className="col-span-full flex justify-between gap-4">
                    <CheckboxGroup
                      name="statusOptions"
                      label={t("advance.status")}
                      className="[&>fieldset>div]:space-y-0"
                      items={((internalFilters.statusOptions.filters[0].value || []) as ComboboxItem[]).map((item) => ({
                        ...item,
                        ...(item.subLabel && { subLabel: t(item.subLabel) }),
                        label: item.label && t(item.label),
                      }))}
                      onChange={handleFilterChange("statusOptions", "checkbox")}
                    />
                    <div className="flex items-end justify-end">
                      <Button icon={LiaSearchSolid} onClick={handleApplyFilter}>
                        {t("report.drivers.search")}
                      </Button>
                    </div>
                  </div>
                  <div className="col-span-full">
                    <FilterStatus options={filterOptions} onChange={handleFilterStatusChange} />
                  </div>
                </div>
              </CardContent>
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="advance" action="new">
              <Button as={Link} href={`${orgLink}/advances/new`} icon={PlusIcon}>
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
                <TableCell>{t("advance.name")}</TableCell>
                <TableCell align="right">{t("advance.amount")}</TableCell>
                <TableCell align="right">{t("advance.approved_amount")}</TableCell>
                <TableCell>{t("advance.reason_advance")}</TableCell>
                <TableCell align="center" nowrap className="w-fit">
                  {t("advance.status")}
                </TableCell>
                <TableCell nowrap className="w-fit">
                  {t("advance.status_paid")}
                </TableCell>
                <TableCell nowrap className="w-fit">
                  {t("common.updated_info")}
                </TableCell>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && advances.length === 0 && (
                <SkeletonTableRow rows={10} columns={8} profileColumnIndexes={[0, 5, 6]} />
              )}

              {/* Empty data */}
              {!isLoading && advances.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={8} className="px-6 lg:px-8">
                    <EmptyListSection
                      actionLink={canNew() ? `${orgLink}/advances/new` : undefined}
                      description={canNew() ? undefined : t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {advances.map((item, index) => (
                <TableRow key={item.id} flash={Number(item.id) === flashingId} onFlashed={handleFlashed}>
                  <TableCell>
                    <Authorization
                      resource="advance"
                      action="detail"
                      fallbackComponent={
                        <InfoBox
                          label={getDisplayName(item)}
                          subLabel={
                            <>
                              {(item.type === AdvanceType.DRIVER && item.driver?.phoneNumber) ??
                                item.driver?.email ??
                                t("common.empty")}
                              {(item.type === AdvanceType.SUBCONTRACTOR && item.subcontractor?.phoneNumber) ??
                                item.subcontractor?.email ??
                                t("common.empty")}
                            </>
                          }
                        />
                      }
                    >
                      <InfoBox
                        as={Link}
                        label={getDisplayName(item)}
                        emptyLabel={t("common.empty")}
                        href={`${orgLink}/advances/${encryptId(item.id)}`}
                        subLabel={
                          <>
                            {(item.type === AdvanceType.DRIVER && item.driver?.phoneNumber) ?? item.driver?.email}
                            {(item.type === AdvanceType.SUBCONTRACTOR && item.subcontractor?.phoneNumber) ??
                              item.subcontractor?.email}
                          </>
                        }
                      />
                    </Authorization>
                  </TableCell>
                  <TableCell align="right">
                    <NumberLabel value={item.amount} type="currency" emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell align="right">
                    <NumberLabel value={item.approvedAmount} type="currency" emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell title={item.reason || t("common.empty")}>
                    <div className="w-56 truncate">{item.reason || t("common.empty")}</div>
                  </TableCell>
                  <TableCell align="center" nowrap>
                    <AdvanceProcess currentStatus={item.status} />
                  </TableCell>
                  <TableCell nowrap>
                    <ProfileInfo
                      user={item.paymentBy}
                      description={<DateTimeLabel value={ensureString(item.paymentDate)} type="date" />}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell nowrap>
                    <ProfileInfo
                      user={item.updatedByUser}
                      description={<DateTimeLabel value={item.updatedAt} type="datetime" />}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell action>
                    <Authorization
                      resource="advance"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(item.createdByUser?.id, userId)) ||
                        (canDeleteOwn() && equalId(item.createdByUser?.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          advances.length >= 3 && (advances.length - 1 === index || advances.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={editLink(item)}
                        copyLink={canNew() ? `advances/new?copyId=${encryptId(item.id)}` : ""}
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
          title={t("common.confirmation.delete_title", {
            name: t("advance.display_name_amount", {
              amount: selectedAdvanceRef.current?.amount,
              name: getDisplayName(selectedAdvanceRef.current),
            }),
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
    resource: "advance",
    action: "find",
  }
);
