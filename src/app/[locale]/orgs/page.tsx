"use client";

import { useRouter } from "next-intl/client";
import { useCallback, useEffect } from "react";

import { Loading } from "@/components/molecules";
import { Footer, Header } from "@/components/organisms";
import { useAuth } from "@/hooks";
import useOrganizationsByUserId from "@/hooks/useOrganizationsByUserId";
import { updateUserOrganizationIdSetting } from "@/services/client/user";
import { OrganizationInfo } from "@/types/strapi";
import { getOrganizationLink } from "@/utils/auth";
import { withAuth } from "@/utils/client";
import { equalId } from "@/utils/number";

import { NewOrganization, OrganizationList } from "./components";

export default withAuth(({ userId, user }) => {
  const router = useRouter();
  const { reloadUserProfile } = useAuth();
  const { isLoading, organizationMembers } = useOrganizationsByUserId({ id: userId });

  /**
   * Handling the selection of an organization.
   *
   * @param {Organization} organization - The selected organization.
   */
  const handleOrganizationSelect = useCallback(
    async (organization: OrganizationInfo) => {
      if (!organization.isActive) {
        return;
      }

      // Update the current organization setting if needed
      const settingId = user?.setting.id && Number(user.setting.id);
      if (settingId && !equalId(user.setting.organizationId, organization.id)) {
        // Update the user's organization ID setting
        const result = await updateUserOrganizationIdSetting(settingId, Number(organization.id));

        // If the update was successful, reload the user profile
        if (result) {
          await reloadUserProfile();
        }
      }

      // Navigate to the organization's dashboard
      const orgLink = getOrganizationLink(organization);
      router.replace(`${orgLink}/dashboard`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reloadUserProfile, user]
  );

  useEffect(() => {
    // Auto access to Organization if has only one Organization
    if (organizationMembers.length === 1) {
      // Automatically navigating an organization based on the provided information.
      handleOrganizationSelect(organizationMembers[0].organization as OrganizationInfo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationMembers]);

  if (organizationMembers.length === 1 && organizationMembers[0].organization.isActive) {
    return <Loading size="medium" />;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="min-h-full flex-1">
        <Header sidebarMenu={false} searchBar={false} />

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {/* Loading */}
            {isLoading && <Loading />}

            {/* List */}
            {!isLoading && organizationMembers.length > 0 && (
              <OrganizationList
                organizationMembers={organizationMembers}
                onOrganizationSelect={handleOrganizationSelect}
              />
            )}

            {/* New */}
            {!isLoading && organizationMembers.length === 0 && <NewOrganization />}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
});
