"use client";

import clsx from "clsx";
import { useTranslations } from "next-intl";
import { CSSProperties, HTMLAttributes } from "react";

import { SortType } from "@/types/filter";
import { hexToRGBA } from "@/utils/string";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  rounded?: boolean;
  color?:
    | "success"
    | "error"
    | "info"
    | "warning"
    | "primary"
    | "secondary"
    | "purple"
    | "pink"
    | "teal"
    | "cyan"
    | "zinc";
  customColor?: string | null;
  sort?: SortType;
  onRemove?: () => void;
  isDelete?: boolean;
};

const Badge = ({
  className,
  title,
  label,
  rounded = false,
  color = "primary",
  customColor = null,
  sort,
  onRemove,
  isDelete = true,
}: BadgeProps) => {
  const t = useTranslations("components");
  const customStyle = getCustomStyle(customColor);
  const colorClasses = getColorClasses(color, customColor);

  return (
    <span
      className={clsx(
        "inline-flex w-fit items-center px-2 py-1 text-xs font-medium ring-1 ring-inset",
        className,
        colorClasses,
        { "rounded-full": rounded, "rounded-md": !rounded },
        { "text-wrap": customStyle, "whitespace-nowrap": !customStyle }
      )}
      style={customStyle}
    >
      {title && <b className="mr-1 after:content-[':']">{title}</b>}
      {label}
      {sort && <span className="ml-1 whitespace-nowrap">{sort === "asc" ? t("badge.asc") : t("badge.desc")}</span>}
      {onRemove && isDelete && (
        <button
          type="button"
          className="group relative -mr-1 ml-1 h-3.5 w-3.5 rounded-sm hover:bg-gray-600/20"
          onClick={onRemove}
        >
          <span className="sr-only">{t("badge.remove")}</span>
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-gray-800/50 group-hover:stroke-gray-800/75">
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      )}
    </span>
  );
};

const getCustomStyle = (customColor: string | null): CSSProperties => {
  if (!customColor) return {};
  const opacity = { text: 1, bg: 0.1, border: 0.1 };
  return {
    backgroundColor: hexToRGBA(customColor, opacity.bg),
    color: hexToRGBA(customColor, opacity.text),
    border: `1px solid ${hexToRGBA(customColor, opacity.border)}`,
    boxShadow: "none",
  };
};

const getColorClasses = (color: string, customColor: string | null) => {
  if (customColor) return "";
  const colorClasses: Record<string, string> = {
    primary: "border-blue-700 bg-blue-50 text-blue-700 ring-blue-700/20",
    secondary: "border-gray-500 bg-gray-50 text-gray-500 ring-gray-500/20",
    info: "border-sky-500 bg-sky-50 text-sky-500 ring-sky-500/20",
    success: "border-green-600 bg-green-50 text-green-600 ring-green-600/20",
    warning: "border-yellow-600 bg-yellow-50 text-yellow-600 ring-yellow-600/20",
    error: "border-red-600 bg-red-50 text-red-600 ring-red-600/20",
    purple: "border-purple-600 bg-purple-50 text-purple-700 ring-purple-700/10",
    pink: "border-pink-600 bg-pink-50 text-pink-700 ring-pink-700/10",
    teal: "border-teal-600 bg-teal-50 text-teal-700 ring-teal-700/10",
    cyan: "border-cyan-600 bg-cyan-50 text-cyan-700 ring-cyan-700/10",
    zinc: "border-zinc-600 bg-zinc-50 text-zinc-700 ring-zinc-700/10",
  };
  return colorClasses[color] || colorClasses.primary;
};

export default Badge;
