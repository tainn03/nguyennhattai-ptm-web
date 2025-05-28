"use client";

import useSWR from "swr";

import { customerGroupFetcher } from "@/services/client/customerGroup";
import { CustomerGroupInfo } from "@/types/strapi";

const useCustomerGroup = (params: Partial<CustomerGroupInfo>) => {
  const { data, error, isLoading, mutate } = useSWR([`customer-group/${params.id}`, params], customerGroupFetcher);

  return {
    customerGroup: data,
    isLoading,
    error,
    mutate,
  };
};

export default useCustomerGroup;
