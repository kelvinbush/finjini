/**
 * Parser Route Schemas
 */

export const parseTextSchema = {
  description: 'Parse financial details from a single text/SMS',
  tags: ['Parser'],
  body: {
    type: 'object',
    required: ['text'],
    properties: {
      text: {
        type: 'string',
        description: 'The text/SMS to parse for financial details'
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rawText: { type: 'string' },
              date: { type: 'string', nullable: true },
              name: { type: 'string', nullable: true },
              type: { type: 'string', enum: ['income', 'expense'], nullable: true },
              amount: { type: 'number', nullable: true }
            }
          }
        },
        count: { type: 'number', description: 'Number of transactions found' }
      }
    },
    400: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' }
      }
    }
  }
};

export const parseMultipleTextsSchema = {
  description: 'Parse financial details from multiple texts/SMS',
  tags: ['Parser'],
  body: {
    type: 'object',
    required: ['texts'],
    properties: {
      texts: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of texts/SMS to parse'
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rawText: { type: 'string' },
              date: { type: 'string', nullable: true },
              name: { type: 'string', nullable: true },
              type: { type: 'string', enum: ['income', 'expense'], nullable: true },
              amount: { type: 'number', nullable: true }
            }
          }
        },
        count: { type: 'number', description: 'Total number of transactions found' }
      }
    },
    400: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' }
      }
    }
  }
};

export const parseAndSaveSchema = {
  description: 'Parse financial details from text and save to database',
  tags: ['Parser'],
  body: {
    type: 'object',
    required: ['text', 'userId'],
    properties: {
      text: {
        type: 'string',
        description: 'The text/SMS to parse for financial details'
      },
      userId: {
        type: 'string',
        description: 'The user ID to associate with this transaction'
      }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              rawText: { type: 'string' },
              date: { type: 'string' },
              name: { type: 'string', nullable: true },
              type: { type: 'string', enum: ['income', 'expense'] },
              amount: { type: 'number' },
              userId: { type: 'string' },
              createdAt: { type: 'string' }
            }
          }
        },
        count: { type: 'number', description: 'Number of transactions saved' }
      }
    },
    400: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' }
      }
    }
  }
};

export const getUserTransactionsSchema = {
  description: 'Get all parsed transactions for a specific user',
  tags: ['Parser'],
  params: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The user ID to get transactions for'
      }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of transactions to return',
        default: 50
      },
      offset: {
        type: 'number',
        description: 'Number of transactions to skip',
        default: 0
      }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              rawText: { type: 'string' },
              date: { type: 'string' },
              name: { type: 'string', nullable: true },
              type: { type: 'string', enum: ['income', 'expense'] },
              amount: { type: 'number' },
              userId: { type: 'string' },
              createdAt: { type: 'string' }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            limit: { type: 'number' },
            offset: { type: 'number' },
            total: { type: 'number' }
          }
        }
      }
    }
  }
};
