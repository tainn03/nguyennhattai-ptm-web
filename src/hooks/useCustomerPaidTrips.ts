"use client";

import useSWR from "swr";

import { customerPaidTripsFetcher } from "@/actions/orderTrip";
import { CustomerPaidTrip, IndividualCustomerStatisticParams } from "@/types/report";

const useCustomerPaidTrips = (params: IndividualCustomerStatisticParams) => {
  const { organizationId, startDate, endDate, driverReportIds, customerId } = params;
  const isValidFetchRequest = organizationId && startDate && endDate && customerId && driverReportIds?.length;

  const { data, error, isLoading, mutate } = useSWR(
    isValidFetchRequest ? ["customer-paid-trips", params] : null,
    customerPaidTripsFetcher.bind(null, params)
  );

  return {
    paidTrips: (data || []) as CustomerPaidTrip[],
    isLoading,
    error,
    mutate,
  };
};

export default useCustomerPaidTrips;
