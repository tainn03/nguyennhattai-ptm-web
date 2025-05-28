"use client";

import useSWR from "swr";

import { shareObjectFetcher } from "@/services/client/shareObject";
import { OrderInfo } from "@/types/strapi";

const useShareObject = (params: Partial<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.id ? [`order-share/${params.id}`, params] : null,
    shareObjectFetcher
  );

  return {
    shareObject: data,
    isLoading,
    error,
    mutate,
  };
};

export default useShareObject;
