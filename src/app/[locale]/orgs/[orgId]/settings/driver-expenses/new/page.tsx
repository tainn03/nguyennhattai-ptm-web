"use client";

import { useSearchParams } from "next/navigation";

import { DriverExpenseForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const searchParams = useSearchParams();
    const encryptedId = searchParams.get("copyId");
    const { originId } = useIdParam({ encryptedId });

    return <DriverExpenseForm screenMode="NEW" id={originId} {...props} />;
  },
  {
    resource: "driver-expense",
    action: "new",
  }
);
