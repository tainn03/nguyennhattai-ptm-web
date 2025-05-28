"use client";

import useSWR from "swr";

import { adjacentRoutePointsFetcher } from "@/actions/routePoint";
import { FilterRequest } from "@/types/filter";
import { RoutePointInfo } from "@/types/strapi";

const useAdjacentRoutePoints = (params: FilterRequest<RoutePointInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["adjacent-route-points", params], adjacentRoutePointsFetcher);
  return {
    points: data?.data?.data || [],
    pagination: data?.data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useAdjacentRoutePoints;
