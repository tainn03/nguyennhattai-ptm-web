"use client";

import { ChangeEvent, useCallback, useRef } from "react";
import { NumberFormatValues, NumericFormat, NumericFormatProps, SourceInfo } from "react-number-format";

import { TextField } from "@/components/molecules";
import { TextFieldProps } from "@/components/molecules/TextField/TextField";
import { ensureString } from "@/utils/string";

type NumberFieldProps = NumericFormatProps &
  Omit<TextFieldProps, "type" | "multiline" | "rows" | "showCount" | "toolbarComponent" | "onChange" | "value"> & {
    value?: string | number | null;
  };

const NumberField = ({ value, name, thousandSeparator = true, onChange, ...otherProps }: NumberFieldProps) => {
  const valueRef = useRef<string | number | null | undefined>(value);

  const handleValueChange = useCallback((values: NumberFormatValues, _sourceInfo: SourceInfo) => {
    valueRef.current = values.floatValue;
  }, []);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = (valueRef.current ? valueRef.current : null) as unknown as string;
      onChange && onChange({ ...event, target: { ...event.target, name: ensureString(name), value } });
    },
    [name, onChange]
  );

  return (
    <NumericFormat
      value={value}
      thousandSeparator={thousandSeparator}
      name={name}
      {...otherProps}
      onChange={handleChange}
      customInput={TextField}
      onValueChange={handleValueChange}
    />
  );
};

export default NumberField;
