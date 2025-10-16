import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';
import { DailyAggregate, NutritionGoals } from '../lib/mockData';
import { Activity } from 'lucide-react';

interface MicronutrientTrendsProps {
  dailyData: DailyAggregate[];
  goals: NutritionGoals;
}

export function MicronutrientTrends({ dailyData, goals }: MicronutrientTrendsProps) {
  const chartData = useMemo(() => {
    const labels = dailyData.map(d => format(d.date, 'MMM d'));

    return {
      labels,
      datasets: [
        {
          label: 'Fiber (g)',
          data: dailyData.map(d => d.totalFiber),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: 'y'
        },
        {
          label: 'Iron (mg)',
          data: dailyData.map(d => d.totalIron),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: 'y'
        },
        {
          label: 'Calcium (mg)',
          data: dailyData.map(d => d.totalCalcium),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: 'y1'
        },
        {
          label: 'Sodium (mg)',
          data: dailyData.map(d => d.totalSodium),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          yAxisID: 'y1'
        }
      ]
    };
  }, [dailyData]);

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
          padding: 12,
          font: {
            size: 11,
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
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Fiber & Iron',
          font: {
            size: 11,
            weight: 'bold'
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Calcium & Sodium (mg)',
          font: {
            size: 11,
            weight: 'bold'
          }
        },
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      }
    }
  };

  const averages = useMemo(() => {
    const totalDays = dailyData.length;
    const totals = dailyData.reduce(
      (acc, day) => ({
        fiber: acc.fiber + day.totalFiber,
        iron: acc.iron + day.totalIron,
        calcium: acc.calcium + day.totalCalcium,
        sodium: acc.sodium + day.totalSodium
      }),
      { fiber: 0, iron: 0, calcium: 0, sodium: 0 }
    );

    return {
      fiber: (totals.fiber / totalDays).toFixed(1),
      iron: (totals.iron / totalDays).toFixed(1),
      calcium: Math.round(totals.calcium / totalDays),
      sodium: Math.round(totals.sodium / totalDays)
    };
  }, [dailyData]);

  const getStatusColor = (value: number, target: number, isLimit: boolean = false) => {
    const percentage = (value / target) * 100;
    if (isLimit) {
      if (percentage > 100) return 'text-red-600 bg-red-50';
      if (percentage > 80) return 'text-orange-600 bg-orange-50';
      return 'text-green-600 bg-green-50';
    } else {
      if (percentage >= 80) return 'text-green-600 bg-green-50';
      if (percentage >= 60) return 'text-orange-600 bg-orange-50';
      return 'text-red-600 bg-red-50';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Micronutrient Trends</h2>
          <p className="text-sm text-gray-500 mt-1">Daily intake patterns for key micronutrients</p>
        </div>
        <Activity className="w-6 h-6 text-blue-600" />
      </div>

      <div className="h-80 mb-6">
        <Line data={chartData} options={options} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Fiber</div>
          <div className={`inline-flex items-center justify-center px-3 py-2 rounded-lg ${
            getStatusColor(Number(averages.fiber), goals.fiberGramsTarget)
          }`}>
            <span className="text-lg font-bold">{averages.fiber}g</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Target: {goals.fiberGramsTarget}g
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Iron</div>
          <div className={`inline-flex items-center justify-center px-3 py-2 rounded-lg ${
            getStatusColor(Number(averages.iron), goals.ironMgTarget)
          }`}>
            <span className="text-lg font-bold">{averages.iron}mg</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Target: {goals.ironMgTarget}mg
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Calcium</div>
          <div className={`inline-flex items-center justify-center px-3 py-2 rounded-lg ${
            getStatusColor(Number(averages.calcium), goals.calciumMgTarget)
          }`}>
            <span className="text-lg font-bold">{averages.calcium}mg</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Target: {goals.calciumMgTarget}mg
          </div>
        </div>

        <div className="text-center">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Sodium</div>
          <div className={`inline-flex items-center justify-center px-3 py-2 rounded-lg ${
            getStatusColor(Number(averages.sodium), goals.sodiumMgLimit, true)
          }`}>
            <span className="text-lg font-bold">{averages.sodium}mg</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Limit: {goals.sodiumMgLimit}mg
          </div>
        </div>
      </div>
    </div>
  );
}
