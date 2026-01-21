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
  const processStartTime = performance.now();
  const currentDate = new Date().toISOString().split('T')[0];

  console.log(`[ValidateKaro] ⏱️  Starting PDF processing for card: ${cardName}`);
  console.log(`[ValidateKaro] Number of PDFs: ${pdfInputs.length}`);
  console.log(`[ValidateKaro] Strategy: Extract -> Chunk -> Analyze -> Merge`);

  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Configuration Error: OpenRouter API key not configured.");
  }

  // STEP 1: Extract text (Client-side)
  const extractStartTime = performance.now();
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
  const extractEndTime = performance.now();
  const extractDuration = ((extractEndTime - extractStartTime) / 1000).toFixed(2);
  console.log(`[ValidateKaro] ⏱️  PDF Extraction completed in ${extractDuration}s`);

  const fullTextCombined = extractedTexts.join("\n\n");
  const totalLength = fullTextCombined.length;
  console.log(`[ValidateKaro] Total extracted text length: ${totalLength} chars`);

  // STEP 2: Smart Chunking
  const chunkStartTime = performance.now();
  // CRITICAL: GLM-4.5-Air has limited context window (~32K tokens total)
  // System prompt ≈ 4K tokens, so chunk must leave room for input + output
  // 8000 chars ≈ 2K tokens input, leaving headroom for 16K output tokens
  // More chunks = more parallel calls, but avoids truncation (finish_reason: length)
  const CHUNK_SIZE = 8000;  // Reduced from 15000 to prevent GLM truncation
  const chunks: string[] = [];

  if (totalLength <= CHUNK_SIZE) {
    chunks.push(fullTextCombined);
  } else {
    // Split into chunks
    let start = 0;
    while (start < totalLength) {
      const end = Math.min(start + CHUNK_SIZE, totalLength);
      chunks.push(fullTextCombined.slice(start, end));
      start = end;
    }
  }
  const chunkEndTime = performance.now();
  const chunkDuration = ((chunkEndTime - chunkStartTime) / 1000).toFixed(2);

  console.log(`[ValidateKaro] ⏱️  Chunking completed in ${chunkDuration}s`);
  console.log(`[ValidateKaro] Created ${chunks.length} chunks for analysis`);
  console.log(`[ValidateKaro] Chunk size: ${CHUNK_SIZE} chars`);
  console.log(`[ValidateKaro] Estimated API calls: ${chunks.length}`);

  onProgress?.('analyzing', `Analyzing ${chunks.length} chunks with AI...`);

  // STEP 3: Parallel AI Analysis
  const aiStartTime = performance.now();

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
    const chunkAIStart = performance.now();
    const result = await analyzeChunk(chunk, cardName, apiKey, currentDate, i, chunks.length);
    const chunkAIDuration = ((performance.now() - chunkAIStart) / 1000).toFixed(2);
    console.log(`[ValidateKaro] ⏱️  Chunk ${i + 1}/${chunks.length} analyzed in ${chunkAIDuration}s`);
    completedChunks++;
    onProgress?.('analyzing', `AI analysis: ${completedChunks}/${chunks.length} chunks complete`);
    return result;
  });

  // Wait for all to complete
  const results = await Promise.all(chunkPromises);
  const aiEndTime = performance.now();
  const aiDuration = ((aiEndTime - aiStartTime) / 1000).toFixed(2);
  console.log(`[ValidateKaro] ⏱️  AI Analysis (all chunks) completed in ${aiDuration}s`);

  // STEP 4: Merge results
  const mergeStartTime = performance.now();
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
  const mergeEndTime = performance.now();
  const mergeDuration = ((mergeEndTime - mergeStartTime) / 1000).toFixed(2);
  console.log(`[ValidateKaro] ⏱️  Results merging completed in ${mergeDuration}s`);

  // Final timing summary
  const processEndTime = performance.now();
  const totalDuration = ((processEndTime - processStartTime) / 1000).toFixed(2);
  console.log(`[ValidateKaro] ═══════════════════════════════════════`);
  console.log(`[ValidateKaro] ⏱️  TOTAL PROCESSING TIME: ${totalDuration}s`);
  console.log(`[ValidateKaro]    ├─ PDF Extraction: ${extractDuration}s`);
  console.log(`[ValidateKaro]    ├─ Chunking: ${chunkDuration}s`);
  console.log(`[ValidateKaro]    ├─ AI Analysis: ${aiDuration}s`);
  console.log(`[ValidateKaro]    └─ Merging: ${mergeDuration}s`);
  console.log(`[ValidateKaro] ═══════════════════════════════════════`);

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
  const systemInstruction = `You are a credit card compliance analyst extracting reward information from "${cardName}" MITC documents.

CONTEXT: This is chunk ${chunkIndex + 1}/${totalChunks} of the document.

CARD NAME MATCHING (FLEXIBLE):
- Accept variations: If card is "Axis Magnus Burgundy", accept "Magnus", "Burgundy", "Axis Magnus", etc.
- Assume "cardholder", "program", or generic references apply to "${cardName}"
- Extract reward tables even if card name isn't repeated in every row

EXTRACTION RULES (PRIORITY ORDER):

1. EXPLICIT MERCHANT RULES (Highest Priority)
   • If Amazon, Flipkart, Swiggy, Zomato, etc. are EXPLICITLY NAMED → use that exact rule
   • Explicit rules override everything else
   • Example: "Swiggy → 10%" means Swiggy gets 10%, NOT any generic "food delivery" rate

2. CATEGORY RULES (Medium Priority)
   • If merchant NOT explicitly named → use category rule
   • "All other merchants", "Other online spends", "Other spends" → applies to unnamed merchants
   • Example: "Other online spends → 1%" + Amazon never mentioned → Amazon gets 1%

3. GENERIC BUCKETS (Lowest Priority)
   • Merchants inherit nearest generic bucket rate if not explicitly listed or excluded

4. STANDARD EXCLUSIONS (Apply Unless Explicitly Overridden)
   Rewards NOT earned on (unless document explicitly allows):
   • Cash: ATM withdrawals, cash advances, quasi-cash, money transfers
   • Wallets: Paytm, PhonePe, Amazon Pay loads
   • EMI, gift cards, vouchers
   • Bank fees: late payment, processing, interest charges
   • Fuel (unless explicitly allowed)
   • Utilities: electricity, water, phone bills (unless explicitly allowed)
   • Insurance, rent, taxes (unless explicitly allowed)
   • Gambling, crypto, govt transactions
   • Reversals, cancelled transactions

5. WHEN TO USE "N/A"
   • Category is COMPLETELY NOT MENTIONED in this chunk → "N/A"
   • If benefit EXISTS but has conditions (minimum spend, limits) → NOT "N/A", extract with conditions

6. LOUNGE ACCESS (Important)
   • If ANY mention of: lounge access, lounge program, airport lounge, complimentary visits
   • Extract as benefit (reward_type: "Complimentary")
   • Put limits/conditions in caps_limits (e.g., "4 visits per quarter", "minimum ₹50k quarterly spend")

---

OUTPUT FORMAT (19 MANDATORY CATEGORIES):

Return ONLY valid JSON with ALL 19 keys below. Each key must have these fields:

{
  "categories": {
    "amazon_spends": {
      "reward_type": "Cashback | Reward Points | Miles | Complimentary | N/A",
      "reward_rate": "5% | 2 points per ₹100 | 4 visits | (empty if N/A)",
      "caps_limits": "Monthly cap ₹500 | Annual cap 10,000 points | (empty if none)",
      "exclusions_conditions": "Excludes EMI | MCC 6300 excluded | (empty if none)",
      "source_in_mitc": "Page 4, Section 3.1 | (empty if N/A)",
      "document_reference": "Axis Magnus MITC | (empty if N/A)",
      "verification_date": "${currentDate}",
      "confidence": 85
    }
  }
}

---

19 SPENDING CATEGORIES (MUST INCLUDE ALL):

1. amazon_spends              → Amazon purchases
2. flipkart_spends            → Flipkart purchases
3. other_online_spends        → Other online shopping (Myntra, Nykaa, etc.)
4. grocery_spends_online      → Online grocery (BigBasket, Blinkit, etc.)
5. online_food_ordering       → Food delivery (Swiggy, Zomato, Uber Eats)
6. mobile_phone_bills         → Mobile/telecom bills
7. electricity_bills          → Electricity bills
8. water_bills                → Water bills
9. fuel                       → Fuel purchases
10. dining_or_going_out       → Restaurants, dining, bars
11. flights_annual            → Flight bookings
12. hotels_annual             → Hotel bookings
13. domestic_lounge_usage_quarterly    → Domestic airport lounge access
14. international_lounge_usage_quarterly → International lounge (Priority Pass, etc.)
15. insurance_health_annual   → Health insurance premiums
16. insurance_car_or_bike_annual → Vehicle insurance premiums
17. rent                      → Rent payments
18. school_fees               → School/education fees
19. other_offline_spends      → Offline store/POS purchases

CRITICAL: Output MUST include ALL 19 keys. Set reward_type to "N/A" if category not mentioned in chunk.`;

  const messages = [
    { role: "system", content: systemInstruction },
    {
      role: "user",
      content: `Analyze this text chunk for "${cardName}". Extract all reward categories found and return ONLY valid JSON.\n\n${textChunk}`
    }
  ];

  const requestBody = JSON.stringify({
    model: "z-ai/glm-4.5-air",  // GLM gives richer, more detailed extraction results
    messages,
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 16384,  // Reduced from 32768 - gives model more input headroom
    top_p: 0.9  // Nucleus sampling for consistent generation
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
    const finishReason = result.choices?.[0]?.finish_reason;

    // Check for token limit issues
    if (finishReason === 'length' && (!content || content.trim().length < 10)) {
      console.error(`[ValidateKaro] Chunk ${chunkIndex + 1}: Response truncated (finish_reason: length) with no/minimal content`);
      console.error(`[ValidateKaro] Chunk ${chunkIndex + 1}: This usually means input exceeded token limit`);
      return { categories: {} };
    }

    if (!content) {
      console.warn(`[ValidateKaro] Chunk ${chunkIndex + 1}: No content in response`);
      return { categories: {} };
    }

    console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: Raw response length: ${content.length} chars`);
    console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: First 200 chars of raw response:`, content.substring(0, 200));

    let jsonStr = content.trim();

    // Try to extract JSON from code blocks
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      jsonStr = match[1].trim();
      console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: Extracted from code block`);
    }

    // Also try to find JSON object directly
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: JSON string length before parse: ${jsonStr.length} chars`);
    console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: First 300 chars of JSON:`, jsonStr.substring(0, 300));

    try {
      const parsed = JSON.parse(jsonStr);
      console.log(`[ValidateKaro] Chunk ${chunkIndex + 1}: Successfully parsed JSON`);
      return { categories: parsed.categories || {}, token_usage: result.usage };
    } catch (parseError) {
      console.error(`[ValidateKaro] Chunk ${chunkIndex + 1}: JSON parse failed`);
      console.error(`[ValidateKaro] Chunk ${chunkIndex + 1}: Parse error:`, parseError);
      console.error(`[ValidateKaro] Chunk ${chunkIndex + 1}: Full JSON string that failed:`, jsonStr);
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

  // Count how many categories have actual data vs N/A
  let specifiedCount = 0;
  let totalCount = 0;

  CANONICAL_KEYS.forEach(key => {
    const data = categories[key];
    totalCount++;

    if (!data) {
      score -= 5; // Missing Category
      return;
    }

    const isSpecified = data.reward_type !== 'N/A';
    if (isSpecified) {
      specifiedCount++;

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

  // CRITICAL: If no categories have actual data extracted, this is a failed extraction
  // Score should reflect that we didn't extract useful information
  if (specifiedCount === 0) {
    console.warn(`[ValidateKaro] Warning: No categories with actual data extracted (all N/A)`);
    score = 0; // Complete extraction failure
  } else if (specifiedCount < 3) {
    // Very few categories extracted - likely partial failure
    console.warn(`[ValidateKaro] Warning: Only ${specifiedCount}/${totalCount} categories have data`);
    score = Math.min(score, 30); // Cap at 30% for minimal extraction
  }

  return Math.max(0, Math.min(100, score));
}