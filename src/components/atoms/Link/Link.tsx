import clsx from "clsx";
import NextLinkBase, { LinkProps as NextLinkProps } from "next/link";
import NextLink from "next-intl/link";
import React, { ReactNode } from "react";

export type LinkProps = NextLinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof NextLinkProps> & {
    color?: "primary" | "secondary" | "info" | "success" | "warning" | "error";
    locale?: string;
    underline?: boolean;
    emptyLabel?: ReactNode;
    useIntlLink?: boolean;
    useDefaultStyle?: boolean;
  };

const Link = ({
  color = "primary",
  underline,
  emptyLabel = "",
  children,
  className,
  useIntlLink = true,
  useDefaultStyle = false,
  ...otherProps
}: LinkProps) => {
  const Tag = useIntlLink ? NextLink : NextLinkBase;

  return children ? (
    <Tag
      className={clsx(className, {
        "text-sm font-medium leading-6": useDefaultStyle,
        "text-blue-700 hover:text-blue-600": color === "primary" && useDefaultStyle,
        "text-gray-900 hover:text-gray-800": color === "secondary" && useDefaultStyle,
        "text-sky-500 hover:text-sky-400": color === "info" && useDefaultStyle,
        "text-green-600 hover:text-green-500": color === "success" && useDefaultStyle,
        "text-yellow-600 hover:text-yellow-500": color === "warning" && useDefaultStyle,
        "text-red-600 hover:text-red-500": color === "error" && useDefaultStyle,
        "hover:underline": underline,
      })}
      {...otherProps}
    >
      {children}
    </Tag>
  ) : (
    <>{emptyLabel}</>
  );
};

export default Link;
