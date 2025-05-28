"use client";

import useSWR from "swr";

import { customFieldFetcher } from "@/services/client/customField";
import { CustomFieldInfo } from "@/types/strapi";

const useCustomField = (params: Partial<CustomFieldInfo>) => {
  const { data, error, isLoading } = useSWR([`custom-fields/${params.id}`, params], customFieldFetcher);

  return {
    customField: data,
    isLoading,
    error,
  };
};

export default useCustomField;
