import { AnyObject } from ".";
import { ReportRequest } from "./report";

type Organization = {
  name: string;
  taxCode: string;
  abbreviationName: string;
  internationalName: string;
  phoneNumber: string;
  email: string;
  website: string;
  businessAddress: string;
  contactName: string;
  contactPosition: string;
  contactEmail: string | null;
  contactPhoneNumber: string;
};

type CreatedByUser = {
  name: string;
};

type Body = {
  dataset: AnyObject;
  sheetName: string;
  startDate: string;
  endDate: string;
  organization: Organization;
  createdByUser: CreatedByUser;
};

type Data = {
  body: Body;
};

export type ReportData = {
  data: Data;
};

export type CreateReportParams = {
  reportId: string;
  reportName: string;
  request: ReportData[];
  exportPdf?: boolean;
};

export type ExportReportRequest<T = AnyObject> = {
  dynamicTemplateId: string;
  downloadFileName: string;
  data: ReportRequest<T> | ReportRequest<T>[];
  exportPdf?: boolean;
  returnType?: "url";
};

export type ReportResponse = {
  status: "ok" | "error"; // Assuming status could be 'ok' or 'error' for flexibility
  url: string; // URL to the generated report file
  message: string; // Message describing the result
};
