import React, { useState } from 'react';
import { Upload, ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analyzeMealImage } from '../services/geminiService';
import SaveLogModal from './SaveLogModal';
import './FoodScanner.css';

const formatNumber = (value) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return '0';
  }
  return Math.round(Number(value)).toString();
};

const formatDecimal = (value, digits = 1) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return (0).toFixed(digits);
  }
  return Number(value).toFixed(digits);
};

const formatMeasurement = (value, unit = 'g', digits = 1) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return `0 ${unit}`;
  }
  const numericValue = Number(value);
  if (unit === 'mg') {
    return `${Math.round(numericValue).toLocaleString()} ${unit}`;
  }
  return `${formatDecimal(numericValue, digits)} ${unit}`;
};

const FoodScanner = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

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
      const data = await analyzeMealImage(selectedFile);

      if (!data || data.success === false) {
        const message = data?.error || 'Failed to analyze image with Gemini';
        throw new Error(message);
      }

      const totals = data.nutritionTotals;

      if (!totals) {
        throw new Error('No nutrition totals returned from Gemini. Try a clearer photo.');
      }

      setResults({
        protein: totals.totalProtein,
        carbs: totals.totalCarbs,
        fat: totals.totalFat,
        calories: totals.totalCalories,
        saturatedFat: totals.saturatedFat,
        transFat: totals.transFat,
        cholesterol: totals.cholesterol,
        sodium: totals.sodium,
        fiber: totals.fiber,
        sugars: totals.sugars,
        caloriesFromFat: totals.caloriesFromFat,
        matchedItems: data.matchedItems || [],
        unmatchedDishes: data.unmatchedDishes || [],
        timestamp: data.timestamp || new Date().toISOString(),
        nutritionTotals: totals,
      });
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

  const handleSaveLogClick = () => {
    if (!results) {
      setError('No scan results to save');
      return;
    }
    setShowSaveModal(true);
  };

  return (
    <div className="scanner-page">
      <div className="scanner-container">
        <div className="scanner-shell">
          <div className="scanner-hero">
            <div>
              <p className="scanner-hero-badge">HUDS Food Scanner</p>
              <h1 className="scanner-hero-title">Nutrition Scanner</h1>
              <p className="scanner-hero-subtitle">
                Upload a meal photo and we'll estimate servings, portion descriptions, and macros using today's HUDS menu.
              </p>
            </div>
            <div className="scanner-hero-meta">
              <Clock className="scanner-hero-meta-icon" />
              <div>
                <p className="scanner-hero-meta-label">Avg turnaround</p>
                <p className="scanner-hero-meta-value">~8 seconds</p>
              </div>
            </div>
          </div>

          {!results ? (
            <div className="scanner-upload-grid">
              <section className="scanner-panel">
                <div className="scanner-panel-header">
                  <p className="scanner-panel-eyebrow">Upload</p>
                  <h2 className="scanner-panel-title">Add a clear photo</h2>
                  <p className="scanner-panel-subtitle">
                    Use natural light, avoid glare, and capture the full plate for best accuracy.
                  </p>
                </div>

                <label htmlFor="file-upload" className="scanner-dropzone">
                  <Upload className="scanner-dropzone-icon" />
                  <p className="scanner-dropzone-title">Drop image or browse files</p>
                  <p className="scanner-dropzone-subtitle">Supports JPG/PNG up to 20MB</p>
                </label>
                <input
                  id="file-upload"
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="scanner-hidden-input"
                />

                {selectedFile && (
                  <div className="scanner-file-chip">
                    <p className="scanner-file-name">{selectedFile.name}</p>
                    <p className="scanner-file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                )}

                {error && <div className="scanner-error">{error}</div>}

                <button
                  onClick={handleScan}
                  disabled={!selectedFile || loading}
                  className={`scanner-primary-btn ${(!selectedFile || loading) ? 'is-disabled' : ''}`}
                >
                  {loading ? (
                    <>
                      <svg className="scanner-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="scanner-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="scanner-spinner-indicator" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Scan food
                      <ArrowRight className="scanner-btn-icon" />
                    </>
                  )}
                </button>
              </section>

              <section className="scanner-panel scanner-preview-panel">
                <p className="scanner-panel-eyebrow text-light">Preview</p>
                <div className="scanner-preview-frame">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Food preview" />
                  ) : (
                    <div className="scanner-preview-placeholder">Upload a photo to see it here</div>
                  )}
                </div>
                {selectedFile && <p className="scanner-preview-file">Captured file: {selectedFile.name}</p>}

                <div className="scanner-preview-details">
                  <div>
                    <p className="scanner-preview-heading">Capture checklist</p>
                    <ul className="scanner-list">
                      <li>Avoid motion blur and harsh shadows</li>
                      <li>Include everything you plan to eat</li>
                      <li>Angle camera directly above the plate</li>
                    </ul>
                  </div>
                  <div className="scanner-mini-card">
                    <p className="scanner-mini-card-eyebrow">How it works</p>
                    <ul className="scanner-list">
                      <li>Pull today's HUDS menu so we understand what's being served.</li>
                      <li>Compare your plate to each menu dish to find the closest matches.</li>
                      <li>Scale dishes based on the visible portion size before calculating macros.</li>
                    </ul>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="scanner-results">
              <div className="scanner-results-card">
                <p className="scanner-results-badge">Scan complete</p>
                <h2>Personalized nutrition snapshot</h2>
                <p className="scanner-results-copy">
                  Estimated from {results.matchedItems.length} matched HUDS dishes
                  {results.unmatchedDishes?.length ? `, ${results.unmatchedDishes.length} unmatched` : ''}.
                </p>
              </div>

              <div className="scanner-macro-grid">
                {[
                  { label: 'Protein', value: `${formatNumber(results.protein)} g` },
                  { label: 'Carbs', value: `${formatNumber(results.carbs)} g` },
                  { label: 'Fat', value: `${formatNumber(results.fat)} g` },
                  { label: 'Total Calories', value: `${formatNumber(results.calories)}` }
                ].map((card) => (
                  <div key={card.label} className="scanner-macro-card">
                    <p className="scanner-macro-label">{card.label}</p>
                    <p className="scanner-macro-value">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="scanner-micro-section">
                <p className="scanner-micro-heading">Detailed nutrients</p>
                <div className="scanner-micro-grid">
                  {[
                    { label: 'Saturated Fat', value: formatMeasurement(results.saturatedFat, 'g') },
                    { label: 'Trans Fat', value: formatMeasurement(results.transFat, 'g') },
                    { label: 'Cholesterol', value: formatMeasurement(results.cholesterol, 'mg', 0) },
                    { label: 'Sodium', value: formatMeasurement(results.sodium, 'mg', 0) },
                    { label: 'Fiber', value: formatMeasurement(results.fiber, 'g') },
                    { label: 'Sugars', value: formatMeasurement(results.sugars, 'g') },
                  ].map((card) => (
                    <div key={card.label} className="scanner-micro-card">
                      <p className="scanner-micro-label">{card.label}</p>
                      <p className="scanner-micro-value">{card.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="scanner-dishes-panel">
                <div className="scanner-dishes-top">
                  <div>
                    <h3>Detected HUDS dishes</h3>
                    <p>Portion estimates are based on visual comparison to HUDS serving sizes.</p>
                  </div>
                  <button onClick={resetScanner} className="scanner-ghost-btn">
                    New scan
                    <ArrowRight className="scanner-btn-icon" />
                  </button>
                </div>

                {results.matchedItems && results.matchedItems.length > 0 ? (
                  <div className="scanner-dish-list">
                    {results.matchedItems.map((item) => (
                      <div key={`${item.recipeId}-${item.predictedName}`} className="scanner-dish-row">
                        <div className="scanner-dish-meta">
                          <p className="scanner-dish-name">{item.matchedName}</p>
                          <p className="scanner-dish-portion">
                            {item.portionDescription || `${item.estimatedServings ?? 1} HUDS serving${(item.estimatedServings ?? 1) === 1 ? '' : 's'}`}
                          </p>
                        </div>
                        <div className="scanner-dish-macros">
                          {[
                            `${formatNumber(item.calories)} cal`,
                            `Protein ${formatNumber(item.protein)}g`,
                            `Carbs ${formatNumber(item.carbs)}g`,
                            `Fat ${formatNumber(item.fat)}g`
                          ].map((detail, idx) => (
                            <span key={`${item.recipeId}-${detail}`} className={`scanner-dish-macro ${idx === 0 ? 'is-calories' : ''}`}>
                              {detail}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="scanner-empty-state">
                    We couldn't confidently match any HUDS dishes for this photo. Try another angle or clearer lighting.
                  </p>
                )}

                {results.unmatchedDishes && results.unmatchedDishes.length > 0 && (
                  <div className="scanner-unmatched">
                    <p className="scanner-unmatched-label">Still unsure</p>
                    <p>Could not match: {results.unmatchedDishes.join(', ')}. Try clarifying those items or add them manually.</p>
                  </div>
                )}
              </div>

              <div className="scanner-footer-row">
                <div className="scanner-footer-meta">
                  <Clock className="scanner-footer-icon" />
                  Scanned {new Date(results.timestamp).toLocaleString()}
                </div>
                <button
                  onClick={handleSaveLogClick}
                  className="scanner-primary-btn scanner-save-log-btn"
                >
                  Save Log
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <SaveLogModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSuccess={() => {
          setShowSaveModal(false);
          resetScanner();
          navigate('/home/meal-logs');
        }}
        scanData={results}
        imageUrl={previewUrl}
        imageFile={selectedFile}
      />
    </div>
  );
};

export default FoodScanner;