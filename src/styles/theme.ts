export const theme = {
    colors: {
      primary: '#4A90E2', // VHL Blue
      secondary: '#2D5A8B', // Darker blue for contrast
      background: '#FFFFFF',
      foreground: '#1A1A1A',
      muted: '#F5F5F5',
      border: '#E2E8F0',
      accent: '#82B1FF',
      success: '#4CAF50',
      warning: '#FFC107',
      error: '#EF5350',
    },
    transitions: {
      default: 'all 0.3s ease-in-out',
      slow: 'all 0.5s ease-in-out',
      fast: 'all 0.15s ease-in-out',
    },
  }
  
  export type Theme = typeof theme