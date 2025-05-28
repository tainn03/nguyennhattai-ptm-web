"use client";

import { RadioGroup } from "@headlessui/react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { UserType } from "@/forms/auth";

type UserTypeRadioGroupProps = {
  value: UserType;
  onChange?: (value: UserType) => void;
};

const UserTypeRadioGroup = ({ value, onChange }: UserTypeRadioGroupProps) => {
  const t = useTranslations();

  const userTypeOptions = useMemo(
    () => [
      {
        value: "ADMIN",
        label: t("sign_in.user_type_admin_label"),
        description: t("sign_in.user_type_admin_description"),
      },
      {
        value: "MEMBER",
        label: t("sign_in.user_type_member_label"),
        description: t("sign_in.user_type_member_description"),
      },
    ],
    [t]
  );

  return (
    <RadioGroup value={value} onChange={onChange}>
      <RadioGroup.Label className="sr-only" />
      <div className="flex flex-col gap-y-2 -space-y-px rounded-md bg-white">
        {userTypeOptions.map((item) => (
          <RadioGroup.Option
            key={item.value}
            value={item.value}
            className={({ checked }) =>
              clsx("relative flex cursor-pointer rounded-md border p-2 focus:outline-none", {
                "z-10 border-blue-200 bg-blue-50": checked,
                "border-gray-200": !checked,
              })
            }
          >
            {({ active, checked }) => (
              <>
                <span
                  className={clsx(
                    "mt-0.5 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border",
                    {
                      "border-transparent bg-blue-700": checked,
                      "border-gray-300 bg-white": !checked,
                      "ring-2 ring-blue-700 ring-offset-2": active,
                    }
                  )}
                  aria-hidden="true"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <div className="ml-3 flex flex-col">
                  <RadioGroup.Label as="span" className="block text-sm font-medium text-gray-900">
                    {item.label}
                  </RadioGroup.Label>
                  <RadioGroup.Description as="span" className="block text-xs text-gray-500">
                    {item.description}
                  </RadioGroup.Description>
                </div>
              </>
            )}
          </RadioGroup.Option>
        ))}
      </div>
    </RadioGroup>
  );
};

export default UserTypeRadioGroup;
