"use client";

import useSWR from "swr";

import { fuelLogFetcher } from "@/services/client/fuelLog";
import { FuelLogInfo } from "@/types/strapi";

const useFuelLog = (params: Partial<FuelLogInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["fuel-log", params], fuelLogFetcher);

  return {
    fuelLog: data,
    isLoading,
    error,
    mutate,
  };
};

export default useFuelLog;
