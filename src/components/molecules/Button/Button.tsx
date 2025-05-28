"use client";

import clsx from "clsx";
import { ButtonHTMLAttributes, ElementType, useMemo } from "react";

import { Spinner } from "@/components/atoms";
import { LinkProps } from "@/components/atoms/Link/Link";
import { ReactTag } from "@/types";

const shapeAndSizeStyles = {
  rectangle: {
    small: "rounded-md px-2.5 h-8",
    medium: "rounded-md px-3 h-9",
    large: "rounded-md px-3.5 h-10",
  },
  pill: {
    small: "rounded-full px-2.5 h-8",
    medium: "rounded-full px-3 h-9",
    large: "rounded-full px-3.5 h-10",
  },
  circle: {
    small: "rounded-full p-2",
    medium: "rounded-full p-2.5",
    large: "rounded-full p-3",
  },
};

const variantAndColorStyles = {
  contained: {
    primary:
      "shadow-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-blue-700 hover:bg-blue-600 focus-visible:outline-blue-700",
    secondary:
      "shadow-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-gray-500 hover:bg-gray-400 focus-visible:outline-gray-500",
    info: "shadow-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-sky-500 hover:bg-sky-400 focus-visible:outline-sky-500",
    success:
      "shadow-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-green-600 hover:bg-green-500 focus-visible:outline-green-600",
    warning:
      "shadow-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-yellow-600 hover:bg-yellow-500 focus-visible:outline-yellow-600",
    error:
      "shadow-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-red-600 hover:bg-red-500 focus-visible:outline-red-600",
  },
  outlined: {
    primary: "shadow-sm text-blue-700 ring-1 ring-inset ring-blue-500 hover:ring-blue-700 hover:bg-blue-700/10",
    secondary: "shadow-sm text-gray-900 ring-1 ring-inset ring-gray-300 hover:ring-gray-500 hover:bg-gray-500/10",
    info: "shadow-sm text-sky-500 ring-1 ring-inset ring-sky-300 hover:ring-sky-500 hover:bg-green-500/10",
    success: "shadow-sm text-green-600 ring-1 ring-inset ring-green-400 hover:ring-green-500 hover:bg-green-600/20",
    warning: "shadow-sm text-yellow-600 ring-1 ring-inset ring-yellow-400 hover:ring-yellow-500 hover:bg-yellow-600/20",
    error: "shadow-sm text-red-600 ring-1 ring-inset ring-red-400 hover:ring-red-500 hover:bg-red-600/10",
  },
  text: {
    primary: "text-blue-600 hover:bg-blue-700/10",
    secondary: "text-gray-500 hover:bg-gray-500/10",
    info: "text-sky-500 hover:bg-sky-500/10",
    success: "text-green-600 hover:bg-green-600/20",
    warning: "text-yellow-600 hover:bg-yellow-600/20",
    error: "text-red-600 hover:bg-red-600/10",
  },
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Partial<Pick<LinkProps, "href">> & {
    size?: "small" | "medium" | "large";
    variant?: "text" | "outlined" | "contained";
    color?: "primary" | "success" | "info" | "warning" | "error" | "secondary";
    shape?: "rectangle" | "pill" | "circle";
    icon?: ElementType;
    iconPlacement?: "start" | "end";
    loading?: boolean;
    as?: ReactTag;
  };

const Button = ({
  as: Tag = "button",
  size = "medium",
  color = "primary",
  variant = "contained",
  shape = "rectangle",
  icon: Icon,
  iconPlacement = "start",
  className,
  children,
  disabled,
  loading,
  onClick,
  ...otherProps
}: ButtonProps) => {
  const iconComponent = useMemo(() => {
    if (loading) {
      return (
        <Spinner
          size="small"
          color={color}
          className={clsx({
            "border-white/20 border-t-white": variant === "contained",
          })}
        />
      );
    }

    return Icon && <Icon className="h-5 w-5" aria-hidden="true" />;
  }, [Icon, color, loading, variant]);

  const isDisabled = useMemo(() => disabled || loading, [disabled, loading]);

  const Component = useMemo(() => (isDisabled ? "button" : Tag), [Tag, isDisabled]);

  return (
    <Component
      className={clsx(
        "inline-flex items-center justify-center text-sm font-semibold",
        variantAndColorStyles[variant][color],
        shapeAndSizeStyles[shape][size],
        className,
        {
          "cursor-not-allowed opacity-50": isDisabled,
        }
      )}
      {...otherProps}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
    >
      <span className="inline-flex items-center gap-x-2 whitespace-nowrap">
        {iconPlacement === "start" && iconComponent}
        {children}
        {iconPlacement === "end" && iconComponent}
      </span>
    </Component>
  );
};

export default Button;
