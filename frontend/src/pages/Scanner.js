import React from 'react';
import FoodScanner from '../components/FoodScanner';

const Scanner = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Food Scanner
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload a photo to analyze its nutrients using our AI-powered scanner
          </p>
        </div>

        {/* Scanner Component */}
        <FoodScanner />

        {/* Instructions Section */}
        <div className="mt-12 bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
            How to Use
          </h2>
          <ul className="space-y-3 text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                1
              </span>
              <span>Click "Choose Image" to upload a photo of your food (JPG or PNG format)</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                2
              </span>
              <span>Preview your image to ensure it's clear and well-lit</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                3
              </span>
              <span>Click "Scan Food" and wait for the AI to analyze the nutritional content</span>
            </li>
            <li className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                4
              </span>
              <span>Review the detailed nutritional breakdown including protein, carbs, fat, and total calories</span>
            </li>
          </ul>
        </div>

        {/* Tips Section */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            💡 Tips for Best Results
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• Take photos in good lighting conditions</li>
            <li>• Capture the entire meal in the frame</li>
            <li>• Avoid blurry or low-quality images</li>
            <li>• Make sure food items are clearly visible</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
