"use client";

import { useSearchParams } from "next/navigation";

import { ExpenseTypeForm } from "@/components/organisms";
import { useIdParam } from "@/hooks";
import { withOrg } from "@/utils/client";

export default withOrg(
  (props) => {
    const searchParams = useSearchParams();
    const encryptedId = searchParams.get("copyId");
    const { originId } = useIdParam({ encryptedId });

    return <ExpenseTypeForm screenMode="NEW" id={originId} {...props} />;
  },
  {
    resource: "expense-type",
    action: "new",
  }
);
