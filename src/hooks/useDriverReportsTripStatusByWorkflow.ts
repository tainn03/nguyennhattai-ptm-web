"use client";

import useSWR from "swr";

import { driverReportsTripStatusByWorkflowFetcher } from "@/services/client/driverReport";
import { FilterRequest } from "@/types/filter";
import { DriverReportInfo } from "@/types/strapi";

const useDriverReportsTripStatusByWorkflow = (params: FilterRequest<DriverReportInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["driver-reports-trip-status-by-workflow", params],
    driverReportsTripStatusByWorkflowFetcher
  );

  return {
    driverReports: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useDriverReportsTripStatusByWorkflow;
