import { useSelector } from "react-redux";

import { State } from "@/redux/reducers";

const useAppState = () => useSelector((state: State) => state.app);
const useOrganizationMembersState = () => useSelector((state: State) => state.organizationMember);
const useDriverReportState = () => useSelector((state: State) => state.driverReport);
const useMaintenanceTypeState = () => useSelector((state: State) => state.maintenanceType);
const useMerchandiseTypeState = () => useSelector((state: State) => state.merchandiseType);
const useUnitOfMeasureState = () => useSelector((state: State) => state.unitOfMeasure);
const useAdvanceState = () => useSelector((state: State) => state.advance);

const useTrailerTypeState = () => useSelector((state: State) => state.trailerType);
const useVehicleTypeState = () => useSelector((state: State) => state.vehicleType);
const useCustomerState = () => useSelector((state: State) => state.customer);
const useCustomFieldState = () => useSelector((state: State) => state.customField);
const useDriverLicenseTypeState = () => useSelector((state: State) => state.driverLicenseType);
const useTrailerState = () => useSelector((state: State) => state.trailer);
const useMaintenanceState = () => useSelector((state: State) => state.maintenance);
const useVehicleState = () => useSelector((state: State) => state.vehicle);
const useSubcontractorState = () => useSelector((state: State) => state.subcontractor);
const useDriverState = () => useSelector((state: State) => state.driver);
const useRouteState = () => useSelector((state: State) => state.route);
const useOrderState = () => useSelector((state: State) => state.order);
const useDriverSalaryState = () => useSelector((state: State) => state.driverSalary);
const useSubcontractorCostState = () => useSelector((state: State) => state.subcontractorCost);
const useNotificationState = () => useSelector((state: State) => state.notification);
const useGasStationState = () => useSelector((state: State) => state.gasStation);
const useDriverExpenseState = () => useSelector((state: State) => state.driverExpense);
const useFuelLogState = () => useSelector((state: State) => state.fuelLog);
const useOrderMonitoringState = () => useSelector((state: State) => state.orderMonitoring);
const useVehicleGroupState = () => useSelector((state: State) => state.vehicleGroup);
const useCustomerGroupState = () => useSelector((state: State) => state.customerGroup);
const useCustomerReportState = () => useSelector((state: State) => state.customerReport);
const useMonitoringVehicleState = () => useSelector((state: State) => state.monitoringVehicle);

export {
  useAdvanceState,
  useAppState,
  useCustomerGroupState,
  useCustomerReportState,
  useCustomerState,
  useCustomFieldState,
  useDriverExpenseState,
  useDriverLicenseTypeState,
  useDriverReportState,
  useDriverSalaryState,
  useDriverState,
  useFuelLogState,
  useGasStationState,
  useMaintenanceState,
  useMaintenanceTypeState,
  useMerchandiseTypeState,
  useMonitoringVehicleState,
  useNotificationState,
  useOrderMonitoringState,
  useOrderState,
  useOrganizationMembersState,
  useRouteState,
  useSubcontractorCostState,
  useSubcontractorState,
  useTrailerState,
  useTrailerTypeState,
  useUnitOfMeasureState,
  useVehicleGroupState,
  useVehicleState,
  useVehicleTypeState,
};
