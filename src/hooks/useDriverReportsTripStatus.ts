"use client";

import useSWR from "swr";

import { driverReportsTripStatusFetcher } from "@/services/client/driverReport";
import { FilterRequest } from "@/types/filter";
import { DriverReportInfo } from "@/types/strapi";

const useDriverReportsTripStatus = (params: FilterRequest<DriverReportInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["driver-reports-trip-status", params],
    driverReportsTripStatusFetcher
  );

  return {
    driverReports: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useDriverReportsTripStatus;
