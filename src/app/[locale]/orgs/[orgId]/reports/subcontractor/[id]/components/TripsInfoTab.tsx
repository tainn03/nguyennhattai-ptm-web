"use client";

import { BanknotesIcon } from "@heroicons/react/24/outline";
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
import { useAuth, useOrgSettingExtendedStorage, usePermission, useSubcontractorPaidTrips } from "@/hooks";
import { IndividualSubcontractorCostParams } from "@/types/report";
import { getFullName } from "@/utils/auth";
import { endOfDayToISOString, startOfDayToISOString } from "@/utils/date";
import { isNumeric } from "@/utils/number";
import { ensureString } from "@/utils/string";

const enum Polarity {
  NEGATIVE = "NEGATIVE",
  POSITIVE = "POSITIVE",
}

type SubcontractorTripInfoTabProps = Required<Omit<IndividualSubcontractorCostParams, "organizationId">>;

const TripInfoTab = (props: SubcontractorTripInfoTabProps) => {
  const t = useTranslations();
  const { orgId, orgLink } = useAuth();
  const { canFind: canFindOrderTrip } = usePermission("order-trip");
  const { canDetail: canDetailOrder } = usePermission("order");
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();

  const { paidTrips, isLoading, mutate } = useSubcontractorPaidTrips({
    ...props,
    organizationId: orgId!,
    ...(props.startDate && { startDate: startOfDayToISOString(props.startDate) }),
    ...(props.endDate && { endDate: endOfDayToISOString(props.endDate) }),
  });

  const [open, setOpen] = useState(false);
  const selectedOrderTripRef = useRef<string | null>();

  const toggleModal = useCallback(
    (id?: string) => () => {
      !id && mutate();
      selectedOrderTripRef.current = id;
      setOpen((prev) => !prev);
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
              <TableCell action>{t("report.subcontractors.detail.order_number")}</TableCell>
              <TableCell>{t("report.subcontractors.detail.order_trip_code")}</TableCell>
              <TableCell>{t("report.subcontractors.detail.vehicle")}</TableCell>
              <TableCell>{t("report.subcontractors.detail.customer")}</TableCell>
              <TableCell>{t("report.subcontractors.detail.route")}</TableCell>
              <Authorization resource="bill-of-lading" action="find">
                <TableCell>{t("report.subcontractors.detail.bill_of_lading")}</TableCell>
              </Authorization>
              <TableCell align="right">{t("report.subcontractors.detail.subcontractor_cost")}</TableCell>
              <TableCell>{t("report.subcontractors.detail.trip_start_date")}</TableCell>
              <TableCell>{t("report.subcontractors.detail.trip_end_date")}</TableCell>
              <TableCell>{t("report.subcontractors.detail.trip_status")}</TableCell>
              <TableCell action>
                <span className="sr-only">{t("report.subcontractors.detail.actions")}</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Loading skeleton */}
            {isLoading && paidTrips.length === 0 && <SkeletonTableRow rows={10} columns={11} />}

            {/* Empty data */}
            {!isLoading && paidTrips.length === 0 && (
              <TableRow hover={false} className="mx-auto max-w-lg">
                <TableCell colSpan={11} className="px-6 lg:px-8">
                  <EmptyListSection
                    description={t("report.subcontractors.detail.no_subcontractor_info")}
                    icon={PiNoteBlankThinIcon}
                  />
                </TableCell>
              </TableRow>
            )}

            {/* Data */}
            {paidTrips.map((trip, index) => {
              return (
                <TableRow key={trip.id}>
                  <TableCell action>{index + 1}</TableCell>
                  <TableCell>
                    <Authorization
                      alwaysAuthorized={canDetailOrder() && canFindOrderTrip()}
                      fallbackComponent={<span>{trip.code}</span>}
                    >
                      <Link
                        useDefaultStyle
                        href={`${orgLink}/orders/${trip.orderCode}?tab=${OrderTab.DISPATCH_VEHICLE}`}
                      >
                        {trip.code}
                      </Link>
                    </Authorization>
                    <CopyToClipboard value={ensureString(trip.code)} />
                  </TableCell>
                  <TableCell>
                    <InfoBox
                      label={trip.vehicleNumber}
                      subLabel={getFullName(trip.firstName, trip.lastName)}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <InfoBox label={trip.customerCode} subLabel={trip.customerName} emptyLabel={t("common.empty")} />
                  </TableCell>
                  <TableCell>
                    <InfoBox label={trip.routeName} subLabel={trip.routeName} emptyLabel={t("common.empty")} />
                  </TableCell>
                  <Authorization resource="bill-of-lading" action="find">
                    <TableCell>{trip.billOfLading || t("common.empty")}</TableCell>
                  </Authorization>
                  <TableCell align="right" className="!text-blue-700">
                    <NumberLabel
                      value={sanitizeValue(trip.subcontractorCost, Polarity.POSITIVE)}
                      type="currency"
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <DateTimeLabel
                      type={organizationOrderRelatedDateFormat}
                      value={trip.pickupDate}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <DateTimeLabel
                      type={organizationOrderRelatedDateFormat}
                      value={trip.deliveryDate}
                      emptyLabel={t("common.empty")}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={trip.driverReportName}
                      color={tripSteps.find(({ value: item }) => item === trip.driverReportType)?.color || "info"}
                    />
                  </TableCell>
                  <TableCell>
                    <Authorization resource="trip-driver-expense" action="find">
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={toggleModal(trip.id)}
                        data-tooltip-id="tooltip"
                        data-tooltip-content={t("report.subcontractors.detail.update_driver_salary")}
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
        open={open}
        id={Number(selectedOrderTripRef.current)}
        onSave={toggleModal()}
        onClose={toggleModal()}
      />
    </>
  );
};

export default memo(TripInfoTab);
