"use client";

import { VehicleOwnerType } from "@prisma/client";
import { useAtom } from "jotai";
import isEmpty from "lodash/isEmpty";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiaShippingFastSolid as LiaShippingFastSolidIcon } from "react-icons/lia";

import {
  DescriptionProperty2,
  InfoBox,
  Link,
  ModalActions,
  ModalContent,
  ModalHeader,
  NumberLabel,
  SkeletonTableRow,
  Switcher,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Button, EmptyListSection, Modal, QuickSearch, TableFilterMenu } from "@/components/molecules";
import { FilterStatus, Pagination } from "@/components/organisms";
import { useAuth, useAvailableVehiclesForDispatching, useIdParam, useSearchConditions } from "@/hooks";
import { useVehicleState } from "@/redux/states";
import { getSubcontractorsByIds } from "@/services/client/subcontractor";
import { orderGroupAtom } from "@/states";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { SubcontractorInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { getFilterRequest } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { joinNonEmptyStrings } from "@/utils/string";
import { getDistinctSubcontractorIds } from "@/utils/subcontractor";

type VehicleSelectionModalProps = {
  open: boolean;
  onSelectVehicle: (vehicle: VehicleInfo) => void;
  onClose: () => void;
};

export default function VehicleSelectionModal({ open, onSelectVehicle, onClose }: VehicleSelectionModalProps) {
  const t = useTranslations();
  const { orgId, userId, orgLink } = useAuth();

  const { encryptId } = useIdParam();
  const { availableVehicles } = useVehicleState();
  const [filterOptions, setFilterOptions] = useSearchConditions(availableVehicles);
  const [{ selectedOrders }] = useAtom(orderGroupAtom);

  const [isManaged, setIsManaged] = useState(false);
  const [subcontractors, setSubcontractors] = useState<SubcontractorInfo[]>();

  const updateRouteRef = useRef(false);

  const { isLoading, vehicles, pagination } = useAvailableVehiclesForDispatching({
    organizationId: orgId,
    ...getFilterRequest(filterOptions),
    ...(isManaged && { isManaged, userId }),
  });

  const subcontractorIds = useMemo(() => getDistinctSubcontractorIds(vehicles), [vehicles]);

  /**
   * Fetch subcontractors by ids
   */
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

  /**
   * Get total weight from selected orders
   */
  const totalWeight = useMemo(() => {
    return selectedOrders.reduce((acc, order) => acc + (order.weight ?? 0), 0);
  }, [selectedOrders]);

  /**
   * Get unique unit from selected orders
   */
  const uniqueUnit = useMemo(() => {
    return selectedOrders
      .map((order) => order.unit?.code)
      .filter((value, index, self) => self.indexOf(value) === index)
      .join(", ");
  }, [selectedOrders]);

  /**
   * Get subcontractor info by id
   *
   * @param id - Subcontractor id
   * @returns Subcontractor info
   */
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
   * Handle changing page
   * @param page - New page
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
   * Handle changing page size
   * @param pageSize - New page size
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
   * Handle applying filters and sort type for a specific column
   * @param columnName - Name of the column to apply filters to
   * @returns Callback function that takes filters and optional sort type
   */
  const handleFilterApply = useCallback(
    (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
      // Set flag to update route
      updateRouteRef.current = true;

      setFilterOptions((prevValue) => {
        // Extract pagination and remaining filter values
        const { pagination, ...values } = prevValue;

        // Create new filter options with reset page number
        const newValue: FilterOptions = {
          pagination: {
            ...pagination,
            page: 1,
          },
        };

        // Update filter values for each column
        Object.keys(values).forEach((key) => {
          let value = values[key];

          // Clear sort type if new one provided
          if (sortType) {
            value.sortType = undefined;
          }

          // Update filters and sort type for target column
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

  const handleFilterChange = useCallback((options: FilterOptions) => {
    updateRouteRef.current = true;
    setFilterOptions(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Switch to get data under management or not
   */
  const handleSwitcherChange = useCallback(() => {
    setIsManaged((prev) => !prev);
  }, []);

  /**
   * Handle select vehicle
   * @param vehicle - Vehicle info
   */
  const handleSelectVehicle = useCallback(
    (vehicle: VehicleInfo) => () => {
      onSelectVehicle(vehicle);
    },
    [onSelectVehicle]
  );

  return (
    <>
      <Modal open={open} size="7xl" showCloseButton onClose={onClose}>
        <ModalHeader title={t("order.vehicle_dispatch.vehicles.title")} />
        <ModalContent padding={false} className="max-h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden">
          <div className="flex flex-wrap justify-between gap-x-6">
            <div>
              <QuickSearch
                className="px-4 pt-4 sm:px-6 sm:pt-6"
                {...filterOptions.keywords}
                onSearch={handleFilterApply("keywords")}
              />
              <Switcher
                className="mt-4 px-4 sm:px-6"
                label={t("order.vehicle_dispatch.vehicles.show_under_management")}
                checked={isManaged}
                onChange={handleSwitcherChange}
              />
              <FilterStatus className="mt-2 px-4 sm:px-6" options={filterOptions} onChange={handleFilterChange} />
            </div>

            <ul role="list" className="shrink rounded-lg">
              <li className="w-full">
                <div className="flex w-full items-center justify-end space-x-6 px-2">
                  <div className="flex-1 truncate">
                    <ul role="list" className="grid grid-cols-1 gap-x-4 md:grid-cols-8">
                      <li className="px-3 md:col-span-4 md:p-3">
                        <DescriptionProperty2
                          loading={isLoading}
                          label={t("order.vehicle_dispatch.vehicles.unit_of_measure")}
                        >
                          {uniqueUnit}
                        </DescriptionProperty2>
                        <DescriptionProperty2 loading={isLoading} label={t("order.vehicle_dispatch.vehicles.quantity")}>
                          <NumberLabel value={totalWeight} unit={uniqueUnit} emptyLabel={t("common.empty")} />
                        </DescriptionProperty2>
                      </li>
                    </ul>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <TableContainer className="!mt-4" inside horizontalScroll>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableFilterMenu
                      label={t("order.vehicle_dispatch.vehicles.vehicle_number")}
                      align="left"
                      className="pl-2 text-xs text-gray-500 [&>span]:uppercase"
                      actionPlacement="right"
                      {...filterOptions.vehicleNumber}
                      onApply={handleFilterApply("vehicleNumber")}
                    />
                  </TableCell>
                  <TableCell>
                    <TableFilterMenu
                      label={t("order.vehicle_dispatch.vehicles.driver")}
                      className="text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.driverName}
                      onApply={handleFilterApply("driverName")}
                    />
                  </TableCell>
                  <TableCell>
                    <TableFilterMenu
                      label={t("order.vehicle_dispatch.vehicles.owner")}
                      className="text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.ownerType}
                      onApply={handleFilterApply("ownerType")}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="text-xs uppercase text-gray-500">{t("order.vehicle_dispatch.vehicles.size")}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs uppercase text-gray-500">
                      {t("order.vehicle_dispatch.vehicles.payloadCapacity")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <TableFilterMenu
                      label={t("order.vehicle_dispatch.vehicles.type")}
                      className="text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.vehicleType}
                      onApply={handleFilterApply("vehicleType")}
                    />
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && vehicles.length === 0 && <SkeletonTableRow rows={10} columns={9} />}

                {!isLoading && vehicles.length === 0 && (
                  <TableRow hover={false} className="mx-auto max-w-lg">
                    <TableCell colSpan={9} className="px-6 lg:px-8">
                      <EmptyListSection description={t("order.vehicle_dispatch.vehicles.empty_list")} />
                    </TableCell>
                  </TableRow>
                )}

                {/* Data */}
                {vehicles.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Link
                        useDefaultStyle
                        color="secondary"
                        href={`${orgLink}/vehicles/${encryptId(item.id)}`}
                        className="group inline-flex min-w-max pl-2"
                      >
                        <div className="flex flex-col text-left">
                          <p className="whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-gray-900">
                            {item.vehicleNumber}
                          </p>
                          {(item.idNumber || item.model) && (
                            <div className="whitespace-nowrap text-xs font-medium text-gray-500 group-hover:text-gray-700">
                              {item.idNumber || item.model}
                            </div>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {item.driver?.publishedAt !== null && (item.driver?.firstName || item.driver?.lastName) ? (
                        <Link
                          useDefaultStyle
                          color="secondary"
                          href={`${orgLink}/drivers/${encryptId(item.driver?.id)}`}
                          className="group inline-flex min-w-max"
                        >
                          <div className="flex flex-col text-left">
                            <p className="whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-gray-900">
                              {getFullName(item.driver?.firstName, item.driver?.lastName)}
                            </p>

                            {(item.driver?.phoneNumber || item.driver?.email) && (
                              <div className="whitespace-nowrap text-xs font-medium text-gray-500 group-hover:text-gray-700">
                                {item.driver?.phoneNumber || item.driver?.email}
                              </div>
                            )}
                          </div>
                        </Link>
                      ) : (
                        <span className="font-normal text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.ownerType === VehicleOwnerType.ORGANIZATION ? (
                        t("order.vehicle_dispatch.organization")
                      ) : (
                        <Link
                          useDefaultStyle
                          color="secondary"
                          className="cursor-pointer"
                          href={`${orgLink}/subcontractors/${encryptId(item.subcontractorId)}`}
                        >
                          <InfoBox
                            label={t("order.vehicle_dispatch.subcontractor")}
                            subLabel={getSubcontractorInfo(item.subcontractorId)}
                          />
                        </Link>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.maxLength ||
                      item.maxWidth ||
                      item.maxHeight ||
                      item.trailer?.maxLength ||
                      item.trailer?.maxWidth ||
                      item.trailer?.maxHeight ? (
                        <>
                          {item.maxLength || item.maxWidth || item.maxHeight ? (
                            <span className="inline-flex flex-row [&>span::after]:mx-1 [&>span::after]:content-['x'] [&>span:last-child::after]:content-none">
                              <span>
                                <NumberLabel
                                  value={Number(item.maxLength)}
                                  emptyLabel="--"
                                  unit={t("common.unit.meter").toLowerCase()}
                                  useSpace={false}
                                />
                              </span>
                              <span>
                                <NumberLabel
                                  value={Number(item.maxWidth)}
                                  emptyLabel="--"
                                  unit={t("common.unit.meter").toLowerCase()}
                                  useSpace={false}
                                />
                              </span>
                              <span>
                                <NumberLabel
                                  value={Number(item.maxHeight)}
                                  emptyLabel="--"
                                  unit={t("common.unit.meter").toLowerCase()}
                                  useSpace={false}
                                />
                              </span>
                            </span>
                          ) : (
                            <>-</>
                          )}
                          <br />
                          {(item.trailer?.maxLength || item.trailer?.maxWidth || item.trailer?.maxHeight) && (
                            <span className="inline-flex flex-row [&>span::after]:mx-1 [&>span::after]:content-['x'] [&>span:last-child::after]:content-none">
                              <span>
                                <NumberLabel
                                  value={Number(item.trailer?.maxLength)}
                                  emptyLabel="--"
                                  unit={t("common.unit.meter").toLowerCase()}
                                  useSpace={false}
                                />
                              </span>
                              <span>
                                <NumberLabel
                                  value={Number(item.trailer?.maxWidth)}
                                  emptyLabel="--"
                                  unit={t("common.unit.meter").toLowerCase()}
                                  useSpace={false}
                                />
                              </span>
                              <span>
                                <NumberLabel
                                  value={Number(item.trailer?.maxHeight)}
                                  emptyLabel="--"
                                  unit={t("common.unit.meter").toLowerCase()}
                                  useSpace={false}
                                />
                              </span>
                            </span>
                          )}
                        </>
                      ) : (
                        <>-</>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.tonPayloadCapacity ||
                      item.palletCapacity ||
                      item.cubicMeterCapacity ||
                      item.trailer?.tonPayloadCapacity ||
                      item.trailer?.palletCapacity ||
                      item.trailer?.cubicMeterCapacity ? (
                        <>
                          {item.tonPayloadCapacity || item.palletCapacity || item.cubicMeterCapacity ? (
                            <span className="inline-flex flex-row gap-x-1 [&>span::after]:content-[','] [&>span:last-child::after]:content-none">
                              {item.tonPayloadCapacity && (
                                <span>
                                  <NumberLabel
                                    value={Number(item.tonPayloadCapacity)}
                                    unit={t("common.unit.ton").toLowerCase()}
                                  />
                                </span>
                              )}
                              {item.palletCapacity && (
                                <span>
                                  <NumberLabel
                                    value={Number(item.palletCapacity)}
                                    unit={t("common.unit.pallet").toLowerCase()}
                                  />
                                </span>
                              )}
                              {item.cubicMeterCapacity && (
                                <span>
                                  <NumberLabel
                                    value={Number(item.cubicMeterCapacity)}
                                    unit={t("common.unit.cubic_meter").toLowerCase()}
                                  />
                                </span>
                              )}
                            </span>
                          ) : (
                            <>-</>
                          )}
                          <br />
                          {!isEmpty(item.trailer) &&
                            (item.trailer?.tonPayloadCapacity ||
                              item.trailer?.palletCapacity ||
                              item.trailer?.cubicMeterCapacity) && (
                              <span className="inline-flex flex-row gap-x-1 [&>span::after]:content-[','] [&>span:last-child::after]:content-none">
                                {item.trailer?.tonPayloadCapacity && (
                                  <span>
                                    <NumberLabel
                                      value={Number(item.trailer?.tonPayloadCapacity)}
                                      unit={t("common.unit.ton").toLowerCase()}
                                    />
                                  </span>
                                )}
                                {item.trailer?.palletCapacity && (
                                  <span>
                                    <NumberLabel
                                      value={Number(item.trailer?.palletCapacity)}
                                      unit={t("common.unit.pallet").toLowerCase()}
                                    />
                                  </span>
                                )}
                                {item.trailer?.cubicMeterCapacity && (
                                  <span>
                                    <NumberLabel
                                      value={Number(item.trailer?.cubicMeterCapacity)}
                                      unit={t("common.unit.cubic_meter").toLowerCase()}
                                    />
                                  </span>
                                )}
                              </span>
                            )}
                        </>
                      ) : (
                        <>-</>
                      )}
                    </TableCell>
                    <TableCell>{item.type?.name || t("common.empty")}</TableCell>
                    <TableCell>
                      <div className="flex justify-end pr-4">
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={
                            item.ownerType === VehicleOwnerType.ORGANIZATION &&
                            (!item.driver?.id || !item.driver?.publishedAt)
                          }
                          data-tooltip-id="tooltip"
                          data-tooltip-content={t("components.vehicle_selection_modal.select_vehicle")}
                          icon={LiaShippingFastSolidIcon}
                          onClick={handleSelectVehicle(item)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </ModalContent>

        <ModalActions className="flex w-full items-end">
          {(pagination?.pageCount || 0) > 0 && (
            <Pagination
              className="w-full "
              showPageSizeOptions
              page={pagination?.page}
              total={pagination?.total}
              pageSize={pagination?.pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </ModalActions>
      </Modal>
    </>
  );
}
