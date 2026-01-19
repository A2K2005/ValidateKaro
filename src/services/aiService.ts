import { CANONICAL_KEYS, SPEND_KEY_LABELS } from "../constants";
import { ValidationOutput, ValidationIssue } from "../types";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export async function processPDFsForCard(cardName: string, pdfBase64s: string[]): Promise<ValidationOutput> {
  const currentDate = new Date().toISOString().split('T')[0];
  
  console.log(`[ValidateKaro] Starting PDF processing for card: ${cardName}`);
  console.log(`[ValidateKaro] Number of PDFs: ${pdfBase64s.length}`);

  const systemInstruction = `You are a credit card compliance analyst working with MITC documents.

Target Card (Exact Match Only): ${cardName}

Task: From the uploaded documents, extract information only if it is explicitly applicable to the ${cardName}. You must output a JSON object where the keys are exactly the 19 "Output Keys" listed below.

Critical Rules (Strict):
1. Use exact card name matching.
2. If a spending category is not mentioned, set the "reward_type" to "N/A" and other fields to empty strings.
3. Do not assume rewards.
4. Ensure 100% accuracy based ONLY on the provided text.

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
13. Domestic lounge access -> domestic_lounge_usage_quarterly
14. International lounge access -> international_lounge_usage_quarterly
15. Health insurance (annual) -> insurance_health_annual
16. Car / bike insurance (annual) -> insurance_car_or_bike_annual
17. Rent payments -> rent
18. School fees -> school_fees
19. Offline shopping (stores/POS) -> other_offline_spends

Mandatory Fields for Each Key:
- reward_type: Cashback / Reward Points / Miles / N/A
- reward_rate: Exact value (e.g., "5%") or empty string if N/A
- caps_limits: Monthly/annual caps or empty string
- exclusions_conditions: MCC restrictions or exclusions or empty string
- source_in_mitc: Page number + section (e.g., "Page 4, Section 3.1") or empty string
- document_reference: Title of the document where rule was found or empty string
- verification_date: "${currentDate}"
- confidence: 0-100 (Integer) - 0 if N/A

Output Format: Return ONLY a valid JSON object with this exact structure:
{
  "categories": {
    "amazon_spends": { ...fields... },
    "flipkart_spends": { ...fields... },
    ...all 19 keys...
  }
}`;

  const fileContents = pdfBase64s.map((base64, index) => ({
    type: "file" as const,
    file: {
      filename: `document_${index + 1}.pdf`,
      file_data: `data:application/pdf;base64,${base64}`
    }
  }));

  const messages = [
    { role: "system", content: systemInstruction },
    { 
      role: "user", 
      content: [
        { type: "text", text: `Analyze the uploaded MITC documents for "${cardName}". Extract all reward categories and return ONLY valid JSON.` },
        ...fileContents
      ]
    }
  ];

    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error("Configuration Error: OpenRouter API key not configured. Please add VITE_OPENROUTER_API_KEY to your environment.");
    }

  console.log(`[ValidateKaro] Sending request to OpenRouter...`);

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "ValidateKaro",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "zhipuai/glm-4.5-air",
      messages,
      plugins: [{
        id: "file-parser",
        pdf: { engine: "pdf-text" }
      }],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 8192
    })
  });

  console.log(`[ValidateKaro] Response status: ${response.status}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `API Error: ${response.status}`;
    console.error(`[ValidateKaro] API Error:`, errorData);
    throw new Error(`OpenRouter API Error: ${errorMessage}`);
  }

  const result = await response.json();
  console.log(`[ValidateKaro] Response received:`, result);
  const text = result.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Audit engine failure: No content returned from OpenRouter.");
  }

  try {
    let jsonStr = text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    if (!parsed.categories) {
      throw new Error("Validation failed: Schema root 'categories' missing.");
    }
    
    const normalizedCategories: Record<string, any> = {};
    CANONICAL_KEYS.forEach(key => {
      if (parsed.categories[key]) {
        normalizedCategories[key] = {
          reward_type: parsed.categories[key].reward_type || 'N/A',
          reward_rate: parsed.categories[key].reward_rate || '',
          caps_limits: parsed.categories[key].caps_limits || '',
          exclusions_conditions: parsed.categories[key].exclusions_conditions || '',
          source_in_mitc: parsed.categories[key].source_in_mitc || '',
          document_reference: parsed.categories[key].document_reference || '',
          verification_date: parsed.categories[key].verification_date || currentDate,
          confidence: typeof parsed.categories[key].confidence === 'number' ? parsed.categories[key].confidence : 0
        };
      } else {
        normalizedCategories[key] = {
          reward_type: 'N/A',
          reward_rate: '',
          caps_limits: '',
          exclusions_conditions: '',
          source_in_mitc: '',
          document_reference: '',
          verification_date: currentDate,
          confidence: 0
        };
      }
    });

    return {
      categories: normalizedCategories,
      token_usage: result.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  } catch (e: any) {
    console.error("JSON Parse Error:", e, "Raw text:", text);
    throw new Error(`Data extraction failed: ${e.message || 'Model returned malformed JSON structure.'}`);
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
      // Heuristic: If reward_type is specified but caps_limits is empty or too vague
      const vagueTerms = ["check", "refer", "terms", "condition", "mitc", "subject to"];
      const isVague = vagueTerms.some(term => (data.caps_limits || "").toLowerCase().includes(term));
      if (!data.caps_limits || data.caps_limits.length < 3 || isVague) {
        score -= 2;
      }
    }
  });

  return Math.max(0, Math.min(100, score));
}
