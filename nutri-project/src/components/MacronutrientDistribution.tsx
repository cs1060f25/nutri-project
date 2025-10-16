import { useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import { DailyAggregate, NutritionGoals } from '../lib/mockData';

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

interface MacronutrientDistributionProps {
  dailyData: DailyAggregate[];
  goals: NutritionGoals;
}

export function MacronutrientDistribution({ dailyData, goals }: MacronutrientDistributionProps) {
  const averageMacros = useMemo(() => {
    const totalDays = dailyData.length;
    const totals = dailyData.reduce(
      (acc, day) => ({
        protein: acc.protein + day.totalProtein,
        carbs: acc.carbs + day.totalCarbs,
        fat: acc.fat + day.totalFat
      }),
      { protein: 0, carbs: 0, fat: 0 }
    );

    return {
      protein: Math.round(totals.protein / totalDays),
      carbs: Math.round(totals.carbs / totalDays),
      fat: Math.round(totals.fat / totalDays)
    };
  }, [dailyData]);

  const doughnutData = {
    labels: ['Protein', 'Carbohydrates', 'Fat'],
    datasets: [
      {
        data: [averageMacros.protein, averageMacros.carbs, averageMacros.fat],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 191, 36, 0.8)'
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)'
        ],
        borderWidth: 2,
        hoverOffset: 10
      }
    ]
  };

  const barData = {
    labels: ['Protein', 'Carbohydrates', 'Fat'],
    datasets: [
      {
        label: 'Average Intake',
        data: [averageMacros.protein, averageMacros.carbs, averageMacros.fat],
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(251, 191, 36, 0.7)'
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(59, 130, 246)',
          'rgb(251, 191, 36)'
        ],
        borderWidth: 2,
        borderRadius: 6
      },
      {
        label: 'Target Goal',
        data: [
          goals.proteinGramsTarget,
          goals.carbsGramsTarget,
          goals.fatGramsTarget
        ],
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
        borderColor: 'rgb(34, 197, 94)',
        borderWidth: 2,
        borderRadius: 6
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
            weight: '500'
          },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value}g (${percentage}%)`;
          }
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 10,
          font: {
            size: 11,
            weight: '500'
          },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y}g`;
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
            return value + 'g';
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

  const macroPercentages = useMemo(() => {
    const total = averageMacros.protein + averageMacros.carbs + averageMacros.fat;
    return {
      protein: ((averageMacros.protein / total) * 100).toFixed(0),
      carbs: ((averageMacros.carbs / total) * 100).toFixed(0),
      fat: ((averageMacros.fat / total) * 100).toFixed(0)
    };
  }, [averageMacros]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">Macronutrient Distribution</h2>
      <p className="text-sm text-gray-500 mb-6">Average daily macronutrient breakdown</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
            Proportional Distribution
          </h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
            Intake vs. Target Goals
          </h3>
          <div className="h-64">
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs font-semibold text-gray-600 uppercase">Protein</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{averageMacros.protein}g</div>
          <div className="text-xs text-gray-500 mt-1">{macroPercentages.protein}% of total</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs font-semibold text-gray-600 uppercase">Carbs</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{averageMacros.carbs}g</div>
          <div className="text-xs text-gray-500 mt-1">{macroPercentages.carbs}% of total</div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-xs font-semibold text-gray-600 uppercase">Fat</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{averageMacros.fat}g</div>
          <div className="text-xs text-gray-500 mt-1">{macroPercentages.fat}% of total</div>
        </div>
      </div>
    </div>
  );
}
