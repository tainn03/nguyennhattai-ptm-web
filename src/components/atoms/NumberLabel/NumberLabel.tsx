"use client";

import isNil from "lodash/isNil";

import { formatCurrency, formatNumber } from "@/utils/number";

export type NumberLabelProps = {
  value?: number | string | null;
  type?: "numeric" | "currency";
  unit?: string;
  useSpace?: boolean;
  emptyLabel?: string;
  showUnitWhenEmpty?: boolean;
};

const NumberLabel = ({
  value,
  type = "numeric",
  unit,
  useSpace = true,
  emptyLabel,
  showUnitWhenEmpty = true,
}: NumberLabelProps) => {
  return !isNil(value) ? (
    <>
      {type === "currency" && formatCurrency(value)}
      {type === "numeric" && (
        <>
          {formatNumber(value)}
          {unit && `${useSpace ? " " : ""}${unit}`}
        </>
      )}
    </>
  ) : (
    <>
      {emptyLabel}
      {showUnitWhenEmpty && unit && `${useSpace ? " " : ""}${unit}`}
    </>
  );
};
export default NumberLabel;
