"use client";

import useSWR from "swr";

import { subcontractorCostsFetcher } from "@/actions/subcontractors";
import { FilterRequest } from "@/types/filter";
import { SubcontractorCostOverview, SubcontractorCostQueryParams } from "@/types/report";

const useSubcontractorCosts = (params: FilterRequest<SubcontractorCostQueryParams>) => {
  const { organizationId, startDate, endDate, driverReportIds, page, pageSize } = params;
  const isValidFetchRequest = organizationId && startDate && endDate && page && pageSize && driverReportIds?.length;

  const { data, error, isLoading, mutate } = useSWR(
    isValidFetchRequest ? ["subcontractor-costs", params] : null,
    subcontractorCostsFetcher.bind(null, params)
  );

  return {
    costInfo: (data?.data || []) as SubcontractorCostOverview[],
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
};

export default useSubcontractorCosts;
