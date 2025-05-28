"use client";

import clsx from "clsx";
import { Fragment, useMemo } from "react";

import { Avatar } from "@/components/molecules";
import { AvatarProps } from "@/components/molecules/Avatar/Avatar";
import { OrderParticipantInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";

export type AvatarGroupProps = Pick<AvatarProps, "useTooltip" | "tooltipPlace"> & {
  orderParticipants: Partial<OrderParticipantInfo>[];
  max?: number;
  size?: "small" | "medium" | "large" | "xlarge";
};

const AvatarGroup = ({
  max = 3,
  orderParticipants,
  size = "small",
  useTooltip,
  tooltipPlace = "top",
}: AvatarGroupProps) => {
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
  return (
    <>
      {orderParticipants.slice(0, max).map((orderParticipant) => (
        <Fragment key={orderParticipant.id}>
          <Avatar
            size={size}
            avatarURL={getAccountInfo(orderParticipant.user).avatar}
            displayName={getAccountInfo(orderParticipant.user).displayName}
            useTooltip={useTooltip}
            tooltipPlace={tooltipPlace}
          />
        </Fragment>
      ))}
      {orderParticipants.length > 3 && (
        <span className={clsx("z-10 inline-flex items-center justify-center rounded-full bg-gray-300", avatarSize)}>
          <span
            className={clsx("font-medium leading-none text-white", {
              "text-base": size === "small",
              "text-xl": size === "medium",
              "text-2xl": size === "large",
              "text-3xl": size === "xlarge",
            })}
          >
            {"+" + (orderParticipants.length - max)}
          </span>
        </span>
      )}
    </>
  );
};

export default AvatarGroup;
