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
  TruncatedList,
} from "@/components/atoms";
import { Button, EmptyListSection, TableFilterMenu } from "@/components/molecules";
import Modal from "@/components/molecules/Modal/Modal";
import QuickSearch from "@/components/molecules/QuickSearch/QuickSearch";
import { FilterStatus, Pagination } from "@/components/organisms";
import { useAdjacentRoutePoints, useAuth, useSearchConditions } from "@/hooks";
import { routePointAtom } from "@/states";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { RoutePointInfo } from "@/types/strapi";
import { hasFilter as utilHasFilter } from "@/utils/filter";
import { getFilterRequest } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { cn } from "@/utils/twcn";

type AdjacentPointsModalProps = {
  open: boolean;
  currentPointId?: number;
  currentPoints?: Partial<RoutePointInfo>[];
  onClose: () => void;
  onConfirm: (selectedPoints: Partial<RoutePointInfo>[]) => void;
};

const AdjacentPointsModal = ({ open, currentPointId, currentPoints, onClose, onConfirm }: AdjacentPointsModalProps) => {
  const t = useTranslations();
  const { orgId } = useAuth();

  const [{ adjacentPointSearchConditions }, setAdjacentPointSearchConditions] = useAtom(routePointAtom);
  const [filterOptions, setFilterOptions] = useSearchConditions(adjacentPointSearchConditions);
  const [selectedPoints, setSelectedPoints] = useState<Partial<RoutePointInfo>[]>([]);

  const { isLoading, points, pagination } = useAdjacentRoutePoints({
    organizationId: orgId,
    excludeId: currentPointId,
    ...getFilterRequest(filterOptions),
  });

  const updatePointRef = useRef(false);

  /**
   * Updating search params.
   */
  useEffect(() => {
    if (updatePointRef.current) {
      setAdjacentPointSearchConditions((prev) => ({
        ...prev,
        adjacentPointSearchConditions: filterOptions,
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
      updatePointRef.current = true;
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
      updatePointRef.current = true;
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
      updatePointRef.current = true;
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
      updatePointRef.current = true;
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
        setSelectedPoints(points);
      } else {
        setSelectedPoints([]);
      }
    },
    [points]
  );

  /**
   * Callback function for handling selection of a specific zone.
   *
   * @param zone - The zone to be selected
   */
  const handleSelectZone = useCallback(
    (point: Partial<RoutePointInfo>) => () => {
      if (selectedPoints.find((p) => equalId(p.id, point.id))) {
        setSelectedPoints((prev) => prev.filter((p) => p.id !== point.id));
      } else {
        setSelectedPoints((prev) => [...prev, point]);
      }
    },
    [selectedPoints, setSelectedPoints]
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
    if (open && currentPoints?.length) {
      setSelectedPoints(currentPoints);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /**
   * Callback function for handling the save action.
   */
  const handleSave = useCallback(() => {
    onConfirm(selectedPoints);
    onClose();
  }, [onClose, onConfirm, selectedPoints]);

  return (
    <Modal open={open} onClose={onClose} showCloseButton size="7xl">
      <ModalHeader
        title={t("route_point.select_adjacent_point")}
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
          <Table dense>
            <TableHead>
              <TableRow>
                <TableCell action>
                  <Checkbox
                    label
                    checked={!isLoading && points.length > 0 && selectedPoints.length === points.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="right"
                    label={t("route_point.code")}
                    {...filterOptions.code}
                    onApply={handleFilterApply("code")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("route_point.name")}
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("route_point.zone")}
                    {...filterOptions.zone}
                    onApply={handleFilterApply("zone")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="left"
                    label={t("route_point.adjacent_points")}
                    {...filterOptions.adjacentPoints}
                    onApply={handleFilterApply("adjacentPoints")}
                  />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && points.length === 0 && <SkeletonTableRow rows={10} columns={5} />}

              {/* Empty data */}
              {!isLoading && points.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={5} className="px-6 lg:px-8">
                    <EmptyListSection />
                  </TableCell>
                </TableRow>
              )}

              {/* Points */}
              {points.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      label
                      checked={
                        !isLoading &&
                        points.length > 0 &&
                        selectedPoints.find((point) => equalId(point.id, item.id)) !== undefined
                      }
                      onChange={handleSelectZone(item)}
                    />
                  </TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.zone?.name || t("common.empty")}</TableCell>
                  <TableCell>
                    <TruncatedList items={item.adjacentPoints?.map((point) => point.name ?? "") || []} maxVisible={2} />
                  </TableCell>
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

export default AdjacentPointsModal;
