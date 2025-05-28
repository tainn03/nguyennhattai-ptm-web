"use client";

import useSWR from "swr";

import { routePointFetcher } from "@/actions/routePoint";
import { RoutePointInfo } from "@/types/strapi";

const useRoutePoint = (params: Pick<RoutePointInfo, "id" | "organizationId">) => {
  const { data, error, isLoading, mutate } = useSWR([`route-point/${params.id}`, params], routePointFetcher);

  return {
    routePoint: data?.data,
    isLoading,
    error,
    mutate,
  };
};

export default useRoutePoint;
