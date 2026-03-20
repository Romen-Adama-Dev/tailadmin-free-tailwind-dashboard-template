import ApexCharts from "apexcharts";

let chartInstance;

const chart02 = (dataset = { completionRate: 0 }) => {
  const chartSelector = document.querySelector("#chartTwo");

  if (!chartSelector) {
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new ApexCharts(chartSelector, {
    series: [dataset.completionRate],
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "radialBar",
      height: 330,
      sparkline: { enabled: true },
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: { size: "80%" },
        track: {
          background: "#E4E7EC",
          strokeWidth: "100%",
          margin: 5,
        },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "36px",
            fontWeight: "600",
            offsetY: 60,
            color: "#1D2939",
            formatter: (value) => `${Math.round(value)}%`,
          },
        },
      },
    },
    fill: {
      type: "solid",
      colors: ["#465FFF"],
    },
    stroke: {
      lineCap: "round",
    },
    labels: ["Resolucion"],
  });

  chartInstance.render();
};

export default chart02;
