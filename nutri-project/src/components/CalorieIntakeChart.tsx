import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format } from 'date-fns';
import { DailyAggregate, NutritionGoals } from '../lib/mockData';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CalorieIntakeChartProps {
  dailyData: DailyAggregate[];
  goals: NutritionGoals;
}

export function CalorieIntakeChart({ dailyData, goals }: CalorieIntakeChartProps) {
  const chartData = useMemo(() => {
    const labels = dailyData.map(d => format(d.date, 'MMM d'));
    const calories = dailyData.map(d => d.totalCalories);
    const target = dailyData.map(() => goals.dailyCalorieTarget);

    return {
      labels,
      datasets: [
        {
          label: 'Daily Intake',
          data: calories,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(59, 130, 246)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Daily Target',
          data: target,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    };
  }, [dailyData, goals]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '500'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += context.parsed.y.toLocaleString() + ' kcal';
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          callback: function(value: any) {
            return value.toLocaleString() + ' kcal';
          },
          font: {
            size: 11
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      }
    }
  };

  const averageIntake = useMemo(() => {
    const sum = dailyData.reduce((acc, d) => acc + d.totalCalories, 0);
    return Math.round(sum / dailyData.length);
  }, [dailyData]);

  const variance = useMemo(() => {
    const diff = averageIntake - goals.dailyCalorieTarget;
    const percentage = ((diff / goals.dailyCalorieTarget) * 100).toFixed(1);
    return { diff, percentage };
  }, [averageIntake, goals.dailyCalorieTarget]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Caloric Intake Analysis</h2>
          <p className="text-sm text-gray-500 mt-1">Daily calories vs. target goal</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
            <Target className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">
              Avg: {averageIntake.toLocaleString()} kcal
            </span>
          </div>
          {variance.diff !== 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              variance.diff > 0 ? 'bg-orange-50' : 'bg-green-50'
            }`}>
              {variance.diff > 0 ? (
                <TrendingUp className="w-4 h-4 text-orange-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-600" />
              )}
              <span className={`text-sm font-medium ${
                variance.diff > 0 ? 'text-orange-700' : 'text-green-700'
              }`}>
                {variance.diff > 0 ? '+' : ''}{variance.percentage}%
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
