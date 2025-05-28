import { combineReducers } from "redux";

import advanceReducer from "./advanceReducer";
import appReducer from "./appReducer";
import customerGroupReducer from "./customerGroupReducer";
import customerReducer from "./customerReducer";
import customerReportReducer from "./customerReport";
import customFieldReducer from "./customFieldReducer";
import driverExpenseReducer from "./driverExpenseReducer";
import driverLicenseTypeReducer from "./driverLicenseTypeReducer";
import driverReducer from "./driverReducer";
import driverReportReducer from "./driverReportReducer";
import driverSalaryReducer from "./driverSalaryReducer";
import fuelLogReducer from "./fuelLogReducer";
import gasStationReducer from "./gasStationReducer";
import maintenanceReducer from "./maintenanceReducer";
import maintenanceTypeReducer from "./maintenanceTypeReducer";
import merchandiseTypeReducer from "./merchandiseTypeReducer";
import MonitoringVehicleReducer from "./monitoringVehicleReducer";
import notificationReducer from "./notificationReducer";
import orderMonitoringReducer from "./orderMonitoringReducer";
import orderReducer from "./orderReducer";
import organizationMemberReducer from "./organizationMemberReducer";
import routeReducer from "./routeReducer";
import subcontractorCostReducer from "./subcontractorCostReducer";
import subcontractorReducer from "./subcontractorReducer";
import trailerReducer from "./trailerReducer";
import trailerTypeReducer from "./trailerTypeReducer";
import unitOfMeasureReducer from "./unitOfMeasureReducer";
import vehicleGroupReducer from "./vehicleGroupReducer";
import vehicleReducer from "./vehicleReducer";
import vehicleTypeReducer from "./vehicleTypeReducer";

export type State = {
  app: ReturnType<typeof appReducer>;
  organizationMember: ReturnType<typeof organizationMemberReducer>;
  driverReport: ReturnType<typeof driverReportReducer>;
  maintenanceType: ReturnType<typeof maintenanceTypeReducer>;
  merchandiseType: ReturnType<typeof merchandiseTypeReducer>;
  unitOfMeasure: ReturnType<typeof unitOfMeasureReducer>;
  maintenance: ReturnType<typeof maintenanceReducer>;
  advance: ReturnType<typeof advanceReducer>;
  trailerType: ReturnType<typeof trailerTypeReducer>;
  vehicleType: ReturnType<typeof vehicleTypeReducer>;
  customer: ReturnType<typeof customerReducer>;
  customField: ReturnType<typeof customFieldReducer>;
  driverLicenseType: ReturnType<typeof driverLicenseTypeReducer>;
  trailer: ReturnType<typeof trailerReducer>;
  vehicle: ReturnType<typeof vehicleReducer>;
  subcontractor: ReturnType<typeof subcontractorReducer>;
  driver: ReturnType<typeof driverReducer>;
  route: ReturnType<typeof routeReducer>;
  order: ReturnType<typeof orderReducer>;
  driverSalary: ReturnType<typeof driverSalaryReducer>;
  subcontractorCost: ReturnType<typeof subcontractorCostReducer>;
  notification: ReturnType<typeof notificationReducer>;
  gasStation: ReturnType<typeof gasStationReducer>;
  driverExpense: ReturnType<typeof driverExpenseReducer>;
  fuelLog: ReturnType<typeof fuelLogReducer>;
  orderMonitoring: ReturnType<typeof orderMonitoringReducer>;
  vehicleGroup: ReturnType<typeof vehicleGroupReducer>;
  customerGroup: ReturnType<typeof customerGroupReducer>;
  customerReport: ReturnType<typeof customerReportReducer>;
  monitoringVehicle: ReturnType<typeof MonitoringVehicleReducer>;
};

const reducers = combineReducers({
  app: appReducer,
  organizationMember: organizationMemberReducer,
  driverReport: driverReportReducer,
  maintenanceType: maintenanceTypeReducer,
  merchandiseType: merchandiseTypeReducer,
  unitOfMeasure: unitOfMeasureReducer,
  maintenance: maintenanceReducer,
  advance: advanceReducer,
  trailerType: trailerTypeReducer,
  vehicleType: vehicleTypeReducer,
  customer: customerReducer,
  customField: customFieldReducer,
  driverLicenseType: driverLicenseTypeReducer,
  trailer: trailerReducer,
  vehicle: vehicleReducer,
  subcontractor: subcontractorReducer,
  driver: driverReducer,
  route: routeReducer,
  order: orderReducer,
  driverSalary: driverSalaryReducer,
  subcontractorCost: subcontractorCostReducer,
  notification: notificationReducer,
  gasStation: gasStationReducer,
  driverExpense: driverExpenseReducer,
  fuelLog: fuelLogReducer,
  orderMonitoring: orderMonitoringReducer,
  vehicleGroup: vehicleGroupReducer,
  customerGroup: customerGroupReducer,
  customerReport: customerReportReducer,
  monitoringVehicle: MonitoringVehicleReducer,
});

export default reducers;
