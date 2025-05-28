"use client";

import useSWR from "swr";

import { routesFetcher } from "@/services/client/route";
import { FilterRequest } from "@/types/filter";
import { RouteInfo } from "@/types/strapi";

const useRoutes = (params: FilterRequest<RouteInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["routes", params], routesFetcher);

  return {
    routes: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useRoutes;
