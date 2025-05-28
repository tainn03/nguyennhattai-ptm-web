"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  DetailDataNotFound,
  Link,
  NumberLabel,
} from "@/components/atoms";
import { Authorization, Button, PageHeader, SystemInfoCard } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useGasStation, useIdParam, usePermission } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useGasStationState } from "@/redux/states";
import { deleteGasStation } from "@/services/client/gasStation";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { getDetailAddress } from "@/utils/string";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId } = useIdParam();
    const { showNotification } = useNotification();
    const { searchQueryString } = useGasStationState();
    const { setBreadcrumb } = useBreadcrumb();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const { canEditOwn, canDeleteOwn } = usePermission("gas-station");

    const { gasStation, isLoading } = useGasStation({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("gas_station.manage"), link: `${orgLink}/settings` },
        { name: t("gas_station.title"), link: `${orgLink}/settings/gas-stations${searchQueryString}` },
        {
          name: gasStation?.name || `${encryptedId}`,
          link: `${orgLink}/settings/gas-stations/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gasStation?.name, orgLink]);

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
      if (originId && userId) {
        const { error } = await deleteGasStation(
          {
            organizationId: orgId,
            id: originId,
            updatedById: userId,
          },
          gasStation?.updatedAt
        );

        if (error) {
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: gasStation?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: gasStation?.name,
            }),
          });
        }
      }

      router.push(`${orgLink}/settings/gas-stations${searchQueryString}`);
    }, [
      originId,
      userId,
      router,
      orgLink,
      searchQueryString,
      orgId,
      gasStation?.updatedAt,
      gasStation?.name,
      showNotification,
      t,
    ]);

    // Data not found
    if (!isLoading && !gasStation) {
      return <DetailDataNotFound goBackLink={`${orgLink}/settings/gas-stations${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("gas_station.title")}
          description={t("gas_station.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="gas-station"
                action="delete"
                alwaysAuthorized={canDeleteOwn() && equalId(gasStation?.createdByUser?.id, userId)}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="gas-station" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/settings/gas-stations/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="gas-station"
                action="edit"
                alwaysAuthorized={canEditOwn() && equalId(gasStation?.createdByUser?.id, userId)}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/settings/gas-stations/${encryptedId}/edit`}>
                  {t("common.edit")}
                </Button>
              </Authorization>
            </>
          }
        />

        <div className="mt-10 flex w-full flex-col gap-4 sm:gap-6 lg:flex-row lg:gap-8">
          <div className="flex flex-1 flex-col gap-4 sm:gap-6 lg:gap-8">
            {/* General */}
            <Card>
              <CardHeader loading={isLoading} title={t("gas_station.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("gas_station.name")} loading={isLoading}>
                  {gasStation?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("gas_station.fuel_capacity")} loading={isLoading}>
                  <NumberLabel
                    value={gasStation?.fuelCapacity}
                    unit={t("gas_station.fuel_capacity_unit")}
                    emptyLabel={t("common.empty")}
                  />
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("gas_station.address")} size="long" loading={isLoading}>
                  {getDetailAddress(gasStation?.address)}
                </DescriptionProperty2>

                <DescriptionProperty2 count={3} multiline label={t("gas_station.description")} loading={isLoading}>
                  {gasStation?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("gas_station.status")} loading={isLoading}>
                  <Badge
                    label={gasStation?.isActive ? t("gas_station.status_active") : t("gas_station.status_inactive")}
                    color={gasStation?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>
          <div className="flex w-full flex-1 flex-col gap-4 sm:gap-6 lg:max-w-xs lg:gap-8 xl:max-w-sm">
            {/* System info */}
            <SystemInfoCard loading={isLoading} entity={gasStation} />
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: gasStation?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  },
  {
    resource: "gas-station",
    action: "detail",
  }
);
