"use client";

import useSWR from "swr";

import { subcontractorCostFetcher } from "@/actions/subcontractors";
import { DetailedSubcontractorCostInfo, IndividualSubcontractorCostParams } from "@/types/report";

const useSubcontractorCost = (params: IndividualSubcontractorCostParams) => {
  const { organizationId, startDate, endDate, driverReportIds, subcontractorId } = params;
  const isValidFetchRequest = organizationId && startDate && endDate && subcontractorId && driverReportIds?.length;

  const { data, error, isLoading, mutate } = useSWR(
    isValidFetchRequest ? ["subcontractor-cost", params] : null,
    subcontractorCostFetcher.bind(null, params)
  );

  return {
    costInfo: (data ?? {}) as DetailedSubcontractorCostInfo,
    isLoading,
    error,
    mutate,
  };
};

export default useSubcontractorCost;
