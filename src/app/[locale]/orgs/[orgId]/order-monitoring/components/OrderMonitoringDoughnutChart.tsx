import { ArcElement, Chart, DoughnutController } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { useEffect, useRef } from "react";
import { Doughnut } from "react-chartjs-2";

import { AnyObject } from "@/types";

type DataChart = {
  title: string;
  labels: string[];
  backgroundColor: string[];
  values: number[];
  textCenter: string;
  width?: number;
  height?: number;
};

Chart.register(DoughnutController, ChartDataLabels, ArcElement);

const OrderMonitoringDoughnutChart = ({
  title,
  labels,
  backgroundColor,
  values,
  textCenter,
  width,
  height,
}: DataChart) => {
  const totalRef = useRef<number>(0);

  // Calculate the total value whenever the values array changes
  useEffect(() => {
    totalRef.current = values.reduce((total, value) => total + Number(value), 0);
  }, [values]);

  return (
    values.length > 0 && (
      <div className="flex items-center">
        <Doughnut
          width={width}
          height={height}
          data={{
            labels: labels,
            datasets: [
              {
                label: title,
                backgroundColor: backgroundColor,
                data: values,
              },
            ],
          }}
          options={{
            responsive: false,
            layout: {
              padding: {
                top: 0,
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              title: {
                display: false,
              },
              datalabels: {
                color: "white", // Set the color of the text
                display: (context: AnyObject) => {
                  // Control the display of labels based on your conditions
                  return context.dataset.data[context.dataIndex] > 0; // Display label if data value is greater than 10
                },
                font: { size: 16 },
              } as AnyObject,
              tooltip: { mode: "index", intersect: true, position: "average" },
            },
            cutout: "50%", // Adjust the cutout to create a hole in the center
            animation: {
              loop: false,
            },
          }}
          plugins={[
            {
              id: "customPlugin", // Add the 'id' property
              afterDraw: (chart) => {
                const { ctx } = chart;

                ctx.save();

                // Set globalCompositeOperation to draw the tooltip over the label center
                ctx.globalCompositeOperation = "destination-over";

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // Get position center point
                const xCoor = chart.getDatasetMeta(0).data[0]?.x ?? 0;
                const yCoor = chart.getDatasetMeta(0).data[0]?.y ?? 0;

                // Handle render title text center
                ctx.font = "bold 20px Arial"; // Adjust the font size and family
                ctx.fillText(totalRef.current.toString(), xCoor, yCoor);

                // Handle render value text center
                ctx.font = "12px Arial"; // Adjust the font size and family
                ctx.fillText(textCenter, xCoor, yCoor + 20); // Move down 25px

                ctx.restore();
                ctx.save();
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.restore();
              },
            },
          ]}
        />
      </div>
    )
  );
};

export default OrderMonitoringDoughnutChart;
