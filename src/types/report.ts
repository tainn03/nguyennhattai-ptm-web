import type { OrganizationReportType } from "@prisma/client";
import { OrderStatusType } from "@prisma/client";

import { AnyObject } from "@/types";
import { Pagination } from "@/types/graphql";
import { LocaleType } from "@/types/locale";
import { OrganizationInfo } from "@/types/strapi";
import { FuelLogInfo } from "@/types/strapi";

export enum DynamicReportStatusCode {
  OK = "ok",
  NOT_GOOD = "ng",
}

export type ReportRequest<T = AnyObject> = {
  data: {
    body: T;
  };
};

export type ReportQueryParams<T> = T &
  Pick<Pagination, "page" | "pageSize"> & {
    organizationId: number;
    startDate: Date | string;
    endDate: Date | string;
  };

/**
 * Query parameters for the driver salary page.
 * @reference /reports/driver/page.tsx
 */
export type DriverSalaryQueryParams = ReportQueryParams<{
  driverId?: string | number;
  driverReportIds: string[] | number[];
}>;

/**
 * Type for the driver salary overview in the driver salary page.
 * @reference /reports/driver/page.tsx
 */
export type DriverSalaryOverview = {
  id: string;
  firstName: string;
  lastName: string;
  vehicleId: string;
  vehicleNumber: string;
  trailerNumber: string;
  totalTrip: string; // Tổng chuyến
  phoneNumber: string;
  basicSalary: string; // Lương cơ bản
  securityDeposit: string; // Tiền ký quỹ
  unionDues: string; // Phí công đoàn
  tripSalaryTotal: string; // Tổng lương chuyến
  salaryAdvance: string; // Tổng lương tạm ứng
  advanceTotalCost: string; // Tổng chi phí chuyến tạm ứng
};

/**
 * Query parameters for the driver salary report page.
 * @reference /reports/driver/[id]/page.tsx
 */
export type IndividualDriverSalaryParams = Required<
  Pick<DriverSalaryQueryParams, "driverId" | "driverReportIds" | "organizationId">
> & {
  startDate: string | null;
  endDate: string | null;
};

/**
 * Query parameters for export the driver salary report.
 * @reference /reports/driver/[id]/page.tsx
 * @reference /reports/driver/page.tsx
 */
export type IndividualDriverSalaryReportParams = Required<Omit<IndividualDriverSalaryParams, "driverId">> & {
  driverId?: string | number;
  isExportList?: boolean;
  locale?: LocaleType;
  clientTimezone?: string;
};

/**
 * Detailed driver information that includes salary information.
 * @reference /reports/drivers/[id]/components/DriverSalaryInfoTab.tsx
 */
export type DetailedDriverSalaryInfo = DriverSalaryOverview & {
  idNumber: string;
  accountNumber: string;
  bankName: string;
  bankBranch: string;
  city: string;
  district: string;
  ward: string;
  addressLine1: string;
};

/**
 * Overview trip information of a driver that includes salary information.
 * @reference /reports/drivers/[id]/components/DriverTripInfoTab.tsx
 */
export type DriverPaidTrip = {
  id: string;
  code: string;
  billOfLading: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  driverCost: string;
  advanceTotalCost: string;
  startDate: string;
  endDate: string;
  pickupDate: string;
  deliveryDate: string;
  driverReportName: string;
  driverReportType: string;
};

/**
 * Reporting trip information of a driver that includes salary information.
 * @reference src/utils/driver.ts
 */
export type DriverPaidTripReport = DriverPaidTrip & {
  otherCost: string | null;
  subContractorCost: string | null;
  bridgeToll: string | null;
  notes: string | null;
  pickupPoints: string | null;
  deliveryPoints: string | null;
  orderTotalAmount: string | null;
  orderNotes: string | null;
  driverExpenseInfo: AnyObject;
  meta?: AnyObject;
  merchandiseTypes?: string | null;
  order: AnyObject;
};

/**
 * Detailed driver salary report to be exported.
 * @reference src/utils/driver.ts
 * @reference services/server/dynamicReport.ts
 */
export type DriverSalaryReport = {
  currentDate: string | null;
  currentMonth: string | null;
  currentYear: string | null;
  driverId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  city: string | null;
  district: string | null;
  ward: string | null;
  addressLine1: string | null;
  idNumber: string | null;
  idIssueDate: string | null;
  idIssuedBy: string | null;
  licenseType: string | null;
  licenseNumber: string | null;
  licenseIssueDate: string | null;
  licenseExpiryDate: string | null;
  experienceYears: string | null;
  email: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  basicSalary: string;
  unionDues: string;
  securityDeposit: string;
  totalTrip: string | null;
  description: string | null;
  accountNumber: string | null;
  holderName: string | null;
  bankName: string | null;
  bankBranch: string | null;
  vehicleId: string | null;
  vehicleNumber: string | null;
  trailerNumber: string | null;
  tripSalaryTotal: string;
  salaryAdvance: string;
  advanceTotalCost: string;
  balance: number | null;
  actualSalary: number | null;
  sheetName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  orderTrips?: DriverPaidTripReport[] | null;
  image?: AnyObject;
  organization?: OrganizationInfo;
  createdByUser?: AnyObject;
};

/**
 * Query parameters for the subcontractor cost report page.
 * @reference /reports/subcontractor/page.tsx
 */
export type SubcontractorCostQueryParams = ReportQueryParams<{
  subcontractorId?: string | number;
  driverReportIds: string[] | number[];
}>;

/**
 * Overview cost information of a subcontractor.
 * @reference /reports/subcontractor/page.tsx
 */
export type SubcontractorCostOverview = {
  id: string;
  name: string;
  code: string;
  phoneNumber: string;
  email: string;
  totalTrip: string; // Tổng chuyến
  subcontractorCostTotal: string; // Tổng chi phí nhà thầu phụ
  advanceTotalCost: string; // Tổng chi phí tạm ứng của nhà thầu phụ
};

/**
 * Query parameters for the subcontractor cost report page.
 * @reference /reports/subcontractor/[id]/page.tsx
 */
export type IndividualSubcontractorCostParams = Required<
  Pick<SubcontractorCostQueryParams, "subcontractorId" | "driverReportIds" | "organizationId">
> & {
  startDate: string | null;
  endDate: string | null;
};

/**
 * Detailed driver information that includes salary information.
 * @reference /reports/subcontractor/[id]/components/SubcontractorInfoTab.tsx
 */
export type DetailedSubcontractorCostInfo = SubcontractorCostOverview & {
  taxCode: string;
  holderName: string;
  accountNumber: string;
  bankName: string;
  bankBranch: string;
  website: string;
  businessAddress: string;
};

/**
 * Paid trip information of a subcontractor that includes cost information.
 * @reference /reports/subcontractor/[id]/components/SubcontractorTripInfoTab.tsx
 */
export type SubcontractorPaidTrip = Omit<DriverPaidTrip, "driverCost" | "advanceTotalCost"> & {
  subcontractorCost: string;
  vehicleId: string;
  vehicleNumber: string;
  firstName: string; // driver's first name
  lastName: string; // driver's last name
};

/**
 * Query parameters for export the subcontractor cost report.
 * @reference /reports/subcontractor/[id]/page.tsx
 * @reference /reports/subcontractor/page.tsx
 */
export type IndividualSubcontractorCostReportParams = Required<
  Omit<IndividualSubcontractorCostParams, "subcontractorId">
> & {
  subcontractorId?: string | number;
  isExportList?: boolean;
  locale?: LocaleType;
  type?: OrganizationReportType;
  clientTimezone?: string;
};

/**
 * Reporting trip information of a subcontractor that includes salary information.
 * @reference src/utils/subcontractor.ts
 */
export type SubcontractorPaidTripReport = Omit<SubcontractorPaidTrip, "vehicleId"> & {
  vehicleIdNumber: string | null; // vehicle's ID number
  driverIdNumber: string | null; // driver's ID number
  phoneNumber: string | null; // driver's phone number
  email: string | null; // driver's email
  otherCost: string | null;
  bridgeToll: string | null;
  unitOfMeasureCode: string | null;
  unitOfMeasureName: string | null;
  notes: string | null;
  driverExpenseInfo: AnyObject;
  pickupPoints: string | null;
  deliveryPoints: string | null;
  orderTotalAmount: string | null;
  orderNotes: string | null;
  meta?: AnyObject;
  merchandiseTypes?: string | null;
  order: AnyObject;
};

/**
 * Detailed subcontractor cost report to be exported.
 * @reference src/utils/subcontractor.ts
 * @reference services/server/dynamicReport.ts
 */
export type SubcontractorCostReport = DetailedSubcontractorCostInfo & {
  currentDate: string | null;
  currentMonth: string | null;
  currentYear: string | null;
  balance: number | null;
  sheetName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  orderTrips?: SubcontractorPaidTripReport[] | null;
  image?: AnyObject;
  organization?: OrganizationInfo;
  createdByUser?: AnyObject;
};

/**
 * Query parameters for the customer statistic page.
 * @reference /reports/customer/page.tsx
 */
export type CustomerStatisticQueryParams = ReportQueryParams<{
  customerId?: string | number;
  driverReportIds: string[] | number[];
}>;

/**
 * Overview statistic information of customers.
 * @reference /reports/customer/page.tsx
 */
export type CustomerStatisticOverview = {
  id: string;
  name: string;
  taxCode: string;
  code: string;
  type: string;
  phoneNumber: string;
  email: string;
  totalOrder: string; // Tổng đơn hàng
  totalTrip: string; // Tổng chuyến
  totalAmount: string; // Tổng số tiền khách hàng phải trả
};

/**
 * Query parameters for the customer statistic report page.
 * @reference /reports/customer/[id]/page.tsx
 */
export type IndividualCustomerStatisticParams = Required<
  Pick<CustomerStatisticQueryParams, "customerId" | "driverReportIds" | "organizationId">
> & {
  startDate: string | null;
  endDate: string | null;
};

/**
 * Query parameters for export the customer statistic report.
 * @reference /reports/customer/[id]/page.tsx
 * @reference /reports/customer/page.tsx
 */
export type IndividualCustomerStatisticReportParams = Required<
  Omit<IndividualCustomerStatisticParams, "customerId">
> & {
  customerId?: string | number;
  isExportList?: boolean;
  locale?: LocaleType;
  type?: OrganizationReportType;
  clientTimezone?: string;
};

/**
 * Detailed customer information that includes expense information.
 */
export type DetailedCustomerStatisticInfo = CustomerStatisticOverview & {
  businessAddress: string;
  contactName: string;
  contactPosition: string;
  accountNumber: string;
  holderName: string;
  bankName: string;
  bankBranch: string;
};

/**
 * Paid trip information of a customer that includes expense information.
 * @reference /reports/customer/[id]/components/CustomerTripInfoTab.tsx
 */
export type CustomerPaidTrip = Omit<DriverPaidTrip, "driverCost" | "advanceTotalCost"> & {
  vehicleId: string;
  vehicleNumber: string;
  firstName: string; // driver's first name
  lastName: string; // driver's last name
};

/**
 * Reporting trip information of a customer that includes expense information.
 * @reference src/utils/customer.ts
 */
export type CustomerPaidTripReport = CustomerPaidTrip & {
  driverId: string;
  driverCost: string | null;
  billOfLadingReceivedDate: string | null;
  orderDate: string | null;
  orderCompletedDate: string | null;
  subContractorCost: string | null;
  bridgeToll: string | null;
  otherCost: string | null;
  weight: string | null;
  unitOfMeasureCode: string | null;
  unitOfMeasureName: string | null;
  pickupPoints: string | null;
  deliveryPoints: string | null;
  notes: string | null;
  driverExpenseInfo: AnyObject;
  orderTotalAmount: string | null;
  meta?: AnyObject;
};

/**
 * Detailed subcontractor cost report to be exported.
 * @reference src/utils/subcontractor.ts
 * @reference services/server/dynamicReport.ts
 */
export type CustomerStatisticReport = DetailedCustomerStatisticInfo & {
  contactEmail: string;
  contactPhoneNumber: string;
  currentDate: string | null;
  currentMonth: string | null;
  currentYear: string | null;
  sheetName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  orderTrips?: CustomerPaidTripReport[] | null;
  image?: AnyObject;
  organization?: OrganizationInfo;
  createdByUser?: AnyObject;
};

export type AggregateCustomerReport = {
  currentDate: string | null;
  currentMonth: string | null;
  currentYear: string | null;
  sheetName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  orderTrips?: CustomerPaidTripReport[] | null;
  image?: AnyObject;
  organization?: OrganizationInfo;
  createdByUser?: AnyObject;
};

export type TripReportQueryParams = ReportQueryParams<{
  driverReportIds: string[] | number[];
}>;

export type TripReportOverView = Omit<DriverPaidTrip, "advanceTotalCost"> & {
  otherCost: string;
  subcontractorCost: string;
  bridgeToll: string;
  totalAdvance: string;
  weight: string;
  orderUnit: string;
  vehicleId: string;
  vehicleNumber: string;
  billOfLadingReceivedDate: string;
  notes: string;
  firstName: string; // driver's first name
  lastName: string; // driver's last name
  tripCreatedAt: string;
  tripUpdatedAt: string;
  billOfLadingFileUrl: string;
  billOfLadingFileName: string;
  createdByAvatarUrl: string;
  createdByAvatarName: string;
  createdByFirstName: string;
  createdByLastName: string;
  updatedByAvatarUrl: string;
  updatedByAvatarName: string;
  updatedByFirstName: string;
  updatedByLastName: string;
};

export type IndividualTripReportParams = Required<Omit<TripReportQueryParams, "page" | "pageSize">> & {
  locale?: LocaleType;
  clientTimezone?: string;
};

export type TripDetailReport = {
  id: string;
  code: string;
  startDate: string;
  endDate: string;
  pickupDate: string;
  deliveryDate: string;
  billOfLading: string | null;
  billOfLadingReceivedDate: string | null;
  driverCost: string;
  bridgeToll: string;
  subcontractorCost: string;
  otherCost: string;
  weight: string;
  notes: string;
  orderUnit: string;
  orderId: string;
  orderCode: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  driverReportName: string;
  driverReportType: string;
  driverExpenseInfo: AnyObject;
  driverId: string;
  firstName: string;
  lastName: string;
  vehicleId: string;
  vehicleNumber: string;
  tripCreatedAt: string;
  tripUpdatedAt: string;
  totalAdvance: string;
  pickupPoints: string | null;
  deliveryPoints: string | null;
  order: AnyObject;
  meta: AnyObject;
  merchandiseTypes?: string | null;
  routeMeta?: AnyObject;
  customerMeta?: AnyObject;
};

export type TripReportRequest = {
  organizationId: number;
  currentDate?: string | null;
  currentMonth?: string | null;
  currentYear?: string | null;
  sheetName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  orderTrips?: TripDetailReport[] | null;
  image?: AnyObject;
  organization?: OrganizationInfo;
  createdByUser?: AnyObject;
  orderTripTotal?: number | null;
};

export type OrderMonitoringChart = {
  lastStatusType: OrderStatusType | null | string;
  cntByLastStatusType: number;
  label: string;
  color: string;
};

export type MerchandiseType = {
  name?: string | null;
  description?: string | null;
};

export type MonthlyPeriod = {
  startDate: string;
  endDate: string;
};

export type MobileSalariesParams = {
  organizationId: number;
  driverId: number;
  monthlyPeriods: MonthlyPeriod[];
};

export type MobileDriverSalaries = {
  id: number;
  totalTrip: string | null;
  tripSalaryTotal: string | null;
  startDate: string;
  endDate: string;
  salaryVariance: number;
};

/**
 * Query parameters for the fuel cost history report page.
 * @reference /reports/fuel-logs/page.tsx
 */
export type IndividualFuelLogsHistoryQueryParams = {
  gasStationId?: string | number | null;
  driverId?: string | number | null;
  vehicleId?: string | number | null;
  startDate: string | null;
  endDate: string | null;
  locale: LocaleType;
  clientTimezone: string;
  organizationCode: string;
  organizationId?: number;
};

export type FuelLogsHistoryExportParams = Omit<
  IndividualFuelLogsHistoryQueryParams,
  "organizationId" | "organizationCode"
>;

export type FuelLogReport = Omit<FuelLogInfo, "date" | "confirmationAt" | "confirmationBy"> & {
  date: Date | string | null;
  confirmationAt: Date | string | null;
  confirmationBy: AnyObject;
};

export type FuelLogsHistoryExportData = {
  sheetName: string;
  organization: OrganizationInfo;
  fuelLogs: FuelLogReport[];
  startDate: string | null;
  endDate: string | null;
  createdByUser: AnyObject;
};

export type OrderGroupBookingData = {
  orderGroupIndex: number; // STT
  pickupDate?: string; // Ngày Lấy Hàng
  deliveryDate?: string; // Ngày Giao Hàng
  vehicleNumber?: string; // Số Xe Vận Chuyển
  driverFullName?: string; // Tài Xế
  phoneNumber?: string; // Số ĐT
  pickupWarehouse?: string; // Kho Lấy
  deliveryPoint?: string; // Tên Điểm Bán
  deliveryZone?: string; // Khu Vực
  crates?: number | null; // Thùng
  cbm?: number | null; // CBM
  notes?: string; // Ghi Chú
  vehicleType?: string; // Khung Xe
  pickupTimeNotes?: string; // Giờ Load Hàng
  deliveryTimeNotes?: string; // Giờ Yêu Cầu Giao
};
