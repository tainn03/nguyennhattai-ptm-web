"use client";

import useSWR from "swr";

import { driverReportsTripStatusWithTypeAndNameFetcher } from "@/services/client/driverReport";
import { FilterRequest } from "@/types/filter";
import { DriverReportInfo } from "@/types/strapi";

const useDriverReportsTripStatusWithTypeAndName = (params: FilterRequest<DriverReportInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["driver-reports-trip-status-with-type-and-name", params],
    driverReportsTripStatusWithTypeAndNameFetcher
  );

  return {
    driverReports: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useDriverReportsTripStatusWithTypeAndName;
