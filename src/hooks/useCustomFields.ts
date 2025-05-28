"use client";

import useSWR from "swr";

import { customFieldsFetcher } from "@/services/client/customField";
import { FilterRequest } from "@/types/filter";
import { CustomFieldInfo } from "@/types/strapi";

const useCustomFields = (params: FilterRequest<CustomFieldInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["custom-fields", params], customFieldsFetcher);

  return {
    customFields: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useCustomFields;
