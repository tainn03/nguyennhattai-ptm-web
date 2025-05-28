"use client";

import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  DescriptionProperty2,
  DetailDataNotFound,
  InfoBox,
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
import { useIdParam, usePermission, useVehicleGroup } from "@/hooks";
import { useBreadcrumb, useNotification } from "@/redux/actions";
import { useVehicleGroupState } from "@/redux/states";
import { deleteVehicleGroup, updateVehicleListInVehicleGroup } from "@/services/client/vehicleGroup";
import { ErrorType } from "@/types";
import { VehicleInfo } from "@/types/strapi";
import { getAccountInfo, getFullName } from "@/utils/auth";
import { withOrg } from "@/utils/client";
import { equalId } from "@/utils/number";
import { ensureString } from "@/utils/string";

import { VehicleGroupModal } from "./components";

export default withOrg(
  ({ orgId, orgLink, userId }) => {
    const t = useTranslations();
    const router = useRouter();
    const { originId, encryptedId, encryptId } = useIdParam();
    const { searchQueryString } = useVehicleGroupState();
    const { showNotification } = useNotification();
    const { setBreadcrumb } = useBreadcrumb();

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleteVehicleConfirmOpen, setIsDeleteVehicleConfirmOpen] = useState(false);
    const [isVehicleGroupOpen, setIsVehicleGroupOpen] = useState(false);
    const { canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("vehicle-group");
    const selectedVehicleRef = useRef<Partial<VehicleInfo>>();

    const { vehicleGroup, isLoading, mutate } = useVehicleGroup({
      organizationId: orgId,
      id: originId!,
    });

    /**
     * Updating the breadcrumb navigation.
     */
    useEffect(() => {
      setBreadcrumb([
        { name: t("org_setting_general.settings"), link: `${orgLink}/settings` },
        { name: t("vehicle_group.title"), link: `${orgLink}/vehicle-groups${searchQueryString}` },
        {
          name: vehicleGroup?.name || `${encryptedId}`,
          link: `${orgLink}/vehicle-groups/${encryptedId}`,
        },
      ]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleGroup?.name, orgLink]);

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
        const { error } = await deleteVehicleGroup(
          {
            id: originId,
            organizationId: orgId,
            updatedById: userId,
          },
          vehicleGroup?.updatedAt
        );

        if (error) {
          if (error === ErrorType.EXCLUSIVE) {
            showNotification({
              color: "error",
              title: t("common.message.delete_error_title"),
              message: t("common.message.save_error_exclusive", { name: vehicleGroup?.name }),
            });
            return;
          }
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message: t("common.message.delete_error_message", {
              name: vehicleGroup?.name,
            }),
          });
        } else {
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: vehicleGroup?.name,
            }),
          });
        }
      }
      router.push(`${orgLink}/vehicle-groups${searchQueryString}`);
    }, [
      vehicleGroup?.updatedAt,
      vehicleGroup?.name,
      originId,
      userId,
      router,
      orgLink,
      searchQueryString,
      orgId,
      showNotification,
      t,
    ]);

    /**
     * Checks if the vehicle group has vehicles.
     * Returns true if the vehicle group exists and contains at least one vehicle, otherwise returns false.
     */
    const hasVehicles = useMemo(() => vehicleGroup?.vehicles && vehicleGroup.vehicles.length > 0, [vehicleGroup]);

    /**
     * This function handles the event to open the delete vehicle confirmation modal.
     * @param {Partial<VehicleInfo>} item - The vehicle to be deleted.
     * @returns {function} - A function that sets the selected vehicle and opens the modal.
     */
    const handleOpenDeleteVehicleConfirmModal = useCallback(
      (item: Partial<VehicleInfo>) => () => {
        selectedVehicleRef.current = item;
        setIsDeleteVehicleConfirmOpen(true);
      },
      []
    );

    /**
     * Handles closing the delete vehicle confirmation modal.
     * It clears the selected vehicle reference and closes the modal.
     */
    const handleCloseDeleteVehicleConfirmModal = useCallback(() => {
      selectedVehicleRef.current = undefined;
      setIsDeleteVehicleConfirmOpen(false);
    }, []);

    /**
     * Handles the removal of a vehicle from the vehicle group.
     * This function removes the selected vehicle from the vehicle group and updates the list of vehicles.
     */
    const handleConfirmDeleteVehicle = useCallback(async () => {
      // Get the ID of the selected vehicle
      const id = Number(selectedVehicleRef.current?.id);

      // Filter out the selected vehicle from the list of vehicles in the vehicle group
      const vehicles = vehicleGroup?.vehicles.filter((item) => !equalId(id, item.id)) || [];

      // If the vehicle ID exists
      if (id) {
        // Update the list of vehicles in the vehicle group
        const result = await updateVehicleListInVehicleGroup(
          {
            id: Number(vehicleGroup?.id),
            updatedById: userId,
            organizationId: orgId,
            vehicles,
          },
          vehicleGroup?.updatedAt
        );

        // If there's an error during the update
        if (result.error) {
          // Handle different error types
          let message = "";
          switch (result.error) {
            case ErrorType.EXCLUSIVE:
              message = t("common.message.save_error_exclusive", { name: selectedVehicleRef.current?.vehicleNumber });
              break;
            case ErrorType.UNKNOWN:
              message = t("common.message.delete_error_unknown", { name: selectedVehicleRef.current?.vehicleNumber });
              break;
            default:
              break;
          }

          // Show an error notification
          showNotification({
            color: "error",
            title: t("common.message.delete_error_title"),
            message,
          });
        } else {
          // Show a success notification and refresh the vehicle group data
          showNotification({
            color: "success",
            title: t("common.message.delete_success_title"),
            message: t("common.message.delete_success_message", {
              name: selectedVehicleRef.current?.vehicleNumber,
            }),
          });
          mutate(); // Refresh the data by refetching
        }
      }

      // Reset the selected vehicle and close the confirmation modal
      selectedVehicleRef.current = undefined;
      setIsDeleteVehicleConfirmOpen(false);
    }, [mutate, orgId, showNotification, t, userId, vehicleGroup?.id, vehicleGroup?.updatedAt, vehicleGroup?.vehicles]);

    /**
     * Handles opening the vehicles modal.
     * This function sets the state to open the vehicles modal.
     */
    const handleOpenVehiclesModal = useCallback(() => {
      setIsVehicleGroupOpen(true);
    }, []);

    /**
     * Handles closing the vehicles modal.
     * This function sets the state to close the vehicles modal.
     */
    const handleCloseVehiclesModal = useCallback(() => {
      setIsVehicleGroupOpen(false);
    }, []);

    /**
     * Handles submitting the vehicles modal.
     * This function refreshes the data by refetching.
     */
    const handleSubmitVehiclesModal = useCallback(() => {
      mutate();
    }, [mutate]);

    // Data not found
    if (!isLoading && isEmpty(vehicleGroup)) {
      return <DetailDataNotFound goBackLink={`${orgLink}/vehicle-groups${searchQueryString}`} />;
    }

    return (
      <>
        <PageHeader
          title={t("vehicle_group.title")}
          description={t("vehicle_group.title_description")}
          actionHorizontal
          loading={isLoading}
          actionComponent={
            <>
              {/* Delete */}
              <Authorization
                resource="vehicle-group"
                action="delete"
                alwaysAuthorized={canDelete() || (canDeleteOwn() && equalId(vehicleGroup?.createdByUser?.id, userId))}
              >
                <Button disabled={isLoading} type="button" color="error" onClick={handleDeleteClick}>
                  {t("common.delete")}
                </Button>
              </Authorization>

              {/* Copy */}
              <Authorization resource="vehicle-group" action="new">
                <Button
                  as={Link}
                  variant="outlined"
                  disabled={isLoading}
                  href={`${orgLink}/vehicle-groups/new?copyId=${encryptedId}`}
                >
                  {t("common.copy")}
                </Button>
              </Authorization>

              {/* Edit */}
              <Authorization
                resource="vehicle-group"
                action="edit"
                alwaysAuthorized={canEdit() || (canEditOwn() && equalId(vehicleGroup?.createdByUser?.id, userId))}
              >
                <Button as={Link} disabled={isLoading} href={`${orgLink}/vehicle-groups/${encryptedId}/edit`}>
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
              <CardHeader loading={isLoading} title={t("vehicle_group.general_title")} />
              <CardContent>
                <DescriptionProperty2 label={t("vehicle_group.name")} loading={isLoading}>
                  {vehicleGroup?.name}
                </DescriptionProperty2>
                <DescriptionProperty2 count={3} multiline label={t("vehicle_group.description")} loading={isLoading}>
                  {vehicleGroup?.description}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("vehicle_group.manager")} loading={isLoading}>
                  {getAccountInfo(vehicleGroup?.manager?.member).displayName}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("vehicle_group.phone_number")} loading={isLoading}>
                  {ensureString(vehicleGroup?.manager?.phoneNumber)}
                </DescriptionProperty2>
                <DescriptionProperty2 label={t("vehicle_group.status")} loading={isLoading}>
                  <Badge
                    label={
                      vehicleGroup?.isActive ? t("vehicle_group.status_active") : t("vehicle_group.status_inactive")
                    }
                    color={vehicleGroup?.isActive ? "success" : "error"}
                  />
                </DescriptionProperty2>
              </CardContent>
            </Card>
          </div>

          {/* System info */}
          <div className="w-full space-y-4 lg:max-w-xs xl:max-w-sm">
            <SystemInfoCard loading={isLoading} entity={vehicleGroup} />
          </div>
        </div>
        <Card className="mt-4 sm:mt-6 lg:mt-8">
          <CardHeader
            loading={isLoading}
            title={t("vehicle_group.vehicles_title")}
            actionComponent={
              <Authorization
                resource="vehicle-group"
                action={["edit", "edit-own"]}
                alwaysAuthorized={canEdit() || (canEditOwn() && equalId(vehicleGroup?.createdByUser?.id, userId))}
              >
                <Button variant="outlined" size="small" onClick={handleOpenVehiclesModal} icon={PlusIcon}>
                  {t("vehicle_group.add_vehicle")}
                </Button>
              </Authorization>
            }
          />
          <CardContent padding={isLoading} className="pb-4">
            <TableContainer variant="paper" inside className="!mt-2">
              <Table dense={!isLoading}>
                <TableHead uppercase>
                  <TableRow>
                    <TableCell>{t("vehicle_group.vehicle")}</TableCell>
                    <TableCell>{t("vehicle_group.driver_name")}</TableCell>
                    <TableCell>
                      <span className="sr-only">{t("common.actions")}</span>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y divide-gray-200 bg-white">
                  {isLoading && !hasVehicles && <SkeletonTableRow rows={7} columns={5} />}

                  {!isLoading && !hasVehicles && (
                    <TableRow hover={false}>
                      <TableCell colSpan={5}>
                        <EmptyListSection
                          description={t("vehicle_group.empty_list")}
                          actionLabel={t("vehicle_group.add_vehicle")}
                          onClick={
                            isLoading ||
                            !(canEdit() || (canEditOwn() && equalId(vehicleGroup?.createdByUser?.id, userId)))
                              ? undefined
                              : handleOpenVehiclesModal
                          }
                        />
                      </TableCell>
                    </TableRow>
                  )}

                  {(vehicleGroup?.vehicles || []).map((item) => {
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Authorization
                            resource="vehicle"
                            action="detail"
                            fallbackComponent={<InfoBox label={item.vehicleNumber} subLabel={item.idNumber} />}
                          >
                            <InfoBox
                              as={Link}
                              href={`${orgLink}/vehicles/${encryptId(item.id)}`}
                              label={item.vehicleNumber}
                              subLabel={item.idNumber}
                            />
                          </Authorization>
                        </TableCell>
                        <TableCell>
                          <Authorization
                            resource="driver"
                            action="detail"
                            fallbackComponent={
                              <InfoBox
                                label={getFullName(item.driver?.firstName, item.driver?.lastName)}
                                subLabel={item.driver?.phoneNumber}
                                emptyLabel={t("common.empty")}
                              />
                            }
                          >
                            <InfoBox
                              as={Link}
                              href={`${orgLink}/drivers/${encryptId(item.driver?.id)}`}
                              label={getFullName(item.driver?.firstName, item.driver?.lastName)}
                              subLabel={item.driver?.phoneNumber}
                              emptyLabel={t("common.empty")}
                            />
                          </Authorization>
                        </TableCell>
                        <TableCell align="right" className="space-x-2 !pr-4">
                          <Authorization
                            resource="vehicle-group"
                            action={["edit", "edit-own"]}
                            alwaysAuthorized={
                              canEdit() || (canEditOwn() && equalId(vehicleGroup?.createdByUser?.id, userId))
                            }
                          >
                            <button
                              type="button"
                              data-tooltip-id="tooltip"
                              data-tooltip-content={t("common.delete")}
                              onClick={handleOpenDeleteVehicleConfirmModal(item)}
                            >
                              <TrashIcon aria-hidden="true" className="h-5 w-5 text-red-400 hover:text-red-500" />
                            </button>
                          </Authorization>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Delete group confirmation dialog */}
        <ConfirmModal
          open={isDeleteConfirmOpen}
          icon="error"
          color="error"
          title={t("common.confirmation.delete_title", { name: vehicleGroup?.name })}
          message={t("common.confirmation.delete_message")}
          onClose={handleDeleteCancel}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />

        {/* Delete vehicle confirmation dialog */}
        <ConfirmModal
          open={isDeleteVehicleConfirmOpen}
          icon="question"
          title={t("common.confirmation.delete_title", { name: selectedVehicleRef.current?.vehicleNumber })}
          message={t("common.confirmation.delete_message")}
          onClose={handleCloseDeleteVehicleConfirmModal}
          onCancel={handleCloseDeleteVehicleConfirmModal}
          onConfirm={handleConfirmDeleteVehicle}
        />

        {vehicleGroup && (
          <VehicleGroupModal
            open={isVehicleGroupOpen}
            vehicleGroup={vehicleGroup}
            onClose={handleCloseVehiclesModal}
            onSubmit={handleSubmitVehiclesModal}
          />
        )}
      </>
    );
  },
  {
    resource: "vehicle-group",
    action: "detail",
  }
);
