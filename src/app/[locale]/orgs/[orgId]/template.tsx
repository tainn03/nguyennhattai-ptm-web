"use client";

import { useParams } from "next/navigation";
import { useRouter } from "next-intl/client";
import { useCallback, useEffect } from "react";

import { PERSISTENT_ORGANIZATION, SESSION_ORGANIZATION_CACHED } from "@/constants/storage";
import { useAuth } from "@/hooks";
import { getOrganizationByCodeAndUserId } from "@/services/client/organizationMember";
import { updateUserOrganizationIdSetting } from "@/services/client/user";
import { DefaultReactProps } from "@/types";
import { ApiResult, HttpStatusCode } from "@/types/api";
import { OrganizationInfo } from "@/types/strapi";
import { get } from "@/utils/api";
import { getItemObject, getItemString, removeItem, setItemObject, setItemString } from "@/utils/storage";
import { ensureString } from "@/utils/string";

export default function Template({ children }: DefaultReactProps) {
  const router = useRouter();
  const params = useParams();
  const orgCode = ensureString(params.orgId);
  const { user, reloadUserProfile } = useAuth();

  /**
   * Retrieves basic information about an organization identified by its unique code.
   * If the information is not found in the cache or differs from the cached data,
   * it fetches the data from the server and updates the cache.
   */
  const getBasicOrganizationInfo = useCallback(async () => {
    // Ensure organization code and user are available
    if (!orgCode) {
      return;
    }

    // Check if the organization information is already cached
    const isOrganizationCached = getItemString(SESSION_ORGANIZATION_CACHED) === orgCode;
    const storedOrg = getItemObject<OrganizationInfo>(PERSISTENT_ORGANIZATION, { provider: "persistent" });

    // If not cached or cached data differs, fetch the data from the server
    if (!isOrganizationCached || !storedOrg || storedOrg.code !== orgCode) {
      // Remove the existing organization data from the cache and Fetch organization data from the server
      storedOrg && removeItem(PERSISTENT_ORGANIZATION, { provider: "persistent" });
      const { status, data } = await get<ApiResult<OrganizationInfo>>(`/api/orgs/${orgCode}`);

      // Update the cache if the data is successfully fetched
      if (status === HttpStatusCode.Ok && data) {
        setItemObject(PERSISTENT_ORGANIZATION, data, { provider: "persistent" });
        setItemString(SESSION_ORGANIZATION_CACHED, orgCode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Checks the validity of the organization associated with the user.
   * If the organization is not valid, it navigates the user to the default organization page ("/orgs").
   */
  const checkOrganizationValid = useCallback(async () => {
    // Ensure organization code and user are available
    if (!orgCode || !user) {
      return;
    }

    // Get organization information by code and user ID
    const org = await getOrganizationByCodeAndUserId(orgCode, user.id);

    // If the organization is not valid, navigate to the default organization page
    if (!org) {
      router.replace("/orgs");
      return;
    }

    const orgId = Number(org.id);
    const settingOrgId = Number(user.setting.organizationId);
    const settingId = Number(user.setting.id);
    if (orgId !== settingOrgId && settingId) {
      const result = await updateUserOrganizationIdSetting(settingId, orgId);
      if (result) {
        await reloadUserProfile();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Get organization information by code and save it to LocalStorage
    getBasicOrganizationInfo();

    // Checks the validity of the organization associated with the user.
    checkOrganizationValid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}
