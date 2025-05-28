"use client";

import useSWR from "swr";

import { customFieldByTypeFetcher } from "@/services/client/customField";
import { CustomFieldInfo } from "@/types/strapi";

const useCustomFieldByType = (params: Partial<CustomFieldInfo>) => {
  const { data, error, isLoading } = useSWR(
    params.type ? ["custom-field-by-type", params] : null,
    customFieldByTypeFetcher
  );

  return {
    customFields: data || [],
    isLoading,
    error,
  };
};

export default useCustomFieldByType;
