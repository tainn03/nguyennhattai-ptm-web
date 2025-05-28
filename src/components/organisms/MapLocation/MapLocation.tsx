"use client";

import { useTranslations } from "next-intl";
import React, { useCallback, useState } from "react";
import { IoLocationSharp } from "react-icons/io5";

import { Link, Spinner } from "@/components/atoms";
import { getLocationNominatim } from "@/services/client/nominatim";
import { ensureString, joinNonEmptyStrings } from "@/utils/string";

export type MapLocationProps = {
  latitude: number;
  longitude: number;
  isIcon?: boolean;
};

function MapLocation({ latitude, longitude, isIcon = false }: MapLocationProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPosition, setCurrentPosition] = useState<string | undefined>(undefined);

  /**
   * Retrieves location information using Nominatim API based on provided latitude and longitude.
   *
   * @returns {Promise<string | undefined>} A Promise that resolves to a formatted address or undefined if the request fails.
   */
  const handleGetNominatim = useCallback(async (): Promise<string | undefined> => {
    setIsLoading(true);
    const result = await getLocationNominatim(latitude, longitude);
    setCurrentPosition(result);
    setIsLoading(false);
    return result;
  }, [latitude, longitude]);

  return (
    <div className="flex flex-row items-center">
      {isIcon && <IoLocationSharp className="h-4 w-4 text-gray-500" aria-hidden="true" />}
      {isLoading ? (
        <Spinner size="small" />
      ) : (
        <div>
          {!currentPosition && joinNonEmptyStrings([ensureString(latitude), ensureString(longitude)], ",")}
          {!!currentPosition && currentPosition}
          <span className="ml-1">
            (
            {!currentPosition && (
              <span
                className="mr-1 text-sm font-medium leading-6 text-blue-700 hover:cursor-pointer hover:text-blue-600"
                onClick={handleGetNominatim}
              >
                {t("components.map_location.view_detail_position")},
              </span>
            )}
            <Link
              useDefaultStyle
              href={`https://maps.google.com?q=${latitude},${longitude}`}
              className="hover:cursor-pointer"
              target="_blank"
            >
              {t("components.map_location.show_map")}
            </Link>
            )
          </span>
        </div>
      )}
    </div>
  );
}

export default MapLocation;
