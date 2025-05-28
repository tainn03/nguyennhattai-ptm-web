"use client";

import useSWR from "swr";

import { gasStationsFetcher } from "@/services/client/gasStation";
import { FilterRequest } from "@/types/filter";
import { GasStationInfo } from "@/types/strapi";

const useGasStations = (params: FilterRequest<GasStationInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["gas-stations", params], gasStationsFetcher);

  return {
    gasStations: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useGasStations;
