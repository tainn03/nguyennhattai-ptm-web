"use client";

import useSWR from "swr";

import { driverSalariesFetcher } from "@/actions/drivers";
import { DriverSalaryOverview, DriverSalaryQueryParams } from "@/types/report";

const useDriverSalaries = (params: DriverSalaryQueryParams) => {
  const { organizationId, startDate, endDate, driverReportIds, page, pageSize } = params;
  const isValidFetchRequest = organizationId && startDate && endDate && page && pageSize && driverReportIds?.length;

  const { data, error, isLoading, mutate } = useSWR(
    isValidFetchRequest ? ["driver-salaries", params] : null,
    driverSalariesFetcher.bind(null, params)
  );
  return {
    driverSalaries: (data?.data || []) as DriverSalaryOverview[],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useDriverSalaries;
