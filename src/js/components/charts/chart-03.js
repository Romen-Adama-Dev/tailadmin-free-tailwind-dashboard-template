import ApexCharts from "apexcharts";

let chartInstance;

const chart03 = (dataset = { categories: [], created: [], resolved: [] }) => {
  const chartSelector = document.querySelector("#chartThree");

  if (!chartSelector) {
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new ApexCharts(chartSelector, {
    series: [
      {
        name: "Creados",
        data: dataset.created,
      },
      {
        name: "Resueltos",
        data: dataset.resolved,
      },
    ],
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    colors: ["#465FFF", "#12B76A"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      toolbar: { show: false },
    },
    fill: {
      gradient: {
        enabled: true,
        opacityFrom: 0.35,
        opacityTo: 0,
      },
    },
    stroke: {
      curve: "straight",
      width: ["2", "2"],
    },
    markers: { size: 0 },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: "category",
      categories: dataset.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: false,
    },
    yaxis: {
      title: {
        style: { fontSize: "0px" },
      },
    },
  });

  chartInstance.render();
};

export default chart03;
