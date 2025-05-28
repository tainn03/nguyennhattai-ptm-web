"use client";

import useSWR from "swr";

import { subcontractorPaidTripsFetcher } from "@/actions/orderTrip";
import { IndividualSubcontractorCostParams, SubcontractorPaidTrip } from "@/types/report";

const useSubcontractorPaidTrips = (params: IndividualSubcontractorCostParams) => {
  const { organizationId, startDate, endDate, driverReportIds, subcontractorId } = params;
  const isValidFetchRequest = organizationId && startDate && endDate && subcontractorId && driverReportIds?.length;

  const { data, error, isLoading, mutate } = useSWR(
    isValidFetchRequest ? ["subcontractor-paid-trips", params] : null,
    subcontractorPaidTripsFetcher.bind(null, params)
  );

  return {
    paidTrips: (data || []) as SubcontractorPaidTrip[],
    isLoading,
    error,
    mutate,
  };
};

export default useSubcontractorPaidTrips;
