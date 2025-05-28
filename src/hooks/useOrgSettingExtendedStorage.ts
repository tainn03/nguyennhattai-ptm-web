"use client";

import { useMemo } from "react";

import {
  DateTimeDisplayType,
  OrganizationSettingExtendedKey,
  TripStatusUpdateType,
} from "@/constants/organizationSettingExtended";
import { SESSION_ORGANIZATION_SETTING_EXTENDED } from "@/constants/storage";
import { OrganizationSettingExtendedStorage } from "@/types/storage";
import { getItemObject } from "@/utils/storage";

const useOrgSettingExtendedStorage = () => {
  const organizationOrderRelatedDateFormat = useMemo(() => {
    return (
      getItemObject<OrganizationSettingExtendedStorage>(SESSION_ORGANIZATION_SETTING_EXTENDED)
        ?.organizationOrderRelatedDateFormat || DateTimeDisplayType.DATE
    );
  }, []);

  const tripStatusUpdateType = useMemo(() => {
    return (
      getItemObject<OrganizationSettingExtendedStorage>(SESSION_ORGANIZATION_SETTING_EXTENDED)?.tripStatusUpdateType ||
      TripStatusUpdateType.DEFAULT
    );
  }, []);

  const useFuelCostManagement = useMemo(() => {
    return (
      getItemObject<OrganizationSettingExtendedStorage>(SESSION_ORGANIZATION_SETTING_EXTENDED)?.useFuelCostManagement ||
      false
    );
  }, []);

  const allowOrderEditAnyStatus = useMemo(() => {
    return (
      getItemObject<OrganizationSettingExtendedStorage>(SESSION_ORGANIZATION_SETTING_EXTENDED)
        ?.allowOrderEditAnyStatus || false
    );
  }, []);

  const mergeDeliveryAndPickup = useMemo(() => {
    return (
      getItemObject<OrganizationSettingExtendedStorage>(SESSION_ORGANIZATION_SETTING_EXTENDED)
        ?.mergeDeliveryAndPickup || false
    );
  }, []);

  const orderConsolidationEnabled = useMemo(() => {
    return (
      getItemObject<OrganizationSettingExtendedStorage>(SESSION_ORGANIZATION_SETTING_EXTENDED)
        ?.orderConsolidationEnabled || false
    );
  }, []);

  const enableCbmField = useMemo(() => {
    return (
      getItemObject<OrganizationSettingExtendedStorage>(SESSION_ORGANIZATION_SETTING_EXTENDED)?.enableCbmField || false
    );
  }, []);

  return {
    [OrganizationSettingExtendedKey.ORGANIZATION_ORDER_RELATED_DATE_FORMAT]: organizationOrderRelatedDateFormat,
    [OrganizationSettingExtendedKey.TRIP_STATUS_UPDATE_TYPE]: tripStatusUpdateType,
    [OrganizationSettingExtendedKey.USE_FUEL_COST_MANAGEMENT]: useFuelCostManagement,
    [OrganizationSettingExtendedKey.ALLOW_ORDER_EDIT_ANY_STATUS]: allowOrderEditAnyStatus,
    [OrganizationSettingExtendedKey.MERGE_DELIVERY_AND_PICKUP]: mergeDeliveryAndPickup,
    [OrganizationSettingExtendedKey.ORDER_CONSOLIDATION_ENABLED]: orderConsolidationEnabled,
    [OrganizationSettingExtendedKey.ENABLE_CBM_FIELD]: enableCbmField,
  };
};

export default useOrgSettingExtendedStorage;
