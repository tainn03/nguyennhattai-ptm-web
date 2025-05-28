"use client";

import useSWR from "swr";

import { driverSalaryFetcher } from "@/actions/drivers";
import { DetailedDriverSalaryInfo, IndividualDriverSalaryParams } from "@/types/report";

const useDriverSalary = (params: IndividualDriverSalaryParams) => {
  const { organizationId, startDate, endDate, driverId, driverReportIds } = params;
  const isValidFetchRequest = organizationId && startDate && endDate && driverId && driverReportIds?.length;

  const { data, error, isLoading, mutate } = useSWR(
    isValidFetchRequest ? ["driver-salary", params] : null,
    driverSalaryFetcher.bind(null, params)
  );

  return {
    driverSalary: (data ?? {}) as DetailedDriverSalaryInfo,
    isLoading,
    error,
    mutate,
  };
};

export default useDriverSalary;
