"use client";

import { DriverReportForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId, encryptedId } = useIdParam();

    return <DriverReportForm screenMode="EDIT" id={originId} encryptedId={encryptedId} {...props} />;
  },
  {
    resource: "driver-report",
    action: ["edit", "edit-own"],
  }
);
