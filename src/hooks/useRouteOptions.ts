"use client";

import useSWR from "swr";

import { routeOptionsFetcher } from "@/services/client/route";
import { RouteInfo } from "@/types/strapi";

const useRouteOptions = (params: Partial<RouteInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.customerId ? [`customers/${params.customerId}/routes`, params] : null,
    routeOptionsFetcher
  );

  return {
    routes: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useRouteOptions;
