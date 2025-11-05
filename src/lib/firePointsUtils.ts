export const resetFirePoints = () => {
  // Reset fire points logic if needed
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fire_points');
  }
};

