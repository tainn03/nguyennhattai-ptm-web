"use client";

import { CustomerGroupForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId, encryptedId } = useIdParam();

    return <CustomerGroupForm screenMode="EDIT" id={originId} encryptedId={encryptedId} {...props} />;
  },
  {
    resource: "customer-group",
    action: ["edit", "edit-own"],
  }
);
