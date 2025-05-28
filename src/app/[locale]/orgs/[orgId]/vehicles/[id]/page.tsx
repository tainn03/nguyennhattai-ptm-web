"use client";

import { VehicleDetail } from "@/components/organisms";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    return <VehicleDetail {...props} />;
  },
  {
    resource: "vehicle",
    action: ["detail", "edit-own"],
  }
);
