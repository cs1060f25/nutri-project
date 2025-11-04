import React, { useState } from 'react';

const FoodScanner = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG or PNG)');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      setResults(null);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to scan image');
      }

      setResults(data);
    } catch (err) {
      console.error('Scan error:', err);
      setError(err.message || 'An error occurred while scanning the image');
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      {/* Upload Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
          Upload Food Image
        </h2>
        
        {/* File Input */}
        <div className="space-y-2">
          <label 
            htmlFor="file-upload" 
            className="block w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg cursor-pointer text-center transition-colors"
          >
            Choose Image
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
          />
          {selectedFile && (
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {selectedFile.name}
            </p>
          )}
        </div>

        {/* Image Preview */}
        {previewUrl && (
          <div className="mt-4">
            <img
              src={previewUrl}
              alt="Food preview"
              className="w-full h-64 object-cover rounded-lg shadow-sm"
            />
          </div>
        )}

        {/* Scan Button */}
        <button
          onClick={handleScan}
          disabled={!selectedFile || loading}
          className={`w-full px-4 py-3 font-medium rounded-lg transition-colors ${
            !selectedFile || loading
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg 
                className="animate-spin h-5 w-5 mr-2 text-white" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Analyzing...
            </span>
          ) : (
            'Scan Food'
          )}
        </button>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Results Card */}
      {results && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 space-y-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Nutritional Analysis
              </h2>
            </div>
            <button
              onClick={resetScanner}
              className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              New Scan
            </button>
          </div>

          {/* Nutrition Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Protein */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">P</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Protein</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {results.protein}<span className="text-base font-normal text-gray-500 ml-1">g</span>
              </div>
            </div>
            
            {/* Carbs */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">C</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Carbs</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {results.carbs}<span className="text-base font-normal text-gray-500 ml-1">g</span>
              </div>
            </div>
            
            {/* Fat */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xs">F</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Fat</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {results.fat}<span className="text-base font-normal text-gray-500 ml-1">g</span>
              </div>
            </div>
            
            {/* Calories */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Calories</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {results.calories}<span className="text-base font-normal text-gray-500 ml-1">kcal</span>
              </div>
            </div>
          </div>

          {/* Calorie Breakdown Bar */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wider">Calorie Distribution</p>
            <div className="flex h-6 rounded-full overflow-hidden shadow-inner bg-gray-200 dark:bg-gray-700">
              <div 
                className="bg-green-500 flex items-center justify-center text-xs text-white font-semibold"
                style={{width: `${(results.protein * 4 / results.calories * 100).toFixed(0)}%`}}
                title={`Protein: ${(results.protein * 4 / results.calories * 100).toFixed(0)}%`}
              >
                {(results.protein * 4 / results.calories * 100).toFixed(0)}%
              </div>
              <div 
                className="bg-orange-500 flex items-center justify-center text-xs text-white font-semibold"
                style={{width: `${(results.carbs * 4 / results.calories * 100).toFixed(0)}%`}}
                title={`Carbs: ${(results.carbs * 4 / results.calories * 100).toFixed(0)}%`}
              >
                {(results.carbs * 4 / results.calories * 100).toFixed(0)}%
              </div>
              <div 
                className="bg-purple-500 flex items-center justify-center text-xs text-white font-semibold"
                style={{width: `${(results.fat * 9 / results.calories * 100).toFixed(0)}%`}}
                title={`Fat: ${(results.fat * 9 / results.calories * 100).toFixed(0)}%`}
              >
                {(results.fat * 9 / results.calories * 100).toFixed(0)}%
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Protein</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Carbs</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">Fat</span>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Scanned at {new Date(results.timestamp).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodScanner;
