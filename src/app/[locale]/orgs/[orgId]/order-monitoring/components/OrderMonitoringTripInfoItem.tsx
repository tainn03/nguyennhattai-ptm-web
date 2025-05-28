import { Disclosure } from "@headlessui/react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import {
  Badge,
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
import { Authorization, EmptyListSection } from "@/components/molecules";
import { tripSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import { OrderTripInfo, OrderTripStatusInfo } from "@/types/strapi";
import { encryptId } from "@/utils/security";
import { ensureString } from "@/utils/string";

export type OrderMonitoringTripInfoItemProps = {
  orderTripsInfo: OrderTripInfo[];
  unitCode: string;
  orgLink: string;
  isLoading: boolean;
};

const OrderMonitoringTripInfoItem = ({
  orderTripsInfo,
  unitCode,
  orgLink,
  isLoading,
}: OrderMonitoringTripInfoItemProps) => {
  const t = useTranslations();

  const getCurrentTripType = useCallback((trip: Partial<OrderTripInfo>) => {
    const latestStatus = trip.statuses?.reduce((prev, current) => {
      return (prev as OrderTripStatusInfo).createdAt > (current as OrderTripStatusInfo).createdAt ? prev : current;
    });

    return (
      <Badge
        color={tripSteps.find(({ value: item }) => item === trip.lastStatusType)?.color || "info"}
        label={ensureString(latestStatus?.driverReport?.name)}
      />
    );
  }, []);

  return (
    <Disclosure.Panel as="tr">
      <TableCell colSpan={10} className="bg-blue-50 !p-0">
        <ul role="list" className="grid grid-cols-1 gap-x-12 gap-y-4 lg:grid-cols-12 xl:gap-x-12">
          <li className="group overflow-hidden rounded-lg lg:col-span-12">
            <TableContainer inside variant="paper">
              <Table dense>
                <TableHead>
                  <TableRow>
                    <TableCell align="left">
                      <span className="font-semibold text-gray-900">{t("order_monitoring.list_item.trips.code")}</span>
                    </TableCell>
                    <TableCell align="left">
                      <span className="font-semibold text-gray-900">
                        {t("order_monitoring.list_item.trips.vehicle")}
                      </span>
                    </TableCell>
                    <TableCell align="left">
                      <span className="font-semibold text-gray-900">
                        {t("order_monitoring.list_item.trips.driver")}
                      </span>
                    </TableCell>
                    <TableCell align="left">
                      <span className="font-semibold text-gray-900">
                        {t("order_monitoring.list_item.trips.weight")}
                      </span>
                    </TableCell>
                    <TableCell align="left">
                      <span className="font-semibold text-gray-900">
                        {t("order_monitoring.list_item.trips.trip_status")}
                      </span>
                    </TableCell>
                    <Authorization resource="bill-of-lading" action="find">
                      <TableCell align="left">
                        <span className="font-semibold text-gray-900">
                          {t("order_monitoring.list_item.trips.bill_of_lading")}
                        </span>
                      </TableCell>
                    </Authorization>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Loading skeleton  */}
                  {isLoading && orderTripsInfo.length === 0 && (
                    <SkeletonTableRow rows={5} columns={6} profileColumnIndexes={[0]} multilineColumnIndexes={[1]} />
                  )}

                  {/* Empty data */}
                  {!isLoading && orderTripsInfo.length === 0 && (
                    <TableRow hover={false} className="mx-auto max-w-lg">
                      <TableCell colSpan={6} className="px-6 lg:px-8">
                        <EmptyListSection description={t("order_monitoring.list_item.trips.no_trip_info")} />
                      </TableCell>
                    </TableRow>
                  )}
                  {orderTripsInfo.map((trip: OrderTripInfo) => {
                    return (
                      <TableRow key={trip.code}>
                        <TableCell align="left">{trip.code}</TableCell>
                        <TableCell align="left">
                          <Authorization
                            resource="vehicle"
                            action="detail"
                            fallbackComponent={<span className="!font-semibold">{trip.vehicle?.vehicleNumber}</span>}
                          >
                            <Link
                              useDefaultStyle
                              href={`${orgLink}/vehicles/${encryptId(trip.vehicle?.id)}`}
                              className="!font-semibold"
                            >
                              {trip.vehicle?.vehicleNumber}
                            </Link>
                          </Authorization>
                        </TableCell>

                        <TableCell align="left">
                          <Authorization
                            resource="driver"
                            action="detail"
                            fallbackComponent={
                              <InfoBox
                                label={`${trip.driver?.lastName} ${trip.driver?.firstName}`}
                                subLabel={trip.driver?.phoneNumber}
                              />
                            }
                          >
                            <InfoBox
                              label={`${trip.driver?.lastName} ${trip.driver?.firstName}`}
                              subLabel={trip.driver?.phoneNumber}
                              as={Link}
                              href={`${orgLink}/drivers/${encryptId(trip.driver?.id)}`}
                            />
                          </Authorization>
                        </TableCell>

                        <TableCell align="left">
                          <NumberLabel
                            type="numeric"
                            emptyLabel={t("common.empty")}
                            value={trip.weight}
                            unit={unitCode}
                          />
                        </TableCell>

                        <TableCell align="left">{getCurrentTripType(trip)}</TableCell>

                        <Authorization resource="bill-of-lading" action="find">
                          <TableCell align="left" className="whitespace-pre-wrap">
                            {trip.billOfLading && trip.billOfLadingReceived
                              ? t("order_monitoring.list_item.bill_of_lading_received", {
                                  billOfLading: trip.billOfLading,
                                })
                              : trip.billOfLading
                              ? t("order_monitoring.list_item.vehicle_dispatch_document_number", {
                                  billOfLading: trip.billOfLading,
                                })
                              : "_"}
                          </TableCell>
                        </Authorization>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </li>
        </ul>
      </TableCell>
    </Disclosure.Panel>
  );
};

export default OrderMonitoringTripInfoItem;
