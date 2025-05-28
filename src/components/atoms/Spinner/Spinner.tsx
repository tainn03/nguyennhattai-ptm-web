import clsx from "clsx";
import React from "react";

/**
 * Spinner color styles
 */
const colorStyles = {
  primary: "border-t-blue-700 border-blue-700/10",
  secondary: "border-t-gray-500 border-gray-500/10",
  info: "border-t-sky-500 border-sky-500/10",
  success: "border-t-green-600 border-green-600/20",
  warning: "border-t-yellow-600 border-yellow-600/20",
  error: "border-t-red-600 border-red-600/10",
};

/**
 * Spinner size styles
 */
const sizeStyles = {
  small: "h-4 w-4 border-[2px]",
  medium: "h-5 w-5 border-[2px]",
  large: "h-8 w-8 border-[4px]",
};

export type SpinnerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: "small" | "medium" | "large";
  color?: "primary" | "success" | "info" | "warning" | "error" | "secondary";
};

const Spinner = ({ size = "medium", color = "primary", className, ...otherProps }: SpinnerProps) => {
  return (
    <div
      className={clsx("animate-spin rounded-full", colorStyles[color], sizeStyles[size], className)}
      {...otherProps}
    />
  );
};

export default Spinner;
