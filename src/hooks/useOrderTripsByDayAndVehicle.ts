"use client";

import useSWR from "swr";

import { orderTripsByDayAndVehicleFetcher } from "@/actions/orderTrip";
import { FilterRequest } from "@/types/filter";
import { OrderTripInfo } from "@/types/strapi";

const useOrderTripsByDayAndVehicle = (params: FilterRequest<OrderTripInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["order-trips", params], orderTripsByDayAndVehicleFetcher);

  return {
    orderTrips: data?.data?.data || [],
    pagination: data?.data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useOrderTripsByDayAndVehicle;
