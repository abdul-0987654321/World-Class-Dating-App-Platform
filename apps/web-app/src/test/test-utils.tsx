/**
 * Test Utilities
 * Custom render function with all providers
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore, EnhancedStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import reducers
import authReducer from '../store/slices/authSlice';
import profileReducer from '../store/slices/profileSlice';
import matchingReducer from '../store/slices/matchingSlice';
import messagingReducer from '../store/slices/messagingSlice';

// Import the actual theme to ensure type compatibility
import { theme as appTheme } from '../styles/theme';

// Test theme that matches the full theme structure for type compatibility
const testTheme: typeof appTheme = {
  colors: {
    // Primary Brand Colors
    primary: '#ff2d75',
    primaryLight: '#ff5a94',
    primaryDark: '#d91a5c',
    primaryHover: '#ff5a94',
    secondary: '#ffb8d1',
    secondaryHover: '#ffe0eb',
    gradient: 'linear-gradient(135deg, #ff2d75 0%, #7B61FF 50%, #2ED4FF 100%)',
    gradientHover: 'linear-gradient(135deg, #d91a5c 0%, #ff2d75 50%, #ff5a94 100%)',

    // Dark Theme Surfaces
    white: '#2d2d44',
    black: '#000000',
    background: '#1a1a2e',
    backgroundSecondary: '#232342',
    backgroundTertiary: '#2d2d44',
    surface: '#232342',
    surfaceElevated: '#2d2d44',
    surfaceOverlay: 'rgba(26, 26, 46, 0.7)',

    // Text Colors
    text: '#FFFFFF',
    textPrimary: '#FFFFFF',
    textSecondary: '#B5B8C5',
    textTertiary: '#8A8F9E',
    textMuted: '#6B7280',
    textLight: '#9CA3AF',

    // Border Colors
    border: 'rgba(255, 255, 255, 0.1)',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    borderStrong: 'rgba(255, 255, 255, 0.2)',

    // Status Colors
    success: '#00d9a5',
    successLight: 'rgba(0, 217, 165, 0.1)',
    warning: '#F59E0B',
    warningLight: 'rgba(245, 158, 11, 0.1)',
    error: '#EF4444',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    info: '#3B82F6',
    infoLight: 'rgba(59, 130, 246, 0.1)',

    // Accent Colors
    pink: '#ff2d75',
    coral: '#ff5a94',
    softPink: '#ffb8d1',
    purple: '#9333EA',
    blue: '#3B82F6',
    cyan: '#06B6D4',
    green: '#00d9a5',
    gold: '#D9A657',

    // Coin/Premium Colors
    coinPrimary: '#D9A657',
    coinSecondary: '#C77A45',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
    '2xl': '48px',
    '3xl': '64px',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    base: '16px',
    lg: '18px',
    xl: '24px',
    xxl: '32px',
    '2xl': '32px',
    '3xl': '48px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    '3xl': '32px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px rgba(0, 0, 0, 0.4)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.5)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.6)',
    '2xl': '0 25px 50px rgba(0, 0, 0, 0.7)',
    glow: '0 0 20px rgba(255, 45, 117, 0.3)',
    glowStrong: '0 0 40px rgba(255, 45, 117, 0.5)',
  },
  transitions: {
    fast: '0.15s ease',
    base: '0.2s ease',
    slow: '0.3s ease',
  },
  breakpoints: {
    xs: '320px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    xxl: '1400px',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
};

// Types
interface WrapperProps {
  children: ReactNode;
}

// Store reducer configuration
const storeReducers = {
  auth: authReducer,
  profile: profileReducer,
  matching: matchingReducer,
  messaging: messagingReducer,
} as const;

// Get proper types from a dummy store (needed for Redux Toolkit v2 strict typing)
const dummyStore = configureStore({ reducer: storeReducers });
type TestRootState = ReturnType<typeof dummyStore.getState>;
type TestStore = typeof dummyStore;

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Partial<TestRootState>;
  store?: TestStore;
  route?: string;
  initialEntries?: string[];
  withRouter?: boolean;
  withRedux?: boolean;
  withTheme?: boolean;
  withQueryClient?: boolean;
}

// Create a test store
export function createTestStore(preloadedState: Partial<TestRootState> = {}) {
  return configureStore({
    reducer: storeReducers,
    preloadedState: preloadedState as TestRootState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });
}

// Create a test query client
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom render function that wraps components with all necessary providers
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    route = '/',
    initialEntries = [route],
    withRouter = true,
    withRedux = true,
    withTheme = true,
    withQueryClient = true,
    ...renderOptions
  }: ExtendedRenderOptions = {}
): RenderResult & { store: EnhancedStore; queryClient: QueryClient } {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: WrapperProps): ReactElement {
    let wrappedChildren = children;

    if (withQueryClient) {
      wrappedChildren = (
        <QueryClientProvider client={queryClient}>{wrappedChildren}</QueryClientProvider>
      );
    }

    if (withTheme) {
      wrappedChildren = <ThemeProvider theme={testTheme}>{wrappedChildren}</ThemeProvider>;
    }

    if (withRedux) {
      wrappedChildren = <Provider store={store}>{wrappedChildren}</Provider>;
    }

    if (withRouter) {
      wrappedChildren = (
        <MemoryRouter initialEntries={initialEntries}>{wrappedChildren}</MemoryRouter>
      );
    }

    return <>{wrappedChildren}</>;
  }

  return {
    store,
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Render with routes for testing navigation
 */
export function renderWithRoutes(
  routes: Array<{ path: string; element: ReactElement }>,
  {
    initialEntry = '/',
    preloadedState = {},
    ...options
  }: ExtendedRenderOptions & { initialEntry?: string } = {}
) {
  return renderWithProviders(
    <Routes>
      {routes.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
    </Routes>,
    {
      initialEntries: [initialEntry],
      preloadedState,
      ...options,
    }
  );
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Export test theme for use in tests
export { testTheme };
