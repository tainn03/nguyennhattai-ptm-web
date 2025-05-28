"use client";

import { memo } from "react";

import { DetailedDriverSalaryInfo } from "@/types/report";

import { DriverInfoCard, DriverSalaryDetailCard } from ".";

type DriverSalaryInfoTabProps = {
  loading: boolean;
  salaryInfo: DetailedDriverSalaryInfo;
};

const DriverSalaryInfoTab = (props: DriverSalaryInfoTabProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-5 2xl:grid-cols-6">
      {/* Driver Info */}
      <DriverInfoCard {...props} />

      {/* Driver Salary Detail */}
      <DriverSalaryDetailCard {...props} />
    </div>
  );
};

export default memo(DriverSalaryInfoTab);
