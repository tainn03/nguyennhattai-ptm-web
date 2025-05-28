"use client";

import { BanknotesIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { memo, useCallback, useRef, useState } from "react";
import { PiNoteBlankThin as PiNoteBlankThinIcon } from "react-icons/pi";

import {
  Badge,
  DateTimeLabel,
  InfoBox,
  Link,
  NumberLabel,
  SkeletonTableRow,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@/components/atoms";
import { Authorization, CopyToClipboard, EmptyListSection, TripExpenseModal } from "@/components/molecules";
import { tripSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import { OrderTab } from "@/constants/order";
import { useAuth, useOrgSettingExtendedStorage, usePaidTrips, usePermission } from "@/hooks";
import { IndividualDriverSalaryParams } from "@/types/report";
import { endOfDayToISOString, startOfDayToISOString } from "@/utils/date";
import { isNumeric } from "@/utils/number";
import { ensureString } from "@/utils/string";

const enum Polarity {
  NEGATIVE = "NEGATIVE",
  POSITIVE = "POSITIVE",
}

type DriverTripInfoTabProps = Required<Omit<IndividualDriverSalaryParams, "organizationId">>;

const DriverTripInfoTab = (props: DriverTripInfoTabProps) => {
  const t = useTranslations();
  const { orgId, orgLink } = useAuth();
  const { canFind: canFindOrderTrip } = usePermission("order-trip");
  const { canDetail: canDetailOrder } = usePermission("order");

  const { paidTrips, isLoading, mutate } = usePaidTrips({
    ...props,
    organizationId: orgId!,
    ...(props.startDate && { startDate: startOfDayToISOString(props.startDate) }),
    ...(props.endDate && { endDate: endOfDayToISOString(props.endDate) }),
  });

  const [isDriverSalaryDetailModalOpen, setIsDriverSalaryDetailModalOpen] = useState(false);
  const selectedOrderTripRef = useRef<string | null>();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();

  const toggleModal = useCallback(
    (id?: string) => () => {
      !id && mutate();
      selectedOrderTripRef.current = id;
      setIsDriverSalaryDetailModalOpen((prev) => !prev);
    },
    [mutate]
  );

  const sanitizeValue = useCallback((value: number | string, polarity: Polarity = Polarity.NEGATIVE) => {
    const numValue = Number(value);
    if (isNumeric(value) && numValue !== 0) {
      return polarity === Polarity.NEGATIVE ? -numValue : numValue;
    }
    return null;
  }, []);

  return (
    <>
      <TableContainer
        allowFullscreen
        fullHeight
        horizontalScroll
        verticalScroll
        stickyHeader
        autoHeight
        className="!mt-0"
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell action>{t("report.drivers.detail.order_number")}</TableCell>
              <TableCell>{t("report.drivers.detail.order_trip_code")}</TableCell>
              <TableCell>{t("report.drivers.detail.customer_code")}</TableCell>
              <TableCell>{t("report.drivers.detail.route_code")}</TableCell>
              <Authorization resource="bill-of-lading" action="find">
                <TableCell>{t("report.drivers.detail.bill_of_lading")}</TableCell>
              </Authorization>
              <TableCell align="right">{t("report.drivers.detail.driver_advance")}</TableCell>
              <TableCell align="right">{t("report.drivers.detail.driver_cost")}</TableCell>
              <TableCell align="right">{t("report.drivers.detail.driver_balance")}</TableCell>
              <TableCell>{t("report.drivers.detail.trip_start_date")}</TableCell>
              <TableCell>{t("report.drivers.detail.trip_end_date")}</TableCell>
              <TableCell>{t("report.drivers.detail.trip_status")}</TableCell>
              <TableCell action>
                <span className="sr-only">{t("report.drivers.detail.update_driver_salary")}</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Loading skeleton */}
            {isLoading && paidTrips.length === 0 && <SkeletonTableRow rows={10} columns={12} />}

            {/* Empty data */}
            {!isLoading && paidTrips.length === 0 && (
              <TableRow hover={false} className="mx-auto max-w-lg">
                <TableCell colSpan={12} className="px-6 lg:px-8">
                  <EmptyListSection
                    description={t("report.drivers.detail.no_driver_info")}
                    icon={PiNoteBlankThinIcon}
                  />
                </TableCell>
              </TableRow>
            )}

            {/* Data */}
            {paidTrips.map((orderTrip, index) => {
              return (
                <TableRow key={orderTrip.id}>
                  <TableCell action>{index + 1}</TableCell>
                  <TableCell>
                    <Authorization
                      alwaysAuthorized={canDetailOrder() && canFindOrderTrip()}
                      fallbackComponent={<span>{orderTrip.code}</span>}
                    >
                      <Link
                        useDefaultStyle
                        href={`${orgLink}/orders/${orderTrip.orderCode}?tab=${OrderTab.DISPATCH_VEHICLE}`}
                      >
                        {orderTrip.code}
                      </Link>
                    </Authorization>
                    <CopyToClipboard value={ensureString(orderTrip.code)} />
                  </TableCell>
                  <TableCell>
                    <InfoBox
                      label={orderTrip.customerCode}
                      subLabel={orderTrip.customerName}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <InfoBox
                      label={orderTrip.routeName}
                      subLabel={orderTrip.routeName}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <Authorization resource="bill-of-lading" action="find">
                    <TableCell>{orderTrip.billOfLading || t("common.empty")}</TableCell>
                  </Authorization>
                  <TableCell align="right">
                    <NumberLabel
                      value={sanitizeValue(orderTrip.driverCost, Polarity.POSITIVE)}
                      type="currency"
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    className={clsx({
                      "text-red-600": !!orderTrip.advanceTotalCost,
                    })}
                  >
                    <NumberLabel
                      value={sanitizeValue(orderTrip.advanceTotalCost)}
                      type="currency"
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell align="right" className="text-blue-700">
                    <NumberLabel
                      value={sanitizeValue(orderTrip.driverCost, Polarity.POSITIVE)}
                      type="currency"
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <DateTimeLabel
                      type={organizationOrderRelatedDateFormat}
                      value={orderTrip.pickupDate}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <DateTimeLabel
                      type={organizationOrderRelatedDateFormat}
                      value={orderTrip.deliveryDate}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={orderTrip.driverReportName}
                      color={tripSteps.find(({ value: item }) => item === orderTrip.driverReportType)?.color || "info"}
                    />
                  </TableCell>
                  <TableCell>
                    <Authorization resource="trip-driver-expense" action="find">
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={toggleModal(orderTrip.id)}
                        data-tooltip-id="tooltip"
                        data-tooltip-content={t("report.drivers.detail.update_driver_salary")}
                      >
                        <BanknotesIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </Authorization>
                  </TableCell>
                </TableRow>
              );
            })}
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

export default memo(DriverTripInfoTab);
