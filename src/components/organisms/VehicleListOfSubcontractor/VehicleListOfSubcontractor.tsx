"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge, Card, CardContent, CardHeader, Link, Spinner } from "@/components/atoms";
import { Authorization, EmptyListSection, MasterActionTable } from "@/components/molecules";
import { ConfirmModal, Pagination } from "@/components/organisms";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { useIdParam, usePermission, useVehicleList } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { deleteVehicle } from "@/services/client/vehicle";
import { VehicleInfo } from "@/types/strapi";
import { getFilterRequest } from "@/utils/filter";
import { equalId } from "@/utils/number";

export type VehicleListOfSubcontractorProps = {
  orgLink: string;
  orgId: number;
  userId: number;
  subcontractorId: number;
  subcontractorName: string;
};
const searchConditionsVehicle = {
  pagination: {
    page: 1,
    pageSize: PAGE_SIZE_OPTIONS[0],
    defaultSort: "updatedAt:desc",
    filters: [],
  },
};

const VehicleListOfSubcontractor = ({
  orgLink,
  orgId,
  userId,
  subcontractorId,
  subcontractorName,
}: VehicleListOfSubcontractorProps) => {
  const t = useTranslations();
  const { encryptId } = useIdParam();
  const { showNotification } = useNotification();
  const [filterOptionsVehicle, setFilterOptionsVehicle] = useState(searchConditionsVehicle);
  const [isDeleteConfirmOpenVehicle, setIsDeleteConfirmOpenVehicle] = useState(false);
  const { canEdit, canEditOwn, canDelete, canDeleteOwn } = usePermission("vehicle");
  const [isSetAction, setIsSetAction] = useState(false);

  const selectedVehicleRef = useRef<VehicleInfo>();

  const { isLoading, vehicles, pagination, mutate } = useVehicleList({
    subcontractorId: subcontractorId,
    organizationId: Number(orgId),
    ...getFilterRequest(filterOptionsVehicle),
  });

  /**
   * Handles a change in the current page for the vehicle list. This function updates the filter options
   * for the vehicle list, setting the page to the new page number.
   * @param page - The new page number.
   */
  const handlePageChangeVehicle = useCallback(
    (page: number) => {
      setFilterOptionsVehicle((prevValue) => ({
        ...prevValue,
        pagination: {
          ...prevValue.pagination,
          page,
        },
      }));
    },
    [setFilterOptionsVehicle]
  );

  useEffect(() => {
    if (canEdit() || canDelete()) {
      setIsSetAction(true);
    }
    if (canEditOwn() || canDeleteOwn()) {
      for (const vehicle of vehicles) {
        if (equalId(vehicle.createdByUser?.id, userId)) {
          setIsSetAction(true);
          break;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles]);

  /**
   * Handles a change in the page size for the vehicle list. This function updates the filter options
   * for the vehicle list, setting the page to the first page and the new page size.
   * @param pageSize - The new page size.
   */
  const handlePageSizeChangeVehicle = useCallback(
    (pageSize: number) => {
      setFilterOptionsVehicle((prevValue) => ({
        ...prevValue,
        pagination: {
          ...prevValue.pagination,
          page: 1,
          pageSize,
        },
      }));
    },
    [setFilterOptionsVehicle]
  );

  /**
   * Callback function for canceling and closing a dialog.
   */
  const handleDeleteCancelVehicle = useCallback(() => {
    setIsDeleteConfirmOpenVehicle(false);
  }, []);

  /**
   * Handles the initiation of the vehicle deletion process by setting the selected vehicle,
   * and then opens the confirmation dialog to confirm the deletion.
   * @param item - The vehicle information to be deleted.
   */
  const handleDeleteVehicle = useCallback(
    (item: VehicleInfo) => () => {
      selectedVehicleRef.current = item;
      setIsDeleteConfirmOpenVehicle(true);
    },
    []
  );

  /**
   * Handles the confirmation of vehicle deletion. It sends a request to delete the selected vehicle,
   * shows a success or error notification, and then cancels the delete operation. Afterward, it triggers
   * a data mutation to reflect the changes in the user interface.
   */
  const handleDeleteConfirmVehicle = useCallback(async () => {
    if (selectedVehicleRef.current?.id && userId) {
      const { error } = await deleteVehicle({
        organizationId: Number(orgId),
        id: Number(selectedVehicleRef.current.id),
        updatedById: userId,
      });

      if (error) {
        showNotification({
          color: "error",
          title: t("common.message.delete_error_title"),
          message: t("common.message.delete_error_message", {
            name: selectedVehicleRef.current?.vehicleNumber,
          }),
        });
      } else {
        showNotification({
          color: "success",
          title: t("common.message.delete_success_title"),
          message: t("common.message.delete_success_message", {
            name: selectedVehicleRef.current?.vehicleNumber,
          }),
        });
      }
    }
    handleDeleteCancelVehicle();
    mutate();
  }, [handleDeleteCancelVehicle, mutate, orgId, showNotification, t, userId]);

  return (
    <>
      <Card className="h-full">
        <CardHeader title={t("subcontractor.vehicle_list")} subTitle={subcontractorName} />
        <CardContent padding={false} className="grid max-w-4xl grid-cols-1 gap-x-6 gap-y-8 md:col-span-2">
          {/* Loading skeleton */}
          {isLoading && vehicles.length === 0 && (
            <div className="mx-auto my-6 max-w-lg text-center">
              <Spinner size="large" />
            </div>
          )}

          {/* Empty state and empty customerId */}
          {!isLoading && vehicles.length === 0 && subcontractorId === 0 && <EmptyListSection description=" " />}

          {/* Empty state */}
          {!isLoading && vehicles.length === 0 && subcontractorId !== 0 && (
            <Authorization
              resource="vehicle"
              action="new"
              fallbackComponent={<EmptyListSection showCreationSuggestion={false} />}
            >
              <EmptyListSection actionLink={`${orgLink}/subcontractors/${encryptId(subcontractorId)}/vehicles/new`} />
            </Authorization>
          )}

          {/* Data list */}
          <ul role="list" className="divide-y divide-gray-100">
            {vehicles.map((vehicle) => (
              <li
                key={vehicle.id}
                className="flex h-[60px] items-center justify-between gap-x-2 py-5 pl-4 pr-2 sm:gap-x-2 sm:pl-6 sm:pr-4"
              >
                <div className="min-w-0 grow">
                  <div className="flex items-start gap-x-3">
                    <p className="whitespace-nowrap text-sm font-semibold leading-6 text-gray-900">
                      <Authorization
                        resource="vehicle"
                        action="detail"
                        alwaysAuthorized={canEditOwn() && equalId(vehicle.createdByUser?.id, userId)}
                        fallbackComponent={
                          <span className="text-sm font-medium leading-6 text-gray-900">
                            {vehicle.vehicleNumber} {vehicle.idNumber ? `(${vehicle.idNumber})` : ""}
                          </span>
                        }
                      >
                        <Link
                          useDefaultStyle
                          color="secondary"
                          className="cursor-pointer"
                          href={`${orgLink}/subcontractors/${encryptId(subcontractorId)}/vehicles/${encryptId(
                            vehicle.id
                          )}`}
                        >
                          {vehicle.vehicleNumber} {vehicle.idNumber ? `(${vehicle.idNumber})` : ""}
                        </Link>
                      </Authorization>
                    </p>
                  </div>

                  {vehicle.driver && (
                    <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 text-gray-500">
                      <p title={`${vehicle.driver?.firstName} ${vehicle.driver?.lastName}`} className="truncate">
                        {vehicle.driver?.firstName} {vehicle.driver?.lastName}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-none items-center justify-end gap-x-4">
                  <div>
                    <Badge
                      label={vehicle.isActive ? t("subcontractor.vehicle_active") : t("subcontractor.vehicle_inactive")}
                      color={vehicle.isActive ? "success" : "error"}
                    />
                  </div>

                  <Authorization
                    resource="vehicle"
                    action={["edit", "delete"]}
                    type="oneOf"
                    alwaysAuthorized={
                      (canEditOwn() && equalId(vehicle.createdByUser?.id, userId)) ||
                      (canDeleteOwn() && equalId(vehicle.createdByUser?.id, userId))
                    }
                    fallbackComponent={<>{isSetAction && <span className="w-6" />}</>}
                  >
                    <MasterActionTable
                      editLink={
                        canEdit() || (canEditOwn() && equalId(vehicle.createdByUser?.id, userId))
                          ? `${orgLink}/subcontractors/${encryptId(subcontractorId)}/vehicles/${encryptId(
                              vehicle.id
                            )}/edit`
                          : ""
                      }
                      onDelete={
                        canDelete() || (canDeleteOwn() && equalId(vehicle.createdByUser?.id, userId))
                          ? handleDeleteVehicle(vehicle)
                          : undefined
                      }
                    />
                  </Authorization>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {(pagination?.pageCount || 0) > 0 && (
        <Pagination
          className="mt-4"
          showPageSizeOptions={false}
          page={pagination?.page}
          total={pagination?.total}
          pageSize={pagination?.pageSize}
          onPageChange={handlePageChangeVehicle}
          onPageSizeChange={handlePageSizeChangeVehicle}
        />
      )}
      <ConfirmModal
        open={isDeleteConfirmOpenVehicle}
        icon="error"
        color="error"
        title={t("common.confirmation.delete_title", { name: selectedVehicleRef.current?.vehicleNumber })}
        message={t("common.confirmation.delete_message")}
        onClose={handleDeleteCancelVehicle}
        onCancel={handleDeleteCancelVehicle}
        onConfirm={handleDeleteConfirmVehicle}
      />
    </>
  );
};

export default VehicleListOfSubcontractor;
