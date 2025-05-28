"use client";

import useSWR from "swr";

import { LATEST_LOCATION_FETCH_INTERVAL } from "@/constants/notification";
import { latestVehicleLocationFetcher } from "@/services/server/vehicle";
import { LatestVehicleLocationParams } from "@/types/vehicle";

const useLatestVehicleLocation = (params: LatestVehicleLocationParams) => {
  const { data, error, isLoading, mutate } = useSWR(
    params.organizationId ? ["latest-vehicle-location", params] : null,
    latestVehicleLocationFetcher.bind(null, params),
    {
      refreshInterval: LATEST_LOCATION_FETCH_INTERVAL,
    }
  );

  return {
    locations: data || [],
    isLoading,
    error,
    mutate,
  };
};

export default useLatestVehicleLocation;
