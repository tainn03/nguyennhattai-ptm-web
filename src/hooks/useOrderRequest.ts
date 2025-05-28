"use client";

import useSWR from "swr";

import { randomRequestFetcher } from "@/services/client/orderRequest";
import { randomInt } from "@/utils/number";

const useOrderRequest = () => {
  const { data, isLoading, error } = useSWR(`order-request/${randomInt(1, 10)}`, randomRequestFetcher);

  return {
    orderRequest: data || {},
    isLoading,
    error,
  };
};

export default useOrderRequest;
