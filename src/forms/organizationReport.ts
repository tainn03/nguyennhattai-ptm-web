import { OrganizationReportInfo } from "@/types/strapi";

export type OrganizationReportInputForm = Partial<OrganizationReportInfo> & {
  templateId: number;
};
