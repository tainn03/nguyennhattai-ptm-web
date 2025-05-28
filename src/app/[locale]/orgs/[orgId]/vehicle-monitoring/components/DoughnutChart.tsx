import { ArcElement, Chart, DoughnutController, Legend, Tooltip } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";

import { AnyObject } from "@/types";
import { getStatusColor, tripSteps } from "@/utils/prototype";

Chart.register(ArcElement, DoughnutController, Legend, Tooltip, ChartDataLabels);

type DoughnutChartProps = {
  trips: AnyObject[];
};

const DoughnutChart = ({ trips }: DoughnutChartProps) => {
  const t = useTranslations();
  const { labels, data, totalTrips, backgroundColors } = useMemo(() => {
    const statusCount = trips.reduce(
      (acc, trip) => {
        const status = trip.lastStatusType;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const filteredSteps = tripSteps.filter((step) => statusCount[step.value] > 0);

    const labels = filteredSteps.map((step) => step.label);
    const data = filteredSteps.map((step) => statusCount[step.value]);
    const backgroundColors = filteredSteps.map((step) => getStatusColor(step.value));
    const totalTrips = data.reduce((sum, count) => sum + count, 0);

    return { labels, data, backgroundColors, totalTrips };
  }, [trips]);

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: backgroundColors,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        display: true,
        color: "white",
        formatter: (value: number) => value,
      },
    },
    cutout: "50%",
  };

  return (
    <div className="relative flex h-full w-full gap-x-4">
      <div className="relative flex h-48 w-48 flex-shrink-0 items-center justify-center">
        <Doughnut data={chartData} options={options} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-center text-lg font-semibold text-gray-700">
            {totalTrips}
            <br />
            {t("vehicle_monitoring.trip")}
          </span>
        </div>
      </div>
      <div className="flex flex-1  flex-col justify-center">
        {tripSteps.map((step, index) => (
          <div key={index} className="mb-1 flex items-center justify-start">
            <span
              className="mr-2 h-2 w-2 max-w-[8px] flex-shrink-0"
              style={{ backgroundColor: getStatusColor(step.value) }}
            />
            <span className="flex-1 text-xs text-gray-500">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoughnutChart;
