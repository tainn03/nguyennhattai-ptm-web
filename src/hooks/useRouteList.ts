"use client";

import useSWR from "swr";

import { routeListByCustomerIdFetcher } from "@/services/client/route";
import { FilterRequest } from "@/types/filter";
import { RouteInfo } from "@/types/strapi";

const useRouteList = (params: FilterRequest<RouteInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.customerId ? ["routes", params] : null,
    routeListByCustomerIdFetcher
  );

  return {
    routes: data?.data || [],
    pagination: data?.meta?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useRouteList;
