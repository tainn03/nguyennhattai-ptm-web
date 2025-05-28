"use client";

import useSWR from "swr";

import { detailOrderTripsFetcher } from "@/services/client/orderTrip";
import { OrderTripInfo } from "@/types/strapi";

const useOrderTripsDetail = (params: Partial<OrderTripInfo> & { orderTripIds: number[] }) => {
  const hasOrderTripsId = params.orderTripIds.length > 0;
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId && hasOrderTripsId ? ["vehicle-monitoring/detail-order-trips", params] : null,
    detailOrderTripsFetcher
  );

  return {
    orderTrips: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useOrderTripsDetail;
