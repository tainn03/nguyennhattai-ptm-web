"use client";

import { RoutePointForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId, encryptedId } = useIdParam();

    return <RoutePointForm screenMode="EDIT" id={originId} encryptedId={encryptedId} {...props} />;
  },
  {
    resource: "route-point",
    action: ["edit", "edit-own"],
  }
);
