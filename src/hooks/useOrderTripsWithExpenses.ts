"use client";

import useSWR from "swr";

import { getOrderTripsWithExpensesByOrderId } from "@/services/client/orderTrip";
import { OrderInfo } from "@/types/strapi";

const useOrderTripsWithExpenses = (params: Partial<OrderInfo>) => {
  const { data, isLoading, error, mutate } = useSWR(
    ["order-trips-with-expenses", params],
    getOrderTripsWithExpensesByOrderId
  );

  return {
    orderTrips: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useOrderTripsWithExpenses;
