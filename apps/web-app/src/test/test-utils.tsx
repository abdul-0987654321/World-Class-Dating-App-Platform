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

// Default theme for testing
const testTheme = {
  colors: {
    primary: '#ec4899',
    primaryHover: '#db2777',
    primaryLight: 'rgba(236, 72, 153, 0.1)',
    secondary: '#8b5cf6',
    secondaryHover: '#7c3aed',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    gradientHover: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)',
    text: '#1f2937',
    textSecondary: '#6b7280',
    textLight: '#9ca3af',
    background: '#ffffff',
    backgroundSecondary: '#f9fafb',
    backgroundTertiary: '#f3f4f6',
    white: '#ffffff',
    border: '#e5e7eb',
    error: '#ef4444',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    success: '#22c55e',
    warning: '#f59e0b',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  transitions: {
    base: '150ms ease-in-out',
    fast: '100ms ease-in-out',
    slow: '300ms ease-in-out',
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

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: Record<string, unknown>;
  store?: EnhancedStore;
  route?: string;
  initialEntries?: string[];
  withRouter?: boolean;
  withRedux?: boolean;
  withTheme?: boolean;
  withQueryClient?: boolean;
}

// Create a test store
export function createTestStore(preloadedState: Record<string, unknown> = {}) {
  return configureStore({
    reducer: {
      auth: authReducer,
      profile: profileReducer,
      matching: matchingReducer,
      messaging: messagingReducer,
    },
    preloadedState,
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
        <QueryClientProvider client={queryClient}>
          {wrappedChildren}
        </QueryClientProvider>
      );
    }

    if (withTheme) {
      wrappedChildren = (
        <ThemeProvider theme={testTheme}>{wrappedChildren}</ThemeProvider>
      );
    }

    if (withRedux) {
      wrappedChildren = <Provider store={store}>{wrappedChildren}</Provider>;
    }

    if (withRouter) {
      wrappedChildren = (
        <MemoryRouter initialEntries={initialEntries}>
          {wrappedChildren}
        </MemoryRouter>
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
