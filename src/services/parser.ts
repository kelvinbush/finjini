/**
 * Mistral AI Parser Service for Financial Data Extraction
 */
import { Mistral } from "@mistralai/mistralai";
import { logger } from "../utils/logger";
import type { NewTransaction } from "../db/schema";
import { config as loadEnv } from "dotenv";

loadEnv();

// Initialize Mistral client
const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

// Type for the parsed transaction data (excluding id and userId)
export interface ParsedTransaction {
  rawText: string;
  date: string | null;
  name: string | null;
  type: "income" | "expense" | null;
  amount: number | null;
  mistralResponse?: any; // Raw response from Mistral AI
}


/**
 * Extract financial details from text/SMS using OpenAI
 */
export async function parseFinancialText(
  text: string,
): Promise<ParsedTransaction[]> {
  try {
    if (!process.env.MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY environment variable is not set");
    }

    const prompt = `
You are a financial data extraction assistant. Extract financial transaction details from the following text/SMS message(s).

IMPORTANT: The text may contain MULTIPLE transactions (multiple SMS messages copied together). If you detect multiple transactions, return an array of transactions. If only one transaction, return a single object.

Rules:
1. Return ONLY valid JSON - either a single object or array of objects
2. If you're not sure about a value, use null
3. For dates, use ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ) if possible, or null if unclear
4. For amounts, extract only the numeric value (no currency symbols)
5. For type, analyze the transaction flow:
   - EXPENSE: Money leaving your account (purchases, payments, transfers out, withdrawals, bills, fees)
   - INCOME: Money entering your account (deposits, salary, refunds, payments received, cashback)
   - Look for keywords: "sent to", "paid to", "transferred to" = EXPENSE
   - Look for keywords: "received from", "deposited", "credited" = INCOME
6. For name, extract the recipient, merchant, service, or transaction description
7. Each transaction should have its own rawText extracted from the original message

Text to parse: "${text}"

Return JSON in ONE of these formats:

Single transaction:
{
  "rawText": "extracted transaction text",
  "date": "2024-01-15T10:30:00Z" or null,
  "name": "Merchant/Service name" or null,
  "type": "income" or "expense" or null,
  "amount": 123.45 or null
}

Multiple transactions:
[
  {
    "rawText": "first transaction text",
    "date": "2024-01-15T10:30:00Z" or null,
    "name": "Merchant/Service name" or null,
    "type": "income" or "expense" or null,
    "amount": 123.45 or null
  },
  {
    "rawText": "second transaction text",
    "date": "2024-01-16T11:30:00Z" or null,
    "name": "Another Merchant" or null,
    "type": "income" or "expense" or null,
    "amount": 67.89 or null
  }
]
`;

    const completion = await mistral.chat.complete({
      model: "open-mistral-nemo", // Medium model for better availability
      messages: [
        {
          role: "system",
          content:
            "You are a financial data extraction assistant. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent results
      maxTokens: 500,
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from Mistral AI");
    }

    // Extract text from ContentChunk[] if needed
    const responseText = Array.isArray(responseContent) 
      ? responseContent.map(chunk => 'text' in chunk ? chunk.text : '').join('')
      : responseContent;

    // Parse the JSON response
    const parsedResponse = JSON.parse(responseText);

    // Handle both single object and array responses
    const transactions = Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];

    // Validate and clean each transaction
    const results: ParsedTransaction[] = transactions.map((transaction) => ({
      rawText: transaction.rawText || text,
      date: transaction.date || null,
      name: transaction.name || null,
      type: transaction.type === "income" || transaction.type === "expense" ? transaction.type : null,
      amount: typeof transaction.amount === "number" ? transaction.amount : null,
    }));

    return results;
  } catch (error) {
    logger.error("Failed to parse financial text", {
      error: error instanceof Error ? error.message : "Unknown error",
      text,
    });

    // Return a fallback response with the original text
    return [
      {
        rawText: text,
        date: null,
        name: null,
        type: null,
        amount: null,
      },
    ];
  }
}

/**
 * Batch parse multiple texts
 */
export async function parseMultipleFinancialTexts(
  texts: string[],
): Promise<ParsedTransaction[]> {
  const results: ParsedTransaction[] = [];

  // Process texts in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((text) => parseFinancialText(text)),
    );
    // Flatten the results since parseFinancialText now returns arrays
    results.push(...batchResults.flat());

    // Small delay between batches to respect rate limits
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Convert parsed transaction to database format
 */
export function toDatabaseFormat(
  parsedTransaction: ParsedTransaction,
  userId: string,
): NewTransaction {
  return {
    rawText: parsedTransaction.rawText,
    date: parsedTransaction.date
      ? new Date(parsedTransaction.date)
      : new Date(),
    name: parsedTransaction.name,
    type: parsedTransaction.type || "expense", // Default to expense if unclear
    amount: parsedTransaction.amount || 0,
    userId: userId,
  };
}
