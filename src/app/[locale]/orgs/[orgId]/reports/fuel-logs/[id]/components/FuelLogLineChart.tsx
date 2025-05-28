"use client";

import { ChartDataset, ScriptableContext } from "chart.js";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import colors from "tailwindcss/colors";

import { Card, CardContent, CardHeader, SkeletonDescriptionProperty } from "@/components/atoms";
import { DatePicker, LineChart, Loading } from "@/components/molecules";
import { getFuelLogDataChart } from "@/services/client/fuelLog";
import { getVehicleFuelConsumption } from "@/services/client/vehicle";
import { FuelLogInfo, VehicleInfo } from "@/types/strapi";
import { calculateDateDifferenceInYear, formatDate, parseDate } from "@/utils/date";

type FuelLogLineChartProps = {
  loading: boolean;
  organizationId: number;
  vehicleId: number;
  startDate: string | null;
  endDate: string | null;
};

const FuelLogLineChart = ({ loading, organizationId, vehicleId, startDate, endDate }: FuelLogLineChartProps) => {
  const t = useTranslations();

  const [fuelLogs, setFuelLogs] = useState<FuelLogInfo[]>([]);
  const [startDateValue, setStartDateValue] = useState<Date | null>(parseDate(startDate, t("common.format.date")));
  const [endDateValue, setEndDateValue] = useState<Date | null>(parseDate(endDate, t("common.format.date")));
  const [isLoading, setIsLoading] = useState(false);
  const [vehicle, setVehicle] = useState<VehicleInfo | undefined>(undefined);
  const [target, setTarget] = useState<number | undefined>(undefined);

  /**
   * Handler function to initialize vehicle data.
   * Fetches vehicle information by organizationId and vehicleId,
   * then sets the retrieved data to the 'vehicle' state.
   * This function is executed when organizationId or vehicleId changes.
   */
  const handlerInitDataVehicle = useCallback(async () => {
    if (!organizationId || !vehicleId) {
      return;
    }

    const result = await getVehicleFuelConsumption(organizationId, vehicleId);
    setVehicle(result);
  }, [organizationId, vehicleId]);

  /**
   * Handler function to initialize chart data.
   * Fetches fuel log data for the specified organization, vehicle, start date, and end date.
   * Sets the retrieved data to the 'fuelLogs' state and updates the loading state.
   * This function is executed when endDateValue, organizationId, startDateValue, or vehicle changes.
   */
  const handlerInitDataChart = useCallback(async () => {
    if (!organizationId || !vehicleId || !startDateValue || !endDateValue) {
      return;
    }
    setFuelLogs([]);
    setIsLoading(true);
    const result = await getFuelLogDataChart(organizationId, vehicleId, startDateValue, endDateValue);
    setFuelLogs(result);
    setIsLoading(false);
  }, [endDateValue, organizationId, startDateValue, vehicleId]);

  useEffect(() => {
    if (!loading) {
      handlerInitDataVehicle();
      handlerInitDataChart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => {
    handlerInitDataChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endDateValue, startDateValue]);

  const labelFormat = useMemo(() => {
    if (fuelLogs.length === 0) {
      return;
    }

    const fuelLogStartDate = fuelLogs[0].date;
    const fuelLogEndDate = fuelLogs[fuelLogs.length - 1].date;
    if (!fuelLogStartDate || !fuelLogEndDate) {
      return;
    }

    const hasDoubleDate = new Set(fuelLogs.map((fuelLog) => fuelLog.date)).size > 1;
    const isSameYear = calculateDateDifferenceInYear(fuelLogStartDate, fuelLogEndDate) === 0;
    if (isSameYear) {
      return hasDoubleDate ? t("common.format.datetime_no_year_no_second") : t("common.format.datetime_no_time");
    }

    return hasDoubleDate ? t("common.format.datetime_no_second") : t("common.format.date");
  }, [fuelLogs, t]);

  const labels = useMemo(() => fuelLogs.map(({ date }) => formatDate(date, labelFormat)), [fuelLogs, labelFormat]);

  const getGradient = useCallback((context: ScriptableContext<"line">, fuelConsumption: number) => {
    const chart = context.chart;
    const { ctx, chartArea } = chart;
    if (!chartArea) {
      return;
    }
    const minY = context.chart.scales.y.ticks[0].value;
    const maxY = context.chart.scales.y.ticks[context.chart.scales.y.ticks.length - 1].value;
    const lengthOy = maxY - minY;
    const valueColorStop = (fuelConsumption - minY) / lengthOy;

    let width: number | undefined;
    let height: number | undefined;
    let gradient: CanvasGradient | undefined;

    const chartWidth = chartArea.right - chartArea.left;
    const chartHeight = chartArea.bottom - chartArea.top;
    if (!gradient || width !== chartWidth || height !== chartHeight) {
      width = chartWidth;
      height = chartHeight;
      gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
      gradient.addColorStop(0, colors.green[400]);
      if (valueColorStop > 0 && valueColorStop < 1) {
        gradient.addColorStop(valueColorStop, colors.green[400]);
        gradient.addColorStop(valueColorStop, colors.orange[400]);
      }
      gradient.addColorStop(1, colors.orange[400]);
    }

    return gradient;
  }, []);

  const datasets = useMemo(() => {
    const data = fuelLogs.map(({ liters }) => liters || 0);

    const fuelConsumption = vehicle?.fuelConsumption || 0;
    setTarget(fuelConsumption === 0 ? undefined : fuelConsumption);

    const result: ChartDataset<"line">[] = [
      {
        label: t("report.fuel_log.chart_detail_note_fuel_consumption"),
        data: [],
        borderColor: colors.blue[300],
        pointRadius: 0,
        fill: false,
      },
      {
        label: t("report.fuel_log.chart_detail_note_fuel_lower"),
        data: [],
        borderColor: colors.green[400],
      },
      {
        label: t("report.fuel_log.chart_detail_note_fuel_hight"),
        data,
        borderColor: (context: ScriptableContext<"line">) => {
          return getGradient(context, fuelConsumption);
        },
        tension: 0.5,
        fill: false,
      },
    ];

    return result;
  }, [fuelLogs, getGradient, t, vehicle]);

  /**
   * Handler function to update start or end date values based on the specified type.
   * @param {string} type - The type of date to update ("startDate" or "endDate").
   * @param {Date | null} date - The selected date value.
   */
  const handleDateChange = useCallback(
    (type: string) => (date: Date | null) => {
      switch (type) {
        case "startDate":
          setStartDateValue(date);
          break;
        case "endDate":
          setEndDateValue(date);
          break;
        default:
          break;
      }
    },
    []
  );

  const actionHeader = useMemo(
    () => (
      <div className="flex justify-end gap-2">
        <div className="flex items-center gap-2">
          <span>{t("report.fuel_log.chart_detail_date_from")}</span>
          <DatePicker className="w-32" selected={startDateValue} onChange={handleDateChange("startDate")} />
        </div>

        <div className="flex items-center gap-2">
          <span>{t("report.fuel_log.chart_detail_date_to")}</span>
          <DatePicker className="w-32" selected={endDateValue} onChange={handleDateChange("endDate")} />
        </div>
      </div>
    ),
    [endDateValue, handleDateChange, startDateValue, t]
  );

  return (
    <Card>
      <CardHeader loading={loading} title={t("report.fuel_log.chart_detail_title")} actionComponent={actionHeader} />

      <CardContent>
        {loading ? (
          <SkeletonDescriptionProperty type="chart" size="long" />
        ) : (
          <div className="flex h-96 items-center justify-center">
            {isLoading && fuelLogs.length === 0 && <Loading size="large" />}

            {!isLoading && fuelLogs.length === 0 && (
              <div className="text-sm text-gray-500">{t("report.fuel_log.chart_detail_not_found")}</div>
            )}

            {!isLoading && fuelLogs.length !== 0 && (
              <LineChart
                options={{
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          let label = context.dataset.label || "";
                          const data = context.dataset.data;

                          if (data && data.length > 0) {
                            const currentValue = data[context.dataIndex];
                            if (Number(currentValue) < Number(vehicle?.fuelConsumption)) {
                              label = `${t("report.fuel_log.chart_detail_note_fuel_lower")}: ${currentValue}`;
                            } else {
                              label = `${t("report.fuel_log.chart_detail_note_fuel_hight")}: ${currentValue}`;
                            }
                          }
                          return label;
                        },
                      },
                    },
                    annotation: {
                      annotations: [
                        {
                          type: "line",
                          borderColor: colors.blue[300],
                          borderWidth: 3,
                          scaleID: "y",
                          value: target,
                        },
                      ],
                    },
                    legend: {
                      onClick: function (e) {
                        e.native?.stopPropagation();
                      },
                    },
                    datalabels: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                      title: {
                        display: true,
                        text: t("report.fuel_log.chart_detail_title_y"),
                        align: "end",
                      },
                    },
                    x: {
                      title: {
                        display: true,
                        text: t("report.fuel_log.chart_detail_title_x"),
                        align: "end",
                      },
                    },
                  },
                  maintainAspectRatio: false,
                }}
                labels={labels}
                datasets={datasets}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FuelLogLineChart;
