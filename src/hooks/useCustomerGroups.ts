"use client";

import useSWR from "swr";

import { customerGroupsFetcher } from "@/services/client/customerGroup";
import { FilterRequest } from "@/types/filter";
import { CustomerGroupInfo } from "@/types/strapi";

const useCustomerGroups = (params: FilterRequest<CustomerGroupInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["customer-groups", params] : null,
    customerGroupsFetcher
  );

  return {
    customerGroups: data?.customerGroups || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useCustomerGroups;
