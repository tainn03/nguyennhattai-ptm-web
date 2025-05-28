"use client";

import useSWR from "swr";

import { getDataChartOrderMonitoring } from "@/services/client/order";
import { FilterRequest } from "@/types/filter";
import { OrderInfo } from "@/types/strapi";

const useOrderMonitoringChart = (params: FilterRequest<OrderInfo>) => {
  const { data, error, isLoading, mutate } = useSWR(["order-monitoring-chart", params], getDataChartOrderMonitoring);

  return {
    dataChart: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useOrderMonitoringChart;
