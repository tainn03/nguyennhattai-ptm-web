"use client";

import { useSearchParams } from "next/navigation";

import { MemberForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const searchParams = useSearchParams();
    const encryptedId = searchParams.get("copyId");
    const { originId } = useIdParam({ encryptedId });

    return <MemberForm screenMode="NEW" id={originId} {...props} />;
  },
  {
    resource: "organization-member",
    action: "new",
  }
);
