"use client";

import useSWR from "swr";

import { AdvanceInputForm } from "@/forms/advance";
import { orderTripOptionsFetcher } from "@/services/client/orderTrip";

const useOrderTripOptions = (params: Pick<AdvanceInputForm, "organizationId" | "monthOfTrip">) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.monthOfTrip ? ["order-trip-options", params] : null,
    orderTripOptionsFetcher
  );

  return {
    orderTrips: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useOrderTripOptions;
