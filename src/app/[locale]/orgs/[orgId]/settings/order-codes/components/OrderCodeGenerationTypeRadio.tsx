"use client";

import { OrganizationSettingOrderCodeGenerationType } from "@prisma/client";
import clsx from "clsx";
import { useCallback, useMemo } from "react";

import { Radio } from "@/components/atoms";

import { SkeletonOrderCodeGenerationTypeRadio } from ".";

type ReportRadioGroupProps = {
  label: string;
  description: string;
  value?: OrganizationSettingOrderCodeGenerationType | null;
  orderCodeGenerationType?: OrganizationSettingOrderCodeGenerationType;
  name?: string;
  loading?: boolean;
  onChange?: (value: OrganizationSettingOrderCodeGenerationType) => void;
};

const OrderCodeGenerationTypeRadio = ({
  label,
  description,
  value,
  orderCodeGenerationType,
  name,
  loading,
  onChange,
}: ReportRadioGroupProps) => {
  /**
   * Checks if the current value is equal to the order code generation type.
   * Memoized for performance optimization.
   */
  const isChecked = useMemo(() => value === orderCodeGenerationType, [value, orderCodeGenerationType]);

  /**
   * Handles the change event for the order code generation type.
   * Calls the provided onChange callback if orderCodeGenerationType is defined.
   */
  const handleChange = useCallback(() => {
    if (orderCodeGenerationType) {
      onChange && onChange(orderCodeGenerationType);
    }
  }, [onChange, orderCodeGenerationType]);

  return (
    <div
      onClick={handleChange}
      className={clsx(
        "relative mt-4 flex cursor-pointer flex-nowrap gap-2 rounded-lg border bg-white px-6 py-4 shadow-sm focus:outline-none",
        {
          "border-blue-700 ring-2 ring-blue-700": isChecked,
          "border-gray-300": !isChecked,
        }
      )}
    >
      <Radio checked={isChecked} name={name} label="" />
      {loading ? (
        <SkeletonOrderCodeGenerationTypeRadio />
      ) : (
        <>
          <span className="flex items-center">
            <span className="flex flex-col text-sm">
              <span className="font-medium text-gray-900">{label}</span>
              <span className="text-gray-500">
                <span className="block sm:inline">{description}</span>
              </span>
            </span>
          </span>
          <span
            className={clsx("pointer-events-none absolute -inset-px rounded-lg border", {
              "border-blue-700": isChecked,
              "border-transparent": !isChecked,
            })}
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
};

export default OrderCodeGenerationTypeRadio;
