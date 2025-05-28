"use client";

import { CheckCircleIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

type ProgressBarProps = {
  steps: string[];
  stepIndex: number;
};

const ProgressBar = ({ steps, stepIndex }: ProgressBarProps) => {
  return (
    <div>
      <h4 className="sr-only">Status</h4>
      {/* <p className="text-sm font-medium text-gray-900">Migrating MySQL database...</p> */}
      <div aria-hidden="true">
        <div className="overflow-hidden rounded-full bg-gray-200">
          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${(stepIndex / steps.length) * 100}%` }} />
        </div>
        <h2 className="mt-3 hidden flex-row justify-center text-base font-semibold text-gray-900 max-sm:flex">
          {steps[stepIndex]}
        </h2>
        <div className="mt-3 hidden grid-cols-2 text-sm font-medium text-gray-600 sm:grid">
          {steps.map((item, index) => (
            <div
              key={item}
              className={clsx("flex flex-row gap-2", {
                "justify-start": index === 0,
                "justify-center": index > 0 && index < steps.length - 1,
                "justify-end": index === steps.length - 1,
                "text-blue-600": stepIndex > index,
                "font-semibold text-gray-900": stepIndex === index,
              })}
            >
              {stepIndex > index && <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />}
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;
