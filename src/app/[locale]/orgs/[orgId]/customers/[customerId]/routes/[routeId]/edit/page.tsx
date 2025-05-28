"use client";

import { RouteForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId, encryptedId } = useIdParam({ name: "routeId" });

    return <RouteForm screenMode="EDIT" id={originId} encryptedId={encryptedId} {...props} />;
  },
  {
    resource: "customer-route",
    action: ["edit", "edit-own"],
  }
);
