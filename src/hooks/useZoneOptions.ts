"use client";

import useSWR from "swr";

import { zoneOptionsFetcher } from "@/actions/zone";
import { FilterRequest } from "@/types/filter";
import { ZoneInfo } from "@/types/strapi";

const useZoneOptions = (params: FilterRequest<ZoneInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["zone-options", params] : null,
    zoneOptionsFetcher
  );

  return {
    zones: data?.data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useZoneOptions;
