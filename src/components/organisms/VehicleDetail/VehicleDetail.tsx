"use client";

import { Subcontractor } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useState } from "react";

import { DetailDataNotFound, Link } from "@/components/atoms";
import { Authorization, Button, PageHeader, VehicleDetailView } from "@/components/molecules";
import { ConfirmModal } from "@/components/organisms";
import { useIdParam, usePermission, useVehicle } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useVehicleState } from "@/redux/states";
import { getPartialSubcontractor, getSubcontractorName } from "@/services/client/subcontractor";
import { deleteVehicle } from "@/services/client/vehicle";
import { OrgPageProps } from "@/utils/client";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";

export type VehicleFormProps = OrgPageProps & {
  subcontractorId?: number | null;
};

const VehicleDetail = ({ orgId, orgLink, userId, subcontractorId }: VehicleFormProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { originId, encryptedId } = useIdParam();
  const { encryptId } = useIdParam();
  const { setBreadcrumb } = useBreadcrumb();
  const { showNotification } = useNotification();
  const { searchQueryString } = useVehicleState();

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { canEditOwn, canDeleteOwn } = usePermission("vehicle");
  const [subcontractor, setSubcontractor] = useState<Subcontractor | undefined>();

  const { vehicle, isLoading } = useVehicle({ organizationId: Number(orgId), id: originId! });

  const updateBreadcrumb = useCallback(
    async () => {
      let subcontractorName;
      if (subcontractorId) {
        subcontractorName = await getSubcontractorName(orgId, subcontractorId);
      }
      if (subcontractorId) {
        setBreadcrumb([
          { name: t("subcontractor.management"), link: orgLink },
          { name: t("subcontractor.title"), link: `${orgLink}/subcontractors` },
          {
            name: subcontractorName || encryptId(subcontractorId),
            link: `${orgLink}/subcontractors/${encryptId(subcontractorId)}`,
          },
          {
            name: t("vehicle.title"),
            link: searchQueryString
              ? `${orgLink}/subcontractors/${encryptId(subcontractorId)}${searchQueryString}&tab=vehicles`
              : `${orgLink}/subcontractors/${encryptId(subcontractorId)}?tab=vehicles`,
          },
          {
            name: vehicle?.vehicleNumber || ensureString(encryptedId),
            link: `${orgLink}/subcontractors/${encryptId(subcontractorId)}/vehicles/${encryptedId}`,
          },
        ]);
      } else {
        setBreadcrumb([
          { name: t("vehicle.manage"), link: orgLink },
          { name: t("vehicle.title"), link: `${orgLink}/vehicles${searchQueryString}` },
          {
            name: vehicle?.vehicleNumber || ensureString(encryptedId),
            link: `${orgLink}/vehicles/${encryptedId}`,
          },
        ]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicle?.vehicleNumber, orgId, orgLink, subcontractorId, searchQueryString]
  );

  useEffect(() => {
    updateBreadcrumb();
  }, [updateBreadcrumb]);

  /**
   * Handle the click event for deleting a customer.
   * Initiates the delete action, shows a success or error notification, and redirects to the customer list page.
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (originId && userId) {
      const { error } = await deleteVehicle(
        {
          organizationId: orgId,
          id: originId,
          updatedById: userId,
        },
        vehicle?.updatedAt
      );

      if (error) {
        showNotification({
          color: "error",
          title: t("common.message.delete_error_title"),
          message: t("common.message.delete_error_message", {
            name: vehicle?.vehicleNumber,
          }),
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.delete_success_title"),
          message: t("common.message.delete_success_message", {
            name: vehicle?.vehicleNumber,
          }),
        });
      }
    }

    if (subcontractorId) {
      router.push(
        searchQueryString
          ? `${orgLink}/subcontractors/${encryptId(subcontractorId)}${searchQueryString}&tab=vehicles`
          : `${orgLink}/subcontractors/${encryptId(subcontractorId)}?tab=vehicles`
      );
    } else {
      router.push(`${orgLink}/vehicles?${searchQueryString}`);
    }
  }, [
    originId,
    userId,
    subcontractorId,
    orgId,
    vehicle?.updatedAt,
    vehicle?.vehicleNumber,
    showNotification,
    t,
    router,
    searchQueryString,
    orgLink,
    encryptId,
  ]);

  /**
   * Handle the click event for initiating a delete action.
   * Sets the 'isDeleteConfirmOpen' state to true to confirm the deletion.
   */
  const handleDeleteClick = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  /**
   * Handles the cancel event for deleting and closes the deletion confirmation modal.
   */
  const handleDeleteCancel = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, [setIsDeleteConfirmOpen]);

  /**
   * Fetch subcontractor information based on the vehicle's subcontractorId, if available.
   */
  const fetchSubcontractorId = useCallback(async () => {
    if (vehicle?.subcontractorId) {
      const result = await getPartialSubcontractor(orgId, vehicle?.subcontractorId);
      if (result) {
        setSubcontractor(result);
      }
    }
  }, [orgId, vehicle?.subcontractorId]);

  useEffect(() => {
    fetchSubcontractorId();
  }, [vehicle?.subcontractorId, fetchSubcontractorId]);

  // Data not found
  if (!isLoading && !vehicle) {
    if (subcontractorId) {
      return (
        <DetailDataNotFound
          goBackLink={
            searchQueryString
              ? `${orgLink}/subcontractors/${encryptId(subcontractorId)}${searchQueryString}&tab=vehicles`
              : `${orgLink}/subcontractors/${encryptId(subcontractorId)}?tab=vehicles`
          }
        />
      );
    }
    return <DetailDataNotFound goBackLink={`${orgLink}/vehicles${searchQueryString}`} />;
  }

  return (
    <Authorization resource="vehicle" action="detail">
      <PageHeader
        title={t("vehicle.title")}
        description={t("vehicle.title_description")}
        loading={isLoading}
        actionHorizontal
        actionComponent={
          <>
            {/* Delete */}
            <Authorization
              resource="vehicle"
              action="delete"
              alwaysAuthorized={canDeleteOwn() && equalId(vehicle?.createdByUser.id, userId)}
            >
              <Button disabled={isLoading} color="error" onClick={handleDeleteClick}>
                {t("common.delete")}
              </Button>
            </Authorization>

            {/* Copy */}
            <Authorization resource="vehicle" action="new">
              <Button
                as={Link}
                variant="outlined"
                disabled={isLoading}
                href={
                  subcontractorId
                    ? `${orgLink}/subcontractors/${encryptId(subcontractorId)}/vehicles/new?copyId=${encryptedId}`
                    : `${orgLink}/vehicles/new?copyId=${encryptedId}`
                }
              >
                {t("common.copy")}
              </Button>
            </Authorization>

            {/* Edit */}
            <Authorization
              resource="vehicle"
              action="edit"
              alwaysAuthorized={canEditOwn() && equalId(vehicle?.createdByUser.id, userId)}
            >
              <Button
                as={Link}
                disabled={isLoading}
                href={
                  subcontractorId
                    ? `${orgLink}/subcontractors/${encryptId(subcontractorId)}/vehicles/${encryptedId}/edit`
                    : `${orgLink}/vehicles/${encryptedId}/edit`
                }
              >
                {t("common.edit")}
              </Button>
            </Authorization>
          </>
        }
      />

      <VehicleDetailView vehicle={vehicle} subcontractor={subcontractor} isLoading={isLoading} orgLink={orgLink} />

      <ConfirmModal
        open={isDeleteConfirmOpen}
        icon="error"
        color="error"
        title={t("common.confirmation.delete_title", { name: vehicle?.vehicleNumber })}
        message={t("common.confirmation.delete_message")}
        onClose={handleDeleteCancel}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </Authorization>
  );
};

export default VehicleDetail;
