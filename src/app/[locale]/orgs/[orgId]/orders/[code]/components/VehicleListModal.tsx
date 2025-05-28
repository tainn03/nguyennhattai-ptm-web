"use client";

import { VehicleOwnerType } from "@prisma/client";
import { isEmpty } from "lodash";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LiaShippingFastSolid as LiaShippingFastSolidIcon } from "react-icons/lia";

import {
  DescriptionProperty2,
  InfoBox,
  Link,
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
import { useAuth, useAvailableVehiclesForDispatching, useSearchConditions } from "@/hooks";
import { useOrderState, useVehicleState } from "@/redux/states";
import { getSubcontractorsByIds } from "@/services/client/subcontractor";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { SubcontractorInfo, VehicleInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { getFilterRequest } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { getGeneralDispatchVehicleInfo } from "@/utils/order";
import { encryptId } from "@/utils/security";
import { joinNonEmptyStrings } from "@/utils/string";
import { getDistinctSubcontractorIds } from "@/utils/subcontractor";

import { DispatchVehicleModal } from ".";

type VehicleListModalProps = {
  open: boolean;
  onClose: () => void;
  onReOpen: (value: boolean) => void;
};

const VehicleListModal = ({ open, onClose, onReOpen }: VehicleListModalProps) => {
  const t = useTranslations();
  const { orgId, orgLink, userId } = useAuth();
  const { availableVehicles } = useVehicleState();
  const [filterOptions, setFilterOptions] = useSearchConditions(availableVehicles);
  const { order } = useOrderState();

  const [isOpenDispatchVehicleModal, setIsOpenDispatchVehicleModal] = useState(false);
  const [subcontractors, setSubcontractors] = useState<SubcontractorInfo[]>();
  const [isManaged, setIsManaged] = useState(false);

  const selectedVehicleRef = useRef<Partial<VehicleInfo>>();
  const updateRouteRef = useRef(false);

  const { isLoading, vehicles, pagination } = useAvailableVehiclesForDispatching({
    organizationId: orgId,
    ...getFilterRequest(filterOptions),
    ...(isManaged && { isManaged, userId }),
  });

  const subcontractorIds = useMemo(() => getDistinctSubcontractorIds(vehicles), [vehicles]);
  const fetchSubcontractors = useCallback(async () => {
    const result = await getSubcontractorsByIds(Number(orgId), subcontractorIds);
    setSubcontractors(result);
  }, [orgId, subcontractorIds]);

  const { unitCode, totalTripWeight, remainingWeight } = useMemo(() => getGeneralDispatchVehicleInfo(order), [order]);

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

  const handleOpenDispatchVehicleModal = useCallback(
    (item: Partial<VehicleInfo>) => () => {
      selectedVehicleRef.current = item;
      onClose();
      setIsOpenDispatchVehicleModal(true);
    },
    [onClose]
  );

  const handleCloseDispatchVehicleModal = useCallback(() => {
    setIsOpenDispatchVehicleModal(false);
    selectedVehicleRef.current = undefined;
    onReOpen(true);
  }, [onReOpen]);

  const handleConfirmDispatchVehicle = useCallback(
    (isMaxPayloadReached: boolean) => {
      handleCloseDispatchVehicleModal();
      isMaxPayloadReached && onClose();
      selectedVehicleRef.current = undefined;
    },
    [handleCloseDispatchVehicleModal, onClose]
  );

  const handleClose = useCallback(() => {
    onClose && onClose();
  }, [onClose]);

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

  const handleFilterApply = useCallback(
    (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
      updateRouteRef.current = true;
      setFilterOptions((prevValue) => {
        const { pagination, ...values } = prevValue;
        const newValue: FilterOptions = {
          pagination: {
            ...pagination,
            page: 1,
          },
        };
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

  return (
    <>
      <Modal open={open} size="7xl" showCloseButton onClose={handleClose}>
        <ModalHeader title={t("order.vehicle_dispatch.vehicles.title")} />
        <ModalContent padding={false}>
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
                <div className="flex w-full items-center justify-between space-x-6 px-2">
                  <div className="flex-1 truncate">
                    <ul role="list" className="grid grid-cols-1 gap-x-4 md:grid-cols-8">
                      <li className="px-3 md:col-span-4 md:p-3">
                        <DescriptionProperty2
                          loading={isLoading}
                          label={t("order.vehicle_dispatch.vehicles.unit_of_measure")}
                        >
                          {unitCode}
                        </DescriptionProperty2>
                        <DescriptionProperty2 loading={isLoading} label={t("order.vehicle_dispatch.vehicles.quantity")}>
                          <NumberLabel value={order?.weight} unit={unitCode} emptyLabel="0" />
                        </DescriptionProperty2>
                      </li>

                      <li className="px-3 pb-3 md:col-span-4 md:p-3">
                        <DescriptionProperty2
                          loading={isLoading}
                          label={t("order.vehicle_dispatch.vehicles.has_transported")}
                        >
                          <NumberLabel value={totalTripWeight} unit={unitCode} emptyLabel="0" />
                        </DescriptionProperty2>
                        <DescriptionProperty2
                          loading={isLoading}
                          label={t("order.vehicle_dispatch.vehicles.remaining")}
                        >
                          <NumberLabel value={remainingWeight} unit={unitCode} emptyLabel="0" />
                        </DescriptionProperty2>
                      </li>
                    </ul>
                  </div>
                </div>
              </li>
            </ul>
          </div>

          <TableContainer
            horizontalScroll
            verticalScroll
            stickyHeader
            inside
            variant="paper"
            fullHeight
            className="!mt-4"
            footer={
              (pagination?.pageCount || 0) > 0 && (
                <Pagination
                  className="mt-4 w-full px-4 pb-4 sm:p-6"
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
                  {/* 1. Vehicle Number */}
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

                  {/* 2. Driver */}
                  <TableCell>
                    <TableFilterMenu
                      label={t("order.vehicle_dispatch.vehicles.driver")}
                      className="text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.driverName}
                      onApply={handleFilterApply("driverName")}
                    />
                  </TableCell>

                  {/* 3. Owner */}
                  <TableCell>
                    <TableFilterMenu
                      label={t("order.vehicle_dispatch.vehicles.owner")}
                      className="text-xs text-gray-500 [&>span]:uppercase"
                      {...filterOptions.ownerType}
                      onApply={handleFilterApply("ownerType")}
                    />
                  </TableCell>

                  {/* 4. Size */}
                  <TableCell>
                    <span className="text-xs uppercase text-gray-500">{t("order.vehicle_dispatch.vehicles.size")}</span>
                  </TableCell>

                  {/* 5. Payload Capacity */}
                  <TableCell>
                    <span className="text-xs uppercase text-gray-500">
                      {t("order.vehicle_dispatch.vehicles.payloadCapacity")}
                    </span>
                  </TableCell>

                  {/* 6. Type */}
                  <TableCell>
                    <span className="text-xs uppercase text-gray-500">{t("order.vehicle_dispatch.vehicles.type")}</span>
                  </TableCell>

                  {/* 7. Actions */}
                  <TableCell className="w-[120px]">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading && vehicles.length === 0 && <SkeletonTableRow rows={10} columns={7} />}

                {!isLoading && vehicles.length === 0 && (
                  <TableRow hover={false} className="mx-auto max-w-lg">
                    <TableCell colSpan={7} className="px-6 lg:px-8">
                      <EmptyListSection description={t("order.vehicle_dispatch.vehicles.empty_list")} />
                    </TableCell>
                  </TableRow>
                )}

                {/* Data */}
                {vehicles.map((item) => (
                  <TableRow key={item.id}>
                    {/* 1. Vehicle Number */}
                    <TableCell nowrap>
                      <InfoBox
                        as={Link}
                        nowrap
                        label={item.vehicleNumber}
                        subLabel={item.idNumber || item.model}
                        className="group inline-flex min-w-max"
                        href={`${orgLink}/vehicles/${encryptId(item.id)}`}
                        emptyLabel={t("common.empty")}
                      />
                    </TableCell>

                    {/* 2. Driver */}
                    <TableCell>
                      <InfoBox
                        as={Link}
                        nowrap
                        label={getFullName(item.driver?.firstName, item.driver?.lastName)}
                        subLabel={item.driver?.phoneNumber || item.driver?.email}
                        href={`${orgLink}/drivers/${encryptId(item.driver?.id)}`}
                        emptyLabel={t("common.empty")}
                      />
                    </TableCell>

                    {/* 3. Owner */}
                    <TableCell>
                      <InfoBox
                        nowrap
                        href={`${orgLink}/subcontractors/${encryptId(item.subcontractorId)}`}
                        label={
                          item.ownerType === VehicleOwnerType.ORGANIZATION
                            ? t("order.vehicle_dispatch.organization")
                            : t("order.vehicle_dispatch.subcontractor")
                        }
                        subLabel={getSubcontractorInfo(item.subcontractorId)}
                        emptyLabel={t("common.empty")}
                      />
                    </TableCell>

                    {/* 4. Size */}
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

                    {/* 5. Payload Capacity */}
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

                    {/* 6. Type */}
                    <TableCell>{item.type?.name || t("common.empty")}</TableCell>

                    {/* 7. Actions */}
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
                          data-tooltip-content={t("order.vehicle_dispatch.vehicles.dispatch")}
                          icon={LiaShippingFastSolidIcon}
                          onClick={handleOpenDispatchVehicleModal(item)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </ModalContent>
      </Modal>

      <DispatchVehicleModal
        open={isOpenDispatchVehicleModal}
        onClose={handleCloseDispatchVehicleModal}
        onConfirm={handleConfirmDispatchVehicle}
        vehicle={selectedVehicleRef.current}
      />
    </>
  );
};

export default VehicleListModal;
