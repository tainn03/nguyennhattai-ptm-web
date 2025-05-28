"use client";

import useSWR from "swr";

import { gasStationOptionsFetcher } from "@/services/client/gasStation";
import { GasStationInfo } from "@/types/strapi";

const useGasStationOptions = (params: Partial<GasStationInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["gas-station-options", params] : null,
    gasStationOptionsFetcher
  );

  return {
    gasStations: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useGasStationOptions;
