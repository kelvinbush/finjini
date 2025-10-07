/**
 * Parser Routes for Financial Data Extraction
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { parseFinancialText, parseMultipleFinancialTexts, toDatabaseFormat } from '../services/parser';
import { transactions } from '../db/schema/transactions';
import { eq } from 'drizzle-orm';
import { 
  parseTextSchema, 
  parseMultipleTextsSchema, 
  parseAndSaveSchema, 
  getUserTransactionsSchema 
} from '../schemas/parser.schemas';

// Request/Response types
interface ParseTextRequest {
  Body: {
    text: string;
  };
}

interface ParseMultipleTextsRequest {
  Body: {
    texts: string[];
  };
}

interface ParseAndSaveRequest {
  Body: {
    text: string;
    userId: string;
  };
}

/**
 * Register parser routes
 */
export async function registerParserRoutes(fastify: FastifyInstance): Promise<void> {
  
  // Parse single text
  fastify.post<ParseTextRequest>('/parse/text', {
    schema: parseTextSchema
  }, async (request: FastifyRequest<ParseTextRequest>, reply: FastifyReply) => {
    try {
      const { text } = request.body;
      
      if (!text || text.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Text is required and cannot be empty'
        });
      }

      const parsedData = await parseFinancialText(text);
      
      return reply.send({
        success: true,
        data: parsedData,
        count: parsedData.length
      });

    } catch (error) {
      request.log.error(error, 'Error parsing text:');
      return reply.status(500).send({
        success: false,
        error: 'Failed to parse text'
      });
    }
  });

  // Parse multiple texts
  fastify.post<ParseMultipleTextsRequest>('/parse/texts', {
    schema: parseMultipleTextsSchema
  }, async (request: FastifyRequest<ParseMultipleTextsRequest>, reply: FastifyReply) => {
    try {
      const { texts } = request.body;
      
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Texts array is required and cannot be empty'
        });
      }

      if (texts.length > 10) {
        return reply.status(400).send({
          success: false,
          error: 'Maximum 10 texts can be processed at once'
        });
      }

      const parsedData = await parseMultipleFinancialTexts(texts);
      
      return reply.send({
        success: true,
        data: parsedData,
        count: parsedData.length
      });

    } catch (error) {
      request.log.error(error, 'Error parsing texts:');
      return reply.status(500).send({
        success: false,
        error: 'Failed to parse texts'
      });
    }
  });

  // Parse and save to database
  fastify.post<ParseAndSaveRequest>('/parse/save', {
    schema: parseAndSaveSchema
  }, async (request: FastifyRequest<ParseAndSaveRequest>, reply: FastifyReply) => {
    try {
      const { text, userId } = request.body;
      
      if (!text || text.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Text is required and cannot be empty'
        });
      }

      if (!userId || userId.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'User ID is required'
        });
      }

      // Parse the text
      const parsedData = await parseFinancialText(text);
      
      // Save all transactions to database
      const savedTransactions = [];
      for (const transaction of parsedData) {
        const transactionData = toDatabaseFormat(transaction, userId);
        const [savedTransaction] = await fastify.db
          .insert(transactions)
          .values(transactionData)
          .returning();
        savedTransactions.push(savedTransaction);
      }
      
      return reply.status(201).send({
        success: true,
        data: savedTransactions,
        count: savedTransactions.length
      });

    } catch (error) {
      request.log.error(error, 'Error parsing and saving text:');
      return reply.status(500).send({
        success: false,
        error: 'Failed to parse and save text'
      });
    }
  });

  // Get parsed transactions for a user
  fastify.get('/parse/transactions/:userId', {
    schema: getUserTransactionsSchema
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string };
      const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };
      
      // Get transactions for the user
      const userTransactions = await fastify.db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .limit(limit)
        .offset(offset)
        .orderBy(transactions.createdAt);
      
      // Get total count
      const [totalResult] = await fastify.db
        .select({ count: transactions.id })
        .from(transactions)
        .where(eq(transactions.userId, userId));
      
      return reply.send({
        success: true,
        data: userTransactions,
        pagination: {
          limit,
          offset,
          total: totalResult?.count || 0
        }
      });

    } catch (error) {
      request.log.error(error, 'Error getting user transactions:');
      return reply.status(500).send({
        success: false,
        error: 'Failed to get transactions'
      });
    }
  });
}
