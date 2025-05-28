"use client";

import useSWR from "swr";

import { fuelLogsGasStationChartFetcher } from "@/services/client/fuelLog";
import { FuelLogInfo } from "@/types/strapi";

const useFuelLogsGasStationChart = (
  params: Pick<FuelLogInfo, "organizationId"> & { startDate: Date; endDate: Date }
) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["fuel-logs-gas-station-chart", params],
    fuelLogsGasStationChartFetcher
  );

  return {
    fuelLogs: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useFuelLogsGasStationChart;
