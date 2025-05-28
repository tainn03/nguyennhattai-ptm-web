"use client";

import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LuMapPin } from "react-icons/lu";

import { deleteZone } from "@/actions/zone";
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
import { useIdParam, usePermission } from "@/hooks";
import { useZone } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { zoneAtom } from "@/states";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { setBreadcrumb } = useBreadcrumb();
    const { showNotification, showNotificationBasedOnStatus } = useNotification(t);
    const { canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("zone");
    const [{ searchQueryString }] = useAtom(zoneAtom);

    const { originId, encryptedId, encryptId } = useIdParam();
    const { zone, isLoading } = useZone({ id: originId!, organizationId: orgId! });

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("zone.manage"), link: `${orgLink}` },
        { name: t("zone.name"), link: `${orgLink}/zones${searchQueryString}` },
        {
          name: zone?.name || `${encryptedId}`,
          link: `${orgLink}/zones/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zone?.name, orgLink]);

    /**
     * Handles the click event to initiate the deletion confirmation.
     */
    const handleDeleteClick = useCallback(() => {
      setIsDeleteConfirmOpen(true);
    }, []);

    /**
     * Handles the confirmation of the deletion.
     */
    const handleDeleteConfirm = useCallback(async () => {
      if (!zone?.id || !orgId) {
        showNotification({
          color: "error",
          title: t("common.message.delete_error_title"),
          message: t("common.message.data_not_found_message"),
        });
        return;
      }

      const { status } = await deleteZone({
        id: zone.id,
        organizationId: orgId,
        updatedAt: zone?.updatedAt,
      });

      showNotificationBasedOnStatus(status, zone.name);
      setIsDeleteConfirmOpen(false);
      router.push(`${orgLink}/zones${searchQueryString}`);
    }, [
      zone?.id,
      zone?.updatedAt,
      zone?.name,
      orgId,
      showNotificationBasedOnStatus,
      router,
      orgLink,
      searchQueryString,
      showNotification,
      t,
    ]);

    /**
     * Checks if the zone has nearby zones.
     * Returns true if the zone exists and contains at least one nearby zone, otherwise returns false.
     */
    const hasAdjacentZones = useMemo(() => zone?.adjacentZones && zone?.adjacentZones.length > 0, [zone]);

    /**
     * This function handles the event to open the delete zone confirmation modal.
     * @param {Partial<VehicleInfo>} item - The zone to be deleted.
     * @returns {function} - A function that sets the selected zone and opens the modal.
     */
    const handleOpenAdjacentZonesModal = useCallback(() => {
      if (!hasAdjacentZones) {
        router.push(`${orgLink}/zones/${encryptedId}/edit`);
      }
    }, [hasAdjacentZones, router, orgLink, encryptedId]);

    /**
     * Handles closing the delete zone confirmation modal.
     * It clears the selected zone reference and closes the modal.
     */
    const handleCloseDeleteZoneConfirmModal = useCallback(() => {
      setIsDeleteConfirmOpen(false);
    }, []);

    // Data not found
    if (!isLoading && !zone) {
      return <DetailDataNotFound goBackLink={`${orgLink}/zones${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("zone.name")}
          description={t("zone.zone_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="zone"
                action="delete"
                alwaysAuthorized={canDelete() || (canDeleteOwn() && equalId(zone?.createdByUser?.id, userId))}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="zone" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/zones/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="zone"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(zone?.createdByUser?.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/zones/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          {/* General */}
          <div className="flex flex-1 flex-col gap-4">
            <Card>
              <CardHeader loading={isLoading} title={t("zone.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("zone.name")} loading={isLoading}>
                  {zone?.name || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("zone.parent")} loading={isLoading}>
                  {zone?.parent?.name || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("zone.description")} loading={isLoading}>
                  {zone?.description || t("common.empty")}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("zone.status")} loading={isLoading}>
                  <Badge
                    label={zone?.isActive ? t("zone.status_active") : t("zone.status_inactive")}
                    color={zone?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full space-y-4 lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={zone} />
          </div>
        </div>

        <Card className="mt-4 sm:mt-6 lg:mt-8 lg:flex-row">
          <CardHeader loading={isLoading} title={t("zone.list_adjacent_zone")} />
          <CardContent padding={isLoading} className="pb-4">
            <TableContainer variant="paper" inside horizontalScroll>
              <Table dense={!isLoading}>
                <TableHead uppercase>
                  <TableRow>
                    <TableCell>{t("zone.name")}</TableCell>
                    <TableCell>{t("zone.parent")}</TableCell>
                    <TableCell>{t("zone.adjacent_zones")}</TableCell>
                    <TableCell>
                      <span className="sr-only">{t("common.actions")}</span>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y divide-gray-200 bg-white">
                  {isLoading && !hasAdjacentZones && <SkeletonTableRow rows={7} columns={4} />}

                  {!isLoading && !hasAdjacentZones && (
                    <TableRow hover={false}>
                      <TableCell colSpan={4}>
                        <EmptyListSection
                          description={t("zone.empty_list")}
                          actionLabel={t("zone.add")}
                          onClick={
                            isLoading || !(canEdit() || (canEditOwn() && equalId(zone?.createdByUser?.id, userId)))
                              ? undefined
                              : handleOpenAdjacentZonesModal
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {(zone?.adjacentZones || []).map((item) => {
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link
                            useDefaultStyle
                            color="secondary"
                            className="cursor-pointer"
                            href={`${orgLink}/zones/${encryptId(item.id)}`}
                          >
                            {item.name}
                          </Link>
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
                        <TableCell align="right" className="space-x-2 !pr-4" />
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Delete zone confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          loading={isLoading}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: zone?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleCloseDeleteZoneConfirmModal}
          onCancel={handleCloseDeleteZoneConfirmModal}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "zone",
    action: "detail",
  }
);
