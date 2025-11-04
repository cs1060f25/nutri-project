import React from 'react';
import FoodScanner from '../components/FoodScanner';

/**
 * Standalone test page for Food Scanner - bypasses auth
 * Access at: http://localhost:3001/scanner-test
 */
const ScannerTest = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Test Badge */}
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded">
          <p className="font-bold">🧪 Test Mode</p>
          <p className="text-sm">This is a standalone test page for the Food Scanner feature.</p>
        </div>

        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Food Scanner Test
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            HW8 NUTRI-70 - Upload a photo to analyze its nutrients
          </p>
        </div>

        {/* Scanner Component */}
        <FoodScanner />

        {/* Test Info */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            ℹ️ Test Information
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• <strong>Backend:</strong> http://localhost:3333/api/scan</li>
            <li>• <strong>Processing Time:</strong> ~1.5 seconds (simulated AI)</li>
            <li>• <strong>Data:</strong> Mock nutritional values (random)</li>
            <li>• <strong>File Types:</strong> JPG, PNG (max 5MB)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScannerTest;
