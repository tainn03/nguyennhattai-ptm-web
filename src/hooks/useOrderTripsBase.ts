"use client";

import useSWR from "swr";

import { baseOrderTripsFetcher } from "@/services/client/orderTrip";
import { FilterRequest } from "@/types/filter";
import { OrderTripInfo } from "@/types/strapi";

const useOrderTripsBase = (params: FilterRequest<OrderTripInfo> & { vehicleIds: number[] }) => {
  const hasVehicleId = params.vehicleIds.length > 0;
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId && hasVehicleId ? ["vehicle-monitoring/base-order-trips", params] : null,
    baseOrderTripsFetcher
  );

  return {
    orderTrips: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useOrderTripsBase;
