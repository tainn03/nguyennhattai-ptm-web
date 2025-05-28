"use client";

import useSWR from "swr";

import { orderTripsByVehicleFetcher } from "@/services/client/orderTrip";
import { OrderTripInfo } from "@/types/strapi";

const useOrderTripsByVehicle = (params: Partial<OrderTripInfo> & { orderTripIds: number[] }) => {
  const hasOrderTripsId = params.orderTripIds.length > 0;
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId && hasOrderTripsId ? ["vehicle-monitoring/order-trips-by-vehicle", params] : null,
    orderTripsByVehicleFetcher
  );

  return {
    orderTrips: data?.data ?? [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useOrderTripsByVehicle;
