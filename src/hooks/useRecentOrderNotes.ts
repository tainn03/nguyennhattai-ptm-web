"use client";

import useSWR from "swr";

import { recentOrderNotesFetcher } from "@/actions/orders";
import { FilterRequest } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

const useRecentOrderNotes = (params: FilterRequest<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["recent-order-note", params],
    recentOrderNotesFetcher.bind(null, params)
  );

  return {
    orders: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useRecentOrderNotes;
