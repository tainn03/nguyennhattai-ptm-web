import { ChartDataset } from "chart.js";
import { useTranslations } from "next-intl";
import { useRouter } from "next-intl/client";
import React, { useCallback, useMemo, useState } from "react";
import colors from "tailwindcss/colors";

import { SkeletonChart } from "@/components/atoms";
import { BarChart } from "@/components/molecules";
import { AnyObject } from "@/types";
import { FilterOptions } from "@/types/filter";
import { FuelLogInfo } from "@/types/strapi";
import { getFullName } from "@/utils/auth";
import { formatDate } from "@/utils/date";
import { encryptId } from "@/utils/security";

type FuelLogsBarChartProps = {
  orgLink: string;
  filterOptions: FilterOptions;
  isLoading: boolean;
  fuelLogs: FuelLogInfo[];
};

const FuelLogsBarChart = ({ orgLink, filterOptions, isLoading, fuelLogs }: FuelLogsBarChartProps) => {
  const t = useTranslations();
  const router = useRouter();
  const [dataTooltip, setDataTooltip] = useState<Array<AnyObject>>([{}]);

  const labelFormat = useMemo(
    () => [...new Set(fuelLogs.map(({ vehicle }) => vehicle.vehicleNumber || ""))],
    [fuelLogs]
  );

  const dataFuelLog: ChartDataset<"bar">[] = useMemo(() => {
    const dataLow: number[] = [];
    const dataMedium: number[] = [];
    const dataHight: number[] = [];

    labelFormat.map((label) => {
      const relevantLogs = fuelLogs.filter((item) => item.vehicle.vehicleNumber === label);

      const data = relevantLogs.map(({ liters }) => liters || 0);

      const max = Math.max(...data);
      const min = Math.min(...data);
      const medium = relevantLogs.reduce((prev, item) => prev + (item.liters || 0), 0) / relevantLogs.length;
      const fuelConsumption = relevantLogs[0].vehicle.fuelConsumption || 0;

      const labelExists = (dataTooltip || []).some((item) => item.label === label);
      if (!labelExists) {
        setDataTooltip((prevDataTooltip) => [
          ...prevDataTooltip,
          {
            label,
            value: {
              max,
              min,
              medium,
              fuelConsumption,
            },
          },
        ]);
      }

      if (medium > fuelConsumption) {
        dataLow.push(0);
        dataHight.push(medium - fuelConsumption);
      } else {
        dataLow.push(fuelConsumption - medium);
        dataHight.push(0);
      }
      dataMedium.push(fuelConsumption);
    });

    const result: ChartDataset<"bar">[] = [
      {
        label: t("report.fuel_log.chart_list_title_consumption"),
        data: dataMedium,
        backgroundColor: colors.blue[300],
      },
      {
        label: t("report.fuel_log.chart_list_title_lower"),
        data: dataLow,
        backgroundColor: colors.orange[200],
      },
      {
        label: t("report.fuel_log.chart_list_title_hight"),
        data: dataHight,
        backgroundColor: colors.orange[400],
      },
    ];

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuelLogs, labelFormat, t]);

  /**
   * Handles the click event on the chart, navigates to the fuel log details page.
   *
   * @param {string} label - The label (vehicle number) associated with the clicked chart element.
   */
  const handleClickChart = useCallback(
    (label: string) => {
      const fuelLog = [...fuelLogs].find(({ vehicle }) => vehicle.vehicleNumber === label);
      if (fuelLog) {
        router.push(
          `${orgLink}/reports/fuel-logs/${encryptId(Number(fuelLog.id))}?startDate=${formatDate(
            filterOptions.startDate.filters[0].value as Date,
            t("common.format.date")
          )}&endDate=${formatDate(filterOptions.endDate.filters[0].value as Date, t("common.format.date"))}`
        );
      }
    },
    [fuelLogs, router, orgLink, filterOptions, t]
  );

  return (
    <>
      {isLoading && fuelLogs.length === 0 && <SkeletonChart />}

      {!isLoading && fuelLogs.length !== 0 && (
        <BarChart
          options={{
            plugins: {
              tooltip: {
                displayColors: false,
                callbacks: {
                  label: function (context) {
                    const label = context.label || "";

                    const data = (dataTooltip || []).find((item: AnyObject) => item.label === label);
                    if (!data) {
                      return;
                    }
                    const { min, max, medium, fuelConsumption } = data.value;
                    return [
                      `${t("report.fuel_log.chart_list_tooltip_title_consumption")}: ${fuelConsumption}`,
                      `- ${t("report.fuel_log.chart_list_tooltip_title_lower")}: ${min}`,
                      `- ${t("report.fuel_log.chart_list_tooltip_title_hight")}: ${max}`,
                      `- ${t("report.fuel_log.chart_list_tooltip_title_medium")}: ${
                        medium % 1 === 0 ? medium : medium.toFixed(1)
                      }`,
                    ];
                  },
                  title: function (context) {
                    const label = context[0].label || "";
                    const fuelLog = [...fuelLogs].reverse().find(({ vehicle }) => vehicle.vehicleNumber === label);
                    return `${t("report.fuel_log.chart_list_tooltip_title")}: ${label} (${getFullName(
                      fuelLog?.driver?.firstName,
                      fuelLog?.driver?.lastName
                    )})`;
                  },
                },
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
            onClick: (_event, elements) => {
              if (elements.length > 0) {
                handleClickChart(labelFormat[elements[0].index]);
              }
            },
            responsive: true,
            scales: {
              x: {
                stacked: true,
                title: {
                  display: true,
                  text: t("report.fuel_log.chart_list_x"),
                  align: "end",
                },
              },
              y: {
                stacked: true,
                title: {
                  display: true,
                  text: t("report.fuel_log.chart_list_y"),
                  align: "end",
                },
              },
            },
            maintainAspectRatio: false,
          }}
          labels={labelFormat}
          datasets={dataFuelLog}
        />
      )}
    </>
  );
};

export default FuelLogsBarChart;
