"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next-intl/client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import { deleteWorkflow } from "@/actions/workflow";
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
import { useIdParam, usePermission, useSearchConditions, useWorkflows } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { workFlowAtom } from "@/states";
import { HttpStatusCode } from "@/types/api";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { WorkflowInfo } from "@/types/strapi";
import { withOrg } from "@/utils/client";
import { getFilterRequest, getQueryString } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getItemString } from "@/utils/storage";
import { cn } from "@/utils/twcn";

import { Stepper } from "./components";

const styleTableCell = "text-sm text-gray-500 whitespace-nowrap";

export default withOrg(
  ({ orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();

    const { showNotification } = useNotification();
    const { encryptId } = useIdParam();
    const [flashingId, setFlashingId] = useState<number>();
    const { setBreadcrumb } = useBreadcrumb();
    const [{ workFlowConditions }, setWorkFlowState] = useAtom(workFlowAtom);
    const [filterOptions, setFilterOptions] = useSearchConditions(workFlowConditions);
    const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("workflow");

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInfo | null>(null);
    const updateRouteRef = useRef(false);

    const { workflows, isLoading, pagination, mutate } = useWorkflows({ ...getFilterRequest(filterOptions) });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("workflow.title"), link: `${orgLink}/settings/workflows` },
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
        setWorkFlowState((prev) => ({
          ...prev,
          workFlowSearchQueryString: queryString,
          workFlowConditions: filterOptions,
        }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterOptions]);

    /**
     * Updates the current page in the pagination filter options.
     * @param page - The new page number to set in the pagination options.
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
     * Updates the filter options to change the page size and resets the current page to 1.
     * @param pageSize - The new number of items to display per page.
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
     * Handles the application of filters and sorting for a specific column.
     * Updates the filter options state and resets the pagination to the first page.
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
    const handleFilterChange = useCallback((options: FilterOptions) => {
      updateRouteRef.current = true;
      setFilterOptions(options);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Opens the delete confirmation dialog for a specific workflow item.
     * @param item - The workflow item to be selected for deletion.
     * @returns A function that sets the selected workflow and opens the delete confirmation dialog.
     */
    const handleOpenDeleteConfirm = useCallback(
      (item: WorkflowInfo) => () => {
        setSelectedWorkflow(item);
        setIsDeleteConfirmOpen(true);
      },
      []
    );

    /**
     * Closes the delete confirmation dialog by setting the state variable
     * `isDeleteConfirmOpen` to `false`.
     */
    const handleCloseDeleteConfirm = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, []);

    /**
     * Deletes the selected workflow item after confirming the action.
     * Displays a notification based on the success or failure of the deletion.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (selectedWorkflow?.id && userId) {
        const { status } = await deleteWorkflow({
          entity: {
            id: selectedWorkflow.id,
            updatedById: userId,
          },
          lastUpdatedAt: selectedWorkflow.updatedAt,
        });

        if (status !== HttpStatusCode.Ok) {
          if (status === HttpStatusCode.Exclusive) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: selectedWorkflow?.name }),
            });
            handleCloseDeleteConfirm();
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: selectedWorkflow?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedWorkflow?.name,
            }),
          });
          await mutate();
          handleCloseDeleteConfirm();
        }
      }
    }, [
      handleCloseDeleteConfirm,
      mutate,
      selectedWorkflow?.id,
      selectedWorkflow?.name,
      selectedWorkflow?.updatedAt,
      showNotification,
      t,
      userId,
    ]);

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
          title={t("workflow.title")}
          description={
            <>
              <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </>
          }
          actionHorizontal
          actionComponent={
            <Authorization resource="workflow" action="new">
              <Button as={Link} href={`${orgLink}/settings/workflows/new`} icon={PlusIcon}>
                {t("common.new")}
              </Button>
            </Authorization>
          }
        />

        <TableContainer fullHeight horizontalScroll>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="right"
                    label={t("components.workflow.name")}
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="center"
                    label={t("components.workflow.status")}
                    {...filterOptions.status}
                    onApply={handleFilterApply("status")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("components.workflow.created_by")}
                    {...filterOptions.createdAt}
                    onApply={handleFilterApply("createdAt")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("components.workflow.updated_by")}
                    {...filterOptions.updatedAt}
                    actionPlacement="left"
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
              {isLoading && workflows.length === 0 && <SkeletonTableRow rows={5} columns={6} />}

              {/* Empty data */}
              {!isLoading && workflows.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={6} className="px-6 lg:px-8">
                    <EmptyListSection
                      actionLink={canNew() ? `${orgLink}/settings/workflows/new` : undefined}
                      description={t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {(workflows || []).map((workflow: WorkflowInfo, index: number) => (
                <Disclosure as={Fragment} key={`workflow-${workflow.id}`}>
                  {({ open }) => (
                    <>
                      <TableRow key={workflow.id} flash={equalId(workflow.id, flashingId)} onFlashed={handleFlashed}>
                        <Disclosure.Button as={Fragment}>
                          <TableCell action className={cn({ "w-fit bg-blue-50": open })}>
                            <span>
                              {open ? (
                                <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                              ) : (
                                <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                              )}
                            </span>
                          </TableCell>
                        </Disclosure.Button>
                        <Disclosure.Button as="td" className={cn(styleTableCell, { "bg-blue-50": open })}>
                          <Authorization resource="workflow" action="detail" fallbackComponent={workflow.name}>
                            <Link
                              useDefaultStyle
                              color="secondary"
                              href={`${orgLink}/settings/workflows/${encryptId(workflow.id)}`}
                            >
                              {workflow.name}
                            </Link>
                          </Authorization>
                        </Disclosure.Button>
                        <Disclosure.Button as="td" className={cn(styleTableCell, { "bg-blue-50": open })}>
                          <Badge
                            label={
                              workflow.isActive ? t("gas_station.status_active") : t("gas_station.status_inactive")
                            }
                            color={workflow.isActive ? "success" : "error"}
                          />
                        </Disclosure.Button>
                        <Disclosure.Button as="td" className={cn(styleTableCell, { "bg-blue-50": open })}>
                          <ProfileInfo
                            user={workflow.createdByUser}
                            description={<DateTimeLabel value={workflow.createdAt} type="datetime" />}
                          />
                        </Disclosure.Button>
                        <Disclosure.Button as="td" className={cn(styleTableCell, { "bg-blue-50": open })}>
                          <ProfileInfo
                            user={workflow.updatedByUser}
                            description={<DateTimeLabel value={workflow.updatedAt} type="datetime" />}
                          />
                        </Disclosure.Button>
                        <TableCell action className={cn({ "bg-blue-50": open })}>
                          <MasterActionTable
                            actionPlacement={
                              workflows.length >= 3 &&
                              (workflows.length - 1 === index || workflows.length - 2 === index)
                                ? "start"
                                : "end"
                            }
                            editLink={
                              canEdit() || (canEditOwn() && equalId(workflow.createdByUser.id, userId))
                                ? `${orgLink}/settings/workflows/${encryptId(workflow.id)}/edit`
                                : undefined
                            }
                            copyLink={
                              canNew()
                                ? `${orgLink}/settings/workflows/new?copyId=${encryptId(workflow.id)}`
                                : undefined
                            }
                            onDelete={
                              !workflow.isSystem &&
                              (canDelete() || (canDeleteOwn() && equalId(workflow.createdByUser.id, userId)))
                                ? handleOpenDeleteConfirm(workflow)
                                : undefined
                            }
                          />
                        </TableCell>
                      </TableRow>
                      <Disclosure.Panel as="tr">
                        <TableCell colSpan={6} className="overflow-x-auto px-0 py-0">
                          <Stepper data={workflow.driverReports} />
                        </TableCell>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {(pagination?.pageCount || 0) > 0 && (
          <Pagination
            showBorderTop={false}
            className="flex-1"
            showPageSizeOptions
            page={pagination?.page}
            total={pagination?.total}
            pageSize={pagination?.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}

        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="question"
          title={t("common.confirmation.delete_title", { name: selectedWorkflow?.name })}
          message={t("common.confirmation.delete_message")}
          onConfirm={handleDeleteConfirm}
          onClose={handleCloseDeleteConfirm}
          onCancel={handleCloseDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "workflow",
    action: "find",
  }
);
