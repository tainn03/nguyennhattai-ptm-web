export enum OrganizationSettingExtendedKey {
  ALLOW_DELETE_TRIP_AFTER_DELIVERED = "allowDeleteTripAfterDelivered",

  ALLOW_DELETE_TRIP_AFTER_COMPLETED = "allowDeleteTripAfterCompleted",

  ALLOW_ORDER_EDIT_ANY_STATUS = "allowOrderEditAnyStatus",

  REPORT_CALCULATION_DATE_FLAG = "reportCalculationDateFlag",

  IS_NEW_TRIP_INFO_CONFIDENTIAL = "isNewTripInfoConfidential",

  NEW_TRIP_SORT_CRITERIA_ON_APP = "newTripSortCriteriaOnApp",

  PROCESSING_TRIP_SORT_CRITERIA_ON_APP = "processingTripSortCriteriaOnApp",

  DELIVERED_TRIP_SORT_CRITERIA_ON_APP = "deliveredTripSortCriteriaOnApp",

  DRIVER_NO_RESPONSE_MAX_RETRIES = "driverNoResponseMaxRetries",

  DRIVER_RESPONSE_CHECK_INTERVAL = "driverResponseCheckInterval",

  VEHICLE_MONITORING_DISPLAY_DATE = "vehicleMonitoringDisplayDate",

  DISPATCH_VEHICLE_ORDER_TRIP_SORT_CRITERIA = "dispatchVehicleOrderTripSortCriteria",

  ORGANIZATION_ORDER_RELATED_DATE_FORMAT = "organizationOrderRelatedDateFormat",

  USE_FUEL_COST_MANAGEMENT = "useFuelCostManagement",

  TRIP_STATUS_UPDATE_TYPE = "tripStatusUpdateType",

  SHOW_ASSIGNED_VEHICLE_ON_APP = "showAssignedVehicleOnApp",

  INCLUDE_ORDER_META_IN_REPORTS = "includeOrderMetaInReports",

  INCLUDE_ROUTE_POINT_META_IN_REPORTS = "includeRoutePointMetaInReports",

  INCLUDE_ORDER_ITEM_IN_REPORTS = "includeOrderItemInReports",

  INCLUDE_ATTRIBUTE_ROUTE_IN_REPORTS = "includeAttributeRouteInReports",

  INCLUDE_ATTRIBUTE_CUSTOMER_IN_REPORTS = "includeAttributeCustomerInReports",

  PREVENT_DUPLICATE_BILL_OF_LADING = "preventDuplicateBillOfLading",

  MONTHLY_BOL_DUPLICATE_CHECK_START_DAY = "monthlyBOLDuplicateCheckStartDay",

  TRIP_DETAILS_DISPLAY_RULES = "tripDetailsDisplayRules",

  MERGE_DELIVERY_AND_PICKUP = "mergeDeliveryAndPickup",

  REPORT_ADDRESS_FORMATTING_RULES = "reportAddressFormattingRules",

  ALLOW_PRICE_ADJUSTMENT = "allowPriceAdjustment",

  DAILY_ORDER_SEQUENCE_CUSTOM_FIELD_USAGE = "dailyOrderSequenceCustomFieldUsage",

  CUSTOM_I18N_PATH = "customI18nPath",

  ORDER_CONSOLIDATION_ENABLED = "orderConsolidationEnabled",

  ENABLE_CBM_FIELD = "enableCbmField",
}

export enum ReportCalculationDateFlag {
  TRIP_PICKUP_DATE = "pickupDate",
  TRIP_DELIVERY_DATE = "deliveryDate",
  STATUS_CREATED_AT = "createdAt",
}

export enum DateTimeDisplayType {
  DATE = "date",
  DATETIME = "datetime",
  TIME = "time",
  DATETIME_NO_SECOND = "datetime_no_second",
}

export enum TripStatusUpdateType {
  DEFAULT = "default",
  TIMELINE = "timeline",
}

export const DAILY_ORDER_SEQUENCE_CUSTOM_FIELD_KEY = "daily_order_sequence";

export enum MonthlyBOLDuplicateCheckStartDayValue {
  startOfMonth = "startOfMonth",
  endOfMonth = "endOfMonth",
}
