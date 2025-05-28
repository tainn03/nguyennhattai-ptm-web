"use client";

import useSWR from "swr";

import { customerFetcher } from "@/services/client/customers";
import { CustomerInfo } from "@/types/strapi";

const useCustomer = (params: Partial<CustomerInfo>) => {
  const { data, error, isLoading } = useSWR([`customers/${params.id}`, params], customerFetcher);

  return {
    customer: data,
    isLoading,
    error,
  };
};

export default useCustomer;
