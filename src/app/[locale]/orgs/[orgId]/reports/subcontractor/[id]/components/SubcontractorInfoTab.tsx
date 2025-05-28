"use client";

import { memo } from "react";

import { DetailedSubcontractorCostInfo } from "@/types/report";

import { SubcontractorDetailCard, SubcontractorInfoCard } from ".";

type SubcontractorInfoTabProps = {
  loading: boolean;
  costInfo: DetailedSubcontractorCostInfo;
};

const SubcontractorInfoTab = (props: SubcontractorInfoTabProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-5 2xl:grid-cols-6">
      {/* Subcontractor Info */}
      <SubcontractorInfoCard {...props} />

      {/* Subcontractor Cost Detail */}
      <SubcontractorDetailCard {...props} />
    </div>
  );
};

export default memo(SubcontractorInfoTab);
