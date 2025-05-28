import L from "leaflet";
import { memo, useEffect } from "react";
import { useMap } from "react-leaflet/hooks";

import { LatestVehicleLocationResponse } from "@/types/vehicle";

type MapBoundsUpdaterProps = {
  locations: LatestVehicleLocationResponse[];
};

const MapBoundsUpdater: React.FC<MapBoundsUpdaterProps> = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((location) => [parseFloat(location.latitude), parseFloat(location.longitude)])
      );
      map.fitBounds(bounds);
    }
  }, [locations, map]);

  return null;
};

export default memo(MapBoundsUpdater);
