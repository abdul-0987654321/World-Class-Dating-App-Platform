declare module '@flamoral/shared' {
  import winston from 'winston';

  export function createLogger(serviceName: string): winston.Logger;

  export interface ServiceClient {
    // Add other exports as needed
  }
}
