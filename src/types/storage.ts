import { OrganizationSettingExtendedKey, TripStatusUpdateType } from "@/constants/organizationSettingExtended";

export type DateTimeDisplayType = "date" | "datetime" | "time" | "datetime_no_second" | "time_no_second";

export type OrganizationSettingExtendedStorage = {
  [OrganizationSettingExtendedKey.ORGANIZATION_ORDER_RELATED_DATE_FORMAT]: DateTimeDisplayType;
  [OrganizationSettingExtendedKey.TRIP_STATUS_UPDATE_TYPE]: TripStatusUpdateType;
  [OrganizationSettingExtendedKey.USE_FUEL_COST_MANAGEMENT]: boolean;
  [OrganizationSettingExtendedKey.ALLOW_ORDER_EDIT_ANY_STATUS]: boolean;
  [OrganizationSettingExtendedKey.MERGE_DELIVERY_AND_PICKUP]: boolean;
  [OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED]: boolean;
  [OrganizationSettingExtendedKey.ENABLE_CBM_FIELD]: boolean;
};
