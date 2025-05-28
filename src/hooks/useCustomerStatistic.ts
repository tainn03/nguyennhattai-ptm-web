"use client";

import useSWR from "swr";

import { customerStatisticFetcher } from "@/actions/customers";
import { DetailedCustomerStatisticInfo, IndividualCustomerStatisticParams } from "@/types/report";

const useCustomerStatistic = (params: IndividualCustomerStatisticParams) => {
  const { organizationId, startDate, endDate, customerId, driverReportIds } = params;
  const isValidFetchRequest = organizationId && startDate && endDate && customerId && driverReportIds?.length;

  const { data, error, isLoading, mutate } = useSWR(
    isValidFetchRequest ? [`customer-statistic/${customerId}`, params] : null,
    customerStatisticFetcher.bind(null, params)
  );

  return {
    statistic: (data ?? {}) as DetailedCustomerStatisticInfo,
    isLoading,
    error,
    mutate,
  };
};

export default useCustomerStatistic;
