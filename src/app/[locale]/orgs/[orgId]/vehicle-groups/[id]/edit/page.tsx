"use client";

import { VehicleGroupForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId, encryptedId } = useIdParam();

    return <VehicleGroupForm screenMode="EDIT" id={originId} encryptedId={encryptedId} {...props} />;
  },
  {
    resource: "vehicle-group",
    action: ["edit", "edit-own"],
  }
);
