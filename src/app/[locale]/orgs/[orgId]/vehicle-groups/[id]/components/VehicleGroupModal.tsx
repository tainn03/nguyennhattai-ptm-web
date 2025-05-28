"use client";

import { MinusIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import { VehicleOwnerType } from "@prisma/client";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  InfoBox,
  Link,
  ModalContent,
  ModalHeader,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, Button, EmptyListSection, Modal, QuickSearch, TableFilterMenu } from "@/components/molecules";
import { FilterStatus, Pagination } from "@/components/organisms";
import { useAuth, useAvailableVehiclesForGroup, usePermission, useSearchConditions } from "@/hooks";
import { useNotification } from "@/redux/actions";
import { useVehicleState } from "@/redux/states";
import { getSubcontractorsByIds } from "@/services/client/subcontractor";
import { updateVehicleListInVehicleGroup } from "@/services/client/vehicleGroup";
import { ErrorType } from "@/types";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { SubcontractorInfo, VehicleGroupInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { getFilterRequest } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { encryptId } from "@/utils/security";
import { joinNonEmptyStrings } from "@/utils/string";
import { getDistinctSubcontractorIds } from "@/utils/subcontractor";

type VehicleGroupModalProps = {
  vehicleGroup: Partial<VehicleGroupInfo>;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

const VehicleGroupModal = ({ open, onClose, onSubmit, vehicleGroup }: VehicleGroupModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink, userId } = useAuth();
  const { availableVehicles } = useVehicleState();
  const { showNotification } = useNotification();
  const [selectedVehicle, setSelectedVehicle] = useState<Partial<VehicleInfo> | null>(null);
  const [subcontractors, setSubcontractors] = useState<SubcontractorInfo[]>();

  const [filterOptions, setFilterOptions] = useSearchConditions(availableVehicles);

  const { vehicles, isLoading, pagination, mutate } = useAvailableVehiclesForGroup({
    organizationId: orgId,
    ...getFilterRequest(filterOptions),
  });
  const { canDetail: canDetailSubcontractor } = usePermission("subcontractor");

  const subcontractorIds = useMemo(() => getDistinctSubcontractorIds(vehicles), [vehicles]);
  const fetchSubcontractors = useCallback(async () => {
    const result = await getSubcontractorsByIds(Number(orgId), subcontractorIds);
    setSubcontractors(result);
  }, [orgId, subcontractorIds]);

  useEffect(() => {
    if ((subcontractorIds || []).length > 0) {
      fetchSubcontractors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subcontractorIds]);

  const getSubcontractorInfo = useCallback(
    (id: number) => {
      if (subcontractors) {
        const subcontractor = subcontractors.find((item) => equalId(item.id, id));

        if (subcontractor) {
          return joinNonEmptyStrings([subcontractor?.code, subcontractor?.name], " - ");
        }
      }
      return null;
    },
    [subcontractors]
  );

  /**
   * Handles closing the component.
   */
  const handleClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

  /**
   * Handles changing the page number for pagination.
   * This function is called when the page number is changed.
   * @param {number} page - The new page number to set.
   */
  const handlePageChange = useCallback(
    (page: number) => {
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
   * Handles changing the page size for pagination.
   * @param {number} pageSize - The new page size to set.
   */
  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
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
   * Handles applying filters and sort for a specific column.
   * This function is called when filters or sort are applied to a column.
   * @param {string} columnName - The name of the column for which filters or sort are applied.
   * @returns {Function} A function that takes filters, sort type, and applies them to the column.
   */
  const handleFilterApply = useCallback(
    (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
      // Update the filter options state based on the applied filters and sort for the specified column
      setFilterOptions((prevValue) => {
        const { pagination, ...values } = prevValue;
        const newValue: FilterOptions = {
          pagination: {
            ...pagination,
            page: 1,
          },
        };
        // Iterate over previous filter options
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Handles the change in filter options.
   * @param {FilterOptions} options - The updated filter options.
   */
  const handleFilterChange = useCallback((options: FilterOptions) => {
    setFilterOptions(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Handles adding a vehicle to the vehicle group.
   * This function is executed when a vehicle is selected to be added.
   * @param {VehicleInfo} vehicle - The vehicle to be added.
   */
  const handleVehicleGroupModification = useCallback(
    (vehicle: VehicleInfo, isRemove = false) =>
      async () => {
        // Set the selected vehicle state
        setSelectedVehicle(vehicle);
        let modifiedVehicles = vehicleGroup.vehicles || [];
        if (isRemove) {
          modifiedVehicles = modifiedVehicles.filter((v) => !equalId(v.id, vehicle.id));
        } else {
          modifiedVehicles.push(vehicle);
        }

        // Update the vehicle group with the new vehicle list
        const result = await updateVehicleListInVehicleGroup({
          id: Number(vehicleGroup.id),
          organizationId: Number(orgId),
          updatedById: Number(userId),
          vehicles: modifiedVehicles,
        });

        // Handle errors or success based on the result
        if (result.error) {
          // Show an error notification based on the error type
          if (result.error === ErrorType.EXCLUSIVE) {
            showNotification({
              color: "error",
              title: t("common.message.save_error_title"),
              message: t("common.message.save_error_exclusive", {
                name: vehicle?.vehicleNumber,
              }),
            });
          } else {
            showNotification({
              color: "error",
              title: isRemove ? t("common.message.delete_error_title") : t("common.message.save_error_title"),
              message: isRemove
                ? t("common.message.delete_error_message", { name: vehicle.vehicleNumber })
                : t("common.message.save_error_unknown", { name: vehicle.vehicleNumber }),
            });
          }
        } else {
          // Show a success notification
          showNotification({
            color: "success",
            title: isRemove ? t("common.message.delete_success_title") : t("common.message.save_success_title"),
            message: isRemove
              ? t("common.message.delete_success_message", { name: vehicle.vehicleNumber })
              : t("common.message.save_success_message", { name: vehicle.vehicleNumber }),
          });

          mutate(); // Refresh the data
          onSubmit(); // Trigger the onSubmit function
        }
        setSelectedVehicle(null); // Reset the selected vehicle state
      },
    [mutate, onSubmit, orgId, showNotification, t, userId, vehicleGroup.id, vehicleGroup.vehicles]
  );

  return (
    <>
      <Modal open={open} size="7xl" showCloseButton onClose={handleClose} onDismiss={handleClose}>
        <ModalHeader
          title={
            <div className="flex flex-col">
              <span>{t("vehicle_group.vehicles_title")}</span>
              <FilterStatus options={filterOptions} onChange={handleFilterChange} />
            </div>
          }
          actionComponent={
            <QuickSearch className="mr-8" {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
          }
        />
        <ModalContent padding={false}>
          <TableContainer
            variant="paper"
            fullHeight
            inside
            horizontalScroll
            verticalScroll
            footer={
              (pagination?.pageCount || 0) > 0 && (
                <Pagination
                  className="mt-4 px-4 pb-4 sm:p-6"
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
            <Table dense={!isLoading}>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableFilterMenu
                      label={t("vehicle_group.vehicle_number")}
                      align="left"
                      className="pl-2 text-xs text-gray-500 [&>span]:uppercase"
                      actionPlacement="right"
                      {...filterOptions.vehicleNumber}
                      onApply={handleFilterApply("vehicleNumber")}
                    />
                  </TableCell>
                  <TableCell>
                    <TableFilterMenu
                      label={t("vehicle_group.driver_name")}
                      className="text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.driverName}
                      onApply={handleFilterApply("driverName")}
                    />
                  </TableCell>
                  <TableCell>
                    <TableFilterMenu
                      label={t("vehicle_group.owner_type")}
                      className="text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.ownerType}
                      onApply={handleFilterApply("ownerType")}
                    />
                  </TableCell>
                  <TableCell className="w-[100px]">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && vehicles.length === 0 && <SkeletonTableRow rows={10} columns={4} />}

                {!isLoading && vehicles.length === 0 && (
                  <TableRow hover={false} className="mx-auto max-w-lg">
                    <TableCell colSpan={3} className="px-6 lg:px-8">
                      <EmptyListSection description={t("order.vehicle_dispatch.vehicles.empty_list")} />
                    </TableCell>
                  </TableRow>
                )}

                {/* Data */}
                {vehicles.map((item) => {
                  const isGroupAdded = (item.vehicleGroups || []).some((group) => equalId(group.id, vehicleGroup.id));
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Authorization
                          resource="vehicle"
                          action="detail"
                          fallbackComponent={
                            <InfoBox
                              label={item?.vehicleNumber}
                              subLabel={item?.idNumber}
                              emptyLabel={t("common.empty")}
                            />
                          }
                        >
                          <div className="group inline-flex min-w-max pl-2">
                            <InfoBox
                              as={Link}
                              href={`${orgLink}/vehicles/${encryptId(item.id)}`}
                              label={item?.vehicleNumber}
                              subLabel={item?.idNumber}
                            />
                          </div>
                        </Authorization>
                      </TableCell>
                      <TableCell>
                        <Authorization
                          resource="driver"
                          action="detail"
                          fallbackComponent={
                            <InfoBox
                              label={getFullName(item.driver?.firstName, item.driver?.lastName) || t("common.empty")}
                              subLabel={item.driver?.phoneNumber}
                              emptyLabel={t("common.empty")}
                            />
                          }
                        >
                          <InfoBox
                            as={Link}
                            href={`${orgLink}/drivers/${encryptId(item.driver?.id)}`}
                            label={getFullName(item.driver?.firstName, item.driver?.lastName) || t("common.empty")}
                            subLabel={item.driver?.phoneNumber}
                            emptyLabel={t("common.empty")}
                          />
                        </Authorization>
                      </TableCell>
                      <TableCell>
                        {item.ownerType === VehicleOwnerType.ORGANIZATION ? (
                          t("vehicle_group.organization")
                        ) : (
                          <InfoBox
                            as={canDetailSubcontractor() ? Link : undefined}
                            href={
                              canDetailSubcontractor()
                                ? `${orgLink}/subcontractors/${encryptId(item.subcontractorId)}`
                                : null
                            }
                            label={t("vehicle_group.subcontractor")}
                            subLabel={getSubcontractorInfo(item.subcontractorId)}
                            emptyLabel={t("common.empty")}
                          />
                        )}
                      </TableCell>
                      <TableCell align="right" className="!pr-4" action>
                        <Button
                          size="small"
                          className="min-w-full"
                          loading={!!selectedVehicle?.id && equalId(selectedVehicle.id, item.id)}
                          disabled={!!selectedVehicle?.id && !equalId(selectedVehicle.id, item.id)}
                          variant="outlined"
                          color={isGroupAdded ? "error" : "primary"}
                          icon={isGroupAdded ? MinusIcon : PlusIcon}
                          onClick={handleVehicleGroupModification(item, isGroupAdded)}
                        >
                          {isGroupAdded ? t("common.delete") : t("customer_group.add")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </ModalContent>
      </Modal>
    </>
  );
};

export default VehicleGroupModal;
