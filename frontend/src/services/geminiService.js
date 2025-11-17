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
    const message = errorData?.error || 'Failed to analyze meal image';
    throw new Error(message);
  }

  return response.json();
};
