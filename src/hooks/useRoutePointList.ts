"use client";

import useSWR from "swr";

import { routePointsFetcher } from "@/services/client/routePoint";
import { FilterRequest } from "@/types/filter";
import { RoutePointInfo } from "@/types/strapi";

const useRoutePointList = (params: FilterRequest<RoutePointInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["route-point-list", params], routePointsFetcher);

  return {
    routePoints: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useRoutePointList;
