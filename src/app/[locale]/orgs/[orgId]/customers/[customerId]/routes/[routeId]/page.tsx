"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { RouteType } from "@prisma/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  DetailDataNotFound,
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
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { RoutePointInputForm } from "@/forms/routePoint";
import { useIdParam, useOrgSettingExtendedStorage, usePermission, useRoute } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useRouteState } from "@/redux/states";
import { getCustomerName } from "@/services/client/customers";
import { deleteRoute } from "@/services/client/route";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { ensureString, getDetailAddress } from "@/utils/string";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const router = useRouter();
    const t = useTranslations();
    const { originId: originCustomerId, encryptedId: encryptedCustomerId } = useIdParam({ name: "customerId" });
    const { originId: originRouteId, encryptedId: encryptedRouteId } = useIdParam({ name: "routeId" });
    const { showNotification } = useNotification();
    const { searchQueryString } = useRouteState();
    const { setBreadcrumb } = useBreadcrumb();

    const { mergeDeliveryAndPickup } = useOrgSettingExtendedStorage();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("customer-route");
    const { route, isLoading } = useRoute({
      organizationId: orgId,
      customerId: originCustomerId!,
      id: originRouteId!,
    });

    useEffect(() => {
      if (route?.type && route.type !== RouteType.FIXED) {
        router.push(`${orgLink}/customers`);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, route?.type]);

    const routesUrl = useMemo(() => {
      if (searchQueryString) {
        return `${searchQueryString}&tab=routes`;
      }

      return "?tab=routes";
    }, [searchQueryString]);

    const updateBreadcrumb = useCallback(async () => {
      let customerName;
      if (originCustomerId) {
        customerName = await getCustomerName(orgId, originCustomerId);
      }
      if (originCustomerId) {
        setBreadcrumb([
          { name: t("customer.manage"), link: orgLink },
          { name: t("customer.title"), link: `${orgLink}/customers${searchQueryString}` },
          {
            name: ensureString(customerName) || ensureString(encryptedCustomerId),
            link: `${orgLink}/customers/${encryptedCustomerId}`,
          },
          {
            name: t("customer.route.title"),
            link: `${orgLink}/customers/${encryptedCustomerId}${routesUrl}`,
          },
          {
            name: route?.name || `${encryptedRouteId}`,
            link: `${orgLink}/customers/${encryptedCustomerId}/routes/${encryptedRouteId}`,
          },
        ]);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [originCustomerId, orgLink, searchQueryString, encryptedCustomerId, routesUrl, route?.name, encryptedRouteId]);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      updateBreadcrumb();
    }, [updateBreadcrumb]);

    /**
     * Handles the click event to initiate the deletion confirmation.
     */
    const handleDeleteClick = useCallback(() => {
      setIsDeleteConfirmOpen(true);
    }, []);

    /**
     * Handles the cancel event for deleting and closes the deletion confirmation modal.
     */
    const handleDeleteCancel = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, []);

    /**
     * Handles the confirmation of deletion.
     * Sends a delete request, and displays a notification based on the result.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (originRouteId && userId) {
        const { error } = await deleteRoute(
          {
            organizationId: orgId,
            id: originRouteId,
            updatedById: userId,
          },
          route?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: route?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: route?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/customers/${encryptedCustomerId}?tab=routes`);
    }, [
      encryptedCustomerId,
      orgId,
      orgLink,
      originRouteId,
      route?.name,
      route?.updatedAt,
      router,
      showNotification,
      t,
      userId,
    ]);

    // Data not found
    if (!isLoading && !route) {
      return <DetailDataNotFound goBackLink={`${orgLink}/customers/${encryptedCustomerId}${routesUrl}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("customer.route.general_title")}
          description={t("customer.route.route_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="customer-route"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(route?.createdByUser.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="customer-route" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/customers/${encryptedCustomerId}/routes/new?copyId=${encryptedRouteId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="customer-route"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(route?.createdByUser.id, userId)}
              >
                <Button
                  as={Link}
                  disabled={isLoading}
                  href={`${orgLink}/customers/${encryptedCustomerId}/routes/${encryptedRouteId}/edit`}
                >
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8 xl:flex-row">
          <div className="flex-1">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 2xl:grid-cols-6">
              <Card className="col-span-full">
                <CardHeader title={t("customer.route.general_title")} loading={isLoading} />
                <CardContent>
                  <DescriptionProperty2 label={t("customer.route.id")} loading={isLoading}>
                    {route?.code}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("customer.route.name")} loading={isLoading}>
                    {route?.name}
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("customer.route.distance")} loading={isLoading}>
                    <NumberLabel
                      value={route?.distance}
                      unit={t("common.unit.kilometer")}
                      showUnitWhenEmpty={false}
                      emptyLabel={t("common.empty")}
                    />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("customer.route.min_bol_submit_days")} loading={isLoading}>
                    <NumberLabel
                      value={route?.minBOLSubmitDays}
                      unit={t("customer.route.days")}
                      showUnitWhenEmpty={false}
                      emptyLabel={t("common.empty")}
                    />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("customer.route.status")} loading={isLoading}>
                    <Badge
                      label={route?.isActive ? t("customer.route.status_active") : t("customer.route.status_inactive")}
                      color={route?.isActive ? "success" : "error"}
                    />
                  </DescriptionProperty2>
                  <DescriptionProperty2 label={t("customer.route.description")} loading={isLoading}>
                    {route?.description}
                  </DescriptionProperty2>
                </CardContent>
              </Card>

              <Card className="col-span-full">
                <CardHeader
                  title={
                    mergeDeliveryAndPickup
                      ? t("customer.route.pickup_delivery_info_title")
                      : t("customer.route.pickup_info_title")
                  }
                  loading={isLoading}
                />
                <CardContent padding={false}>
                  <TableContainer variant="paper" inside horizontalScroll className="!mt-0">
                    <Table dense={!isLoading}>
                      <TableHead uppercase>
                        <TableRow>
                          <TableCell className="w-4">
                            <span className="sr-only">{t("common.actions")}</span>
                          </TableCell>
                          <TableCell align="right" className="w-12 pl-2 sm:!pl-0">
                            {t("order.route_card.index")}
                          </TableCell>
                          <TableCell className="min-w-[6rem] max-w-[10rem]">{t("order.route_card.code")}</TableCell>
                          <TableCell className="min-w-[6rem] max-w-[10rem]">{t("order.route_card.name")}</TableCell>
                          <TableCell>{t("order.route_card.address")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody className="divide-y divide-gray-200 bg-white">
                        {isLoading && (!route?.pickupPoints || route?.pickupPoints?.length === 0) && (
                          <SkeletonTableRow rows={3} columns={5} />
                        )}
                        {(route?.pickupPoints || []).map((item: RoutePointInputForm, index) => (
                          <Disclosure key={item.id} as={Fragment}>
                            {({ open }) => (
                              <Fragment key={`pickup-points${item.id}`}>
                                <Disclosure.Button
                                  as="tr"
                                  className={clsx({
                                    "bg-blue-50": open,
                                    "hover:bg-gray-50": !open,
                                  })}
                                >
                                  <TableCell align="center" className="px-3 py-3.5">
                                    <span className="ml-2 flex items-center">
                                      {open ? (
                                        <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                      ) : (
                                        <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                      )}
                                    </span>
                                  </TableCell>
                                  <TableCell align="center">{index + 1}</TableCell>
                                  <TableCell className="max-w-[10rem]">{item.code || t("common.empty")}</TableCell>
                                  <TableCell className="max-w-[10rem]">{item.name || t("common.empty")}</TableCell>
                                  <TableCell nowrap={false} className="min-w-[18rem] break-normal">
                                    {getDetailAddress(item.address) || t("common.empty")}
                                  </TableCell>
                                </Disclosure.Button>
                                <Disclosure.Panel as="tr">
                                  <TableCell colSpan={5} className="p-4" nowrap={false}>
                                    <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                                      <div className="group col-span-full overflow-hidden rounded-lg px-4">
                                        <DescriptionProperty2 label={t("order_new.route_tab.contact_name")}>
                                          {item.contactName || t("common.empty")}
                                        </DescriptionProperty2>
                                        <DescriptionProperty2 label={t("order_new.route_tab.contact_phone")}>
                                          {item.contactPhoneNumber || t("common.empty")}
                                        </DescriptionProperty2>
                                        <DescriptionProperty2 label={t("order_new.route_tab.contact_email")}>
                                          {item.contactEmail || t("common.empty")}
                                        </DescriptionProperty2>
                                        <DescriptionProperty2 label={t("order_new.route_tab.notes")}>
                                          {item.notes || t("common.empty")}
                                        </DescriptionProperty2>
                                      </div>
                                    </div>
                                  </TableCell>
                                </Disclosure.Panel>
                              </Fragment>
                            )}
                          </Disclosure>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              {!mergeDeliveryAndPickup && (
                <Card className="col-span-full">
                  <CardHeader title={t("customer.route.delivery_info_title")} loading={isLoading} />
                  <CardContent padding={false}>
                    <TableContainer variant="paper" inside horizontalScroll className="!mt-0">
                      <Table dense={!isLoading}>
                        <TableHead uppercase>
                          <TableRow>
                            <TableCell className="w-4">
                              <span className="sr-only">{t("common.actions")}</span>
                            </TableCell>
                            <TableCell align="right" className="w-12 pl-2 sm:!pl-0">
                              {t("order.route_card.index")}
                            </TableCell>
                            <TableCell className="min-w-[6rem] max-w-[10rem]">{t("order.route_card.code")}</TableCell>
                            <TableCell className="min-w-[6rem] max-w-[10rem]">{t("order.route_card.name")}</TableCell>
                            <TableCell>{t("order.route_card.address")}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody className="divide-y divide-gray-200 bg-white">
                          {isLoading && (!route?.deliveryPoints || route?.deliveryPoints?.length === 0) && (
                            <SkeletonTableRow rows={3} columns={5} />
                          )}
                          {(route?.deliveryPoints || []).map((item: RoutePointInputForm, index) => (
                            <Disclosure key={item.id} as={Fragment}>
                              {({ open }) => (
                                <Fragment key={`delivery-points${item.id}`}>
                                  <Disclosure.Button
                                    as="tr"
                                    className={clsx({
                                      "bg-blue-50": open,
                                      "hover:bg-gray-50": !open,
                                    })}
                                  >
                                    <TableCell align="center" className="px-3 py-3.5">
                                      <span className="ml-2 flex items-center">
                                        {open ? (
                                          <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        ) : (
                                          <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                        )}
                                      </span>
                                    </TableCell>
                                    <TableCell align="center">{index + 1}</TableCell>
                                    <TableCell className="max-w-[10rem]">{item.code || t("common.empty")}</TableCell>
                                    <TableCell className="max-w-[10rem]">{item.name || t("common.empty")}</TableCell>
                                    <TableCell nowrap={false} className="min-w-[18rem] break-normal">
                                      {getDetailAddress(item.address) || t("common.empty")}
                                    </TableCell>
                                  </Disclosure.Button>
                                  <Disclosure.Panel as="tr">
                                    <TableCell colSpan={5} className="p-4" nowrap={false}>
                                      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                                        <div className="group col-span-full overflow-hidden rounded-lg px-4">
                                          <DescriptionProperty2 label={t("order_new.route_tab.contact_name")}>
                                            {item.contactName || t("common.empty")}
                                          </DescriptionProperty2>
                                          <DescriptionProperty2 label={t("order_new.route_tab.contact_phone")}>
                                            {item.contactPhoneNumber || t("common.empty")}
                                          </DescriptionProperty2>
                                          <DescriptionProperty2 label={t("order_new.route_tab.contact_email")}>
                                            {item.contactEmail || t("common.empty")}
                                          </DescriptionProperty2>
                                          <DescriptionProperty2 label={t("order_new.route_tab.notes")}>
                                            {item.notes || t("common.empty")}
                                          </DescriptionProperty2>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </Disclosure.Panel>
                                </Fragment>
                              )}
                            </Disclosure>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="w-full sm:space-y-6 lg:max-w-xs lg:space-y-8 xl:max-w-sm">
            <Card>
              <CardHeader title={t("customer.route.cost_info")} loading={isLoading} />
              <CardContent>
                <DescriptionProperty2 label={t("customer.route.driver_cost")} loading={isLoading}>
                  <NumberLabel type="currency" emptyLabel={t("common.empty")} value={Number(route?.driverCost)} />
                </DescriptionProperty2>
                <div className="pl-4">
                  {(route?.driverExpenses || [])
                    .sort((a, b) => a.driverExpense?.displayOrder || 0 - (b.driverExpense?.displayOrder || 0))
                    .map((item, index) => (
                      <DescriptionProperty2 key={index} label={item.driverExpense?.name} loading={isLoading}>
                        <NumberLabel type="currency" emptyLabel={t("common.empty")} value={item.amount} />
                      </DescriptionProperty2>
                    ))}
                </div>
                <DescriptionProperty2 label={t("customer.route.price")} loading={isLoading}>
                  <NumberLabel type="currency" emptyLabel={t("common.empty")} value={Number(route?.price)} />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("customer.route.bridge_toll")} loading={isLoading}>
                  <NumberLabel type="currency" emptyLabel={t("common.empty")} value={Number(route?.bridgeToll)} />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("customer.route.subcontractor_cost")} loading={isLoading}>
                  <NumberLabel
                    type="currency"
                    emptyLabel={t("common.empty")}
                    value={Number(route?.subcontractorCost)}
                  />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("customer.route.other_cost")} loading={isLoading}>
                  <NumberLabel type="currency" emptyLabel={t("common.empty")} value={Number(route?.otherCost)} />
                </DescriptionProperty2>
              </CardContent>
            </Card>

            {/* <Card>
              <CardHeader title="Thông tin chi phí khung xe" loading={isLoading} />
              <CardContent padding={false}>
                <TableContainer inside variant="paper" className="!mt-0">
                  <Table dense={!isLoading}>
                    <TableHead uppercase>
                      <TableRow>
                        <TableCell>Loại xe</TableCell>
                        <TableCell>Đơn giá</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="divide-y divide-gray-200 bg-white">
                      {isLoading && <SkeletonTableRow rows={3} columns={5} />}
                      {[
                        {
                          id: 1,
                          vehicleType: "2T",
                          unitPrice: 1000000,
                        },
                      ].map((item) => (
                        <TableRow key={`pricings-${item.id}`}>
                          <TableCell>{item.vehicleType}</TableCell>
                          <TableCell>
                            <NumberLabel value={item.unitPrice} type="currency" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card> */}

            <SystemInfoCard loading={isLoading} entity={route} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", {
            name: route?.name,
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
    resource: "customer-route",
    action: "detail",
  }
);
