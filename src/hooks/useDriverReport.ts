"use client";

import useSWR from "swr";

import { driverReportFetcher } from "@/services/client/driverReport";
import { DriverReportInfo } from "@/types/strapi";

const useDriverReport = (params: Partial<DriverReportInfo>) => {
  const { data, error, isLoading } = useSWR([`driver-report/${params.id}`, params], driverReportFetcher);
  const { reportDetails, ...driverReport } = data || ({} as DriverReportInfo);

  return {
    driverReport,
    driverReportDetails: reportDetails,
    isLoading,
    error,
  };
};

export default useDriverReport;
