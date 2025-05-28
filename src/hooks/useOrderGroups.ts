"use client";

import useSWR from "swr";

import { orderGroupsFetcher } from "@/services/client/orderGroup";
import { AnyObject } from "@/types";

const useOrderGroups = (params: AnyObject) => {
  const { data, error, isLoading, mutate } = useSWR(["order-groups", params], orderGroupsFetcher);

  return {
    orderGroups: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useOrderGroups;
