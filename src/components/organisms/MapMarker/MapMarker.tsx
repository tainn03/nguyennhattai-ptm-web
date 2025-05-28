"use client";

import { OrderTripStatusType, VehicleTrackingStatus } from "@prisma/client";
import clsx from "clsx";
import L, { LatLngExpression } from "leaflet";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import { useCallback, useMemo, useState } from "react";
import { BsFuelPumpFill as BsFuelPumpFillIcon } from "react-icons/bs";
import {
  FaCalendarAlt as FaCalendarAltIcon,
  FaInfoCircle as FaInfoCircleIcon,
  FaMapMarkerAlt as FaMapMarkerAlt,
  FaPhone as FaPhoneIcon,
  FaRoute as FaRouteIcon,
  FaUser as FaUserIcon,
  FaWeightHanging as FaWeightHangingIcon,
} from "react-icons/fa";
import { FaBarcode as FaBarcodeIcon, FaTruckFront as FaTruckFrontIcon } from "react-icons/fa6";
import { IoIosArrowDown as IoIosArrowDownIcon, IoIosArrowUp as IoIosArrowUpIcon } from "react-icons/io";
import { IoIosSpeedometer as IoIosSpeedometerIcon } from "react-icons/io";
import { MdAltRoute as MdAltRouteIcon } from "react-icons/md";

import { Badge, DateTimeLabel } from "@/components/atoms";
import { Authorization, Button } from "@/components/molecules";
import { tripSteps } from "@/components/molecules/OrderGridItem/OrderGridItem";
import { useAuth, useOrgSettingExtendedStorage } from "@/hooks";
import { LatestVehicleLocationResponse } from "@/types/vehicle";
import { getFullName } from "@/utils/auth";
import { ensureString } from "@/utils/string";

import { RoutePointInfoModal } from "..";

const MarkerLeaflet = dynamic(() => import("react-leaflet").then((module) => module.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((module) => module.Popup), { ssr: false });

const rowLayoutStyle = "flex my-1.5 w-full";
const halfWidthRowStyle = "flex my-1.5 w-full sm:w-6/12";
const mapMarkerLayoutStyle = "flex items-center gap-2";
const markerTitleStyle = "w-[120px] font-bold gap-1";

type MapMarkerProps = {
  vehicle: LatestVehicleLocationResponse;
};

const MapMarker = ({ vehicle }: MapMarkerProps) => {
  const t = useTranslations();
  const router = useRouter();
  const { orgLink } = useAuth();
  const { organizationOrderRelatedDateFormat } = useOrgSettingExtendedStorage();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  const hasTrip = useMemo(() => vehicle.orderTripCode, [vehicle.orderTripCode]);

  const position: LatLngExpression = useMemo(
    () => [parseFloat(vehicle.latitude), parseFloat(vehicle.longitude)],
    [vehicle.latitude, vehicle.longitude]
  );

  const icon = L.divIcon({
    className: clsx({
      "[&>div>div]:bg-blue-500 [&>div>div>div]:bg-blue-700 [&>:nth-child(2)>span]:!bg-blue-700 [&>:nth-child(2)>.vehicle]:!border-blue-600 [&>:nth-child(2)>.vehicle]:!text-blue-700":
        vehicle.driverReportType === OrderTripStatusType.NEW ||
        !vehicle.driverReportType ||
        vehicle.driverReportType === OrderTripStatusType.CONFIRMED,
      "[&>div>div]:bg-purple-500 [&>div>div>div]:bg-purple-700 [&>:nth-child(2)>span]:!bg-purple-700 [&>:nth-child(2)>.vehicle]:!border-purple-600 [&>:nth-child(2)>.vehicle]:!text-purple-700":
        vehicle.driverReportType === OrderTripStatusType.PENDING_CONFIRMATION,
      "[&>div>div]:bg-yellow-500 [&>div>div>div]:bg-yellow-700 [&>:nth-child(2)>span]:!bg-yellow-700 [&>:nth-child(2)>.vehicle]:!border-yellow-600 [&>:nth-child(2)>.vehicle]:!text-yellow-700":
        vehicle.driverReportType === OrderTripStatusType.WAITING_FOR_PICKUP,
      "[&>div>div]:bg-zinc-500 [&>div>div>div]:bg-zinc-700 [&>:nth-child(2)>span]:!bg-zinc-700 [&>:nth-child(2)>.vehicle]:!border-zinc-600 [&>:nth-child(2)>.vehicle]:!text-zinc-700":
        vehicle.driverReportType === OrderTripStatusType.WAREHOUSE_GOING_TO_PICKUP,
      "[&>div>div]:bg-cyan-500 [&>div>div>div]:bg-cyan-700 [&>:nth-child(2)>span]:!bg-cyan-700 [&>:nth-child(2)>.vehicle]:!border-cyan-600 [&>:nth-child(2)>.vehicle]:!text-cyan-700":
        vehicle.driverReportType === OrderTripStatusType.WAREHOUSE_PICKED_UP,
      "[&>div>div]:bg-pink-500 [&>div>div>div]:bg-pink-700 [&>:nth-child(2)>span]:!bg-pink-700 [&>:nth-child(2)>.vehicle]:!border-pink-600 [&>:nth-child(2)>.vehicle]:!text-pink-700":
        vehicle.driverReportType === OrderTripStatusType.WAITING_FOR_DELIVERY,
      "[&>div>div]:bg-teal-500 [&>div>div>div]:bg-teal-700 [&>:nth-child(2)>span]:!bg-teal-700 [&>:nth-child(2)>.vehicle]:!border-teal-600 [&>:nth-child(2)>.vehicle]:!text-teal-700":
        vehicle.driverReportType === OrderTripStatusType.DELIVERED,
      "[&>div>div]:bg-green-500 [&>div>div>div]:bg-green-700 [&>:nth-child(2)>span]:!bg-green-700 [&>:nth-child(2)>.vehicle]:!border-green-600 [&>:nth-child(2)>.vehicle]:!text-green-700":
        vehicle.driverReportType === OrderTripStatusType.COMPLETED,
      "[&>div>div]:bg-red-500 [&>div>div>div]:bg-red-700 [&>:nth-child(2)>span]:!bg-red-700 [&>:nth-child(2)>.vehicle]:!border-red-600 [&>:nth-child(2)>.vehicle]:!text-red-700":
        vehicle.driverReportType === OrderTripStatusType.CANCELED,
    }),
    html: `
      <div class="relative z-50 top-[60px] left-[35px] flex h-5 w-5">
        <div class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"></div>
        <div class="relative inline-flex rounded-full h-5 w-5 justify-center items-center">
          <div class="relative inline-flex rounded-full h-2 w-2"></div>
        </div>
      </div>
      <div class="relative">
        <div class="vehicle py-1 px-0.5 rounded-lg text-center !bg-white border-2 font-semibold text-xs shadow-lg whitespace-nowrap">
          ${vehicle.vehicleNumber}
        </div>
        <span class="absolute z-10 h-[13px] w-0.5 -bottom-[10px] left-10 -rotate-45"></span>
        <span class="absolute z-10 h-[13px] w-0.5 -bottom-[10px] right-10 rotate-45"></span>
        <div class="absolute w-0 h-0 top-[26px] !bg-transparent border-l-8 border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white left-1/2 transform -translate-x-1/2"></div>
      </div>
    `,
    iconSize: [90, 50],
    iconAnchor: [50, 45],
    popupAnchor: [-4.5, 16],
  });

  /**
   * Handles the collapse event for the vehicle detail.
   */
  const handleCollapseDetail = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  /**
   * Handles show detail.
   */
  const handleShowDetail = useCallback(() => {
    router.push(`${orgLink}/orders/${vehicle.orderCode}`);
  }, [orgLink, router, vehicle.orderCode]);

  const getCarStatus = useCallback(() => {
    switch (vehicle.carStatus) {
      case VehicleTrackingStatus.ACTIVE:
        return <Badge color="success" label={t("report.vehicle_position_tracker.detail_last_status.active")} />;
      case VehicleTrackingStatus.STOPPED:
        return <Badge color="purple" label={t("report.vehicle_position_tracker.detail_last_status.stopped")} />;
      case VehicleTrackingStatus.NO_SIGNAL:
        return <Badge color="error" label={t("report.vehicle_position_tracker.detail_last_status.no_signal")} />;
      case VehicleTrackingStatus.STOPPED_WITH_ENGINE_ON:
        return (
          <Badge
            color="warning"
            label={t("report.vehicle_position_tracker.detail_last_status.stopped_with_engine_on")}
          />
        );
      default:
        return <Badge color="warning" label={t("report.vehicle_position_tracker.detail_last_status.unknown")} />;
    }
  }, [t, vehicle.carStatus]);

  return (
    <MarkerLeaflet icon={icon} position={position}>
      {/* <Tooltip
        direction="bottom"
        offset={[0, 0]}
        opacity={1}
        permanent
        className={clsx("!rounded-lg !px-3 !py-1 !text-xs !font-semibold !text-white !shadow-lg", {
          "!bg-blue-500":
            vehicle.driverReportType === OrderTripStatusType.NEW ||
            !vehicle.driverReportType ||
            vehicle.driverReportType === OrderTripStatusType.CONFIRMED,
          "!bg-purple-500": vehicle.driverReportType === OrderTripStatusType.PENDING_CONFIRMATION,
          "!bg-yellow-500": vehicle.driverReportType === OrderTripStatusType.WAITING_FOR_PICKUP,
          "!bg-pink-500": vehicle.driverReportType === OrderTripStatusType.WAITING_FOR_DELIVERY,
          "!bg-teal-500": vehicle.driverReportType === OrderTripStatusType.DELIVERED,
          "!bg-green-500": vehicle.driverReportType === OrderTripStatusType.COMPLETED,
          "!bg-red-500": vehicle.driverReportType === OrderTripStatusType.CANCELED,
        })}
      >
        {vehicle.vehicleNumber}
      </Tooltip> */}

      <Popup className="w-[350px] sm:w-[600px]">
        <div className="flex w-[300px] flex-row flex-wrap sm:w-[550px]">
          {/* Biển số xe */}
          <div className={clsx(halfWidthRowStyle)}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaTruckFrontIcon className="text-gray-700" />
              {t("report.vehicle_position_tracker.detail_last_status.vehicle")}:
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>{vehicle.vehicleNumber}</span>
            </div>
          </div>

          {/* Trạng thái xe */}
          <div className={clsx(halfWidthRowStyle)}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaInfoCircleIcon className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.vehicle_status")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>{getCarStatus()}</div>
          </div>

          {/* Tuyến */}
          <div className={clsx(rowLayoutStyle, { hidden: !hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaRouteIcon />
              <span>{t("report.vehicle_position_tracker.detail_last_status.route")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>
                {vehicle.routeCode} ({vehicle.routeName})
              </span>
              <RoutePointInfoModal orderId={Number(vehicle.orderId)} />
            </div>
          </div>

          {/* Mã chuyến */}
          <div className={clsx(halfWidthRowStyle, { hidden: !hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaBarcodeIcon />
              <span>{t("report.vehicle_position_tracker.detail_last_status.trip")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>{vehicle.orderTripCode}</span>
            </div>
          </div>

          {/* Trạng thái chuyến */}
          <div className={clsx(halfWidthRowStyle, { hidden: !hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <MdAltRouteIcon className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.trip_status")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>
                <Badge
                  color={tripSteps.find(({ value: item }) => item === vehicle?.driverReportType)?.color}
                  label={ensureString(vehicle.driverReportName)}
                />
              </span>
            </div>
          </div>

          {/* Ngày nhận */}
          <div className={clsx(halfWidthRowStyle, { hidden: !hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaCalendarAltIcon className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.pickup_date")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <DateTimeLabel type={organizationOrderRelatedDateFormat} value={vehicle.pickupDate} />
            </div>
          </div>

          {/* Ngày giao */}
          <div className={clsx(halfWidthRowStyle, { hidden: !hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaCalendarAltIcon className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.delivery_date")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <DateTimeLabel type={organizationOrderRelatedDateFormat} value={vehicle.deliveryDate} />
            </div>
          </div>

          {/* Vị trí hiện tại */}
          <div className={clsx(rowLayoutStyle)}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaMapMarkerAlt className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.current_position")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>{vehicle.address}</span>
            </div>
          </div>

          {/* Khối lượng */}
          <div className={clsx(rowLayoutStyle, { hidden: isCollapsed || !hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaWeightHangingIcon className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.weight")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>
                {vehicle.weight} {vehicle.unitOfMeasureCode}
              </span>
            </div>
          </div>

          {/* Tốc độ */}
          <div className={clsx(halfWidthRowStyle, { hidden: isCollapsed && hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <IoIosSpeedometerIcon className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.speed_label")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>
                {t("report.vehicle_position_tracker.detail_last_status.speed", {
                  speed: vehicle.speed || t("common.empty"),
                })}
              </span>
            </div>
          </div>

          {/* Nhiên liệu */}
          <div className={clsx(halfWidthRowStyle, { hidden: isCollapsed && hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <BsFuelPumpFillIcon className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.fuel_label")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>
                {t("report.vehicle_position_tracker.detail_last_status.instant_fuel", {
                  fuel: vehicle.instantFuel || t("common.empty"),
                })}
              </span>
            </div>
          </div>

          {/* Tài xế */}
          <div className={clsx(halfWidthRowStyle, { hidden: isCollapsed && hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaUserIcon className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.driver")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>{getFullName(vehicle.firstName, vehicle.lastName) || t("common.empty")}</span>
            </div>
          </div>

          {/* Số điện thoại */}
          <div className={clsx(halfWidthRowStyle, { hidden: isCollapsed && hasTrip })}>
            <div className={clsx(mapMarkerLayoutStyle, markerTitleStyle)}>
              <FaPhoneIcon className="text-gray-700" />
              <span>{t("report.vehicle_position_tracker.detail_last_status.phone_number")}:</span>
            </div>
            <div className={clsx(mapMarkerLayoutStyle)}>
              <span>{vehicle.phoneNumber}</span>
            </div>
          </div>

          <div
            className={clsx(rowLayoutStyle, "mt-2.5 flex-wrap", {
              hidden: !hasTrip,
            })}
          >
            <div
              className="my-1.5 flex w-full cursor-pointer items-center gap-x-2 sm:w-5/12"
              onClick={handleCollapseDetail}
            >
              {isCollapsed && <IoIosArrowDownIcon />}
              {!isCollapsed && <IoIosArrowUpIcon />}
              <span className="text-blue-700">
                {t("report.vehicle_position_tracker.detail_last_status.details_info")}
              </span>
            </div>
            <div className="my-1.5 flex w-full items-center justify-center gap-1 sm:w-7/12 sm:justify-end">
              <Authorization resource="order" action="detail">
                <Button type="button" color="primary" onClick={handleShowDetail}>
                  {t("report.vehicle_position_tracker.detail_last_status.details")}
                </Button>
              </Authorization>
            </div>
          </div>
        </div>
      </Popup>
    </MarkerLeaflet>
  );
};

export default MapMarker;
