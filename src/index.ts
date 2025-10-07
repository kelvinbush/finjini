/**
 * Fastify server entry point with best practices
 */
import "dotenv/config";
import Fastify, { type FastifyInstance } from "fastify";
import { logger } from "./utils/logger";
import { corsPlugin } from "./plugins/cors";
import { databasePlugin } from "./plugins/database";
import { helmetPlugin } from "./plugins/helmet";
import { rateLimitPlugin } from "./plugins/rate-limit";
import { rawBodyPlugin } from "./plugins/raw-body";
import { requestLoggerPlugin } from "./plugins/request-logger";
import { swaggerPlugin } from "./plugins/swagger";
import { sql } from "drizzle-orm";
import { registerParserRoutes } from "./routes/parser.routes";

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

// Create Fastify instance with optimized configuration
const app: FastifyInstance = Fastify({
  logger: false, // Using custom logger
  trustProxy: true, // Trust proxy headers for rate limiting and IP detection
  requestIdHeader: "x-request-id",
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

    logger.info("Core plugins registered successfully");
  } catch (error) {
    logger.error("Failed to register plugins:", error);
    throw error;
  }
}

/**
 * Register application routes
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Register parser routes
  await registerParserRoutes(fastify);
  // Root endpoint
  fastify.get("/", {
    schema: {
      description: "Welcome endpoint",
      tags: ["General"],
      response: {
        200: {
          type: "object",
          properties: {
            message: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            version: { type: "string" },
          },
        },
      },
    },
  }, async () => {
    return {
      message: "Hello from Finjini API!",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };
  });

  // Health check endpoint with database validation
  fastify.get("/health", {
    schema: {
      description: "Health check endpoint with database validation",
      tags: ["Health"],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            uptime: { type: "number", description: "Server uptime in seconds" },
            database: {
              type: "object",
              properties: {
                connected: { type: "boolean" },
              },
            },
          },
        },
        503: {
          type: "object",
          properties: {
            status: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
            database: {
              type: "object",
              properties: {
                connected: { type: "boolean" },
              },
            },
            error: { type: "string" },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      await fastify.db.execute(sql`SELECT 1 AS ok`);
      return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: { connected: true },
      };
    } catch (err) {
      request.log.error(err, "Database health check failed");
      return reply.status(503).send({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: { connected: false },
        error: "Database connection failed",
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
      logger.info("Server closed successfully");
      process.exit(0);
    } catch (err) {
      logger.error("Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

/**
 * Start the Fastify server
 */
export async function startServer(): Promise<FastifyInstance> {
  try {
    // Register core plugins
    await registerPlugins(app);
    
    // Register Swagger plugin BEFORE routes (so it can detect route schemas)
    await app.register(swaggerPlugin);
    
    // Register routes
    await registerRoutes(app);

    // Start listening
    await app.listen({ port: PORT, host: HOST });

    const address = app.server.address();
    const serverPort =
      typeof address === "object" && address !== null ? address.port : PORT;
    logger.info(`🚀 Server listening at http://${HOST}:${serverPort}`);

    // Setup graceful shutdown
    setupGracefulShutdown(app);

    return app;
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Export app instance for testing
export { app };

// Start server when executed directly

void startServer();
