import React from 'react';

interface DataPoint {
  date: string;
  value: number;
  target?: number;
}

interface LineChartProps {
  data: DataPoint[];
  title: string;
  yAxisLabel: string;
  color?: string;
  targetColor?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  yAxisLabel,
  color = '#dc2626',
  targetColor = '#9ca3af',
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.target || 0))) * 1.1;
  const minValue = Math.min(...data.map(d => Math.min(d.value, d.target || 0))) * 0.9;
  const range = maxValue - minValue || 1;

  const getY = (value: number) => {
    return ((maxValue - value) / range) * 200;
  };

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = getY(d.value);
    return `${x},${y}`;
  }).join(' ');

  const targetPoints = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = getY(d.target || 0);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>

      <div className="relative" style={{ height: '250px' }}>
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
          <span>{Math.round(maxValue)}</span>
          <span>{Math.round((maxValue + minValue) / 2)}</span>
          <span>{Math.round(minValue)}</span>
        </div>

        <div className="ml-12">
          <svg viewBox="0 0 100 200" className="w-full" style={{ height: '200px' }}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {data[0]?.target && (
              <polyline
                points={targetPoints}
                fill="none"
                stroke={targetColor}
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />
            )}

            <polyline
              points={`0,200 ${points} 100,200`}
              fill={`url(#gradient-${title})`}
            />

            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="1"
            />

            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = getY(d.value);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill={color}
                />
              );
            })}
          </svg>

          <div className="flex justify-between mt-2 text-xs text-gray-600">
            {data.map((d, i) => {
              if (i % Math.ceil(data.length / 5) === 0 || i === data.length - 1) {
                return <span key={i}>{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>;
              }
              return null;
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
          <span className="text-gray-600">Actual</span>
        </div>
        {data[0]?.target && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5" style={{ backgroundColor: targetColor }}></div>
            <span className="text-gray-600">Target</span>
          </div>
        )}
      </div>
    </div>
  );
};
