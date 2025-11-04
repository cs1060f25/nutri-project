import React, { useState } from 'react';
import { Upload, ArrowRight, Clock } from 'lucide-react';

const FoodScanner = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG or PNG)');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
      setResults(null);
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Nutrition Scanner
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Scan your food and get instant nutritional insights
          </p>
        </div>

        {!results ? (
          // Upload Section
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
            {/* Upload Area */}
            <div className="mb-8">
              <label 
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-12 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors group"
              >
                <Upload className="w-12 h-12 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 mb-3 transition-colors" />
                <p className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                  Drop image here or click to browse
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  PNG or JPG, up to 10MB
                </p>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="mb-8">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                  Preview
                </p>
                <img
                  src={previewUrl}
                  alt="Food preview"
                  className="w-full h-80 object-cover rounded-lg shadow-md"
                />
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-3">
                  {selectedFile.name}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Scan Button */}
            <button
              onClick={handleScan}
              disabled={!selectedFile || loading}
              className={`w-full py-3 px-4 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                !selectedFile || loading
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
              }`}
            >
              {loading ? (
                <>
                  <svg 
                    className="animate-spin h-5 w-5" 
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
                </>
              ) : (
                <>
                  Scan Food
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          // Results Section
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                Nutritional Analysis
              </h2>
              <button
                onClick={resetScanner}
                className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                New Scan
              </button>
            </div>

            {/* Nutrition Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Protein
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {results.protein}<span className="text-base text-slate-600 dark:text-slate-400 ml-1">g</span>
                </p>
              </div>

              <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Carbs
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {results.carbs}<span className="text-base text-slate-600 dark:text-slate-400 ml-1">g</span>
                </p>
              </div>

              <div className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-lg border border-pink-100 dark:border-pink-900/30">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Fat
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {results.fat}<span className="text-base text-slate-600 dark:text-slate-400 ml-1">g</span>
                </p>
              </div>

              <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Total Calories
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {results.calories}
                </p>
              </div>
            </div>

            {/* Timestamp */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Clock className="w-4 h-4" />
              Scanned {new Date(results.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodScanner;