"use client";

import useSWR from "swr";

import { customersFetcher } from "@/services/client/customers";
import { FilterRequest } from "@/types/filter";
import { CustomerInfo } from "@/types/strapi";

const useCustomers = (params: FilterRequest<CustomerInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["customers", params], customersFetcher);

  return {
    customers: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useCustomers;
