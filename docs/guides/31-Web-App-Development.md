# ConnectSphere Web App

React web application for ConnectSphere dating platform.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **State Management:** Redux Toolkit + Redux Persist
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **API Client:** @connectsphere/api-client (shared package)

## Development

```bash
# Install dependencies (from root)
yarn install

# Build shared packages first
yarn build:all

# Start dev server
yarn workspace @connectsphere/web dev

# Or from this directory
yarn dev
```

## Available Scripts

- `yarn dev` - Start development server (port 5173)
- `yarn build` - Build for production
- `yarn preview` - Preview production build
- `yarn lint` - Run ESLint
- `yarn type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/      # React components
│   ├── common/      # Shared UI components
│   ├── blocks/      # Block-related components
│   ├── boosts/      # Boost-related components
│   ├── coins/       # Coin/monetization components
│   ├── limits/      # Daily limits components
│   └── ...
├── pages/           # Page components
├── store/           # Redux store
│   ├── slices/      # Redux slices
│   └── index.ts     # Store configuration
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── App.tsx          # Root component
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Shared Packages

This app uses monorepo shared packages:

- `@connectsphere/api-client` - HTTP client & API methods
- `@connectsphere/types` - TypeScript type definitions
- `@connectsphere/utils` - Common utility functions
- `@connectsphere/constants` - App-wide constants
- `@connectsphere/validators` - Validation schemas

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## Building

```bash
# Type check
yarn type-check

# Build
yarn build

# Preview build
yarn preview
```

## Features

- ✅ User authentication
- ✅ Profile management
- ✅ Discovery/swiping interface
- ✅ Real-time messaging
- ✅ Match management
- ✅ Photo galleries
- ✅ Boosts and coins
- ✅ Daily limits
- ✅ Block/report functionality
- ✅ Moderation features

## Next Steps

1. Implement page components using existing components from `src/components/`
2. Wire up API calls using `@connectsphere/api-client`
3. Add comprehensive error handling
4. Implement real-time features with WebSocket
5. Add loading states and skeletons
6. Optimize performance and bundle size
