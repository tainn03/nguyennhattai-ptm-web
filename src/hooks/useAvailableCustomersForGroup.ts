"use client";

import useSWR from "swr";

import { availableCustomersForGroupFetcher } from "@/services/client/customers";
import { FilterRequest } from "@/types/filter";
import { CustomerInfo } from "@/types/strapi";

const useAvailableCustomersForGroup = (params: FilterRequest<CustomerInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["available-customers-for-group", params] : null,
    availableCustomersForGroupFetcher
  );

  return {
    customers: data?.customers || [],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useAvailableCustomersForGroup;
