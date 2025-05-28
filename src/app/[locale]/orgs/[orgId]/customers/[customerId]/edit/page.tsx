"use client";

import { CustomerForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const { originId, encryptedId } = useIdParam({ name: "customerId" });

    return <CustomerForm screenMode="EDIT" id={originId} encryptedId={encryptedId} {...props} />;
  },
  {
    resource: "customer",
    action: ["edit", "edit-own"],
  }
);
