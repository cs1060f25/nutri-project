import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  label: string;
}

interface DateRangeSelectorProps {
  selectedRange: DateRange;
  onRangeChange: (range: DateRange) => void;
}

const presetRanges: DateRange[] = [
  {
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date(),
    label: 'Last 7 Days'
  },
  {
    startDate: new Date(new Date().setDate(new Date().getDate() - 14)),
    endDate: new Date(),
    label: 'Last 2 Weeks'
  },
  {
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
    label: 'Last 30 Days'
  },
  {
    startDate: new Date(new Date().setDate(new Date().getDate() - 90)),
    endDate: new Date(),
    label: 'Last 3 Months'
  }
];

export function DateRangeSelector({ selectedRange, onRangeChange }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handlePresetSelect = (range: DateRange) => {
    onRangeChange(range);
    setIsOpen(false);
  };

  const handleCustomRangeApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);

      if (start <= end) {
        onRangeChange({
          startDate: start,
          endDate: end,
          label: `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
        });
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-6 py-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Calendar className="w-5 h-5 text-blue-600" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500 font-medium">Date Range</span>
          <span className="text-sm font-semibold text-gray-800">{selectedRange.label}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </motion.button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border border-gray-200 z-20 min-w-[320px] overflow-hidden"
          >
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
                Quick Select
              </div>
              {presetRanges.map((range, index) => (
                <motion.button
                  key={range.label}
                  onClick={() => handlePresetSelect(range)}
                  className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                    selectedRange.label === range.label
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.1 }}
                >
                  {range.label}
                </motion.button>
              ))}

              <div className="h-px bg-gray-200 my-2" />

              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
                Custom Range
              </div>
              <div className="px-3 py-2 space-y-2">
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <motion.button
                  onClick={handleCustomRangeApply}
                  disabled={!customStart || !customEnd}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  whileHover={{ scale: customStart && customEnd ? 1.02 : 1 }}
                  whileTap={{ scale: customStart && customEnd ? 0.98 : 1 }}
                >
                  Apply Custom Range
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
