"use client";

import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TooltipRefProps } from "react-tooltip";

import { getAvatarInfo } from "@/utils/auth";

export type AvatarProps = {
  size?: "small" | "medium" | "large" | "xlarge";
  displayName: string;
  avatarURL?: string;
  useTooltip?: boolean;
  tooltipPlace?: TooltipRefProps["place"];
  hover?: boolean;
};

const Avatar = ({
  size = "small",
  displayName,
  avatarURL = "",
  useTooltip,
  tooltipPlace = "top",
  hover,
}: AvatarProps) => {
  const [isAvatarError, setIsAvatarError] = useState(avatarURL === "" || false);

  useEffect(() => {
    setIsAvatarError(avatarURL === "" || false);
  }, [avatarURL]);

  const avatarInfo = useMemo(() => getAvatarInfo(displayName), [displayName]);

  const avatarSize = useMemo(
    () =>
      clsx({
        "h-8 w-8 min-h-[32px] min-w-[32px]": size === "small",
        "h-12 w-12 min-h-[48px] min-w-[48px]": size === "medium",
        "h-14 w-14 min-h-[56px] min-w-[56px]": size === "large",
        "h-24 w-24 min-h-[96px] min-w-[96px]": size === "xlarge",
      }),
    [size]
  );

  const handleError = useCallback(() => {
    setIsAvatarError(true);
  }, []);

  return (
    <>
      {isAvatarError ? (
        <span
          className={clsx("inline-flex items-center justify-center rounded-full", avatarSize, {
            "hover:cursor-pointer hover:opacity-80": hover,
          })}
          style={{ backgroundColor: avatarInfo.avatarBgColor }}
          data-tooltip-id="tooltip"
          data-tooltip-content={useTooltip ? displayName : undefined}
          data-tooltip-place={useTooltip ? tooltipPlace : undefined}
        >
          <span
            className={clsx("font-medium leading-none text-white", {
              "text-base": size === "small",
              "text-xl": size === "medium",
              "text-2xl": size === "large",
              "text-3xl": size === "xlarge",
            })}
          >
            {avatarInfo.avatarTwoLetter}
          </span>
        </span>
      ) : (
        <img
          className={clsx("inline-block rounded-full border border-gray-100", avatarSize)}
          style={{ backgroundColor: avatarInfo.avatarBgColor }}
          src={avatarURL}
          alt={displayName}
          onError={handleError}
          data-tooltip-id="tooltip"
          data-tooltip-content={useTooltip ? displayName : undefined}
          data-tooltip-place={useTooltip ? tooltipPlace : undefined}
        />
      )}
    </>
  );
};

export default Avatar;
