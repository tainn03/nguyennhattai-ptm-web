"use client";

import useSWR from "swr";

import { gasStationFetcher } from "@/services/client/gasStation";
import { GasStationInfo } from "@/types/strapi";

const useGasStation = (params: Partial<GasStationInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["gas-station", params], gasStationFetcher);

  return {
    gasStation: data,
    isLoading,
    error,
    mutate,
  };
};

export default useGasStation;
