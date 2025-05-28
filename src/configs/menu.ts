import {
  BanknotesIcon,
  BellIcon,
  CalendarDaysIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  HomeIcon,
  KeyIcon,
  LanguageIcon,
  MapIcon,
  RectangleGroupIcon,
  ShieldCheckIcon,
  TruckIcon,
  UserGroupIcon,
  UserIcon,
  UsersIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { ElementType } from "react";
import { BsAlarm as BsAlarmIcon, BsBoxes } from "react-icons/bs";
import { FaTrailer as FaTrailerIcon } from "react-icons/fa";
import { GoContainer as GoContainerIcon, GoWorkflow as GoWorkflowIcon } from "react-icons/go";
import { HiOutlineQrCode as HiOutlineQrCodeIcon } from "react-icons/hi2";
import { IoSettingsOutline as IoSettingsOutlineIcon } from "react-icons/io5";
import {
  PiChartBar as PiChartBarIcon,
  PiChartLine as PiChartLineIcon,
  PiGasPump as PiGasPumpIcon,
  PiMapPin,
  PiMapPinArea,
  PiPackage as PiPackageIcon,
  PiTextbox as PiTextboxIcon,
  PiUnite as PiUniteIcon,
} from "react-icons/pi";
import { TbHeartRateMonitor as TbHeartRateMonitorIcon, TbTruckDelivery as TbTruckDeliveryIcon } from "react-icons/tb";

import { ActionType, ResourceType } from "@/types/permission";

export type MenuItem = {
  id: string;
  name: string;
  link?: string;
  badge?: string;
  icon?: ElementType;
  resource?: ResourceType;
  action?: ActionType;
  process?: "merged" | "finished";
  hidden?: boolean;
};

export type MenuGroup = {
  id: string;
  header?: string;
  prefix?: string;
  menus: MenuItem[];
};

export type Navigation = {
  [key: string]: MenuGroup[];
};

export const features = (code?: string, orderConsolidationEnabled?: boolean): Navigation => ({
  admin: [],
  organization: [
    {
      id: "rscRlBP3wjWX",
      menus: [
        {
          id: "vFFC8y0N6meo",
          name: "dashboard.feature",
          link: `/orgs/${code}/dashboard`,
          icon: HomeIcon,
          process: "finished",
        },
      ],
    },
    {
      id: "Ns5iU5T6EPA0",
      header: "components.search_features.header_order",
      menus: [
        {
          id: "f3578483bc9e",
          name: "Yêu cầu đặt hàng",
          link: `/orgs/${code}/order-requests`,
          icon: GoContainerIcon,
        },
        {
          id: "uAtL3yEp9FA0",
          name: "order.feature",
          link: `/orgs/${code}/orders`,
          icon: PiPackageIcon,
          process: "finished",
          hidden: orderConsolidationEnabled,
        },
        {
          id: "d505a1af6476",
          name: "order_group.title",
          link: `/orgs/${code}/order-groups`,
          icon: BsBoxes,
          hidden: !orderConsolidationEnabled,
          process: "finished",
        },
        {
          id: "3Sb2nnbWtq7v",
          name: "order_plan.feature",
          link: `/orgs/${code}/orders/plan`,
          icon: CalendarDaysIcon,
          process: "finished",
          resource: "order-plan",
          action: "find",
          hidden: orderConsolidationEnabled,
        },
        {
          id: "RE7s1zcxAhYk",
          name: "vehicle_monitoring.title",
          link: `/orgs/${code}/vehicle-monitoring`,
          icon: TbTruckDeliveryIcon,
          process: "finished",
          resource: "vehicle-monitoring",
          action: "find",
          hidden: orderConsolidationEnabled,
        },
        {
          id: "RUMa8YYmq0py",
          name: "order_monitoring.feature",
          link: `/orgs/${code}/order-monitoring`,
          icon: TbHeartRateMonitorIcon,
          process: "finished",
          resource: "order-monitoring",
          action: "find",
          hidden: orderConsolidationEnabled,
        },
        {
          id: "r3PEAD16asM1",
          name: "report.vehicle_position_tracker.feature",
          link: `/orgs/${code}/reports/vehicle-position-tracker`,
          icon: MapIcon,
          process: "finished",
          resource: "vehicle-position-tracker",
          action: "find",
        },
      ],
    },

    // Report and Statistical
    {
      id: "pqjvRAd3ZH1V",
      header: "components.search_features.header_statistical_report",
      menus: [
        // { id: "Yze5n9BsZK26", name: "Doanh thu", link: "#", icon: PiChartLineIcon },
        // { id: "sUUt4yZsZwzX", name: "Xuất hóa đơn", link: "#", icon: PiChartLineIcon },
        {
          id: "r3PEAD16asM0",
          name: "report.customers.title",
          link: `/orgs/${code}/reports/customers`,
          icon: PiChartBarIcon,
          process: "finished",
          resource: "report-statistics-customer",
          action: "find",
        },
        {
          id: "3ocUNQdlOAkd",
          name: "report.subcontractors.feature",
          link: `/orgs/${code}/reports/subcontractor`,
          icon: PiChartLineIcon,
          process: "finished",
          resource: "report-statistics-subcontractor",
          action: "find",
        },
        {
          id: "ABHz0dtPrvGv",
          name: "report.drivers.title",
          link: `/orgs/${code}/reports/drivers`,
          icon: ChartPieIcon,
          process: "finished",
          resource: "report-statistics-driver",
          action: "find",
        },
        {
          id: "ABHz0dtHrvGv",
          name: "report.fuel_log.title",
          link: `/orgs/${code}/reports/fuel-logs`,
          icon: PiGasPumpIcon,
          process: "finished",
          resource: "report-statistics-fuel-log",
          action: "find",
        },
      ],
    },

    {
      id: "7a5lw3zkQAyP",
      header: "components.search_features.header_manage",
      prefix: "components.search_features.prefix_manage",
      menus: [
        {
          id: "60u0HguUjmC8",
          name: "route_point.title",
          link: `/orgs/${code}/route-points`,
          icon: PiMapPin,
          resource: "route-point",
          action: "find",
          process: "finished",
          hidden: !orderConsolidationEnabled,
        },
        {
          id: "ZoLMEJleX8LA",
          name: "zone.title",
          link: `/orgs/${code}/zones`,
          icon: PiMapPinArea,
          resource: "zone",
          action: "find",
          process: "finished",
          hidden: !orderConsolidationEnabled,
        },
        {
          id: "48hGXRiYkQXP",
          name: "customer.feature",
          link: `/orgs/${code}/customers`,
          icon: UsersIcon,
          resource: "customer",
          action: "find",
          process: "finished",
        },
        {
          id: "49hGXRiYkQXP",
          name: "customer_group.title",
          link: `/orgs/${code}/customer-groups`,
          icon: RectangleGroupIcon,
          resource: "customer-group",
          action: "find",
          process: "finished",
        },
        // { id: "gwIv9Nu0Oti9", name: "Tuyến đường", link: "#", icon: TbRouteIcon },
        {
          id: "uUf5njlgT1q2",
          name: "subcontractor.feature",
          link: `/orgs/${code}/subcontractors`,
          icon: UserGroupIcon,
          resource: "subcontractor",
          action: "find",
          process: "finished",
        },
        {
          id: "8K7NFg6Chm65",
          name: "vehicle.feature",
          link: `/orgs/${code}/vehicles`,
          icon: TruckIcon,
          resource: "vehicle",
          action: "find",
          process: "finished",
        },
        {
          id: "8K7NFg6Chm67",
          name: "vehicle_group.title",
          link: `/orgs/${code}/vehicle-groups`,
          icon: RectangleGroupIcon,
          resource: "vehicle-group",
          action: "find",
          process: "finished",
        },
        {
          id: "j1CJN0QExDp1",
          name: "trailer.feature",
          link: `/orgs/${code}/trailers`,
          icon: FaTrailerIcon,
          resource: "trailer",
          action: "find",
          process: "finished",
        },
        {
          id: "svIbxHUq8kSC",
          name: "maintenance.title",
          link: `/orgs/${code}/maintenances`,
          icon: WrenchScrewdriverIcon,
          resource: "maintenance",
          action: "find",
          process: "finished",
        },
        {
          id: "n8f0IyhNHgdS",
          name: "driver.title",
          link: `/orgs/${code}/drivers`,
          icon: UserIcon,
          resource: "driver",
          action: "find",
          process: "finished",
        },
        {
          id: "FwvLCsONS7KQ",
          name: "advance.title",
          link: `/orgs/${code}/advances`,
          icon: BanknotesIcon,
          resource: "advance",
          action: "find",
          process: "finished",
        },
        // { id: "SdlkJGgT4Ooz", name: "Nghỉ phép", link: `/orgs/${code}/absence`, icon: PiCalendarXIcon, show: false },
      ],
    },
  ],
  organization_settings: [
    {
      id: "eWzbEEVjLUAi",
      header: "components.search_features.header_organization",
      menus: [
        {
          id: "U9JEzTaSp3dJ",
          name: "org_setting_general.title",
          link: `/orgs/${code}/settings/general`,
          icon: Cog6ToothIcon,
          resource: "organization",
          action: "edit",
          process: "finished",
        },
        // { id: "f4dSPuX4q6iX", name: "Thống kê", link: `/orgs/${code}/settings/statistics`, icon: PiChartLineIcon, show: false },
        {
          id: "h4myHVG730Qq",
          name: "org_setting_role.title",
          link: `/orgs/${code}/settings/role`,
          icon: ShieldCheckIcon,
          resource: "organization-role",
          action: "find",
          process: "finished",
        },
        {
          id: "vE4nlLe25FA0",
          name: "org_setting_member.title",
          link: `/orgs/${code}/settings/members`,
          icon: UsersIcon,
          resource: "organization-member",
          action: "find",
          process: "finished",
        },
        {
          id: "t0INaAZUcwP8",
          name: "org_setting_report.title",
          link: `/orgs/${code}/settings/reports`,
          icon: ChartPieIcon,
          resource: "organization-report",
          action: "find",
          process: "finished",
        },
        // { id: "bOuDoO5lrrtZ", name: "Cấu hình SMTP", link: `/orgs/${code}/settings/mail`, icon: ServerStackIcon, show: false },
        // { id: "7DENhfBiJm2f", name: "Lịch sử thanh toán", link: `/orgs/${code}/settings/payment-history`, icon: MdOutlineHistoryIcon, show: false },
      ],
    },
    {
      id: "t3PkDcXpJZaN",
      header: "components.search_features.header_master_data",
      prefix: "components.search_features.prefix_settings",
      menus: [
        {
          id: "yIDzhwULMSnKV",
          name: "driver_license_type.title",
          link: `/orgs/${code}/settings/driver-license-types`,
          icon: PiUniteIcon,
          resource: "driver-license-type",
          action: "find",
          process: "finished",
        },
        {
          id: "81o0mfmil8c7",
          name: "driver_report.title",
          link: `/orgs/${code}/settings/driver-reports`,
          icon: GoWorkflowIcon,
          resource: "driver-report",
          action: "find",
          process: "finished",
        },
        {
          id: "MBInctNVezyU",
          name: "maintenance_type.title",
          link: `/orgs/${code}/settings/maintenance-types`,
          icon: PiUniteIcon,
          resource: "maintenance-type",
          action: "find",
          process: "finished",
        },
        {
          id: "yIDzhwqL6juI",
          name: "merchandise_type.title",
          link: `/orgs/${code}/settings/merchandise-types`,
          icon: PiUniteIcon,
          resource: "merchandise-type",
          action: "find",
          process: "finished",
        },
        {
          id: "ksRb8h7Lz9Y3",
          name: "unit_of_measure.title",
          link: `/orgs/${code}/settings/unit-of-measures`,
          icon: PiUniteIcon,
          resource: "unit-of-measure",
          action: "find",
          process: "finished",
        },
        {
          id: "Qk0UUz5eawJt",
          name: "vehicle_type.title",
          link: `/orgs/${code}/settings/vehicle-types`,
          icon: PiUniteIcon,
          resource: "vehicle-type",
          action: "find",
          process: "finished",
        },
        {
          id: "QcyvhZaPBKVs",
          name: "trailer_type.title",
          link: `/orgs/${code}/settings/trailer-types`,
          icon: PiUniteIcon,
          resource: "trailer-type",
          action: "find",
          process: "finished",
        },
        {
          id: "2xVBvBmLcDko",
          name: "gas_station.title",
          link: `/orgs/${code}/settings/gas-stations`,
          icon: PiUniteIcon,
          resource: "gas-station",
          action: "find",
          process: "finished",
        },
        {
          id: "3xVBvBmLcDko",
          name: "driver_expense.title",
          link: `/orgs/${code}/settings/driver-expenses`,
          icon: PiUniteIcon,
          resource: "driver-expense",
          action: "find",
          process: "finished",
        },
        {
          id: "dcbf596ced54",
          name: "expense_type.title",
          link: `/orgs/${code}/settings/expense-types`,
          icon: PiUniteIcon,
          resource: "expense-type",
          action: "find",
          process: "finished",
        },
      ],
    },
    {
      id: "Ic7E7gxC5hoP",
      header: "components.search_features.header_settings",
      menus: [
        {
          id: "RCYUMwSiYJDr",
          name: "org_setting_order_code.title",
          link: `/orgs/${code}/settings/order-codes`,
          icon: HiOutlineQrCodeIcon,
          resource: "order-codes",
          action: "find",
          process: "finished",
        },
        {
          id: "BuUq2CNG20VB",
          name: "org_setting_reminder.title",
          link: `/orgs/${code}/settings/reminders`,
          icon: BsAlarmIcon,
          resource: "reminder",
          action: "find",
          process: "finished",
        },
        {
          id: "CyYq3CMG72FT",
          name: "org_setting_others.title",
          link: `/orgs/${code}/settings/others`,
          icon: IoSettingsOutlineIcon,
          resource: "setting-others",
          action: "find",
          process: "finished",
        },
        // { id: "pG0ThXiN2gEd", name: "Cài đặt gói", link: `/orgs/${code}/settings/plan`, icon: CubeIcon, badge: "DÙNG THỬ"},
        {
          id: "TCzK8zXyVtLe",
          name: "custom_field.title",
          link: `/orgs/${code}/settings/custom-fields`,
          icon: PiTextboxIcon,
          resource: "custom-field",
          action: "find",
          process: "finished",
        },
        // { id: "dGYMmfjMwL8F", name: "org_deletion.title", link: `/orgs/${code}/settings/deletion`, icon: TrashIcon, process: "finished" },
      ],
    },
  ],
  user: [
    {
      id: "W8gUhrEKVwwR",
      header: "components.search_features.header_user",
      menus: [
        { id: "t3F13pwOVdlJ", name: "user_profile.title", link: "/users/profile", icon: UserIcon, process: "finished" },
        // { id: "1gdTFBWnzxBP", name: "Danh sách thông báo", link: "/users/notifications", icon: BellIcon },
        // { id: "sWr7dS3JDLdL", name: "user_linked_account.title", link: "/users/linked-account", icon: LinkIcon, process: "finished" },
        {
          id: "zcThWH3GyGk7",
          name: "user_password_edit.title",
          link: "/users/password-edit",
          icon: KeyIcon,
          process: "finished",
        },
        {
          id: "8IxJAPsRN9mo",
          name: "user_notifications.title",
          link: "/users/notifications",
          icon: BellIcon,
          resource: "notification",
          action: "find",
          process: "finished",
        },
      ],
    },

    // Security
    /* {
      id: "E4wFocWlbI0R",
      header: "components.search_features.header_secure",
      menus: [
        { id: "zcThWH3GyGk7", name: "user_password_edit.title", link: "/users/password-edit", icon: KeyIcon, process: "finished" },
        { id: "Lf8qVsuK4ptE", name: "Bảo mật 2 lớp", link: "/users/two-factor-authentication", icon: ShieldCheckIcon },
        { id: "w9xFyCgat2wl", name: "Thiết bị truy cập", link: "/users/devices", icon: ComputerDesktopIcon, show: false },
      ],
    }, */

    // Settings
    {
      id: "VUm0wX8He6RO",
      header: "components.search_features.header_settings",
      prefix: "components.search_features.prefix_settings",
      menus: [
        // { id: "8IxJAPsRN9mo", name: "Thông báo", link: "/users/notification", icon: BellIcon, show: false },
        {
          id: "JHhTqraXV0X0",
          name: "user_language.title",
          link: "/users/language",
          icon: LanguageIcon,
          process: "finished",
        },
      ],
    },
  ],
});
