"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  ChartDataset,
  ChartOptions,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import ChartAnnotation from "chartjs-plugin-annotation";
import { useMemo } from "react";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ChartAnnotation);

type LineChartProps = {
  labels: string[];
  datasets: ChartDataset<"line">[];
  options?: ChartOptions<"line">;
};

const LineChart = ({ labels, datasets, options }: LineChartProps) => {
  const defaultOptions = useMemo(
    () => ({
      responsive: true,
      plugins: {
        title: {
          display: false,
        },
      },
      ...options,
    }),
    [options]
  );

  const data = useMemo(
    () => ({
      labels,
      datasets,
    }),
    [datasets, labels]
  );

  return <Line options={defaultOptions} data={data} />;
};

export default LineChart;
