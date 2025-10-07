/**
 * Fastify server entry point with best practices
 */
import 'dotenv/config';
import Fastify, { type FastifyInstance } from 'fastify';
import { logger } from './utils/logger';
import { corsPlugin } from './plugins/cors';
import { databasePlugin } from './plugins/database';
import { helmetPlugin } from './plugins/helmet';
import { rateLimitPlugin } from './plugins/rate-limit';
import { rawBodyPlugin } from './plugins/raw-body';
import { requestLoggerPlugin } from './plugins/request-logger';
import { swaggerPlugin } from './plugins/swagger';
import { sql } from 'drizzle-orm';

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Create Fastify instance with optimized configuration
const app: FastifyInstance = Fastify({
  logger: false, // Using custom logger
  trustProxy: true, // Trust proxy headers for rate limiting and IP detection
  requestIdHeader: 'x-request-id',
  genReqId: () => crypto.randomUUID(),
});

/**
 * Register all plugins in the correct order
 */
export async function registerPlugins(fastify: FastifyInstance): Promise<void> {
  try {
    // Security plugins first
    await fastify.register(helmetPlugin);
    await fastify.register(corsPlugin);
    await fastify.register(rateLimitPlugin);
    
    // Body parsing and request handling
    await fastify.register(rawBodyPlugin);
    
    // Infrastructure
    await fastify.register(databasePlugin);
    await fastify.register(requestLoggerPlugin);
    await fastify.register(swaggerPlugin);
    
    logger.info('All plugins registered successfully');
  } catch (error) {
    logger.error('Failed to register plugins:', error);
    throw error;
  }
}

/**
 * Register application routes
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Root endpoint
  fastify.get('/', async () => {
    return { message: 'Hello from Fastify!' };
  });

  // Health check endpoint with database validation
  fastify.get('/health', async (request, reply) => {
    try {
      await fastify.db.execute(sql`SELECT 1 AS ok`);
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: { connected: true },
      };
    } catch (err) {
      request.log.error(err, 'Database health check failed');
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: { connected: false },
        error: 'Database connection failed',
      });
    }
  });
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(fastify: FastifyInstance): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    try {
      await fastify.close();
      logger.info('Server closed successfully');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Start the Fastify server
 */
export async function startServer(): Promise<FastifyInstance> {
  try {
    // Register plugins and routes
    await registerPlugins(app);
    await registerRoutes(app);
    
    // Start listening
    await app.listen({ port: PORT, host: HOST });
    
    const address = app.server.address();
    const serverPort = typeof address === 'object' && address !== null ? address.port : PORT;
    logger.info(`🚀 Server listening at http://${HOST}:${serverPort}`);
    
    // Setup graceful shutdown
    setupGracefulShutdown(app);
    
    return app;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export app instance for testing
export { app };

// Start server when executed directly
if (import.meta.main) {
  void startServer();
}