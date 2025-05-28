import { ChartDataset } from "chart.js";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import colors from "tailwindcss/colors";

import { SkeletonChart } from "@/components/atoms";
import { BarChart } from "@/components/molecules";
import { AnyObject } from "@/types";
import { FuelLogInfo } from "@/types/strapi";

type GasStationsBarChartProps = {
  isLoading: boolean;
  fuelLogs: FuelLogInfo[];
  labelFormat: string[];
  onColumnClick: (gasStationId: number) => void;
};

const GasStationsBarChart = ({ isLoading, fuelLogs, labelFormat, onColumnClick }: GasStationsBarChartProps) => {
  const t = useTranslations();
  const [dataTooltip, setDataTooltip] = useState<Array<AnyObject>>([{}]);

  const dataGasStation: ChartDataset<"bar">[] = useMemo(() => {
    const data: number[] = [];

    labelFormat.map((label) => {
      const relevantLogs = fuelLogs.filter((item) => item.gasStation.name === label);

      let totalLiters = 0;
      for (const item of relevantLogs) {
        totalLiters += Number(item.liters);
      }

      const labelExists = (dataTooltip || []).some((item) => item.label === label);
      if (!labelExists) {
        setDataTooltip((prevDataTooltip) => [
          ...prevDataTooltip,
          {
            label,
            value: {
              totalLiters,
            },
          },
        ]);
      }

      data.push(totalLiters);
    });

    const result: ChartDataset<"bar">[] = [
      { data, backgroundColor: colors.blue[500], label: t("report.fuel_log.gas_station_chart.label") },
    ];
    return result;
  }, [dataTooltip, fuelLogs, labelFormat, t]);

  /**
   * Handles the click event on the chart, navigates to the fuel log details page.
   *
   * @param {string} label - The label (vehicle number) associated with the clicked chart element.
   */
  const handleClickColumn = useCallback(
    (label: string) => {
      const fuelLog = fuelLogs.find((item) => item.gasStation.name === label);
      fuelLog && onColumnClick(Number(fuelLog.gasStation.id));
    },
    [fuelLogs, onColumnClick]
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
                    const { totalLiters } = data.value;
                    return [t("report.fuel_log.gas_station_chart.column_label", { liters: totalLiters })];
                  },
                  title: function (context) {
                    const label = context[0].label || "";
                    return t("report.fuel_log.gas_station_chart.column_title", { gasStationName: label });
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
                handleClickColumn(labelFormat[elements[0].index]);
              }
            },
            responsive: true,
            scales: {
              x: {
                stacked: true,
                title: {
                  display: true,
                  text: t("report.fuel_log.gas_station_chart.x_name"),
                  align: "end",
                },
              },
              y: {
                stacked: true,
                title: {
                  display: true,
                  text: t("report.fuel_log.gas_station_chart.y_name"),
                  align: "end",
                },
              },
            },
            maintainAspectRatio: false,
          }}
          labels={labelFormat}
          datasets={dataGasStation}
        />
      )}
    </>
  );
};

export default GasStationsBarChart;
