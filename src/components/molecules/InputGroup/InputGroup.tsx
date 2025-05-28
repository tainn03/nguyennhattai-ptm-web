"use client";

import clsx from "clsx";
import { HTMLAttributes, ReactNode } from "react";

import { SectionHeader } from "@/components/molecules";

export type InputBoxProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  subTitle?: string;
  description?: ReactNode;
  showBorderBottom?: boolean;
};

const InputBox = ({
  title,
  subTitle,
  description,
  showBorderBottom = true,
  className,
  children,
  ...otherProps
}: InputBoxProps) => {
  return (
    <div
      className={clsx("grid grid-cols-1 gap-x-8 gap-y-10 pb-12 max-sm:px-4 md:grid-cols-3 lg:grid-cols-4", className, {
        "border-b border-gray-900/10": showBorderBottom,
      })}
      {...otherProps}
    >
      <SectionHeader title={title} subTitle={subTitle} description={description} />
      <div className="grid max-w-2xl grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 md:col-span-2 lg:col-span-3">
        {children}
      </div>
    </div>
  );
};

export default InputBox;
