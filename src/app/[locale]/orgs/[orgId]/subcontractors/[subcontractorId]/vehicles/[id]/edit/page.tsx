"use client";

import { VehicleForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId, encryptedId } = useIdParam();
    const { originId: subcontractorId } = useIdParam({ name: "subcontractorId" });

    return (
      <VehicleForm
        screenMode="EDIT"
        id={originId}
        encryptedId={encryptedId}
        subcontractorId={subcontractorId}
        {...props}
      />
    );
  },
  {
    resource: "vehicle",
    action: ["edit", "edit-own"],
  }
);
