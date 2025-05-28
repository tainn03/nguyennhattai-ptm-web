"use client";

import clsx, { ClassValue } from "clsx";

type ProcessProps = {
  label: string;
  processing: number;
  classValue: ClassValue;
  emptyLabel?: string | null;
};

const Process = ({ label, processing, classValue, emptyLabel }: ProcessProps) => {
  return !isNaN(processing) ? (
    <div className="relative h-5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={clsx("flex h-5 rounded-full", classValue)}
        style={{
          width: `${processing * 100}%`,
        }}
      />
      <span className="absolute top-0.5 w-full text-center text-xs font-medium text-gray-900">{label}</span>
    </div>
  ) : (
    emptyLabel
  );
};
export default Process;
