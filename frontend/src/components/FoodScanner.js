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
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Nutritional Analysis
            </h2>
            <button
              onClick={resetScanner}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              New Scan
            </button>
          </div>

          {/* Nutrition Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Protein</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">{results.protein}g</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Carbs</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">{results.carbs}g</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="text-gray-700 dark:text-gray-300 font-medium">Fat</span>
              <span className="text-gray-900 dark:text-gray-100 font-semibold">{results.fat}g</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-blue-700 dark:text-blue-300 font-bold">Total Calories</span>
              <span className="text-blue-900 dark:text-blue-100 font-bold text-xl">{results.calories}</span>
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Scanned at {new Date(results.timestamp).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default FoodScanner;
