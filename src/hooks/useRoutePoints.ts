"use client";

import useSWR from "swr";

import { routePointsFetcher } from "@/actions/routePoint";
import { FilterRequest } from "@/types/filter";
import { RoutePointInfo } from "@/types/strapi";

const useRoutePoints = (params: FilterRequest<RoutePointInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["route-points", params], routePointsFetcher);

  return {
    routePoints: data?.data?.data || [],
    pagination: data?.data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useRoutePoints;
