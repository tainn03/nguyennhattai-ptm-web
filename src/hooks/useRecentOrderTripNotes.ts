"use client";

import useSWR from "swr";

import { recentOrderTripNotesFetcher } from "@/actions/orderTrip";
import { FilterRequest } from "@/types/filter";
import { OrderTripInfo } from "@/types/strapi";

const useRecentOrderTripNotes = (params: FilterRequest<OrderTripInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    ["recent-order-trip-note", params],
    recentOrderTripNotesFetcher.bind(null, params)
  );

  return {
    orderTrips: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useRecentOrderTripNotes;
