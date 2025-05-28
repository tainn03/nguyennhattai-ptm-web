"use client";

import useSWR from "swr";

import { customerOptionsMonitoringFetcher } from "@/services/client/customers";
import { CustomerInfo } from "@/types/strapi";

const useCustomerOptionsOrderMonitoring = (params: Partial<CustomerInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["customers-order-monitoring", params],
    customerOptionsMonitoringFetcher
  );

  return {
    customers: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useCustomerOptionsOrderMonitoring;
