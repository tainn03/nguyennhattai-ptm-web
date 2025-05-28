import { Metadata } from "next";

import { AuthorizationProvider } from "@/providers";
import { DefaultReactProps, GenerateMetadataProps } from "@/types";
import { createTranslator } from "@/utils/locale";
import { getCurrentOrganizationMemberInfo } from "@/utils/server";

export async function generateMetadata({ params: { locale } }: GenerateMetadataProps): Promise<Metadata> {
  const t = await createTranslator(locale);

  return {
    title: {
      template: `%s | ${t("common.app.name")}`,
      default: t("user_profile.account"),
    },
  };
}

export default async function Layout({ children }: DefaultReactProps) {
  const currentOrganizationMemberInfo = await getCurrentOrganizationMemberInfo();

  return <AuthorizationProvider organizationMember={currentOrganizationMemberInfo}>{children}</AuthorizationProvider>;
}
