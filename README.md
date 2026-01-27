# ValidateKaro 🛡️

**AI-Powered Credit Card Compliance Validation System**

ValidateKaro is an internal operations tool that automates the extraction and validation of credit card reward information from MITC (Most Important Terms & Conditions) documents using advanced AI analysis.

---

## 🌟 Features

### Core Capabilities
- **🤖 AI-Powered Extraction** - Uses GLM-4.5-Air via OpenRouter to analyze MITC PDFs and extract reward structures
- **📄 Client-Side PDF Processing** - Secure, browser-based text extraction with `pdfjs-dist` that preserves table structure via Y-coordinate tracking
- **✂️ Smart Chunking** - Automatically splits large documents into ~8000 character chunks for reliable parallel processing
- **⚡ Parallel Analysis** - Processes all chunks simultaneously with intelligent result merging based on confidence scores
- **🔄 Re-Analysis** - Re-run AI extraction on existing cards without re-uploading PDFs
- **🎯 Fuzzy Card Matching** - Accepts variations of card names (e.g., "Magnus", "Burgundy", "Axis Magnus" all match)
- **💾 Dual Storage** - Saves to both Supabase (cloud) and localStorage (offline fallback)
- **📊 Real-time Progress Tracking** - Live overlay showing job status, progress percentage, and detailed activity logs
- **⏱️ Comprehensive Timing Logs** - Detailed performance metrics for PDF extraction, chunking, AI analysis, and merging
- **✈️ Partner Transfers V2** - Smart card type detection with intelligent fallback for partner transfer options
- **💰 Rewards Calculator** - Transaction-based reward point calculations with partner conversion options
- **✅ Manual Approval** - Override automatic validation and manually approve cards regardless of confidence score

### Extracted Data Points
Automatically extracts reward information for 24 spending categories:
- 🛒 E-commerce (Amazon, Flipkart, Other Online)
- 🍔 Food & Groceries (Online grocery, Offline grocery, Food delivery)
- 💡 Utilities (Mobile, Electricity, Water bills, OTT subscriptions)
- ✈️ Travel (Flights, Hotels, Domestic/International Lounge access)
- 🏥 Insurance (Health, Car/Bike, Life Insurance)
- 🏪 Shopping (Electronics, Pharmacy, Offline stores)
- 📦 General (Rent, School fees, Fuel, Dining, etc.)

### For Each Category
- ✅ Reward type (Cashback / Reward Points / Miles / Complimentary / N/A)
- ✅ Reward rate (e.g., "12 EDGE Points per Rs. 200", "4 complimentary visits")
- ✅ Caps & limits (monthly/annual caps, minimum spend requirements)
- ✅ Exclusions & conditions (MCC restrictions, eligibility conditions)
- ✅ Source citation from MITC (page + section reference)
- ✅ Document reference (which document the rule was found in)
- ✅ Confidence score (0-100%)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ or **Bun** runtime
- **Supabase** account (free tier works)
- **OpenRouter** API key (for GLM-4.5-Air access)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd validatekaro_v1
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Configure environment variables**

   Create `.env` file with your values:
   ```env
   VITE_OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Set up Supabase database**

   Run the SQL schema in your Supabase SQL Editor:
   ```bash
   # Open supabase-schema.sql and copy all contents
   # Paste into Supabase Dashboard → SQL Editor → Run
   ```

5. **Start the development server**
   ```bash
   bun run dev
   # or
   npm run dev
   ```

6. **Open the app**
   ```
   http://localhost:3000
   ```

---

## 📁 Project Structure

```
validatekaro_v1/
├── public/
│   └── pdf.worker.min.mjs           # PDF.js worker for client-side extraction
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx              # Navigation sidebar
│   │   ├── UploadModal.tsx          # PDF upload with bank/card dropdowns
│   │   ├── ValidationView.tsx       # Detailed results with Partner Transfers tab
│   │   ├── JsonModal.tsx            # Raw JSON viewer
│   │   ├── PartnerConversionPanel.tsx # Transfer partner display UI
│   │   └── ui/                      # Shadcn UI components (Button, Card, Tabs, etc.)
│   ├── services/
│   │   ├── aiService.ts             # PDF extraction & AI analysis logic
│   │   ├── supabaseService.ts       # Database & storage operations
│   │   └── rewardsEngine/           # V2 Rewards calculation engine
│   │       ├── index.ts             # Barrel exports
│   │       ├── types.ts             # TypeScript type definitions
│   │       ├── redemptionsV2.ts     # V2 Partner transfer logic with fallbacks
│   │       ├── calculator.ts        # Transaction rewards calculator
│   │       └── missingDataHandler.ts # Missing ratio tracking
│   ├── lib/
│   │   ├── supabase.ts              # Supabase client configuration
│   │   └── utils.ts                 # Utility functions
│   ├── types.ts                     # TypeScript interfaces
│   ├── constants.ts                 # Category keys & labels
│   └── App.tsx                      # Main application with dashboard
├── card_partners_v2.json            # V2 Partner data (94 cards, bank-centric)
├── supabase-schema.sql              # Database schema
└── README.md
```

---

## 🎯 Rewards Engine V2

The V2 Rewards Engine provides comprehensive credit card reward calculations with intelligent card type detection and partner program transfer functionality.

### V2 Migration & Consolidation

**Key Changes:**
- **Single Source of Truth**: `card_partners_v2.json` - bank-centric structure with 94 cards
- **Card Type Filtering**: Explicit `card_type` field (`rewards` or `cashback`) for all cards
- **Smart Fallback System**: 3-layer lookup strategy for unknown cards
- **Deprecated Files**: Removed old `redemptions.ts`, `partnerLookup.ts`, and `reward-cashback.json`

### Card Type System

**Rewards Cards (81 cards):**
- Earn transferable reward points
- Show partner transfer options
- Fallback to bank defaults if card not found

**Cashback Cards (13 cards):**
- Earn direct cashback
- **No partner transfers** - explicitly return empty list
- No fallback to bank partners

Examples:
- `HDFC Swiggy` → Cashback → No partners shown
- `Axis Magnus` → Rewards → Full partner list
- `SBI Cashback` → Cashback → No partners shown

### 3-Layer Fallback Strategy

When looking up partner transfers:

1. **Exact Card Match** - Find specific card in JSON (e.g., "Axis Magnus Burgundy")
2. **Fuzzy Keyword Match** - Match by keywords (e.g., "Random Card" → finds bank-level partners)
3. **Bank-Level Default** - Use default card for that bank (e.g., Axis → "Axis Magnus")

**Cashback Override**: If card is identified as `card_type: 'cashback'`, returns empty list (no fallback).

### Features

- **Automatic Card Type Detection** - Determine cashback vs rewards cards
- **Bank-Centric Data Structure** - Organized by bank with default cards
- **Partner Transfer Lookup** - Find airline/hotel transfer partners for any rewards card
- **Conversion Calculations** - Calculate partner points with ratio support (e.g., 5:4, 3:1, 1:1)
- **Transaction Rewards** - Calculate rewards earned from spending with category-wise breakdown
- **Missing Data Tracking** - Track and report missing conversion ratios
- **Subcategory Support** - Domestic vs International partner categorization
- **Proper Point Names** - Display correct terminology ("EDGE Rewards", "Membership Rewards", etc.)

### Partner Transfers Tab

The ValidationView includes a **Partner Transfers** tab that displays:
- Category-wise reward points earned (based on extracted reward rates)
- Available partner transfer options for each category
- Conversion ratios and minimum points requirements
- Estimated values with appropriate disclaimers
- Filtering by partner category (Airlines, Hotels, Vouchers)
- **Automatic hiding for cashback cards**

### Quick Start

```typescript
import {
  getCardType,
  calculateRewardsForTransaction,
  getPartnerConversionsV2,
  getBestValueV2,
} from '@/services/rewardsEngine';

// Check if card earns rewards or cashback
const cardType = getCardType('HDFC Swiggy');
// => 'cashback'

const cardType2 = getCardType('HDFC Infinia');
// => 'rewards'

// Calculate rewards from a transaction
const result = calculateRewardsForTransaction(
  1000,                        // Transaction amount (Rs.)
  'Axis Atlas Credit Card',    // Card name
  5,                           // Reward rate (points per Rs.100)
  'Travel'                     // Spending category
);
// => { earned: 50, partnerConversions: [...], bankPointsType: 'EDGE Rewards', ... }

// Get partner conversions (V2 with fallback)
const partners = getPartnerConversionsV2(10000, 'Axis Magnus Burgundy');
// => [{ partnerId: 'marriott', ratio: '5:4', ... }]

// Cashback card returns empty
const cashbackPartners = getPartnerConversionsV2(5000, 'HDFC Swiggy');
// => []

// Get best value conversion
const bestValue = getBestValueV2(10000, 'Axis Magnus');
// => { partnerId: 'marriott', partnerPoints: 12500, estimatedValue: 'Rs. 25,000', ... }
```

### Supported Cards (94 Total)

| Bank | Cards | Examples |
|------|-------|----------|
| **Axis Bank** (28) | Magnus, Atlas, Reserve, Vistara, Privilege, Select, Aura, Neo, Flipkart, Airtel, ACE, Horizon, Cashback, etc. | Rewards + Cashback |
| **HDFC Bank** (35) | Infinia, Diners Club Black, Regalia Gold, Millenia, Marriott Bonvoy, Swiggy, Tata Neu, Bharat, Biz First, PIXEL, etc. | Rewards + Cashback |
| **American Express** (8) | Platinum Travel, MRCC, Smart Earn, Gold, Platinum Charge, Platinum Reserve, etc. | All Rewards |
| **SBI Card** (13) | Elite, Aurum, Prime, Miles, Simply Click, Cashback, BPCL Octane, Pulse, Flipkart, IRCTC, etc. | Rewards + Cashback |
| **ICICI Bank** (10) | Emeralde, Sapphiro, Rubyx, HPCL Coral, Amazon Pay, MakeMyTrip, Times Black, etc. | Rewards + Cashback |
| **IDFC FIRST** (13) | Select, Wealth, Private, Club Vistara, Millenia, Power, Ashva, Mayura, Dual Indigo, SWYP, etc. | All Rewards |
| **IndusInd** (7) | Legend, EasyDiner, Avios, Platinum RuPay, Aura Edge, Tiger, Generic | All Rewards |
| **AU Bank** (6) | Zenith, Zenith Plus, Altura, Nomo, Altura Plus, LIT | Rewards + Cashback |
| **HSBC** (6) | Live+, Platinum, Premier, Cashback, RuPay Cashback, Travel One | Rewards + Cashback |
| **RBL Bank** (10) | Shoprite, World Safari, Insignia, IndianOil, IndianOil XTRA, Cookies, Play, Super Binge, IRCTC, etc. | All Rewards |
| **Kotak Bank** (8) | Zen Signature, IndianOil Platinum, Delight, Essentia, League, Mojo, Myntra, PVR | All Rewards |
| **Standard Chartered** (5) | Ultimate, Ease My Trip, Smart, Emirates Platinum, Platinum Rewards | Rewards + Cashback |
| **YES Bank** (2) | Marquee, Pop Club, ACE | All Rewards |
| **Bajaj Finserv** (3) | RBL SuperCard, DBS SuperCard, HDFC SuperCard | All Rewards |
| **Federal Bank** (1) | Credit Cards | Rewards |
| **SBM Bank** (2) | Kredit.Pe, ZET Magnet | All Rewards |
| **Other Issuers** (5) | Jupiter Edge, Kiwi Klick, Scapia, Zagg Rupay, Indian Oil Visa | Various |

### Supported Transfer Partners

| Category | Partners | Notes |
|----------|----------|-------|
| **Airlines Domestic** | Club Vistara, IndiGo 6E Rewards, Air India Flying Returns, InterMiles | Vistara merged with Air India (2024) |
| **Airlines International** | British Airways Avios, Emirates Skywards, Singapore KrisFlyer, Etihad Guest, Qatar Privilege Club, Cathay Asia Miles, Virgin Atlantic, etc. | 15+ programs |
| **Hotels** | Marriott Bonvoy, Hilton Honors, IHG One Rewards, Accor Live Limitless, Taj InnerCircle, Hyatt, Wyndham, etc. | 12+ programs |
| **Vouchers** | Amazon Pay, Flipkart, Tanishq, Postcard Hotels | Select cards only |

### Bank-Level Defaults

When a specific card isn't found, the system falls back to these defaults:

| Bank | Default Card | Program |
|------|-------------|---------|
| Axis Bank | Axis Magnus | EDGE Rewards |
| HDFC Bank | Regalia Gold | Infinia/Diners Points |
| American Express | AMEX MRCC | Membership Rewards |
| SBI Card | SBI Miles Prime | Reward Points |
| AU Bank | AU Zenith | Reward Points |
| IndusInd | IndusInd Legend | Reward Points |
| ICICI Bank | ICICI Emeralde | Reward Points |
| IDFC FIRST | IDFC Select | Reward Points |

### UI Component

```tsx
import { PartnerConversionPanel } from '@/components/PartnerConversionPanel';

<PartnerConversionPanel
  bankPoints={5000}
  bankPointsType="EDGE Rewards"
  sourceCard="Axis Atlas Credit Card"
  partnerConversions={result.partnerConversions}
  onTransferClick={(partnerId) => console.log('Transfer to', partnerId)}
/>
```

**Features:**
- Category tabs (All / Airlines / Hotels / Vouchers)
- Sort by estimated value, conversion ratio, or name
- Minimum points validation
- Warning-styled reference values with disclaimers
- Disabled states for insufficient points
- **Hidden for cashback cards automatically**

### Important Notes

> **Reference Values are for Display Only**
>
> The `displayReference.estimatedValue` field is provided for UI display purposes only.
> Actual redemption values vary significantly based on:
> - Availability and booking class
> - Travel dates and routing
> - Award chart changes
> - Redemption option chosen
>
> Never use these values for "best card" comparisons or automated decisions.

---

## 🗄️ Database Schema

### Tables

#### `audits`
Stores validation results and extracted data.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `process_id` | TEXT | Unique process identifier (6-char alphanumeric) |
| `bank_name` | TEXT | Issuing bank name |
| `card_name` | TEXT | Credit card name |
| `status` | TEXT | `processing`, `approved`, `review_required`, `rejected`, `failed` |
| `confidence_score` | INTEGER | Overall confidence (0-100) |
| `extracted_data` | JSONB | All extracted reward information |
| `issues` | JSONB | Validation issues found |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

#### `audit_files`
Tracks uploaded PDF files.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `audit_id` | UUID | Foreign key to `audits.id` |
| `file_name` | TEXT | Original filename |
| `file_path` | TEXT | Storage path |
| `file_size` | INTEGER | File size in bytes |
| `created_at` | TIMESTAMPTZ | Upload timestamp |

### Storage Buckets

- **`audit-pdfs`** - Stores uploaded MITC PDF documents (public bucket)

---

## 🎯 Usage Guide

### 1. Upload MITC Documents

1. Click **"New Audit"** button (or press `N`)
2. Select **Issuing Bank** from searchable dropdown (16 supported banks)
3. Enter **Card Name** - autocomplete from 157+ cards or enter custom name
4. Upload **PDF files** (max 10, drag & drop supported)
5. Click **"Start Extraction"**

### 2. Monitor Progress

A floating overlay shows real-time progress:
1. 📝 **Initializing** (5%) - Creating audit record in database
2. 📤 **Uploading** (10-25%) - Uploading PDFs to Supabase storage
3. 🔄 **Converting** (30-40%) - Getting public URLs for processing
4. 🤖 **Analyzing** (50-70%) - AI analyzing document chunks in parallel
5. 📊 **Scoring** (70-85%) - Calculating confidence score
6. 💾 **Saving** (85-100%) - Persisting results to database

### 3. Review Results

- **Dashboard** - View all audits with confidence scores, sortable by date or confidence
- **Search** - Filter audits by card or bank name (press `/` to focus)
- **Validation View** - Click any audit to see detailed extraction per category
  - **Category Details Tab** - View extracted reward rates, caps, exclusions for each spending category
  - **Partner Transfers Tab** - See available partner transfer options (auto-hidden for cashback cards)
- **JSON Export** - View raw extracted JSON data
- **SQL JSON Export** - Download production-ready JSON for direct database import
- **Re-Analysis** - Click "Re-run" to analyze again without re-uploading PDFs
- **Keyboard Navigation** - Use `j`/`k` to navigate, `Enter` to select, `Esc` to go back

### 4. Approval Workflow

| Score | Status | Gate |
|-------|--------|------|
| ≥ 90% | ✅ `approved` | Production Ready |
| 75-89% | ⚠️ `review_required` | Blocked |
| < 75% | ❌ `rejected` | Must Re-run |

---

## 🔧 Configuration

### AI Model Settings

Located in `src/services/aiService.ts`:

```typescript
{
  model: "z-ai/glm-4.5-air",
  temperature: 0.1,           // Low for consistency
  max_tokens: 16384,          // Maximum for complete responses
  response_format: { type: "json_object" }
}
```

### Chunk Processing

- **Chunk size**: ~8,000 characters (optimized to prevent truncation)
- **Parallel processing**: All chunks analyzed simultaneously via `Promise.all`
- **Smart splitting**: Tries to break at newlines to preserve context
- **Result merging**: Higher confidence results override lower ones

### PDF Text Extraction

Client-side extraction using pdfjs-dist:
- Preserves table structure by tracking Y-coordinates of text items
- New line when Y position changes by > 5 units
- Spaces added between items on same line
- Detects scanned PDFs (< 50 chars extracted) and throws error

### Confidence Scoring

```
📉 Missing category: -5%
📉 Missing reward rate: -3%
📉 Missing MITC citation: -10%
📉 Low confidence (< 70): -5%
📉 Vague caps/limits: -2%
📉 All categories N/A: Score = 0%
📉 < 3 categories with data: Score capped at 30%
```

---

## 🎨 UI Theme

**Light Theme** with vibrant, colorful accents:
- Clean white backgrounds with subtle gradients
- Violet/purple gradients for primary actions
- Emerald (success), Amber (warning), Rose (error) status indicators
- Smooth animations (fade-in, slide-in, zoom-in)
- Responsive design (mobile-friendly)

### ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New audit |
| `/` | Focus search |
| `j` | Next item |
| `k` | Previous item |
| `Enter` | Select/Open |
| `Esc` | Close/Back |

---

## 🐛 Troubleshooting

### Issue: "No tables in schema"
**Solution**: Run `supabase-schema.sql` in Supabase SQL Editor

### Issue: "Extracted text is empty. File might be a scanned image."
**Solution**: The PDF is likely a scanned image without embedded text. Use OCR'd PDFs instead.

### Issue: "Chunk X: JSON parse failed"
**Solution**: The AI response was truncated or malformed. Try re-running with the Re-Analysis feature.

### Issue: PDFs not uploading
**Solution**: Check Supabase storage bucket `audit-pdfs` exists and has public access enabled

### Issue: Empty results (all N/A)
**Solution**:
1. Verify OpenRouter API key is valid and has credits
2. Check that PDF contains actual text (not scanned images)
3. Ensure card name somewhat matches content in the MITC
4. Use Re-Analysis feature to try again

### Issue: Cashback card showing partner transfers
**Solution**: Verify the card has `card_type: "cashback"` in `card_partners_v2.json`. The system automatically hides partner transfers for cashback cards.

### Issue: Job stuck in progress overlay
**Solution**: If a job fails, the overlay shows error details. Click the ✕ to dismiss completed/failed jobs.

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| TypeScript | 5.8 | Type Safety |
| Vite | 6.x | Build Tool |
| Tailwind CSS | 3.4 | Styling |
| pdfjs-dist | 5.4 | PDF Text Extraction |
| Supabase | 2.x | Database & Storage |
| OpenRouter | - | AI Model Access (GLM-4.5-Air) |
| Bun | Latest | Runtime & Package Manager |

---

## 📊 Performance

- **Text Extraction**: ~1-3 seconds per PDF (client-side)
- **AI Analysis**: ~30-90 seconds (optimized chunking)
- **Total Processing**: ~1-2 minutes per card
- **Concurrent Jobs**: Up to 3 jobs can run simultaneously
- **Re-Analysis**: Same speed, no re-upload needed

---

## 🔐 Security

- **Client-Side PDF Processing**: PDFs processed in browser, not sent to external servers for text extraction
- **RLS Policies**: Row-level security enabled on all Supabase tables
- **Public Storage**: PDFs in public bucket (contains no sensitive PII)
- **API Keys**: Stored in `.env` (never committed)
- **No Secrets Logged**: Error messages sanitized to avoid exposing API keys

---

## 🚧 Recent Enhancements (Jan 2026)

### V2 Migration & Consolidation ✅
- Migrated to `card_partners_v2.json` with bank-centric structure
- Added explicit `card_type` field for all 157 cards (141 rewards, 16 cashback)
- Implemented 3-layer fallback system (exact → fuzzy → bank default)
- Cashback cards now correctly return empty partner list (no fallback)
- Deprecated and removed old files (`redemptions.ts`, `partnerLookup.ts`)

### Re-Analysis Feature ✅
- Re-run AI analysis on existing cards without re-uploading PDFs
- Fetches stored PDF URLs from Supabase or localStorage
- Shows progress in Active Jobs overlay
- Updates existing audit record with new results

### Improved Scoring Logic ✅
- All N/A categories → 0% score (failed extraction)
- < 3 categories with data → Score capped at 30%
- Better detection of failed extractions

### Optimized Chunking ✅
- Reduced chunk size to 8,000 characters
- Prevents token truncation errors
- Better handling of large MITC documents

### Comprehensive Timing & Performance Logs ✅
- Detailed timing breakdown for each processing phase
- Per-chunk analysis timing with network request metrics
- Token usage tracking (prompt + completion)
- Performance metrics: throughput, average times, fastest/slowest chunks
- Visual timing summary with percentage breakdowns

### Manual Approval Feature ✅
- Override automatic validation regardless of confidence score
- Manual approval for low-confidence or rejected cards
- Un-approve functionality to revert approval status
- Clear visual indicators for manual overrides

### Card Coverage Expansion ✅
- **157 total cards** across 19 banks (up from 94)
- Added 63 new cards from missing list
- 4 new banks: Bajaj Finserv, Federal Bank, SBM Bank, Other Issuers
- Complete coverage of major Indian credit card issuers

### UI/UX Improvements ✅
- Custom logo and favicon integration
- Enhanced cashback card messaging (clear indication when no partner transfers)
- Improved sidebar with larger logo display

### SQL JSON Export ✅
- **Production-ready export**: Download card data in SQL-compatible format for direct database import
- **Two-table structure**: Generates both `spending_category` definitions and `card_spending_category` values
- **Smart tier parsing**: Handles complex reward structures like "12 points up to 150000, then 35 points"
- **Cashback vs Rewards**: Correctly formats `cb` or `rewards` structure based on card type
- **24 category mappings**: Synced with Production DB IDs (1-30, excluding placeholder IDs)
- **Download button**: Click "SQL JSON" in ValidationView header to download
- **File naming**: Auto-generates filename like `axis_magnus_credit_card_production.json`

#### Export Format
```json
{
  "spending_categories": [
    {
      "category_name": "amazon_spends",
      "display_name": "Amazon Spends",
      "base_reward_value": { ... },
      "additional_benefits": { ... }
    }
  ],
  "card_spending_categories": [
    {
      "card_id": 1,
      "spending_category_id": 2,
      "spend_categories_json": {
        "rewards": {
          "tiers": { "12": "0-150000", "35": "150000-Unlimited" },
          "cash_conversion": 0.2,
          "spend_conversion": 200,
          "category_max_points": "Unlimited"
        }
      },
      "notes": "Excludes EMI transactions"
    }
  ]
}
```

---

## 🚀 Deployment to Vercel

### Prerequisites
- Vercel account (free tier works)
- GitHub/GitLab/Bitbucket repository with your code
- Supabase project configured
- OpenRouter API key

### Step-by-Step Deployment

1. **Prepare Your Repository**
   ```bash
   # Ensure all changes are committed
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your Git repository
   - Vercel will auto-detect Vite configuration

3. **Configure Build Settings**
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (or `bun run build`)
   - **Output Directory**: `dist`
   - **Install Command**: `npm install` (or `bun install`)

4. **Add Environment Variables**
   In Vercel Dashboard → Project Settings → Environment Variables, add:
   ```
   VITE_OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
   - Add for **Production**, **Preview**, and **Development** environments
   - Click "Save" after adding each variable

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Your app will be live at `https://your-project.vercel.app`

### Post-Deployment Checklist

✅ **Verify Environment Variables**
- Check that all API keys are set correctly
- Test OpenRouter connection
- Verify Supabase connection

✅ **Test Core Functionality**
- Upload a PDF and test extraction
- Verify Supabase storage bucket is accessible
- Test partner transfers feature

✅ **Configure Custom Domain (Optional)**
- Go to Project Settings → Domains
- Add your custom domain
- Follow DNS configuration instructions

### Vercel Configuration File (Optional)

Create `vercel.json` in project root for custom configuration:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Important Notes

⚠️ **Client-Side Processing**
- PDF processing happens in the browser (client-side)
- No server-side processing required
- All API calls are made directly from the browser

⚠️ **Environment Variables**
- Vercel automatically injects `VITE_*` variables at build time
- Variables are bundled into the client-side code
- **Never commit `.env` files** - use Vercel's environment variables

⚠️ **Supabase CORS**
- Ensure Supabase project allows requests from your Vercel domain
- Add Vercel URL to Supabase allowed origins if needed

⚠️ **Storage Bucket**
- Ensure `audit-pdfs` bucket is set to **public** in Supabase
- Verify RLS policies allow public read access

### Troubleshooting

#### Quick Diagnostic Checklist

If you're getting errors, run through this checklist:

```bash
# 1. Check if .env file exists
ls -la .env  # or: dir .env (Windows)

# 2. Verify environment variables are loaded
# Add this temporarily to your code:
console.log('API Key exists:', !!import.meta.env.VITE_OPENROUTER_API_KEY);
console.log('API Key prefix:', import.meta.env.VITE_OPENROUTER_API_KEY?.substring(0, 10));

# 3. Restart dev server (required after .env changes)
npm run dev  # or: bun dev

# 4. Check browser console for detailed error messages
# Open DevTools (F12) -> Console tab
```

**Build Fails:**
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure Node.js version is compatible (18+)

**Environment Variables Not Working:**
- Verify variables start with `VITE_`
- Redeploy after adding new variables
- Check variable names match exactly (case-sensitive)

**PDF Upload Fails:**
- Check Supabase storage bucket configuration
- Verify CORS settings
- Check browser console for errors

**API Calls Fail (403 Forbidden Error):**
- **Check API Key Setup:**
  1. Verify `.env` file exists in project root
  2. Confirm `VITE_OPENROUTER_API_KEY=sk-or-v1-...` is set
  3. Restart dev server after adding/changing `.env`
- **Verify API Key:**
  1. Visit https://openrouter.ai/keys
  2. Check if key is active and not expired
  3. Verify key format starts with `sk-or-v1-`
- **Check Credits:**
  1. Visit https://openrouter.ai/credits
  2. Ensure you have sufficient credits
  3. Add credits if balance is low
- **Model Access:**
  1. Verify your account has access to `z-ai/glm-4.5-air`
  2. Some models require specific permissions
- **Rate Limits:**
  1. Check if you've exceeded rate limits
  2. Wait a few minutes and try again
  3. Consider upgrading plan if needed

---

## 📝 License

Internal tool for Pouring Pounds India Pvt. Ltd.

---

## 🤝 Support

For issues or questions, contact the development team.

**Built with ❤️ using React, TypeScript, Supabase, and AI**
