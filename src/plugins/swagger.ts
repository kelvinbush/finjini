/**
 * Scalar API Reference plugin (flattened)
 */
import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';

export const swaggerPlugin = fastifyPlugin(async function (fastify: FastifyInstance) {
  // Register OpenAPI specification generator
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Finjini API',
        description: 'API documentation for Finjini backend',
        version: '1.0.0',
        contact: {
          name: 'Finjini Team',
          email: 'support@finjini.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: process.env.API_URL || `http://localhost:${process.env.PORT || 8080}`,
          description: 'Development server',
        },
        {
          url: 'https://api.finjini.com',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your JWT token',
          },
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
            description: 'API key for authentication',
          },
        },
        responses: {
          UnauthorizedError: {
            description: 'Authentication information is missing or invalid',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'number', example: 401 },
                    error: { type: 'string', example: 'Unauthorized' },
                    message: { type: 'string', example: 'Missing or invalid authentication' },
                  },
                },
              },
            },
          },
          ValidationError: {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    statusCode: { type: 'number', example: 400 },
                    error: { type: 'string', example: 'Bad Request' },
                    message: { type: 'string', example: 'Validation failed' },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // Only register Scalar API Reference when enabled
  if ((process.env.SCALAR_UI_ENABLED || 'true').toLowerCase() === 'true') {
    await fastify.register(import('@scalar/fastify-api-reference'), {
      routePrefix: '/docs',
      configuration: {
        title: 'Finjini API Documentation',
        theme: 'mars', // Options: default, purple, blue, green, mint, zinc
      },
    });
  }
});
