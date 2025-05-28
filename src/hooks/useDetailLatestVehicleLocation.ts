"use client";

import useSWR from "swr";

import { detailLatestVehicleLocationFetcher } from "@/services/server/vehicle";
import { DetailLatestVehicleLocationParams, DetailLatestVehicleLocationResponse } from "@/types/vehicle";

const useDetailLatestVehicleLocation = (params: DetailLatestVehicleLocationParams) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.id ? ["detail-latest-vehicle-location", params] : null,
    detailLatestVehicleLocationFetcher.bind(null, params)
  );

  return {
    detail: data || ({} as DetailLatestVehicleLocationResponse),
    isLoading,
    error,
    mutate,
  };
};

export default useDetailLatestVehicleLocation;
