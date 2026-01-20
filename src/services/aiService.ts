import { CANONICAL_KEYS, SPEND_KEY_LABELS } from "../constants";
import { ValidationOutput, ValidationIssue } from "../types";
import * as pdfjsLib from 'pdfjs-dist';

// Point to the worker in the public folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * Extract text from a single PDF using pdfjs-dist (client-side extraction)
 * This preserves table structure by tracking Y-coordinates of text items
 * SAFER for digital PDFs (bank MITCs) - reads embedded text layer directly
 */
async function extractTextFromPDF(
  pdfInput: string,
  index: number
): Promise<string> {
  try {
    console.log(`[ValidateKaro] Doc ${index + 1}: Starting client-side text extraction...`);

    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument(pdfInput);
    const pdf = await loadingTask.promise;

    console.log(`[ValidateKaro] Doc ${index + 1}: PDF loaded - ${pdf.numPages} pages`);

    let fullText = '';

    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      // THE "FINANCIAL SAFETY" TRICK
      // We don't just join strings. We look at Y-coordinates to preserve rows.
      let lastY = -1;
      let pageText = '';

      for (const item of textContent.items as any[]) {
        const currentY = item.transform[5]; // The Y position on the page
        const str = item.str;

        // If Y changes significantly, it's a new line/row
        if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        } else if (lastY !== -1) {
          // Same line, add a space (simulates column separation)
          pageText += ' ';
        }

        pageText += str;
        lastY = currentY;
      }

      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    // Safety Check: If extraction failed (scanned PDF?), throw error
    if (fullText.trim().length < 50) {
      throw new Error("Extracted text is empty. File might be a scanned image.");
    }

    console.log(`[ValidateKaro] Doc ${index + 1}: Extracted ${fullText.length} characters from ${pdf.numPages} pages`);

    return fullText;

  } catch (error: any) {
    console.error(`[ValidateKaro] Doc ${index + 1}: PDF Extraction Error:`, error);
    throw new Error(`Failed to parse PDF text: ${error.message}`);
  }
}

/**
 * Process PDFs for card validation - 2-STEP APPROACH
 * Step 1: Extract text from each PDF individually (avoids payload limit)
 * Step 2: Analyze combined text
 */
// Helper to merge new results into the master result
function mergeValidationResults(
  master: Record<string, any>,
  newResult: Record<string, any>
): Record<string, any> {
  const merged = { ...master };

  CANONICAL_KEYS.forEach(key => {
    // If master doesn't have this key yet, or it's N/A or empty, try to take from newResult
    const masterVal = merged[key];
    const newVal = newResult[key];

    if (!newVal) return; // No new data for this key

    // If master is missing/empty, take new value
    if (!masterVal || masterVal.reward_type === 'N/A' || !masterVal.reward_rate) {
      if (newVal.reward_type !== 'N/A' && newVal.reward_rate) {
        merged[key] = newVal;
      }
    }
    // If both have data, keep the one with higher confidence
    else if (newVal.reward_type !== 'N/A' && newVal.confidence > (masterVal.confidence || 0)) {
      merged[key] = newVal;
    }
  });

  return merged;
}

export async function processPDFsForCard(
  cardName: string,
  pdfInputs: string[],
  onProgress?: (step: string, detail: string) => void
): Promise<ValidationOutput> {
  const currentDate = new Date().toISOString().split('T')[0];

  console.log(`[ValidateKaro] Starting PDF processing for card: ${cardName}`);
  console.log(`[ValidateKaro] Number of PDFs: ${pdfInputs.length}`);
  console.log(`[ValidateKaro] Strategy: Extract -> Chunk -> Analyze -> Merge`);

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Configuration Error: OpenRouter API key not configured.");
  }

  // STEP 1: Extract text (Client-side)
  onProgress?.('analyzing', `Extracting text from ${pdfInputs.length} documents...`);
  const extractedTexts: string[] = [];
  try {
    for (let i = 0; i < pdfInputs.length; i++) {
      onProgress?.('analyzing', `Extracting text from document ${i + 1}/${pdfInputs.length}...`);
      const text = await extractTextFromPDF(pdfInputs[i], i);
      extractedTexts.push(text);
    }
  } catch (err: any) {
    console.error("Text extraction failed:", err);
    throw new Error(`Text extraction failed: ${err.message}`);
  }

  const fullTextCombined = extractedTexts.join("\n\n");
  const totalLength = fullTextCombined.length;
  console.log(`[ValidateKaro] Total extracted text length: ${totalLength} chars`);

  // STEP 2: Smart Chunking
  // We'll split the text into chunks of max ~30,000 characters for faster API responses
  // Smaller chunks = faster processing, and merging keeps the best results
  const CHUNK_SIZE = 30000;
  const chunks: string[] = [];

  if (totalLength <= CHUNK_SIZE) {
    chunks.push(fullTextCombined);
  } else {
    // Split by documents first to avoid breaking context mid-sentence if possible
    let currentChunk = "";

    extractedTexts.forEach((docText, i) => {
      const header = `\n========== DOCUMENT ${i + 1} ==========\n`;
      const textWithHeader = header + docText;

      if (textWithHeader.length > CHUNK_SIZE) {
        // If a single document is huge (like the 98k one), we MUST split it internally
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = "";
        }

        // Sub-chunk this large document
        let remaining = textWithHeader;
        while (remaining.length > 0) {
          let slice = remaining.slice(0, CHUNK_SIZE);
          // Try to find a safe break point (newline) in the last 1000 chars
          const lastNewline = slice.lastIndexOf('\n', slice.length);
          if (lastNewline > slice.length * 0.8) {
            slice = slice.slice(0, lastNewline);
            remaining = remaining.slice(lastNewline + 1);
          } else {
            remaining = remaining.slice(slice.length);
          }
          chunks.push(slice);
        }
      } else {
        // Normal accumulation
        if (currentChunk.length + textWithHeader.length > CHUNK_SIZE) {
          chunks.push(currentChunk);
          currentChunk = textWithHeader;
        } else {
          currentChunk += textWithHeader;
        }
      }
    });
    if (currentChunk.length > 0) chunks.push(currentChunk);
  }

  console.log(`[ValidateKaro] Split content into ${chunks.length} chunks for analysis`);

  // STEP 3: Parallel Analysis & Merging
  console.log(`[ValidateKaro] Starting parallel analysis of ${chunks.length} chunks...`);

  let masterCategories: Record<string, any> = {};

  // Initialize master with N/A
  CANONICAL_KEYS.forEach(key => {
    masterCategories[key] = {
      reward_type: 'N/A',
      reward_rate: '',
      caps_limits: '',
      exclusions_conditions: '',
      source_in_mitc: '',
      document_reference: '',
      verification_date: currentDate,
      confidence: 0
    };
  });

  let totalTokens = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  // Create promises for all chunks with progress tracking
  let completedChunks = 0;
  const chunkPromises = chunks.map(async (chunk, i) => {
    const result = await analyzeChunk(chunk, cardName, apiKey, currentDate, i, chunks.length);
    completedChunks++;
    onProgress?.('analyzing', `AI analysis: ${completedChunks}/${chunks.length} chunks complete`);
    return result;
  });

  // Wait for all to complete
  const results = await Promise.all(chunkPromises);

  // Merge all results
  results.forEach((chunkResult, i) => {
    if (chunkResult.categories) {
      console.log(`[ValidateKaro] Merging result from chunk ${i + 1}`);
      masterCategories = mergeValidationResults(masterCategories, chunkResult.categories);
    }

    if (chunkResult.token_usage) {
      totalTokens.prompt_tokens += chunkResult.token_usage.prompt_tokens;
      totalTokens.completion_tokens += chunkResult.token_usage.completion_tokens;
      totalTokens.total_tokens += chunkResult.token_usage.total_tokens;
    }
  });

  return {
    categories: masterCategories,
    token_usage: totalTokens
  };
}

// Helper to confirm actual API call for a chunk
async function analyzeChunk(
  textChunk: string,
  cardName: string,
  apiKey: string,
  currentDate: string,
  chunkIndex: number,
  totalChunks: number
): Promise<any> {
  const systemInstruction = `You are a credit card compliance analyst.
CONTEXT: The provided text is an excerpt (Chunk ${chunkIndex + 1}/${totalChunks}) from the official MITC documents for the credit card: "${cardName}".

TASK: Extract reward information for the "${cardName}" from the text below.
Since this is an excerpt:
1. ASSUME all "cardholder", "program", or generic references apply to "${cardName}".
2. ACCEPT fuzzy variations of the card name (e.g. if target is "Axis Magnus Burgundy", accept "Magnus", "Burgundy", "Axis Magnus", etc.).
3. If a reward table is present, extract the data even if the specific card name isn't repeated in every row.

You must output a JSON object where the keys are exactly the 19 "Output Keys" listed below.

Critical Rules:
1. Match card name flexibly as per context.
2. If a spending category is COMPLETELY NOT MENTIONED in this chunk, set the "reward_type" to "N/A".
3. IMPORTANT: If a benefit EXISTS but has CONDITIONS (like minimum spend requirements, quarterly limits, complimentary access limits), it is NOT "N/A". Extract it with the conditions in caps_limits and exclusions_conditions.
4. For LOUNGE ACCESS: If the document mentions lounge access, lounge program, airport lounge, complimentary lounge visits, or lounge benefits - extract it as a benefit. Put any minimum spend requirements, visit limits, or eligibility conditions in the caps_limits field.
5. Do not assume rewards that are not mentioned.
6. Ensure 100% accuracy based ONLY on the provided text chunk.

REWARD INTERPRETATION HIERARCHY (CRITICAL - FOLLOW STRICTLY):

A. Explicit Merchant Rules Override Everything
   - If a merchant (Amazon, Flipkart, Swiggy, Zomato, etc.) is EXPLICITLY NAMED anywhere in the offer (main table, footnotes, exclusions, examples), apply ONLY the explicitly stated rule for that merchant.
   - Do NOT fall back to generic categories for explicitly named merchants.
   - Example: If "Swiggy → 10%" is stated, use 10% for Swiggy, NOT any "food delivery" or "other spends" rate.

B. Category-Level Rules Apply When Merchants Are NOT Explicitly Mentioned
   - If a category like "All other merchants", "Other online spends", or "Other spends" is defined, and a merchant (e.g., Amazon/Flipkart) is NOT explicitly listed anywhere, then that merchant inherits the category rule.
   - Example: If document says "Other online spends → 1%" and Amazon is never mentioned, then Amazon gets 1%.

C. Default Inclusion Under Generic Buckets
   - Merchants like Amazon, Flipkart, Myntra, etc. are treated as regular merchants UNLESS:
     * Explicitly listed under a special rate, OR
     * Explicitly excluded
   - If neither applies, they inherit the nearest generic bucket rate.

D. Exclusion Master List Still Applies
   - Even if a merchant falls under "All other merchants", rewards are NOT applicable if the transaction belongs to an excluded category, UNLESS explicitly overridden by the bank.
   - Standard Exclusions (rewards typically NOT earned on):
     * All Reversals, Cancelled Transactions
     * Cash Advances, ATM Cash Withdrawals
     * Quasi-Cash Transactions, Money Transfers, P2P Transfers
     * Wallet Loads (Paytm, PhonePe, Amazon Pay, etc.)
     * Gift Cards and Vouchers, Voucher Purchases
     * EMI Spends
     * Bank Charges & Fees (Late Payment, Processing, Financial, Interest, Service Charges)
     * Education Spends (unless explicitly allowed)
     * Fuel Spends, Fuel Surcharge, Toll Payments (unless explicitly allowed)
     * Gambling, Lottery, Online Skill-Based Gaming
     * Government-related Transactions, Taxes
     * Utility Bill Payments (Electricity, Water, Telecom - unless explicitly allowed)
     * Insurance Payments (unless explicitly allowed)
     * Jewellery Purchases (unless explicitly allowed)
     * Forex Transactions, Cryptocurrency/Digital Asset Transactions
     * Rent Payment (unless explicitly allowed)
     * Railways, Transportation (unless explicitly allowed)
     * Business Services, Contracted Services, Collection Agencies, Security Broker Services
     * Charity, Donations (Religious, Political Organizations)
     * Antique Items, Liquid Assets
     * Load Money, Outstanding Payments
     * Smartpay, Smartbuy portal (unless explicitly allowed)
   - If the document explicitly allows rewards on any of these categories, extract that rule. Otherwise, assume excluded.

E. Conflict Resolution Rule (Apply in This Order)
   1. Merchant-specific rule (highest priority)
   2. Category-specific rule (medium priority)
   3. Generic "other spends" rule (lowest priority)
   - Always prefer explicit mention over inference, and generic buckets over assumptions.

F. No Assumption of Special Treatment
   - Do NOT infer higher or lower rates for a merchant unless the document explicitly states so.
   - Silence means inherit the nearest applicable generic rule.
   - If uncertain, use the generic bucket rate, NOT N/A (unless the category itself is not mentioned).


Spending Categories to Output Keys (Map):
1. Amazon purchases -> amazon_spends
2. Flipkart purchases -> flipkart_spends
3. Other online shopping -> other_online_spends
4. Online grocery shopping -> grocery_spends_online
5. Food delivery apps -> online_food_ordering
6. Mobile phone bills -> mobile_phone_bills
7. Electricity bills -> electricity_bills
8. Water bills -> water_bills
9. Fuel -> fuel
10. Restaurants and dining -> dining_or_going_out
11. Flight bookings (annual) -> flights_annual
12. Hotel bookings (annual) -> hotels_annual
13. Domestic lounge access (complimentary visits, lounge program) -> domestic_lounge_usage_quarterly
14. International lounge access (Priority Pass, lounge program) -> international_lounge_usage_quarterly
15. Health insurance (annual) -> insurance_health_annual
16. Car / bike insurance (annual) -> insurance_car_or_bike_annual
17. Rent payments -> rent
18. School fees -> school_fees
19. Offline shopping (stores/POS) -> other_offline_spends

Mandatory Fields for Each Key:
- reward_type: Cashback / Reward Points / Miles / N/A (use "Complimentary" for free lounge access)
- reward_rate: Exact value (e.g., "5%", "2 visits/quarter", "4 complimentary visits") or empty string if N/A
- caps_limits: Monthly/annual caps, minimum spend requirements, visit limits, or empty string
- exclusions_conditions: MCC restrictions, eligibility conditions, or exclusions or empty string
- source_in_mitc: Page number + section (e.g., "Page 4, Section 3.1") or empty string
- document_reference: Title of the document where rule was found or empty string
- verification_date: "${currentDate}"
- confidence: 0-100 (Integer) - 0 if N/A

Output Format: Return ONLY a valid JSON object with this exact structure:
{
  "categories": {
    "amazon_spends": { "reward_type": "...", "reward_rate": "...", "caps_limits": "...", "exclusions_conditions": "...", "source_in_mitc": "...", "document_reference": "...", "verification_date": "${currentDate}", "confidence": 0 },
    "flipkart_spends": { ...fields... },
    ...all 19 keys...
  }
}`;

  const messages = [
    { role: "system", content: systemInstruction },
    {
      role: "user",
      content: `Analyze this text chunk for "${cardName}". Extract all reward categories found and return ONLY valid JSON.\n\n${textChunk}`
    }
  ];

  const requestBody = JSON.stringify({
    model: "z-ai/glm-4.5-air",
    messages,
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 32768  // Maximum for GLM-4.5-air to prevent any cutoff
  });

  console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}/${totalChunks}: Request size ${(requestBody.length / 1024).toFixed(1)} KB`);

  try {
    // Add timeout for large requests (3 minutes max)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn(`[ValidateKaro] Chunk ${chunkIndex + 1}: Request timed out after 3 minutes`);
      controller.abort();
    }, 180000);

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "ValidateKaro",
        "Content-Type": "application/json"
      },
      body: requestBody,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[ValidateKaro] Chunk ${chunkIndex + 1} Failed with status ${response.status}`);
      return { categories: {} };
    }

    const result = await response.json();
    console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: Full API response structure:`, {
      has_choices: !!result.choices,
      choices_length: result.choices?.length,
      has_message: !!result.choices?.[0]?.message,
      has_content: !!result.choices?.[0]?.message?.content,
      finish_reason: result.choices?.[0]?.finish_reason,
      usage: result.usage
    });

    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      console.warn(`[ValidateKaro] Chunk ${chunkIndex + 1}: No content in response`);
      return { categories: {} };
    }

    console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: Raw response length: ${content.length} chars`);

    let jsonStr = content.trim();

    // Try to extract JSON from code blocks
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
      console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: Extracted from code block`);
    }

    // Try to find JSON object if response has extra text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(jsonStr);
      console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: Successfully parsed JSON`);
      return { categories: parsed.categories || {}, token_usage: result.usage };
    } catch (parseError) {
      console.error(`[ValidateKaro] Chunk ${chunkIndex + 1}: JSON parse failed`);
      console.error(`[ValidateKaro] Chunk ${chunkIndex + 1}: First 500 chars:`, jsonStr.substring(0, 500));
      console.error(`[ValidateKaro] Chunk ${chunkIndex + 1}: Parse error:`, parseError);
      return { categories: {} };
    }
  } catch (e) {
    console.error(`[ValidateKaro] Chunk ${chunkIndex + 1} Error:`, e);
    return { categories: {} };
  }
}


export function extractIssues(data: ValidationOutput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const categories = data.categories || {};

  CANONICAL_KEYS.forEach(key => {
    const cat = categories[key];
    const label = SPEND_KEY_LABELS[key as keyof typeof SPEND_KEY_LABELS] || key;

    if (!cat) {
      issues.push({ key, label, confidence: 0, description: "Category completely missing from model output." });
      return;
    }

    if (cat.reward_type !== 'N/A' && cat.confidence < 75) {
      issues.push({
        key,
        label,
        confidence: cat.confidence,
        description: `Low confidence data found. Source text may be ambiguous or multi-layered.`
      });
    }

    if (cat.reward_type !== 'N/A' && (!cat.source_in_mitc || cat.source_in_mitc.toLowerCase().includes("not specified"))) {
      issues.push({
        key,
        label,
        confidence: cat.confidence,
        description: "Missing citation. Data found but page/section reference is unclear."
      });
    }
  });

  return issues;
}

export function calculateFinalScore(extractedData: ValidationOutput) {
  let score = 100;
  const categories = extractedData.categories || {};

  CANONICAL_KEYS.forEach(key => {
    const data = categories[key];
    if (!data) {
      score -= 5; // Missing Category
      return;
    }

    const isSpecified = data.reward_type !== 'N/A';
    if (isSpecified) {
      // Missing Required Field (Rate/Limit) -3%
      if (!data.reward_rate || data.reward_rate.length < 2) {
        score -= 3;
      }

      // Missing Page/Section Citation -10%
      if (!data.source_in_mitc || data.source_in_mitc.length < 4 || data.source_in_mitc.toLowerCase().includes("not specified")) {
        score -= 10;
      }

      // Low Confidence Model Output (<70) -5%
      if (data.confidence < 70) {
        score -= 5;
      }

      // Ambiguous Caps/Limits -2%
      const vagueTerms = ["check", "refer", "terms", "condition", "mitc", "subject to"];
      const isVague = vagueTerms.some(term => (data.caps_limits || "").toLowerCase().includes(term));
      if (!data.caps_limits || data.caps_limits.length < 3 || isVague) {
        score -= 2;
      }
    }
  });

  return Math.max(0, Math.min(100, score));
}
