import React from 'react';
import FoodScanner from '../components/FoodScanner';

/**
 * Standalone test page for Food Scanner - bypasses auth
 * Access at: http://localhost:3001/scanner-test
 */
const ScannerTest = () => {
  return (
    <div>
      {/* Test Badge - Fixed position */}
      <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 rounded shadow-lg">
          <p className="font-bold text-sm">🧪 Test Mode - HW8 NUTRI-70</p>
          <p className="text-xs">Standalone test page • Backend: localhost:3333</p>
        </div>
      </div>

      {/* Scanner Component - Full page */}
      <FoodScanner />
    </div>
  );
};

export default ScannerTest;
