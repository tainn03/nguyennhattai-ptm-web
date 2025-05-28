"use client";

import useSWR from "swr";

import { customerOptionsFetcher } from "@/services/client/customers";
import { CustomerInfo } from "@/types/strapi";

const useCustomerOptions = (params: Partial<CustomerInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["customers", params], customerOptionsFetcher);

  return {
    customers: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useCustomerOptions;
