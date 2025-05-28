"use client";

import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Checkbox,
  ModalActions,
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
import { Button, EmptyListSection, TableFilterMenu } from "@/components/molecules";
import Modal from "@/components/molecules/Modal/Modal";
import QuickSearch from "@/components/molecules/QuickSearch/QuickSearch";
import { FilterStatus, Pagination } from "@/components/organisms";
import { useAdjacentZones, useAuth, useSearchConditions } from "@/hooks";
import { zoneAtom } from "@/states";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { ZoneInfo } from "@/types/strapi";
import { hasFilter as utilHasFilter } from "@/utils/filter";
import { getFilterRequest } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { cn } from "@/utils/twcn";

export type AdjacentZonesModalProps = {
  open: boolean;
  currentZoneId?: number;
  currentZones?: Partial<ZoneInfo>[];
  onClose: () => void;
  onConfirm: (selectedZones: Partial<ZoneInfo>[]) => void;
};

const AdjacentZonesModal = ({ open, currentZoneId, currentZones, onClose, onConfirm }: AdjacentZonesModalProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();

  const [{ adjacentZoneSearchConditions }, setAdjacentZoneSearchConditions] = useAtom(zoneAtom);
  const [filterOptions, setFilterOptions] = useSearchConditions(adjacentZoneSearchConditions);
  const [selectedZones, setSelectedZones] = useState<Partial<ZoneInfo>[]>([]);

  const { isLoading, zones, pagination } = useAdjacentZones({
    organizationId: orgId,
    excludeId: currentZoneId,
    ...getFilterRequest(filterOptions),
  });

  const updateZoneRef = useRef(false);

  /**
   * Updating search params.
   */
  useEffect(() => {
    if (updateZoneRef.current) {
      setAdjacentZoneSearchConditions((prev) => ({
        ...prev,
        adjacentZoneSearchConditions: filterOptions,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions]);

  /**
   * Callback function for handling page changes.
   *
   * @param page - The new page number to be set in the pagination state.
   */
  const handlePageChange = useCallback(
    (page: number) => {
      updateZoneRef.current = true;
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
   * Callback function for handling changes in the page size.
   *
   * @param pageSize - The new page size to be set in the pagination state.
   */
  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
      updateZoneRef.current = true;
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
   * Callback function for applying filters to a specific column and updating filter options.
   *
   * @param columnName - The name or identifier of the column to which the filters should be applied.
   * @param filters - An array of filter properties to apply to the column.
   * @param sortType - An optional sorting order ("asc" or "desc") to apply to the column.
   */
  const handleFilterApply = useCallback(
    (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
      updateZoneRef.current = true;
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
    [setFilterOptions]
  );

  /**
   * Callback function for handling changes in filter options.
   *
   * @param options - The new filter options to set.
   */
  const handleFilterChange = useCallback(
    (options: FilterOptions) => {
      updateZoneRef.current = true;
      setFilterOptions(options);
    },
    [setFilterOptions]
  );

  /**
   * Callback function for handling selection/deselection of all zones.
   *
   * @param e - The checkbox change event
   */
  const handleSelectAll = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedZones(zones);
      } else {
        setSelectedZones([]);
      }
    },
    [zones]
  );

  /**
   * Callback function for handling selection of a specific zone.
   *
   * @param zone - The zone to be selected
   */
  const handleSelectZone = useCallback(
    (zone: Partial<ZoneInfo>) => () => {
      if (selectedZones.find((z) => equalId(z.id, zone.id))) {
        setSelectedZones((prev) => prev.filter((z) => z.id !== zone.id));
      } else {
        setSelectedZones((prev) => [...prev, zone]);
      }
    },
    [selectedZones, setSelectedZones]
  );

  /**
   * Check if there are any active filters in the filter options.
   *
   * @returns {boolean} True if there are active filters, false otherwise.
   */
  const hasFilterOrSort = useMemo(() => {
    return Object.keys(filterOptions).some(
      (key) => filterOptions[key].filters.some((item) => utilHasFilter(item)) || filterOptions[key].sortType
    );
  }, [filterOptions]);

  /**
   * Effect to set selected zones when the modal opens and there are current zones.
   */
  useEffect(() => {
    if (open && currentZones?.length) {
      setSelectedZones(currentZones);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Callback function for handling the save action.
   */
  const handleSave = useCallback(() => {
    onConfirm(selectedZones);
    onClose();
  }, [onClose, onConfirm, selectedZones]);

  return (
    <Modal open={open} onClose={onClose} showCloseButton size="6xl">
      <ModalHeader
        title={t("zone.select_adjacent_zone")}
        actionComponentClassName="mr-10"
        actionComponent={<QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />}
      />
      <ModalContent padding={false} className="max-h-[calc(100vh-240px)] overflow-y-auto overflow-x-hidden">
        {hasFilterOrSort && (
          <div className="p-4">
            <FilterStatus className="!mt-0" options={filterOptions} onChange={handleFilterChange} />
          </div>
        )}

        <TableContainer fullHeight horizontalScroll inside className="!mt-0" variant="paper">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell action>
                  <Checkbox
                    label=""
                    checked={!isLoading && zones.length > 0 && selectedZones.length === zones.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="right"
                    label={t("zone.name")}
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("zone.parent")}
                    {...filterOptions.parent}
                    onApply={handleFilterApply("parent")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="left"
                    label={t("zone.adjacent_zones")}
                    {...filterOptions.adjacentZones}
                    onApply={handleFilterApply("adjacentZones")}
                  />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && zones.length === 0 && <SkeletonTableRow rows={10} columns={4} />}

              {/* Empty data */}
              {!isLoading && zones.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={4} className="px-6 lg:px-8">
                    <EmptyListSection />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {zones.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      label
                      checked={
                        !isLoading &&
                        zones.length > 0 &&
                        selectedZones.find((zone) => equalId(zone.id, item.id)) !== undefined
                      }
                      onChange={handleSelectZone(item)}
                    />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.parent?.name || t("common.empty")}</TableCell>
                  <TableCell>{item.adjacentZones?.map((zones) => zones.name).join(", ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ModalContent>

      <ModalActions
        className={cn("flex flex-nowrap gap-4 border-t border-gray-200", {
          "justify-between": pagination?.pageCount,
          "justify-end": !pagination?.pageCount,
        })}
      >
        {(pagination?.pageCount || 0) > 0 && (
          <Pagination
            showBorderTop={false}
            className="flex-1"
            showPageSizeOptions
            page={pagination?.page}
            total={pagination?.total}
            pageSize={pagination?.pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
        <div className="flex items-center gap-4 py-4">
          <Button type="button" variant="outlined" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSave}>
            {t("common.save")}
          </Button>
        </div>
      </ModalActions>
    </Modal>
  );
};

export default AdjacentZonesModal;
