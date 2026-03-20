import ApexCharts from "apexcharts";

let chartInstance;

const chart01 = (dataset = { categories: [], data: [] }) => {
  const chartSelector = document.querySelector("#chartOne");

  if (!chartSelector) {
    return;
  }

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new ApexCharts(chartSelector, {
    series: [
      {
        name: "Pedidos",
        data: dataset.data,
      },
    ],
    colors: ["#465FFF"],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 220,
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        borderRadius: 5,
        columnWidth: "42%",
      },
    },
    dataLabels: { enabled: false },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
    },
    xaxis: {
      categories: dataset.categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { title: false },
    grid: {
      yaxis: { lines: { show: true } },
    },
  });

  chartInstance.render();
};

export default chart01;
