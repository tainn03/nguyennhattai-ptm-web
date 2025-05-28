"use client";

import useSWR from "swr";

import { adjacentZonesFetcher } from "@/actions/zone";
import { FilterRequest } from "@/types/filter";
import { ZoneInfo } from "@/types/strapi";

const useAdjacentZones = (params: FilterRequest<ZoneInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["adjacent-zones", params], adjacentZonesFetcher);
  return {
    zones: data?.data?.data || [],
    pagination: data?.data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useAdjacentZones;
