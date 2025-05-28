"use client";

import clsx from "clsx";
import { useCallback } from "react";

import { Radio } from "@/components/atoms";
import { RadioProps } from "@/components/atoms/Radio/Radio";

export type RadioItem = Pick<RadioProps, "label" | "subLabel" | "disabled"> & {
  value: string;
};

export type RadioGroupProps = {
  name: string;
  items: RadioItem[];
  label?: string;
  description?: string;
  value?: string;
  direction?: "auto" | "column" | "row";
  disabled?: boolean;
  errorText?: string;
  helperText?: string;
  className?: string;
  onChange?: (_value: RadioItem) => void;
};

export default function RadioGroup({
  name,
  items,
  label,
  description,
  value,
  direction = "auto",
  disabled,
  errorText,
  helperText,
  className,
  onChange,
}: RadioGroupProps) {
  const handleChange = useCallback(
    (item: RadioItem) => () => {
      onChange && onChange(item);
    },
    [onChange]
  );

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium leading-6 text-gray-900">{label}</label>}
      {description && <p className="text-sm text-gray-500">{description}</p>}

      <fieldset
        className={clsx({
          "mt-2": label || description,
        })}
      >
        <legend className="sr-only">Radio</legend>
        <div
          className={clsx({
            "space-y-2": direction === "column",
            "flex items-center space-x-10 space-y-0 ": direction === "row",
            "space-y-2 sm:flex sm:items-center sm:space-x-10 sm:space-y-0": direction === "auto",
          })}
        >
          {items.map((item) => (
            <Radio
              key={item.value}
              name={name}
              direction={direction}
              checked={value === item.value}
              disabled={disabled}
              {...item}
              onChange={handleChange(item)}
            />
          ))}
        </div>
      </fieldset>

      {(errorText || helperText) && (
        <p
          className={clsx("mt-2 block text-xs", {
            "text-red-600": errorText,
            "text-gray-500": !errorText,
          })}
        >
          {errorText || helperText}
        </p>
      )}
    </div>
  );
}
