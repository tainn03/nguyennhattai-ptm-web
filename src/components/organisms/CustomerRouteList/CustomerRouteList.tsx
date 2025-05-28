"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Card, Link, NumberLabel, Spinner, Table, TableBody, TableCell, TableHead, TableRow } from "@/components/atoms";
import { Authorization, EmptyListSection, MasterActionTable } from "@/components/molecules";
import { ConfirmModal, Pagination } from "@/components/organisms";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useIdParam, usePermission, useRouteList } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { deleteRoute } from "@/services/client/route";
import { RouteInfo } from "@/types/strapi";
import { getFilterRequest } from "@/utils/filter";
import { equalId } from "@/utils/number";

export type RouteListOfCustomerProps = {
  orgLink: string;
  orgId: number;
  userId: number;
  customerId: number;
  customerName: string;
};
const searchConditionsRoute = {
  pagination: {
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    defaultSort: "updatedAt:desc",
    filters: [],
  },
};

const CustomerRouteList = ({ orgLink, orgId, userId, customerId, customerName }: RouteListOfCustomerProps) => {
  const t = useTranslations();
  const { showNotification } = useNotification();
  const { encryptId } = useIdParam();
  const [filterOptionsRoute, setFilterOptionsRoute] = useState(searchConditionsRoute);
  const [isDeleteConfirmOpenRoute, setIsDeleteConfirmOpenRoute] = useState(false);
  const { canNew, canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("customer-route");

  const selectedRouteRef = useRef<RouteInfo>();

  const { isLoading, routes, pagination, mutate } = useRouteList({
    customerId,
    organizationId: orgId,
    ...getFilterRequest(filterOptionsRoute),
  });

  /**
   * Handles a change in the current page for the route list. This function updates the filter options
   * for the route list, setting the page to the new page number.
   * @param page - The new page number.
   */
  const handlePageChangeRoute = useCallback(
    (page: number) => {
      setFilterOptionsRoute((prevValue) => ({
        ...prevValue,
        pagination: {
          ...prevValue.pagination,
          page,
        },
      }));
    },
    [setFilterOptionsRoute]
  );

  /**
   * Handles a change in the page size for the route list. This function updates the filter options
   * for the route list, setting the page to the first page and the new page size.
   * @param pageSize - The new page size.
   */
  const handlePageSizeChangeRoute = useCallback(
    (pageSize: number) => {
      setFilterOptionsRoute((prevValue) => ({
        ...prevValue,
        pagination: {
          ...prevValue.pagination,
          page: 1,
          pageSize,
        },
      }));
    },
    [setFilterOptionsRoute]
  );

  /**
   * Reset page index to 1 when the customer ID changes.
   */
  useEffect(() => {
    handlePageChangeRoute(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  /**
   * Callback function for canceling and closing a dialog.
   */
  const handleDeleteCancelRoute = useCallback(() => {
    setIsDeleteConfirmOpenRoute(false);
  }, []);

  /**
   * Handles the initiation of the route deletion process by setting the selected route,
   * and then opens the confirmation dialog to confirm the deletion.
   * @param item - The route information to be deleted.
   */
  const handleDeleteRoute = useCallback(
    (item: RouteInfo) => () => {
      selectedRouteRef.current = item;
      setIsDeleteConfirmOpenRoute(true);
    },
    []
  );

  /**
   * Handles the confirmation of route deletion. It sends a request to delete the selected route,
   * shows a success or error notification, and then cancels the delete operation. Afterward, it triggers
   * a data mutation to reflect the changes in the user interface.
   */
  const handleConfirmDeleteRoute = useCallback(async () => {
    if (selectedRouteRef.current?.id && userId) {
      const { error } = await deleteRoute(
        {
          organizationId: orgId,
          id: Number(selectedRouteRef.current.id),
          updatedById: userId,
        },
        selectedRouteRef.current.updatedAt
      );

      if (error) {
        showNotification({
          color: "error",
          title: t("common.message.delete_error_title"),
          message: t("common.message.delete_error_message", {
            name: selectedRouteRef.current?.name,
          }),
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.delete_success_title"),
          message: t("common.message.delete_success_message", {
            name: selectedRouteRef.current?.name,
          }),
        });
      }
    }
    handleDeleteCancelRoute();
    mutate();
  }, [handleDeleteCancelRoute, mutate, orgId, showNotification, t, userId]);

  return (
    <>
      <Card className="h-full !overflow-auto">
        <div className="min-w-full">
          <Table className="max-w-lg [&_td]:py-[7px]">
            <TableHead className="border-gray-200 bg-gray-50">
              <TableCell colSpan={2}>
                <div className="-ml-2 -mt-2 flex flex-wrap items-baseline">
                  <h3 className="ml-2 mt-1 text-base font-semibold leading-6 text-gray-900">
                    {t("customer.route_list")}
                  </h3>
                  <p className="ml-2 mt-1 truncate text-sm font-normal text-gray-600">{customerName}</p>
                </div>
              </TableCell>
              <TableCell action>
                <span className="sr-only">{t("common.actions")}</span>
              </TableCell>
            </TableHead>
            <TableBody>
              {/* Empty state and empty customerId */}
              {!isLoading && routes.length === 0 && customerId === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={3} className="px-6 lg:px-8">
                    <EmptyListSection description=" " />
                  </TableCell>
                </TableRow>
              )}

              {/* Empty state */}
              {!isLoading && routes.length === 0 && customerId !== 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={3} className="px-6 lg:px-8">
                    <EmptyListSection
                      actionLink={canNew() ? `${orgLink}/customers/${encryptId(customerId)}/routes/new` : undefined}
                      description={canNew() ? undefined : t("common.empty_list")}
                    />
                  </TableCell>
                </TableRow>
              )}
              {/* Data list */}
              {routes.map((route, index) => (
                <TableRow key={index} className="max-h-[60px]">
                  <TableCell className="max-w-[180px]">
                    <div>
                      <div className="flex items-start gap-x-3">
                        <p className="flex max-w-full gap-3 text-sm font-semibold leading-6 text-gray-900">
                          <Authorization
                            resource="customer-route"
                            action="detail"
                            alwaysAuthorized={canEditOwn() && equalId(route.createdByUser?.id, userId)}
                            fallbackComponent={
                              <span className="text-sm font-medium leading-6 text-gray-900">{route.code}</span>
                            }
                          >
                            <Link
                              useDefaultStyle
                              color="secondary"
                              className="cursor-pointer truncate"
                              href={`${orgLink}/customers/${encryptId(customerId)}/routes/${encryptId(route.id)}`}
                            >
                              {route.code}
                            </Link>
                          </Authorization>
                          {route.distance && (
                            <p className="mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset">
                              <NumberLabel
                                value={Number(route.distance)}
                                emptyLabel={t("common.empty")}
                                unit={t("common.unit.kilometer").toLowerCase()}
                              />
                            </p>
                          )}
                        </p>
                      </div>

                      {route.price && (
                        <div className="flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                          <p className="truncate">
                            {t("customer.price")}
                            <NumberLabel value={Number(route.price)} emptyLabel={t("common.empty")} type="currency" />
                          </p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[140px] !pr-0">
                    <div className="flex grow flex-col items-end">
                      <div className="flex max-w-full items-start justify-end gap-x-3">
                        <Authorization
                          resource="customer-route"
                          action="detail"
                          fallbackComponent={<span>{route.name}</span>}
                        >
                          <Link
                            useDefaultStyle
                            color="secondary"
                            className="cursor-pointer truncate"
                            href={`${orgLink}/customers/${encryptId(customerId)}/routes/${encryptId(route.id)}`}
                          >
                            {route.name}
                          </Link>
                        </Authorization>
                      </div>

                      <div className="flex items-end gap-x-2 text-xs leading-5 text-gray-500">
                        <p className="flex gap-3 truncate">
                          {(route?.bridgeToll || route?.driverCost || route?.subcontractorCost || route?.otherCost) && (
                            <span>
                              {t("customer.driver_cost")}
                              <NumberLabel
                                value={Number(route?.driverCost)}
                                emptyLabel={t("common.empty")}
                                type="currency"
                              />
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[10px] !px-0" action>
                    <Authorization
                      resource="customer-route"
                      action={["edit", "new", "delete"]}
                      type="oneOf"
                      alwaysAuthorized={
                        (canEditOwn() && equalId(route.createdByUser?.id, userId)) ||
                        (canDeleteOwn() && equalId(route.createdByUser?.id, userId))
                      }
                    >
                      <MasterActionTable
                        actionPlacement={
                          routes.length >= 3 && (routes.length - 1 === index || routes.length - 2 === index)
                            ? "start"
                            : "end"
                        }
                        editLink={
                          canEdit() || (canEditOwn() && equalId(route.createdByUser?.id, userId))
                            ? `customers/${encryptId(customerId)}/routes/${encryptId(route.id)}/edit`
                            : ""
                        }
                        copyLink={
                          canNew() ? `customers/${encryptId(customerId)}/routes/new?copyId=${encryptId(route.id)}` : ""
                        }
                        onDelete={
                          canDelete() || (canDeleteOwn() && equalId(route.createdByUser?.id, userId))
                            ? handleDeleteRoute(route)
                            : undefined
                        }
                      />
                    </Authorization>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Loading spinner */}
          {isLoading && routes.length === 0 && (
            <div className="mx-auto my-6 flex max-w-lg justify-center text-center">
              <Spinner size="large" />
            </div>
          )}
        </div>
      </Card>
      {(pagination?.pageCount || 0) > 0 && (
        <Pagination
          className="mt-4"
          showPageSizeOptions={false}
          page={pagination?.page}
          total={pagination?.total}
          pageSize={pagination?.pageSize}
          onPageChange={handlePageChangeRoute}
          onPageSizeChange={handlePageSizeChangeRoute}
        />
      )}

      <ConfirmModal
        open={isDeleteConfirmOpenRoute}
        icon="error"
        color="error"
        title={t("common.confirmation.delete_title", { name: selectedRouteRef.current?.name })}
        message={t("common.confirmation.delete_message")}
        onClose={handleDeleteCancelRoute}
        onCancel={handleDeleteCancelRoute}
        onConfirm={handleConfirmDeleteRoute}
      />
    </>
  );
};

export default CustomerRouteList;
