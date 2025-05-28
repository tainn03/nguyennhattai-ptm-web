"use client";

import { DetailedCustomerStatisticInfo } from "@/types/report";

import { CustomerInfoCard, CustomerReportCard } from ".";

type CustomerInfoTabProps = {
  isLoading?: boolean;
  customerInfo?: DetailedCustomerStatisticInfo;
};

const CustomerInfoTab = (props: CustomerInfoTabProps) => {
  return (
    <div className="grid grid-cols-1 gap-6 pb-8 lg:grid-cols-5 2xl:grid-cols-6">
      {/* Customer Info */}
      <CustomerInfoCard {...props} />

      {/* Customer Report */}
      <CustomerReportCard {...props} />
    </div>
  );
};

export default CustomerInfoTab;
