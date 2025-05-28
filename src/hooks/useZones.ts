"use client";

import useSWR from "swr";

import { zonesFetcher } from "@/actions/zone";
import { FilterRequest } from "@/types/filter";
import { ZoneInfo } from "@/types/strapi";

const useZones = (params: FilterRequest<ZoneInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["zones", params], zonesFetcher);
  return {
    zones: data?.data?.data || [],
    pagination: data?.data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useZones;
