"use client";

import useSWR from "swr";

import { randomRequestsFetcher } from "@/services/client/orderRequest";

const useOrderRequests = () => {
  const { data, isLoading, error } = useSWR("order-requests", randomRequestsFetcher);

  return {
    orderRequests: data || [],
    isLoading,
    error,
  };
};

export default useOrderRequests;
