"use client";

import { DriverLicenseTypeForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId, encryptedId } = useIdParam();

    return <DriverLicenseTypeForm screenMode="EDIT" id={originId} encryptedId={encryptedId} {...props} />;
  },
  {
    resource: "driver-license-type",
    action: ["edit", "edit-own"],
  }
);
