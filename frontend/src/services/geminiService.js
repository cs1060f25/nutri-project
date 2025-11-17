const API_ENDPOINT = '/api/analyze-meal';

export const analyzeMealImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Handle error message - could be string or object
    let message = 'Failed to analyze meal image';
    if (errorData?.error) {
      message = typeof errorData.error === 'string' 
        ? errorData.error 
        : errorData.error?.message || JSON.stringify(errorData.error);
    } else if (errorData?.message) {
      message = errorData.message;
    }
    throw new Error(message);
  }

  return response.json();
};
