// This file stores all your app's colors in one place
// So if you want to change blue later, you only change it here!

export const colors = {
  // Primary colors from Figma
  primary: {
    dark: '#001F3F',      // Dark blue
    blue: '#007BFF',      // Main blue
    light: '#4A90E2'      // Light blue
  },
  
  // Background colors
  background: {
    gradient: ['#001F3F', '#007BFF'],  // For gradients
    white: '#FFFFFF',
    lightGray: '#F5F5F5'
  },
  
  // Text colors
  text: {
    primary: '#000000',    // Black text
    secondary: '#A9A9A9',  // Gray text
    white: '#FFFFFF'       // White text
  },
  
  // Accent colors for buttons, highlights
  accent: {
    blue: '#007BFF',
    green: '#28A745',     // Success green
    red: '#DC3545',       // Error red
    yellow: '#FFC107'     // Warning yellow
  }
};

// Spacing system - keeps things consistent
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};

// Border radius for rounded corners
export const borderRadius = {
  small: 8,
  medium: 16,
  large: 24
};