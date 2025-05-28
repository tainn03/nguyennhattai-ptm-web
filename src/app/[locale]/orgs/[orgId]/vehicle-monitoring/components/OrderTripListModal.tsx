"use client";

import { Disclosure } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { Fragment, memo, useCallback, useEffect, useState } from "react";

import {
  Badge,
  DateTimeLabel,
  InfoBox,
  Link,
  ModalContent,
  ModalHeader,
  NumberLabel,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, EmptyListSection, Modal } from "@/components/molecules";
import { Pagination, RoutePointInfoModal } from "@/components/organisms";
import { OrderTab } from "@/constants/order";
import { useAuth, useOrderTripsByDayAndVehicle, useOrgSettingExtendedStorage, useSearchConditions } from "@/hooks";
import { orderTripAtom } from "@/states";
import { formatDate, getClientTimezone } from "@/utils/date";
import { getFilterRequest } from "@/utils/filter";
import { tripSteps } from "@/utils/prototype";
import { encryptId } from "@/utils/security";
import { ensureString } from "@/utils/string";

import OrderTripStatusProcess from "./OrderTripStatusProcess";

const DATE_PLACEHOLDER = "--/--/----";
const styleTableCell = "text-sm text-gray-500 whitespace-nowrap";

type OrderTripListModalProps = {
  vehicleInfo?: {
    vehicleId: number;
    vehicleNumber: string;
    date: string;
  };
  open: boolean;
  onClose: () => void;
};

const OrderTripListModal = ({ open, vehicleInfo, onClose }: OrderTripListModalProps) => {
  const t = useTranslations();
  const { orgLink } = useAuth();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();
  const [{ orderTripConditions }] = useAtom(orderTripAtom);
  const [filterOptions, setFilterOptions] = useSearchConditions(orderTripConditions);
  const [filterParams, setFilterParams] = useState({
    ...getFilterRequest(filterOptions),
  });

  const { orderTrips, pagination, isLoading } = useOrderTripsByDayAndVehicle(filterParams);

  useEffect(() => {
    if (vehicleInfo?.vehicleId && vehicleInfo?.date) {
      setFilterParams((prev) => ({
        ...prev,
        vehicleId: vehicleInfo.vehicleId,
        date: vehicleInfo.date,
        clientTimezone: getClientTimezone(),
      }));
    }
  }, [vehicleInfo]);

  /**
   * Setting the initial filter options based on the URL query parameters.
   */
  useEffect(() => {
    setFilterParams((prevParams) => ({
      ...prevParams,
      ...getFilterRequest(filterOptions),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterOptions]);

  /**
   * Callback function for handling page changes.
   *
   * @param page - The new page number to be set in the pagination state.
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

  return (
    <Modal open={open} onClose={onClose} size="7xl" showCloseButton onDismiss={onClose}>
      <ModalHeader
        title={t("vehicle_monitoring.order_trip_list", {
          date: formatDate(vehicleInfo?.date, t("common.format.date")),
          numberVehicle: vehicleInfo?.vehicleNumber,
        })}
      />
      <ModalContent padding={false}>
        <TableContainer variant="paper" horizontalScroll verticalScroll inside stickyHeader>
          <Table dense={!isLoading}>
            <TableHead uppercase>
              <TableRow>
                <TableCell action>
                  <span className="sr-only">{t("common.actions")}</span>
                </TableCell>
                <TableCell>{t("vehicle_monitoring.order.code")}</TableCell>
                <TableCell>{t("vehicle_monitoring.trip_list_modal.trips.code")}</TableCell>
                <TableCell>{t("vehicle_monitoring.trip_list_modal.trips.route")}</TableCell>
                <TableCell>{t("vehicle_monitoring.trip_list_modal.trips.weight")}</TableCell>
                <TableCell>{t("vehicle_monitoring.trip_list_modal.trips.pickup_delivery_date")}</TableCell>
                <TableCell>{t("vehicle_monitoring.trip_list_modal.trips.status")}</TableCell>
                <Authorization resource="bill-of-lading" action="find">
                  <TableCell>{t("vehicle_monitoring.trip_list_modal.trips.bill_of_lading")}</TableCell>
                </Authorization>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Loading skeleton */}
              {isLoading && orderTrips.length === 0 && <SkeletonTableRow rows={10} columns={8} />}

              {/* Empty data */}
              {!isLoading && orderTrips.length === 0 && (
                <TableRow hover={false} className="mx-auto max-w-lg">
                  <TableCell colSpan={8} className="px-6 lg:px-8">
                    <EmptyListSection
                      title={t("order.vehicle_dispatch.vehicle_dispatch_not_found_title")}
                      description={t.rich("order.vehicle_dispatch.vehicle_dispatch_not_found_message", {
                        strong: (chunks) => <span className="font-semibold">{chunks}</span>,
                      })}
                      actionLabel={t("order.vehicle_dispatch.vehicle_dispatch_dispatch_vehicle")}
                    />
                  </TableCell>
                </TableRow>
              )}

              {/* Data */}
              {orderTrips.map((trip) => (
                <Disclosure key={trip.id} as={Fragment} defaultOpen={true}>
                  {({ open }) => (
                    <>
                      <TableRow hover={!open}>
                        {/* Action */}
                        <Disclosure.Button
                          as="td"
                          className={clsx("relative w-10 min-w-[40px] !pl-2", {
                            "bg-blue-50": open,
                          })}
                        >
                          {open ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                          )}
                        </Disclosure.Button>

                        {/* Order */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <Authorization
                            resource="order"
                            action="detail"
                            fallbackComponent={<span className="!font-semibold">{trip.order?.code}</span>}
                          >
                            <Link
                              useDefaultStyle
                              href={`${orgLink}/orders/${trip.order?.code}?tab=${OrderTab.DISPATCH_VEHICLE}`}
                              className="!font-semibold"
                            >
                              {trip.order?.code}
                            </Link>
                          </Authorization>
                        </Disclosure.Button>

                        {/* Trip code */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <div className="flex flex-col text-left">
                            <p className="whitespace-nowrap text-sm font-medium text-gray-700 group-hover:text-gray-900">
                              {trip.code}
                            </p>
                          </div>
                        </Disclosure.Button>

                        {/* Route */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <Authorization
                            resource="customer-route"
                            action="detail"
                            fallbackComponent={
                              <InfoBox
                                label={ensureString(trip.order?.route?.code)}
                                subLabel={ensureString(trip.order?.route?.name)}
                                emptyLabel={t("common.empty")}
                              />
                            }
                          >
                            <div className="flex items-center gap-2">
                              <InfoBox
                                as={Link}
                                href={`${orgLink}/customers/${encryptId(trip.order?.customer?.id)}/routes/${encryptId(
                                  trip.order?.route?.id
                                )}`}
                                label={ensureString(trip.order?.route?.code)}
                                subLabel={ensureString(trip.order?.route?.name)}
                                emptyLabel={
                                  trip.order?.route?.type === "FIXED"
                                    ? t("order_plan.plan_list_modal.fixed")
                                    : t("order_plan.plan_list_modal.casual")
                                }
                              />
                              <RoutePointInfoModal orderId={Number(trip.order?.id)} />
                            </div>
                          </Authorization>
                        </Disclosure.Button>

                        {/* Weight */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <NumberLabel
                            value={Number(trip.weight)}
                            emptyLabel={t("common.empty")}
                            unit={trip.order?.unit?.name}
                          />
                        </Disclosure.Button>

                        {/* Pickup / Delivery date */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          <DateTimeLabel
                            value={ensureString(trip.pickupDate)}
                            type={organizationOrderRelatedDateFormat}
                            emptyLabel={DATE_PLACEHOLDER}
                          />
                          <br />
                          <DateTimeLabel
                            value={ensureString(trip.deliveryDate)}
                            type={organizationOrderRelatedDateFormat}
                            emptyLabel={DATE_PLACEHOLDER}
                          />
                        </Disclosure.Button>

                        {/* Status */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          {/* Status */}
                          <Badge
                            color={tripSteps.find((item) => item.value === trip.lastStatusType)?.color}
                            label={trip?.statuses[0]?.driverReport?.name ?? ""}
                          />
                        </Disclosure.Button>

                        {/* Bill of lading */}
                        <Disclosure.Button
                          as="td"
                          className={clsx(styleTableCell, {
                            "bg-blue-50": open,
                          })}
                        >
                          {trip.billOfLading || t("common.empty")}
                        </Disclosure.Button>
                      </TableRow>

                      {/* Process */}
                      <Disclosure.Panel as="tr">
                        <TableCell colSpan={8} className="overflow-x-auto !pl-4">
                          <OrderTripStatusProcess orderTrip={trip} />
                        </TableCell>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <div className="my-4 px-4">
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
        </div>
      </ModalContent>
    </Modal>
  );
};

export default memo(OrderTripListModal);
