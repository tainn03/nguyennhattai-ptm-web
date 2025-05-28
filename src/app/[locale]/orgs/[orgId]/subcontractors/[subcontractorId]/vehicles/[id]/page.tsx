"use client";

import { VehicleDetail } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId: subcontractorId } = useIdParam({ name: "subcontractorId" });

    return <VehicleDetail subcontractorId={subcontractorId} {...props} />;
  },
  {
    resource: "vehicle",
    action: ["detail", "edit-own"],
  }
);
