"use client";

import useSWR from "swr";

import { orderGroupCountByStatusFetcher } from "@/actions/orderGroup";
import { OrderGroupInfo } from "@/types/strapi";

const useOrderGroupCountByStatus = (param: Pick<OrderGroupInfo, "organizationId">) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["order-group-count-by-status", param],
    orderGroupCountByStatusFetcher
  );

  return {
    baseCount: data?.baseMeta?.pagination?.total ?? 0,
    planCount: data?.planMeta?.pagination?.total ?? 0,
    processedCount: data?.processedMeta?.pagination?.total ?? 0,
    error,
    isLoading,
    mutate,
  };
};

export default useOrderGroupCountByStatus;
