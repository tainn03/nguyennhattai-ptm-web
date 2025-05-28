"use client";

import useSWR from "swr";

import { routePointOptionsFetcher } from "@/actions/routePoint";
import { RoutePointInfo } from "@/types/strapi";

const useRoutePointOptions = (params: Pick<RoutePointInfo, "organizationId">) => {
  const { data, error, isLoading, mutate } = useSWR(["route-point-options", params], routePointOptionsFetcher);

  return {
    routePoints: data?.data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useRoutePointOptions;
