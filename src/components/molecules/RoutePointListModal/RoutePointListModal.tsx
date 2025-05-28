"use client";

import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { Button, EmptyListSection, Modal, QuickSearch, RoutePointModal, TableFilterMenu } from "@/components/molecules";
import { FilterStatus, Pagination } from "@/components/organisms";
import { RouteInputForm } from "@/forms/route";
import { RoutePointInputForm } from "@/forms/routePoint";
import { useAuth, useRoutePointList, useSearchConditions } from "@/hooks";
import { routePointAtom } from "@/states";
import { FilterOptions, FilterProperty, SortType } from "@/types/filter";
import { RoutePointInfo } from "@/types/strapi";
import { getFilterRequest, hasFilter as utilHasFilter } from "@/utils/filter";
import { equalId } from "@/utils/number";
import { cn } from "@/utils/twcn";

export type RoutePointKey = "pickupPoints" | "deliveryPoints";

export type RoutePointListModalProps = {
  open: boolean;
  route: RouteInputForm;
  point: RoutePointKey;
  onClose: () => void;
  onChange: (values: RouteInputForm) => void;
};

export default function RoutePointListModal({ open, route, point, onClose, onChange }: RoutePointListModalProps) {
  const t = useTranslations();
  const { orgId } = useAuth();

  const [{ routePointListModalConditions }] = useAtom(routePointAtom);
  const [filterOptions, setFilterOptions] = useSearchConditions(routePointListModalConditions);
  const updateRoutePointListRef = useRef(false);
  const [openRoutePointModal, setOpenRoutePointModal] = useState(false);

  const [selectedRoutePoints, setSelectedRoutePoints] = useState<RoutePointInputForm[]>([]);

  const { routePoints, pagination, isLoading, mutate } = useRoutePointList({
    organizationId: orgId,
    ...getFilterRequest(filterOptions),
  });

  const handleCloseRoutePointListModal = useCallback(() => {
    setOpenRoutePointModal(false);
  }, []);

  const handleOpenRoutePointListModal = useCallback(() => {
    setOpenRoutePointModal(true);
  }, []);

  const parseJson = (json: string): string[] => {
    try {
      const data = JSON.parse(json);
      return Array.isArray(data) ? data.map((time) => `${time.start} - ${time.end}`) : [];
    } catch (error) {
      return [];
    }
  };

  // const handleSelectAllRoutePoints = useCallback(
  //   (e: ChangeEvent<HTMLInputElement>) => {
  //     if (e.target.checked) {
  //       setSelectedRoutePoints(routePoints);
  //     } else {
  //       setSelectedRoutePoints([]);
  //     }
  //   },
  //   [routePoints, setSelectedRoutePoints]
  // );

  // const handleSelectRoutePoint = useCallback(
  //   (routePoint: RoutePointInfo) => () => {
  //     if (selectedRoutePoints.find((rp) => equalId(rp.id, routePoint.id))) {
  //       setSelectedRoutePoints((prev) => prev.filter((rp) => rp.id !== routePoint.id));
  //     } else {
  //       setSelectedRoutePoints((prev) => [...prev, routePoint]);
  //     }
  //   },
  //   [selectedRoutePoints, setSelectedRoutePoints]
  // );

  const handlePageChange = useCallback(
    (page: number) => {
      updateRoutePointListRef.current = true;
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

  const handleSelectAllRoutePoints = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
        setSelectedRoutePoints((prev) => [
          ...prev,
          ...routePoints.filter((rp) => !prev.some((selected) => equalId(selected.id, rp.id))),
        ]);
      } else {
        setSelectedRoutePoints((prev) => prev.filter((rp) => !routePoints.some((item) => equalId(item.id, rp.id))));
      }
    },
    [routePoints, setSelectedRoutePoints]
  );

  const handleSelectRoutePoint = useCallback(
    (routePoint: RoutePointInfo) => () => {
      setSelectedRoutePoints((prev) =>
        prev.some((rp) => equalId(rp.id, routePoint.id))
          ? prev.filter((rp) => !equalId(rp.id, routePoint.id))
          : [...prev, routePoint]
      );
    },
    [setSelectedRoutePoints]
  );

  const handlePageSizeChange = useCallback(
    (pageSize: number) => {
      updateRoutePointListRef.current = true;
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

  const handleFilterChange = useCallback(
    (options: FilterOptions) => {
      updateRoutePointListRef.current = true;
      setFilterOptions(options);
    },
    [setFilterOptions]
  );

  const handleFilterApply = useCallback(
    (columnName: string) => (filters: FilterProperty[], sortType?: SortType) => {
      updateRoutePointListRef.current = true;
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

  useEffect(() => {
    if (route?.[point]) {
      setSelectedRoutePoints(route[point] ?? []);
    }
  }, [route, point]);

  const hasFilter = useMemo(() => {
    return Object.keys(filterOptions).some(
      (key) => filterOptions[key].filters.some((item) => utilHasFilter(item)) || filterOptions[key].sortType
    );
  }, [filterOptions]);

  const handleSubmitForm = useCallback(() => {
    onChange && onChange({ ...route, [point]: selectedRoutePoints });
  }, [route, point, selectedRoutePoints, onChange]);

  // const isCheckAll = useMemo(() => {
  //   return !isLoading && routePoints.length > 0 && selectedRoutePoints.length === routePoints.length;
  // }, [isLoading, routePoints.length, selectedRoutePoints.length]);

  const isCheckAll = useMemo(() => {
    return (
      !isLoading &&
      routePoints.length > 0 &&
      routePoints.every((rp) => selectedRoutePoints.some((srp) => equalId(srp.id, rp.id)))
    );
  }, [isLoading, routePoints, selectedRoutePoints]);

  return (
    <Modal open={open} onClose={onClose} onDismiss={onClose} size="full" showCloseButton>
      <ModalHeader
        title={t("order.route_point_modal.title")}
        className="!justify-start"
        actionComponentClassName="flex-1"
        actionComponent={
          <div className="flex justify-between pl-5 pr-10">
            <Button onClick={handleOpenRoutePointListModal}>{t("common.new")}</Button>
            <QuickSearch {...filterOptions.keywords} onSearch={handleFilterApply("keywords")} />
          </div>
        }
      />

      <ModalContent padding={false} className="max-h-[calc(100vh-240px)] overflow-y-auto overflow-x-visible">
        {hasFilter && (
          <div className="p-4">
            <FilterStatus className="!mt-0" options={filterOptions} onChange={handleFilterChange} />
          </div>
        )}

        <TableContainer fullHeight inside horizontalScroll className="!mt-0 [&>*]:overflow-x-visible" variant="paper">
          <Table dense>
            <TableHead>
              <TableRow>
                <TableCell action>
                  <Checkbox label="" checked={isCheckAll} onChange={handleSelectAllRoutePoints} />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="right"
                    label={t("components.route_point_list_modal.code")}
                    {...filterOptions.code}
                    onApply={handleFilterApply("code")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("components.route_point_list_modal.name")}
                    {...filterOptions.name}
                    onApply={handleFilterApply("name")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("components.route_point_list_modal.zone")}
                    {...filterOptions.zone}
                    onApply={handleFilterApply("zone")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("components.route_point_list_modal.adjacent_points")}
                    {...filterOptions.adjacentPoints}
                    onApply={handleFilterApply("adjacentPoints")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("components.route_point_list_modal.pickup_times")}
                    {...filterOptions.pickupTimes}
                    onApply={handleFilterApply("pickupTimes")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    label={t("components.route_point_list_modal.delivery_times")}
                    {...filterOptions.deliveryTimes}
                    onApply={handleFilterApply("deliveryTimes")}
                  />
                </TableCell>
                <TableCell>
                  <TableFilterMenu
                    actionPlacement="left"
                    label={t("components.route_point_list_modal.vehicle_type")}
                    {...filterOptions.vehicleTypes}
                    onApply={handleFilterApply("vehicleTypes")}
                  />
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {/* Loading skeleton */}
              {isLoading && routePoints.length === 0 && (
                <SkeletonTableRow rows={10} columns={8} multilineColumnIndexes={[3, 4, 5, 6, 7]} />
              )}

              {/* Empty data */}
              {!isLoading && routePoints.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={8} className="px-6 lg:px-8">
                    <EmptyListSection />
                  </TableCell>
                </TableRow>
              )}

              {routePoints.map((routePoint) => (
                <TableRow key={routePoint.id}>
                  <TableCell action>
                    <Checkbox
                      label=""
                      checked={
                        routePoints.length > 0 &&
                        selectedRoutePoints.find((rp) => equalId(rp.id, routePoint.id)) !== undefined
                      }
                      onChange={handleSelectRoutePoint(routePoint)}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">{routePoint.code}</TableCell>
                  <TableCell className="text-sm text-gray-900">{routePoint.name}</TableCell>
                  <TableCell>{routePoint.zone?.name}</TableCell>
                  <TableCell>
                    <TruncatedList
                      items={routePoint.adjacentPoints?.map((adjacentPoint) => adjacentPoint.name ?? "") || []}
                      maxVisible={2}
                    />
                  </TableCell>
                  <TableCell>
                    <TruncatedList items={parseJson(JSON.stringify(routePoint.pickupTimes))} maxVisible={2} />
                  </TableCell>
                  <TableCell>
                    <TruncatedList items={parseJson(JSON.stringify(routePoint.deliveryTimes))} maxVisible={2} />
                  </TableCell>
                  <TableCell>
                    <TruncatedList
                      items={routePoint.vehicleTypes?.map((vehicleType) => vehicleType.name ?? "") || []}
                      maxVisible={2}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </ModalContent>

      <ModalActions
        className={cn("flex flex-nowrap gap-4", {
          "justify-between": pagination?.pageCount,
          "justify-end": !pagination?.pageCount,
        })}
      >
        {/* Pagination */}
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

        <div className="flex items-center gap-4">
          <Button variant="outlined" color="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSubmitForm} color="primary">
            {t("common.save")}
          </Button>
        </div>
      </ModalActions>

      {/* Route point modal */}
      <RoutePointModal
        mutateRoutePointList={mutate}
        open={openRoutePointModal}
        onClose={handleCloseRoutePointListModal}
      />
    </Modal>
  );
}
