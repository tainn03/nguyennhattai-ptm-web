"use client";

import { useSearchParams } from "next/navigation";

import { VehicleForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const searchParams = useSearchParams();
    const encryptedId = searchParams.get("copyId");
    const { originId } = useIdParam({ encryptedId });
    const { originId: subcontractorId } = useIdParam({ name: "subcontractorId" });

    return <VehicleForm screenMode="NEW" id={originId} subcontractorId={subcontractorId} {...props} />;
  },
  {
    resource: "vehicle",
    action: "new",
  }
);
