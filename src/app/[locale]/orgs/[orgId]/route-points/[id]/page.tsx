"use client";

import { useAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { deleteRoutePoint } from "@/actions/routePoint";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  DetailDataNotFound,
  Link,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, Button, EmptyListSection, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { RoutePointTimeRange } from "@/forms/routePoint";
import { useIdParam, usePermission, useRoutePoint } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { routePointAtom } from "@/states";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { safeParseArray } from "@/utils/object";
import { getDetailAddress } from "@/utils/string";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification, showNotificationBasedOnStatus } = useNotification(t);
    const { canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("route-point");
    const [{ searchQueryString }] = useAtom(routePointAtom);

    const { originId: id, encryptedId, encryptId } = useIdParam();
    const { routePoint, isLoading } = useRoutePoint({ id: id!, organizationId: orgId });

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("route_point.manage"), link: orgLink },
        { name: t("route_point.title"), link: `${orgLink}/route-points${searchQueryString}` },
        {
          name: routePoint?.name || `${encryptedId}`,
          link: `${orgLink}/route-points/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgLink, routePoint?.name, encryptedId]);

    /**
     * Handles the click event to initiate the deletion confirmation.
     */
    const handleOpenDeleteModal = useCallback(async () => {
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
      if (!routePoint?.id || !orgId) {
        showNotification({
          color: "error",
          title: t("common.message.delete_error_title"),
          message: t("common.message.data_not_found_message"),
        });
      }
      const { status } = await deleteRoutePoint({
        organizationId: orgId,
        id: routePoint?.id,
        updatedAt: routePoint?.updatedAt,
      });

      showNotificationBasedOnStatus(status, routePoint?.name);
      setIsDeleteConfirmOpen(false);
      router.push(`${orgLink}/route-points${searchQueryString}`);
    }, [
      orgId,
      orgLink,
      routePoint?.id,
      routePoint?.name,
      routePoint?.updatedAt,
      router,
      searchQueryString,
      showNotification,
      showNotificationBasedOnStatus,
      t,
    ]);

    /**
     * Checks if the route point has adjacent points.
     * Returns true if the route point exists and contains at least one adjacent point, otherwise returns false.
     */
    const hasAdjacentPoints = useMemo(
      () => routePoint?.adjacentPoints && routePoint?.adjacentPoints.length > 0,
      [routePoint]
    );

    /**
     * This function handles the event to open the delete route point confirmation modal.
     * @param {Partial<VehicleInfo>} item - The route point to be deleted.
     * @returns {function} - A function that sets the selected route point and opens the modal.
     */
    const handleOpenAdjacentPointsModal = useCallback(() => {
      if (!hasAdjacentPoints) {
        router.push(`${orgLink}/route-points/${encryptedId}/edit`);
      }
    }, [hasAdjacentPoints, router, orgLink, encryptedId]);

    // Data not found
    if (!isLoading && !routePoint) {
      return <DetailDataNotFound goBackLink={`${orgLink}/route-points${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("route_point.title")}
          description={t("route_point.description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="route-point"
                action="delete"
                alwaysAuthorized={canDelete() || (canDeleteOwn() && equalId(routePoint?.createdByUser?.id, userId))}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleOpenDeleteModal}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="route-point" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/route-points/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="route-point"
                action="edit"
                alwaysAuthorized={canEdit() || (canEditOwn() && equalId(routePoint?.createdByUser?.id, userId))}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/route-points/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-6">
            {/* General */}
            <Card>
              <CardHeader loading={isLoading} title={t("org_setting_general.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("route_point.code")} loading={isLoading}>
                  {routePoint?.code || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("route_point.name")} loading={isLoading}>
                  {routePoint?.name || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("route_point.zone")} loading={isLoading}>
                  {routePoint?.zone?.name || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2
                  count={3}
                  multiline
                  label={t("route_point.description_label")}
                  loading={isLoading}
                >
                  {routePoint?.notes || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("route_point.status")} loading={isLoading}>
                  <Badge
                    label={routePoint?.isActive ? t("route_point.status_active") : t("route_point.status_inactive")}
                    color={routePoint?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>

            {/* Adjacent points list */}
            <Card>
              <CardHeader loading={isLoading} title={t("route_point.adjacent_points")} />
              <CardContent padding={isLoading}>
                <TableContainer variant="paper" inside horizontalScroll>
                  <Table dense={!isLoading}>
                    <TableHead uppercase>
                      <TableRow>
                        <TableCell>{t("route_point.title")}</TableCell>
                        <TableCell>{t("route_point.zone")}</TableCell>
                        <TableCell>{t("route_point.address")}</TableCell>
                        <TableCell>
                          <span className="sr-only">{t("common.actions")}</span>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody className="divide-y divide-gray-200 bg-white">
                      {isLoading && !hasAdjacentPoints && <SkeletonTableRow rows={7} columns={5} />}

                      {!isLoading && !hasAdjacentPoints && (
                        <TableRow hover={false}>
                          <TableCell colSpan={5}>
                            <EmptyListSection
                              description={t("route_point.no_adjacent_points")}
                              actionLabel={t("route_point.add_adjacent_points")}
                              onClick={
                                isLoading ||
                                !(canEdit() || (canEditOwn() && equalId(routePoint?.createdByUser?.id, userId)))
                                  ? undefined
                                  : handleOpenAdjacentPointsModal
                              }
                            />
                          </TableCell>
                        </TableRow>
                      )}

                      {(routePoint?.adjacentPoints || []).map((item) => {
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Link
                                useDefaultStyle
                                color="secondary"
                                className="cursor-pointer"
                                href={`${orgLink}/route-points/${encryptId(item.id)}`}
                              >
                                {item.name}
                              </Link>
                            </TableCell>
                            <TableCell>{item.zone?.name || t("common.empty")}</TableCell>
                            <TableCell>{getDetailAddress(item.address) || t("common.empty")}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </div>

          <div className="w-full space-y-6 lg:max-w-xs xl:max-w-sm">
            {/* Contact info */}
            <Card>
              <CardHeader loading={isLoading} title={t("route_point.contact_info_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("route_point.contact_name")} loading={isLoading}>
                  {routePoint?.contactName || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("route_point.contact_phone_number")} loading={isLoading}>
                  {routePoint?.contactPhoneNumber || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("route_point.contact_email")} loading={isLoading}>
                  {routePoint?.contactEmail || t("common.empty")}
                </DescriptionProperty2>
              </CardContent>
            </Card>

            {/* Address info */}
            <Card>
              <CardHeader loading={isLoading} title={t("route_point.address_info_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("components.address_information.city")} loading={isLoading}>
                  {routePoint?.address?.city?.name || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("components.address_information.district")} loading={isLoading}>
                  {routePoint?.address?.district?.name || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("components.address_information.ward")} loading={isLoading}>
                  {routePoint?.address?.ward?.name || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("components.address_information.address_line1")} loading={isLoading}>
                  {routePoint?.address?.addressLine1 || t("common.empty")}
                </DescriptionProperty2>
              </CardContent>
            </Card>

            {/* Requirement info */}
            <Card>
              <CardHeader loading={isLoading} title={t("route_point.requirement_info_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("route_point.pickup_time")} loading={isLoading}>
                  {routePoint?.pickupTimes && safeParseArray(routePoint?.pickupTimes)
                    ? safeParseArray<RoutePointTimeRange>(routePoint?.pickupTimes).map((time, index) => (
                        <div key={index}>
                          {time?.start?.slice(0, 5)} - {time?.end?.slice(0, 5)}
                        </div>
                      ))
                    : t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("route_point.delivery_time")} loading={isLoading}>
                  {routePoint?.deliveryTimes && safeParseArray(routePoint?.deliveryTimes)
                    ? safeParseArray<RoutePointTimeRange>(routePoint?.deliveryTimes).map((time, index) => (
                        <div key={index}>
                          {time?.start?.slice(0, 5)} - {time?.end?.slice(0, 5)}
                        </div>
                      ))
                    : t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("route_point.vehicle_type")} loading={isLoading}>
                  {routePoint?.vehicleTypes?.map((t) => t.name).join(", ") || t("common.empty")}
                </DescriptionProperty2>
              </CardContent>
            </Card>

            {/* System info */}
            <SystemInfoCard loading={isLoading} entity={routePoint} />
          </div>
        </div>

        {/* Delete group confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          loading={isLoading}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: routePoint?.name })}
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
    action: "detail",
  }
);
