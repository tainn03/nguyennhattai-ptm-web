export type LatestVehicleLocationParams = {
  organizationId: number;
  vehicleIds?: number[];
  startDate: string;
  endDate: string;
};

export type VehiclesByStatusResponse = {
  id: string;
  vehicleNumber: string;
  firstName: string;
  lastName: string;
  driverReportType: string;
  driverReportId: string;
  driverReportName: string;
  displayOrder: string;
  isFree: string;
};

export type LatestVehicleLocationResponse = {
  id: string;
  vehicleNumber: string;
  latitude: string;
  longitude: string;
  address: string;
  carStatus: string;
  speed: string;
  instantFuel: string;
  orderTripId: string;
  orderTripCode: string;
  routeCode: string;
  routeName: string;
  weight: string;
  unitOfMeasureCode: string;
  pickupDate: string;
  deliveryDate: string;
  orderId: string;
  orderCode: string;
  driverReportId: string;
  driverReportType: string;
  driverReportName: string;
  driverId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  avatarObj: string;
};

export type DetailLatestVehicleLocationParams = Pick<
  LatestVehicleLocationResponse,
  "driverId" | "driverReportId" | "id"
> & {
  orderTripId: string;
};

export type DetailLatestVehicleLocationResponse = {
  vehicleNumber: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  orderCode: string;
  orderTripId: string;
  orderTripCode: string;
  driverReportType: string;
  driverReportName: string;
  customerName: string;
  routeName: string;
  isFree: string;

  latitude: string; // TODO: DAT
  longitude: string; // TODO: DAT
};
