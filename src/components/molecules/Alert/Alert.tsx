"use client";

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

import { Link } from "@/components/atoms";
import { DefaultReactProps } from "@/types";

const colorStyles = {
  info: {
    bg: "bg-sky-50",
    title: "text-sky-600",
    text: "text-sky-500",
    hoverText: "hover:text-sky-600",
    border: "border-sky-500",
    action: "hover:bg-sky-100 focus:ring-sky-500 focus:ring-offset-sky-50",
    icon: <InformationCircleIcon className="h-5 w-5 text-sky-500" aria-hidden="true" />,
  },
  success: {
    bg: "bg-green-50",
    title: "text-green-700",
    text: "text-green-600",
    hoverText: "hover:text-green-700",
    border: "border-green-500",
    action: "hover:bg-green-100 focus:ring-green-600 focus:ring-offset-green-50",
    icon: <CheckCircleIcon className="h-5 w-5 text-green-500" aria-hidden="true" />,
  },
  warning: {
    bg: "bg-yellow-50",
    title: "text-yellow-700",
    text: "text-yellow-600",
    hoverText: "hover:text-yellow-700",
    border: "border-yellow-500",
    action: "hover:bg-yellow-100 focus:ring-yellow-600 focus:ring-offset-yellow-50",
    icon: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" aria-hidden="true" />,
  },
  error: {
    bg: "bg-red-50",
    title: "text-red-700",
    text: "text-red-600",
    hoverText: "hover:text-red-700",
    border: "border-red-500",
    action: "hover:bg-red-100 focus:ring-red-600 focus:ring-offset-red-50",
    icon: <XCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />,
  },
};

export type AlertProps = Partial<DefaultReactProps> & {
  color: "info" | "success" | "warning" | "error";
  title?: string | React.ReactNode;
  message?: string;
  detailLinkText?: string;
  detailLink?: string;
  accentBorder?: boolean;
  slotComponent?: React.ReactNode;
  className?: string;
  onClose?: () => void;
};

const Alert = ({
  color,
  title,
  message,
  children,
  detailLinkText,
  detailLink,
  accentBorder,
  slotComponent,
  className,
  onClose,
}: AlertProps) => {
  return (
    <div
      className={clsx("w-full rounded-md p-4", colorStyles[color].bg, className, {
        "border-l-4": accentBorder,
        [colorStyles[color].border]: accentBorder,
      })}
    >
      <div className="flex">
        <div className="flex-shrink-0">{colorStyles[color].icon}</div>
        <div
          className={clsx("ml-3", {
            "md:flex md:flex-1 md:items-center md:justify-between": detailLinkText,
          })}
        >
          <div>
            {title && <h3 className={clsx("text-sm font-medium", colorStyles[color].title)}>{title}</h3>}
            {message && (
              <p
                className={clsx("whitespace-pre-wrap text-sm", colorStyles[color].text, {
                  "mt-2": title,
                })}
              >
                {message}
              </p>
            )}
            {children && (
              <div
                className={clsx("whitespace-pre-wrap text-sm", colorStyles[color].text, {
                  "mt-2": title || message,
                })}
              >
                {children}
              </div>
            )}
            {slotComponent && <div className="mt-4">{slotComponent}</div>}
          </div>
          {detailLinkText && (
            <p className="mt-3 text-sm md:ml-6 md:mt-0">
              <Link
                useDefaultStyle
                href={detailLink || "#"}
                className={clsx("whitespace-nowrap font-medium", colorStyles[color].text, colorStyles[color].hoverText)}
              >
                {detailLinkText}
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </p>
          )}
        </div>

        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={clsx(
                  "inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
                  colorStyles[color].bg,
                  colorStyles[color].text,
                  colorStyles[color].action
                )}
                onClick={onClose}
              >
                <span className="sr-only">Dismiss</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
