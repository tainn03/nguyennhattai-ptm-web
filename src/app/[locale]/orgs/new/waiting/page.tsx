"use client";

import { useRouter } from "next-intl/client";
import { useEffect, useState } from "react";

import { Loading, NewOrganizationNotification } from "@/components/molecules";
import { SESSION_ORGANIZATION_NAME } from "@/constants/storage";
import { withAuth } from "@/utils/client";
import { getItemString } from "@/utils/storage";

export default withAuth(() => {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");

  useEffect(() => {
    const name = getItemString(SESSION_ORGANIZATION_NAME, { remove: true });
    if (name) {
      setOrganizationName(name);
    } else {
      router.replace("/orgs");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Loading
  if (!organizationName) {
    return <Loading size="medium" />;
  }

  return (
    <NewOrganizationNotification
      icon="success"
      titleKey="new_org.waiting.notify_waiting_title"
      descriptionKey="new_org.waiting.notify_waiting_description"
      organizationName={organizationName}
    />
  );
});
