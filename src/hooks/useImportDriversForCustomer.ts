"use client";

import useSWR from "swr";

import { importDriversForCustomerFetcher } from "@/actions/customers";
import { CustomerInfo } from "@/types/strapi";

const useImportDriversForCustomer = (params: Pick<CustomerInfo, "organizationId">) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["import-drivers-for-customer", params],
    importDriversForCustomerFetcher
  );

  return {
    customers: data?.data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useImportDriversForCustomer;
