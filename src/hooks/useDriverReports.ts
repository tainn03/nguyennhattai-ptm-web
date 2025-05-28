"use client";

import useSWR from "swr";

import { driverReportsFetcher } from "@/services/client/driverReport";
import { FilterRequest } from "@/types/filter";
import { DriverReportInfo } from "@/types/strapi";

const useDriverReports = (params: FilterRequest<DriverReportInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["driver-reports", params], driverReportsFetcher);

  return {
    driverReports: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useDriverReports;
