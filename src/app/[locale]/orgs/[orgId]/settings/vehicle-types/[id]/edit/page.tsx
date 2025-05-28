"use client";

import { VehicleTypeForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId, encryptedId } = useIdParam();

    return <VehicleTypeForm screenMode="EDIT" id={originId} encryptedId={encryptedId} {...props} />;
  },
  {
    resource: "vehicle-type",
    action: ["edit", "edit-own"],
  }
);
