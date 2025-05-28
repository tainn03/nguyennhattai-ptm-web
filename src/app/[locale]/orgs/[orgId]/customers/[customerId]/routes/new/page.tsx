"use client";

import { useSearchParams } from "next/navigation";

import RouteForm from "@/components/organisms/RouteForm/RouteForm";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const searchParams = useSearchParams();
    const encryptedId = searchParams.get("copyId");
    const { originId } = useIdParam({ encryptedId });

    return <RouteForm screenMode="NEW" id={originId} {...props} />;
  },
  {
    resource: "customer-route",
    action: "new",
  }
);
