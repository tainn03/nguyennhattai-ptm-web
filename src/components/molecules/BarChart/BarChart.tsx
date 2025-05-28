"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartDataset,
  ChartOptions,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { useMemo } from "react";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type BarChartProps = {
  labels: string[];
  datasets: ChartDataset<"bar">[];
  options?: ChartOptions<"bar">;
  orientation?: "horizontal" | "vertical";
};

const BarChart = ({ labels, datasets, options, orientation = "vertical" }: BarChartProps) => {
  const defaultOptions = useMemo(
    () => ({
      ...(orientation === "horizontal" && {
        indexAxis: "y" as const,
      }),
      responsive: true,
      plugins: {
        title: {
          display: true,
        },
      },
      ...options,
    }),
    [options, orientation]
  );

  const data = useMemo(
    () => ({
      labels,
      datasets,
    }),
    [datasets, labels]
  );

  return <Bar options={defaultOptions} data={data} />;
};

export default BarChart;
