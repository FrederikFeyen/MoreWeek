'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { WeatherData } from '../lib/weather';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface WeatherChartProps {
  data: WeatherData;
}

export default function WeatherChart({ data }: WeatherChartProps) {
  const labels = data.daily.time.map(t => new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }));

  const chartData: ChartData<'line' | 'bar'> = {
    labels,
    datasets: [
      {
        type: 'line' as const,
        label: 'Max Temp (°C)',
        data: data.daily.temperature_2m_max,
        borderColor: '#ff4d4f',
        backgroundColor: 'rgba(255, 77, 79, 0.5)',
        yAxisID: 'y-temp',
        tension: 0.3,
        fill: false,
      },
      {
        type: 'line' as const,
        label: 'Min Temp (°C)',
        data: data.daily.temperature_2m_min,
        borderColor: '#1890ff',
        backgroundColor: 'rgba(24, 144, 255, 0.5)',
        yAxisID: 'y-temp',
        tension: 0.3,
        fill: false,
      },
      {
        type: 'bar' as const,
        label: 'Rainfall (mm)',
        data: data.daily.precipitation_sum,
        backgroundColor: 'rgba(82, 196, 26, 0.4)',
        borderColor: '#52c41a',
        borderWidth: 1,
        yAxisID: 'y-rain',
      },
    ],
  };

  const options: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '7-Day Weather Trend',
      },
    },
    scales: {
      'y-temp': {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Temperature (°C)',
        },
        grid: {
          drawOnChartArea: true,
        },
      },
      'y-rain': {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Rainfall (mm)',
        },
        grid: {
          drawOnChartArea: false,
        },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={options as any} />
    </div>
  );
}
