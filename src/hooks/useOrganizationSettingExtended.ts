"use client";

import useSWR from "swr";

import { organizationSettingExtendedFetcher } from "@/services/client/organizationSettingExtended";
import { OrganizationSettingExtendedInfo } from "@/types/strapi";

const useOrganizationSettingExtended = <T>(
  params: Partial<Pick<OrganizationSettingExtendedInfo, "organizationId" | "key">>
) => {
  const { data, error, isLoading } = useSWR(
    params.organizationId ? [`organization-setting-extended/${params.key}`, params] : null,
    organizationSettingExtendedFetcher
  );

  return {
    value: data as T | undefined,
    isLoading,
    error,
  };
};

export default useOrganizationSettingExtended;
