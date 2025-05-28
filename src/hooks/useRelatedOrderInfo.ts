"use client";

import useSWR from "swr";

import { relatedOrderInfoFetcher } from "@/services/client/order";
import { FilterRequest } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

const useRelatedOrderInfo = (params: FilterRequest<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.isFetch ? ["related-order-info", params] : null,
    relatedOrderInfoFetcher
  );

  return {
    relatedOrderInfo: data,
    isLoading,
    error,
    mutate,
  };
};

export default useRelatedOrderInfo;
