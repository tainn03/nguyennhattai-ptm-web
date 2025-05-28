"use client";

import { Switch } from "@headlessui/react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { HTMLAttributes } from "react";

import { ensureString } from "@/utils/string";

export type SwitcherProps = HTMLAttributes<HTMLDivElement> & {
  checked: boolean;
  label?: string;
  labelPlacement?: "start" | "end";
  onChange: () => void;
};

const Switcher = ({ checked, label, labelPlacement = "start", className, onChange }: SwitcherProps) => {
  const t = useTranslations();
  return (
    <div
      className={clsx("flex items-center gap-x-2", className, {
        "flex-row-reverse": labelPlacement === "end",
      })}
    >
      <Switch
        checked={checked}
        onChange={onChange}
        className={clsx(
          {
            "bg-blue-700": checked,
            "bg-gray-500": !checked,
          },
          "relative inline-flex h-[20px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white/75"
        )}
      >
        <span className="sr-only">{t("common.actions")}</span>
        <span
          aria-hidden="true"
          className={clsx(
            {
              "translate-x-6": checked,
              "translate-x-0": !checked,
            },
            "pointer-events-none inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out"
          )}
        />
      </Switch>
      {label && <span className="whitespace-nowrap text-sm font-normal text-gray-700">{ensureString(label)}</span>}
    </div>
  );
};

export default Switcher;
