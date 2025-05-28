"use client";

import useSWR from "swr";

import { customerStatisticsFetcher } from "@/actions/customers";
import { CustomerStatisticOverview, CustomerStatisticQueryParams } from "@/types/report";

const useCustomerStatistics = (params: CustomerStatisticQueryParams) => {
  const { organizationId, startDate, endDate, driverReportIds, page, pageSize } = params;
  const isValidFetchRequest = organizationId && startDate && endDate && page && pageSize && driverReportIds?.length;

  const { data, error, isLoading, mutate } = useSWR(
    isValidFetchRequest ? ["customer-statistics", params] : null,
    customerStatisticsFetcher.bind(null, params)
  );

  return {
    statistics: (data?.data || []) as CustomerStatisticOverview[],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useCustomerStatistics;
