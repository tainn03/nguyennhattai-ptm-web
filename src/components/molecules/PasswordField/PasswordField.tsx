"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useCallback, useMemo, useState } from "react";

import TextField, { TextFieldProps } from "@/components/molecules/TextField/TextField";

export type PasswordFieldProps = Omit<TextFieldProps, "type" | "rightAddon" | "rightAddonClick"> & {
  showEyeIcon?: boolean;
};

const PasswordField = ({ id, showEyeIcon = true, ...otherProps }: PasswordFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleIconClick = useCallback(() => setShowPassword((prevValue) => !prevValue), []);

  const endAddonComponent = useMemo(
    () =>
      showEyeIcon && (
        <>
          {showPassword ? (
            <EyeIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
          ) : (
            <EyeSlashIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
          )}
        </>
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showEyeIcon, showPassword]
  );

  return (
    <TextField
      id={id}
      rightAddonBorder={!showEyeIcon}
      type={showPassword ? "text" : "password"}
      rightAddon={endAddonComponent}
      rightAddonClick={handleIconClick}
      {...otherProps}
    />
  );
};

export default PasswordField;
