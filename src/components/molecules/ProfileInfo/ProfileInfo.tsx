"use client";

import { TrashIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import isEmpty from "lodash/isEmpty";
import { ElementType, ReactNode, useCallback, useMemo } from "react";

import { Avatar } from "@/components/molecules";
import { useIdParam } from "@/hooks";
import { ReactTag } from "@/types";
import { UserInfo } from "@/types/strapi";
import { getAccountInfo } from "@/utils/auth";

export type ProfileInfoProps = {
  as?: ReactTag;
  user?: Partial<UserInfo>;
  description?: ReactNode;
  border?: boolean;
  hover?: boolean;
  hoverIcon?: ElementType;
  emptyLabel?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  slot?: ReactNode;
};

const ProfileInfo = ({
  as: Tag = "a",
  user,
  description,
  border,
  hover,
  hoverIcon: Icon = TrashIcon,
  href,
  onClick,
  emptyLabel = "",
  slot,
  className,
}: ProfileInfoProps) => {
  const { encryptId } = useIdParam();
  const accountInfo = useMemo(() => getAccountInfo(user), [user]);

  const handleClick = useCallback(() => {
    if (hover && onClick) {
      onClick();
    }
  }, [hover, onClick]);

  return !isEmpty(user) ? (
    <Tag
      color="secondary"
      // href={Tag === "a" ? href || `/users/profile/${encryptId(user?.id)}` : ""}
      href={Tag === "a" ? href || `#${encryptId(user?.id)}` : ""}
      type={Tag === "button" ? "button" : undefined}
      onClick={handleClick}
      className={clsx(className, "group inline-flex hover:bg-gray-50", {
        relative: hover,
        "cursor-default": !hover && Tag === "button",
        "rounded-md border border-gray-200 p-2": border,
      })}
    >
      {hover && Icon && (
        <div className="absolute inset-0 flex items-center justify-center rounded-md opacity-0 hover:bg-black hover:bg-opacity-40 hover:opacity-100">
          <div className="cursor-pointer">
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      )}
      <div className="flex flex-row items-center text-left">
        <div className="flex-shrink-0">
          <Avatar displayName={accountInfo.displayName} avatarURL={accountInfo.avatar} hover={href ? true : false} />
        </div>
        <div className="ml-3">
          <p
            className={clsx("flex flex-row gap-x-2 whitespace-nowrap text-sm font-medium text-gray-700", {
              "group-hover:text-gray-900": href,
            })}
          >
            {accountInfo.displayName}
            {slot && slot}
          </p>
          <div className={clsx("text-xs font-medium text-gray-500", { "group-hover:text-gray-900": href })}>
            {description}
          </div>
        </div>
      </div>
    </Tag>
  ) : (
    emptyLabel
  );
};

export default ProfileInfo;
