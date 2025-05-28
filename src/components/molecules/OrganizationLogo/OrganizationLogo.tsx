"use client";

import { BuildingOffice2Icon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getAvatarInfo } from "@/utils/auth";
import { hexToRGBA } from "@/utils/string";

export type OrganizationLogoProps = {
  size?: "small" | "medium" | "large" | "xlarge";
  rounded?: boolean;
  displayName: string;
  logoURL?: string;
};

const OrganizationLogo = ({ size = "medium", displayName, logoURL = "", rounded }: OrganizationLogoProps) => {
  const [isLogoError, setIsLogoError] = useState(logoURL === "" || false);

  useEffect(() => {
    setIsLogoError(logoURL === "" || false);
  }, [logoURL]);

  const logoInfo = useMemo(() => getAvatarInfo(displayName), [displayName]);

  const logoSize = useMemo(
    () =>
      clsx({
        "h-12 w-12": size === "small",
        "h-16 w-16": size === "medium",
        "h-28 w-28": size === "large",
        "h-32 w-32": size === "xlarge",
      }),
    [size]
  );

  const handleError = useCallback(() => {
    setIsLogoError(true);
  }, []);

  return (
    <>
      {isLogoError ? (
        <span
          className={clsx("inline-flex items-center justify-center border", logoSize, {
            "rounded-lg": !rounded,
            "rounded-full": rounded,
          })}
          style={{ backgroundColor: logoInfo.avatarBgColor }}
        >
          <BuildingOffice2Icon
            className={clsx({
              "h-6 w-6": size === "small",
              "h-8 w-8": size === "medium",
              "h-14 w-14": size === "large",
              "h-16 w-16": size === "xlarge",
            })}
            style={{ color: logoInfo.avatarTextColor }}
            aria-hidden="true"
          />
        </span>
      ) : (
        <img
          className={clsx("inline-block border border-gray-100", logoSize, {
            "rounded-lg": !rounded,
            "rounded-full": rounded,
          })}
          style={{ backgroundColor: hexToRGBA(logoInfo.avatarBgColor, 0.2) }}
          src={logoURL}
          alt={displayName}
          onError={handleError}
        />
      )}
    </>
  );
};

export default OrganizationLogo;
