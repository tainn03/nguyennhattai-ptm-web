"use client";

import { TruckIcon } from "@heroicons/react/24/outline";

import { DriverReportInfo } from "@/types/strapi";
import { cn } from "@/utils/twcn";

export type StepperProps = {
  data: Partial<DriverReportInfo>[];
};

const Stepper = ({ data }: StepperProps) => {
  return (
    <div className="flex max-sm:pb-4 xl:pb-10">
      <nav aria-label="Progress" className="w-full max-w-6xl py-4 xl:px-6">
        <ol role="list" className="flex flex-col xl:flex-row xl:items-center">
          {data?.map((item, index) => (
            <li
              key={item.id}
              className={cn("relative", {
                "flex-1 max-xl:pb-10": index < data.length - 1,
              })}
            >
              <div className="absolute inset-0 flex items-center justify-center max-xl:w-8 xl:h-8" aria-hidden="true">
                <div
                  className={cn("h-full w-0.5 bg-blue-700 xl:h-0.5 xl:w-full", {
                    hidden: index === data.length - 1,
                  })}
                />
              </div>
              <div className="relative min-w-[9.25rem] max-xl:flex max-xl:items-center">
                <div className={cn("relative flex h-8 w-8 items-center justify-center bg-white")}>
                  <TruckIcon className="h-6 w-6 text-blue-700" aria-hidden="true" />
                  <div className="absolute top-8 hidden min-w-0 flex-col items-center justify-center whitespace-nowrap xl:flex">
                    <span className={cn("mt-1 text-center text-xs font-medium text-gray-900")}>{item?.name}</span>
                  </div>
                </div>
                <div className="-mt-1 ml-4 flex min-w-0 flex-col justify-center whitespace-nowrap xl:hidden">
                  <span className={cn("text-xs font-medium text-gray-900")}>{item?.name}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default Stepper;
