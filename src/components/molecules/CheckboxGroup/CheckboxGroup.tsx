"use client";

import clsx from "clsx";
import { useCallback } from "react";

import { Checkbox } from "@/components/atoms";
import { CheckboxProps } from "@/components/atoms/Checkbox/Checkbox";

export type CheckboxItem = Pick<CheckboxProps, "label" | "subLabel" | "checked"> & {
  value: string;
};

export type CheckboxGroupProps = {
  name: string;
  items: CheckboxItem[];
  label?: string;
  description?: string;
  direction?: "auto" | "column" | "row";
  className?: string;
  onChange?: (_values: CheckboxItem[]) => void;
};

export default function CheckboxGroup({
  name,
  items,
  label,
  description,
  direction = "auto",
  className,
  onChange,
}: CheckboxGroupProps) {
  const handleChange = useCallback(
    (currentItem: CheckboxItem) => () => {
      const values = items.map((item) => {
        const newItem = { ...item };
        if (newItem.value === currentItem.value) {
          newItem.checked = !newItem.checked;
        }
        return newItem;
      });
      onChange && onChange(values);
    },
    [items, onChange]
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
        <legend className="sr-only">Checkbox</legend>
        <div
          className={clsx({
            "space-y-2": direction === "column",
            "flex items-center space-x-10 space-y-0 ": direction === "row",
            "space-y-2 sm:flex sm:items-center sm:space-x-10 sm:space-y-0": direction === "auto",
          })}
        >
          {items.map((item) => (
            <Checkbox key={item.value} name={name} direction={direction} {...item} onChange={handleChange(item)} />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
