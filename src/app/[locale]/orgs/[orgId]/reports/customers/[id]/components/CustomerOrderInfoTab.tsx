"use client";

import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { PiNoteBlankThin as PiNoteBlankThinIcon } from "react-icons/pi";

import {
  Badge,
  DateTimeLabel,
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
import { Authorization, EmptyListSection, TripExpenseModal } from "@/components/molecules";
import { tripSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import { OrderTab } from "@/constants/order";
import { useAuth, useCustomerPaidTrips, useIdParam, useOrgSettingExtendedStorage, usePermission } from "@/hooks";
import { IndividualCustomerStatisticParams } from "@/types/report";
import { getFullName } from "@/utils/auth";
import { endOfDayToISOString, startOfDayToISOString } from "@/utils/date";
import { ensureString } from "@/utils/string";

type CustomerOrderInfoTabProps = Required<Omit<IndividualCustomerStatisticParams, "organizationId">>;

const CustomerOrderInfoTab = (props: CustomerOrderInfoTabProps) => {
  const t = useTranslations();
  const { orgLink, orgId } = useAuth();
  const { encryptId } = useIdParam();
  const { canFind: canFindOrderTrip } = usePermission("order-trip");
  const { canDetail: canDetailOrder } = usePermission("order");
  const [isDriverSalaryDetailModalOpen, setIsDriverSalaryDetailModalOpen] = useState(false);
  const selectedOrderTripRef = useRef<string | null>();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();

  const { paidTrips, isLoading, mutate } = useCustomerPaidTrips({
    ...props,
    organizationId: orgId!,
    ...(props.startDate && { startDate: startOfDayToISOString(props.startDate) }),
    ...(props.endDate && { endDate: endOfDayToISOString(props.endDate) }),
  });

  const toggleModal = useCallback(
    (id?: string) => () => {
      !id && mutate();
      selectedOrderTripRef.current = id;
      setIsDriverSalaryDetailModalOpen((prev) => !prev);
    },
    [mutate]
  );

  return (
    <>
      <TableContainer
        allowFullscreen
        horizontalScroll
        verticalScroll
        stickyHeader
        autoHeight
        fullHeight
        className="!mt-0"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell action>{t("report.customers.customer_order_info.cost_index")}</TableCell>
              <TableCell>{t("report.customers.customer_order_info.order_trip_code")}</TableCell>
              <TableCell>{t("report.customers.customer_order_info.route")}</TableCell>
              <TableCell>{t("report.customers.customer_order_info.plan_date")}</TableCell>
              <TableCell>{t("report.customers.customer_order_info.driver_vehicle")}</TableCell>
              <Authorization resource="bill-of-lading" action="find">
                <TableCell>{t("report.customers.customer_order_info.bill_of_lading")}</TableCell>
              </Authorization>
              <TableCell>{t("report.customers.customer_order_info.status")}</TableCell>
              <TableCell action>
                <span className="sr-only">{t("report.customers.customer_order_info.common.actions")}</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Loading skeleton */}
            {isLoading && paidTrips.length === 0 && <SkeletonTableRow rows={10} columns={8} />}

            {/* Empty data */}
            {!isLoading && paidTrips.length === 0 && (
              <TableRow hover={false} className="mx-auto max-w-lg">
                <TableCell colSpan={8} className="px-6 lg:px-8">
                  <EmptyListSection
                    description={t("report.customers.customer_order_info.no_data")}
                    icon={PiNoteBlankThinIcon}
                  />
                </TableCell>
              </TableRow>
            )}

            {/* Data */}
            {paidTrips.map((trip, index) => (
              <TableRow key={trip.id}>
                {/* No. */}
                <TableCell action>{index + 1}</TableCell>

                {/* Order Trip Code */}
                <TableCell>
                  <Authorization
                    alwaysAuthorized={canDetailOrder() && canFindOrderTrip()}
                    fallbackComponent={<InfoBox label={trip.code} subLabel={trip.orderCode} />}
                  >
                    <InfoBox
                      as={Link}
                      label={trip.code}
                      subLabel={trip.orderCode}
                      href={`${orgLink}/orders/${trip.orderCode}?tab=${OrderTab.DISPATCH_VEHICLE}`}
                    />
                  </Authorization>
                </TableCell>

                {/* Route */}
                <TableCell>
                  <InfoBox
                    label={trip.routeCode}
                    subLabel={trip.routeName}
                    href={`${orgLink}/customers/${encryptId(Number(trip.customerId))}/routes/${encryptId(
                      Number(trip.routeId)
                    )}`}
                  />
                </TableCell>

                {/* Plan Date */}
                <TableCell>
                  <DateTimeLabel
                    value={ensureString(trip.pickupDate)}
                    type={organizationOrderRelatedDateFormat}
                    emptyLabel={t("common.empty")}
                  />
                  <br />
                  <DateTimeLabel
                    value={ensureString(trip.deliveryDate)}
                    type={organizationOrderRelatedDateFormat}
                    emptyLabel={t("common.empty")}
                  />
                </TableCell>

                {/* Driver - Vehicle */}
                <TableCell>
                  <InfoBox label={getFullName(trip.firstName, trip.lastName)} subLabel={trip.vehicleNumber} />
                </TableCell>

                {/* Bill of Lading */}
                <Authorization resource="bill-of-lading" action="find">
                  <TableCell>{trip.billOfLading || t("common.empty")}</TableCell>
                </Authorization>

                {/* Status */}
                <TableCell>
                  <Badge
                    label={trip.driverReportName}
                    color={tripSteps.find(({ value: item }) => item === trip.driverReportType)?.color || "info"}
                  />
                </TableCell>

                <TableCell action>
                  <Authorization resource="trip-driver-expense" action="find">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500"
                      onClick={toggleModal(trip.id)}
                      data-tooltip-id="tooltip"
                      data-tooltip-content={t("report.customers.customer_order_info.update_trip_expense")}
                    >
                      <BanknotesIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </Authorization>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Trip expense modal */}
      <TripExpenseModal
        open={isDriverSalaryDetailModalOpen}
        id={Number(selectedOrderTripRef.current)}
        onSave={toggleModal()}
        onClose={toggleModal()}
      />
    </>
  );
};

export default CustomerOrderInfoTab;
