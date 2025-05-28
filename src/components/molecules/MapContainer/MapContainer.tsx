"use client";

import "leaflet/dist/leaflet.css";
import "react-leaflet-fullscreen/styles.css";

import clsx, { ClassValue } from "clsx";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Loading } from "@/components/molecules";
import { DefaultReactProps } from "@/types";

const ReactLeafletMap = dynamic(() => import("react-leaflet").then((module) => module.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((module) => module.TileLayer), { ssr: false });
const ZoomControl = dynamic(() => import("react-leaflet").then((module) => module.ZoomControl), { ssr: false });
const FullscreenControl = dynamic(() => import("react-leaflet-fullscreen").then((module) => module.FullscreenControl), {
  ssr: false,
});

export type MapContainerProps = DefaultReactProps & {
  width?: number;
  height?: number;
  zoom?: number;
  duration?: number;
  center?: [number, number, number?];
  className?: ClassValue;
  style?: React.CSSProperties;
};

const MapContainer = ({ className, children, width, height, duration, ...otherProps }: MapContainerProps) => {
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowMap(true);
    }, duration ?? 0);
    return () => clearTimeout(timeout);
  }, [duration]);

  if (!showMap) {
    return <Loading size="large" fullScreen />;
  }

  return (
    <ReactLeafletMap
      zoom={4}
      zoomControl={false}
      style={{ width: `${width ?? 100}%`, height: `${height ?? 100}%` }}
      className={clsx(className, "z-10")}
      {...otherProps}
    >
      <TileLayer
        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        attribution='&copy; <a href="https://www.google.com/maps/terms">Google Maps</a>'
      />
      <ZoomControl position="topright" />
      {/* <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      /> */}
      {children}
      <FullscreenControl position="topright" />
    </ReactLeafletMap>
  );
};

export default MapContainer;
