"use client";

import { useSearchParams } from "next/navigation";

import { CustomerForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const searchParams = useSearchParams();
    const encryptedId = searchParams.get("copyId");
    const { originId } = useIdParam({ encryptedId });

    return <CustomerForm screenMode="NEW" id={originId} {...props} />;
  },
  {
    resource: "customer",
    action: "new",
  }
);
