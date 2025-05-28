"use client";

import React, { ChangeEvent, ClipboardEvent, FocusEvent, useCallback, useState } from "react";

import { TextField } from "@/components/molecules";

type VerificationFieldPros = {
  onChange?: (value: string) => void;
};

const VerificationField = ({ onChange }: VerificationFieldPros) => {
  const [values, setValues] = useState(["", "", "", "", "", ""]);

  const handleChange = useCallback(
    (index: number) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = event.target.value;
      const newValues = [...values];
      newValues[index] = value;
      setValues(newValues);
      if (value.length === 1 && index < values.length - 1) {
        document.querySelector<HTMLInputElement>(`#code${index + 2}`)?.focus();
      }
      onChange && onChange(newValues.join(""));
    },
    [onChange, values]
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const pastedText = event.clipboardData.getData("text/plain").toUpperCase();
      if (pastedText.length === 6) {
        setValues(pastedText.split(""));
        document.querySelector<HTMLInputElement>("#code6")?.focus();
        onChange && onChange(pastedText);
      }
    },
    [onChange]
  );

  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
    event.target.select();
  }, []);

  return (
    <div className="flex flex-row gap-3">
      {Array.from(Array(6)).map((_, index) => (
        <div key={index}>
          <TextField
            id={`code${index + 1}`}
            name={`code${index + 1}`}
            type="text"
            value={values[index]}
            onChange={handleChange(index)}
            onFocus={handleFocus}
            onPaste={handlePaste}
            maxLength={1}
            className="[&_input]:px-3 [&_input]:py-4 [&_input]:text-center [&_input]:text-3xl [&_input]:uppercase"
          />
        </div>
      ))}
    </div>
  );
};

export default VerificationField;
