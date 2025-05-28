"use client";

import useSWR from "swr";

import { merchandiseTypesFetcher } from "@/services/client/merchandiseType";
import { FilterRequest } from "@/types/filter";
import { MerchandiseTypeInfo } from "@/types/strapi";

const useMerchandiseTypes = (params: FilterRequest<MerchandiseTypeInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["merchandise-types", params], merchandiseTypesFetcher);

  return {
    merchandiseTypes: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useMerchandiseTypes;
