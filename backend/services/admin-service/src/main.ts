/**
 * Admin Service Main Entry Point
 *
 * This file serves as an alias to index.ts for consistency with
 * service naming conventions. The actual server initialization
 * logic is in index.ts.
 */

// Re-export everything from index
export * from './index';

// Import and run the server if this file is executed directly
import './index';
