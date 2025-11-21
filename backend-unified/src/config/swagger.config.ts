export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ConnectSphere API',
      version: '1.0.0',
      description: 'ConnectSphere Dating Platform API',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/api/**/*.ts'],
};
