import {
  AccessLog,
  AddressInformation,
  AdministrativeUnit,
  Advance,
  BankAccount,
  Customer,
  CustomerGroup,
  CustomField,
  Driver,
  DriverExpense,
  DriverLicenseType,
  DriverReport,
  DriverReportDetail,
  DynamicAnalysis,
  DynamicAnalysisFilter,
  ExpenseType,
  FuelLog,
  GasStation,
  Maintenance,
  MaintenanceType,
  MerchandiseType,
  Notification,
  NotificationRecipient,
  Operation,
  Order,
  OrderGroup,
  OrderGroupStatus,
  OrderItem,
  OrderParticipant,
  OrderRouteStatus,
  OrderStatus,
  OrderTrip,
  OrderTripExpense,
  OrderTripMessage,
  OrderTripStatus,
  Organization,
  OrganizationInitialValue,
  OrganizationMember,
  OrganizationReport,
  OrganizationRole,
  OrganizationSetting,
  OrganizationSettingExtended,
  Resource,
  Route,
  RouteDriverExpense,
  RoutePoint,
  Setting,
  ShareObject,
  Subcontractor,
  Trailer,
  TrailerType,
  TripDriverExpense,
  UnitOfMeasure,
  UploadFile,
  User,
  UserDetail,
  UserGuide,
  UserLinkedAccount,
  UserSetting,
  Vehicle,
  VehicleGroup,
  VehicleTracking,
  VehicleType,
  Warehouse,
  Workflow,
  Zone,
} from "@prisma/client";

export type UserInfo = User & {
  detail: Partial<UserDetailInfo>;
  setting: Partial<UserSettingInfo>;
  linkedAccounts?: UserLinkedAccount[];
};

export type UserSettingInfo = UserSetting;

export type UserDetailInfo = UserDetail & {
  avatar?: Partial<UploadFile>;
  address: Partial<AddressInformationInfo>;
};

export type AddressInformationInfo = AddressInformation & {
  country?: Partial<AdministrativeUnit>;
  city?: Partial<AdministrativeUnit>;
  district?: Partial<AdministrativeUnit>;
  ward?: Partial<AdministrativeUnit>;
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type CustomerInfo = Customer & {
  user?: Partial<UserInfo>;
  bankAccount?: Partial<BankAccountInfo>;
  defaultUnit?: Partial<UnitOfMeasureInfo>;
  customerGroups?: Partial<CustomerGroupInfo>[];
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrganizationMemberInfo = OrganizationMember & {
  member: Partial<UserInfo>;
  role: Partial<OrganizationRoleInfo>;
  organization: Partial<OrganizationInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrganizationRoleInfo = OrganizationRole & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type SubcontractorInfo = Subcontractor & {
  user: Partial<UserInfo>;
  bankAccount: Partial<BankAccountInfo>;
  documents: Partial<UploadFile>[];
  member: Partial<UserInfo>;
  organization: Partial<OrganizationInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrganizationInfo = Organization & {
  logo?: Partial<UploadFile>;
  setting?: Partial<OrganizationSettingInfo>;
  dynamicAnalysis?: DynamicAnalysis[];
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type MerchandiseTypeInfo = MerchandiseType & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type ResourceInfo = Resource & {
  operations: Partial<OperationInfo>[];
};

export type OperationInfo = Operation & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type RoutePointInfo = RoutePoint & {
  address: Partial<AddressInformationInfo>;
  vehicleTypes: Partial<VehicleTypeInfo>[];
  adjacentPoints: Partial<RoutePointInfo>[];
  zone?: Partial<ZoneInfo>;
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type RouteInfo = Route & {
  pickupPoints: Partial<RoutePointInfo>[];
  deliveryPoints: Partial<RoutePointInfo>[];
  driverExpenses: Partial<RouteDriverExpenseInfo>[];
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrderStatusInfo = OrderStatus & {
  order: Partial<OrderInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrderRouteStatusInfo = OrderRouteStatus & {
  order: Partial<OrderInfo>;
  routePoint: Partial<RoutePointInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type ShareObjectInfo = ShareObject & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type AccessLogInfo = AccessLog & {
  createdByUser: Partial<UserInfo>;
};

export type OrderInfo = Order & {
  customer: Partial<CustomerInfo>;
  route: Partial<RouteInfo>;
  routeStatuses: Partial<OrderRouteStatusInfo>[];
  items: Partial<OrderItemInfo>[];
  merchandiseTypes: Partial<MerchandiseTypeInfo>[];
  unit: Partial<UnitOfMeasureInfo>;
  participants: Partial<OrderParticipantInfo>[];
  trips: Partial<OrderTripInfo>[];
  statuses: Partial<OrderStatusInfo>[];
  group: Partial<OrderGroupInfo>;
  processForGroups: Partial<OrderGroupInfo>[];
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrderItemInfo = OrderItem & {
  merchandiseType: Partial<MerchandiseTypeInfo>;
  order: Partial<OrderInfo>;
};

export type VehicleTypeInfo = VehicleType & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type MaintenanceTypeInfo = MaintenanceType & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type TrailerTypeInfo = TrailerType & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type DriverReportInfo = DriverReport & {
  reportDetails: Partial<DriverReportDetailInfo>[];
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type DriverReportDetailInfo = DriverReportDetail;

export type WorkflowInfo = Workflow & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
  driverReports: Partial<DriverReportInfo>[];
};

export type CustomFieldInfo = CustomField & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type UnitOfMeasureInfo = UnitOfMeasure & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type DriverLicenseTypeInfo = DriverLicenseType & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type SettingInfo = Setting & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type BankAccountInfo = BankAccount & {
  createdByUser?: UserInfo;
  updatedByUser?: UserInfo;
};

export type OrderTripStatusInfo = OrderTripStatus & {
  trip: Partial<OrderTripInfo>;
  driverReport: Partial<DriverReportInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrderTripInfo = OrderTrip & {
  order: Partial<OrderInfo>;
  driver?: Partial<DriverInfo>;
  vehicle?: Partial<VehicleInfo>;
  workflow?: Partial<WorkflowInfo>;
  statuses: Partial<OrderTripStatusInfo>[];
  billOfLadingImages: Partial<UploadFile>[];
  messages: Partial<OrderTripMessageInfo>[];
  expenses?: Partial<OrderTripExpenseInfo>[];
  driverExpenses: Partial<TripDriverExpenseInfo>[];
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type AdvanceInfo = Advance & {
  driver?: Partial<DriverInfo>;
  subcontractor?: Partial<SubcontractorInfo>;
  order?: Partial<OrderInfo>;
  orderTrip?: Partial<OrderTripInfo>;
  paymentBy?: Partial<UserInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type TrailerInfo = Trailer & {
  type: Partial<TrailerTypeInfo>;
  images: Partial<UploadFile>[] | null;
  registrationCertificate: Partial<UploadFile>[] | null;
  technicalSafetyCertificate: Partial<UploadFile>[] | null;
  liabilityInsuranceCertificate: Partial<UploadFile>[] | null;
  vehicle: Partial<VehicleInfo>;
  createdByUser: UserInfo;
  updatedByUser: UserInfo;
};

export type OrderParticipantInfo = OrderParticipant & {
  user?: Partial<UserInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type DriverInfo = Driver & {
  licenseType: Partial<DriverLicenseTypeInfo>;
  licenseFrontImage: Partial<UploadFile>;
  licenseBackImage: Partial<UploadFile>;
  contractDocuments: Partial<UploadFile>[];
  bankAccount: Partial<BankAccountInfo>;
  address: Partial<AddressInformationInfo>;
  user?: Partial<UserInfo>;
  vehicle?: Partial<VehicleInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type VehicleInfo = Vehicle & {
  images: Partial<UploadFile>[] | null;
  registrationCertificate: Partial<UploadFile>[] | null;
  technicalSafetyCertificate: Partial<UploadFile>[] | null;
  liabilityInsuranceCertificate: Partial<UploadFile>[] | null;
  type: Partial<VehicleTypeInfo>;
  driver: Partial<DriverInfo>;
  trailer: Partial<TrailerInfo>;
  vehicleGroups?: Partial<VehicleGroup>[];
  vehicleTracking: Partial<VehicleTrackingInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type VehicleTrackingInfo = VehicleTracking & {
  vehicle: Partial<VehicleInfo>;
};

export type MaintenanceInfo = Maintenance & {
  costBearer: Partial<UserInfo>;
  vehicle: Partial<VehicleInfo>;
  trailer: Partial<TrailerInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
  maintenanceType: Partial<MaintenanceTypeInfo>;
};

export type OrganizationReportInfo = OrganizationReport & {
  template: Partial<UploadFile>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrderTripMessageInfo = OrderTripMessage & {
  trip?: Partial<OrderTripInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
  attachments: Partial<UploadFile>[];
  readByUsers: Partial<UserInfo>[];
};

export type NotificationRecipientInfo = NotificationRecipient & {
  user: Partial<UserInfo>;
  notification: Partial<NotificationInfo>;
};

export type NotificationInfo = Notification & {
  recipients: Partial<NotificationRecipientInfo>[];
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrganizationSettingInfo = OrganizationSetting & {
  members: Partial<OrganizationMemberInfo>[];
  extended: Partial<OrganizationSettingExtended>;
  salaryNoticeStep: Partial<DriverReportInfo>;
};

export type GasStationInfo = GasStation & {
  address: Partial<AddressInformationInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type DriverExpenseInfo = DriverExpense & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type TripDriverExpenseInfo = TripDriverExpense & {
  trip: Partial<OrderTripInfo>;
  driverExpense: Partial<DriverExpenseInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type RouteDriverExpenseInfo = RouteDriverExpense & {
  route: Partial<RouteInfo>;
  driverExpense: Partial<DriverExpenseInfo>;
};

export type FuelLogInfo = FuelLog & {
  vehicle: Partial<VehicleInfo>;
  driver: Partial<DriverInfo>;
  gasStation: Partial<GasStationInfo>;
  fuelMeterImage?: Partial<UploadFile>;
  odometerImage?: Partial<UploadFile>;
  confirmationBy?: Partial<UserInfo>;
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type VehicleGroupInfo = VehicleGroup & {
  manager: Partial<OrganizationMemberInfo>;
  vehicles: Partial<VehicleInfo>[];
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type CustomerGroupInfo = CustomerGroup & {
  manager: Partial<OrganizationMemberInfo>;
  customers: Partial<CustomerInfo>[];
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type OrganizationSettingExtendedInfo = OrganizationSettingExtended & {
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type DynamicAnalysisFilterInfo = DynamicAnalysisFilter & {
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type DynamicAnalysisInfo = DynamicAnalysis & {
  template?: Partial<File>;
  organizations?: Partial<OrganizationInfo>[];
  resource?: Partial<ResourceInfo>;
  filters?: Partial<DynamicAnalysisFilterInfo>[];
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type UserGuideInfo = UserGuide & {
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type ExpenseTypeInfo = ExpenseType & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrderTripExpenseInfo = OrderTripExpense & {
  expenseType: Partial<ExpenseTypeInfo>;
  trip: Partial<OrderTripInfo>;
  documents?: Partial<UploadFile>[];
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrganizationInitialValueInfo = OrganizationInitialValue & {
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrderGroupStatusInfo = OrderGroupStatus & {
  group: Partial<OrderGroupInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type OrderGroupInfo = OrderGroup & {
  orders: Partial<OrderInfo>[];
  statuses: Partial<OrderGroupStatusInfo>[];
  processByOrder: Partial<OrderInfo>;
  warehouse: Partial<WarehouseInfo>;
  createdByUser: Partial<UserInfo>;
  updatedByUser: Partial<UserInfo>;
};

export type ZoneInfo = Zone & {
  parent?: Partial<ZoneInfo>;
  children?: Partial<ZoneInfo>[];
  adjacentZones?: Partial<ZoneInfo>[];
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};

export type WarehouseInfo = Warehouse & {
  address: Partial<RoutePointInfo>;
  createdByUser?: Partial<UserInfo>;
  updatedByUser?: Partial<UserInfo>;
};
