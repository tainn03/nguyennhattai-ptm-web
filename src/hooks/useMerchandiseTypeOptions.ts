"use client";

import useSWR from "swr";

import { merchandiseTypeOptionsFetcher } from "@/services/client/merchandiseType";
import { MerchandiseTypeInfo } from "@/types/strapi";

const useMerchandiseTypeOptions = (params: Partial<MerchandiseTypeInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["merchandise-type-options", params],
    merchandiseTypeOptionsFetcher
  );

  return {
    merchandiseTypes: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useMerchandiseTypeOptions;
