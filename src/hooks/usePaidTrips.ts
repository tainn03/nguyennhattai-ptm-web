"use client";

import useSWR from "swr";

import { driverPaidTripsFetcher } from "@/actions/orderTrip";
import { DriverPaidTrip, IndividualDriverSalaryParams } from "@/types/report";

const usePaidTrips = (params: IndividualDriverSalaryParams) => {
  const { organizationId, startDate, endDate, driverId, driverReportIds } = params;
  const isValidFetchRequest = organizationId && startDate && endDate && driverId && driverReportIds?.length;

  const { data, error, isLoading, mutate } = useSWR(
    isValidFetchRequest ? ["paid-trips", params] : null,
    driverPaidTripsFetcher.bind(null, params)
  );

  return {
    paidTrips: (data ?? []) as DriverPaidTrip[],
    isLoading,
    error,
    mutate,
  };
};

export default usePaidTrips;
