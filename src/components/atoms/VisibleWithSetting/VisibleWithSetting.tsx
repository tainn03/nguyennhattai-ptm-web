"use client";
import { ReactNode } from "react";

import { OrganizationSettingExtendedKey } from "@/constants/organizationSettingExtended";
import { DateTimeDisplayType, TripStatusUpdateType } from "@/constants/organizationSettingExtended";
import useOrgSettingExtendedStorage from "@/hooks/useOrgSettingExtendedStorage";
import { isTrue } from "@/utils/string";

type SettingValue = DateTimeDisplayType | TripStatusUpdateType | boolean;

interface VisibleWithSettingProps {
  settingKey: OrganizationSettingExtendedKey;
  expect?: boolean | string;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function VisibleWithSetting({ settingKey, expect = true, children, fallback }: VisibleWithSettingProps) {
  const settings = useOrgSettingExtendedStorage();
  const settingValue = settings[settingKey as keyof typeof settings] as SettingValue;

  const isVisible = typeof expect === "boolean" ? isTrue(settingValue) === expect : settingValue === expect;

  if (isVisible) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}
