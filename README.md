# ValidateKaro 🛡️

**AI-Powered Credit Card Compliance Validation System**

ValidateKaro is an internal operations tool that automates the extraction and validation of credit card reward information from MITC (Most Important Terms & Conditions) documents using advanced AI analysis.

---

## 🌟 Features

### Core Capabilities
- **🤖 AI-Powered Extraction** - Uses GLM-4.5-Air via OpenRouter to analyze MITC PDFs and extract reward structures
- **📄 Client-Side PDF Processing** - Uses pdfjs-dist for secure, browser-based text extraction that preserves table structure via Y-coordinate tracking
- **✂️ Smart Chunking** - Automatically splits large documents into ~45KB chunks for reliable API processing
- **⚡ Parallel Analysis** - Processes all chunks simultaneously with intelligent result merging based on confidence scores
- **🎯 Fuzzy Card Matching** - Accepts variations of card names (e.g., "Magnus", "Burgundy", "Axis Magnus" all match "Axis Magnus Burgundy")
- **💾 Dual Storage** - Saves to both Supabase (cloud) and localStorage (offline fallback)
- **📊 Real-time Progress Tracking** - Live overlay showing job status, progress percentage, and detailed activity logs
- **✈️ Partner Transfers** - Calculate and display airline/hotel loyalty program transfer options with conversion ratios
- **💰 Rewards Calculator** - Transaction-based reward point calculations with partner conversion options

### Extracted Data Points
Automatically extracts reward information for 19 spending categories:
- 🛒 E-commerce (Amazon, Flipkart, Other Online)
- 🍔 Food & Groceries (Online grocery, Food delivery)
- 💡 Utilities (Mobile, Electricity, Water bills)
- ✈️ Travel (Flights, Hotels, Lounge access)
- 🏥 Insurance (Health, Car/Bike)
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

   Copy `.env.example` to `.env` and fill in your values:
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
   http://localhost:5173
   ```

---

## 📁 Project Structure

```
validatekaro_v1/
├── public/
│   └── pdf.worker.min.mjs    # PDF.js worker for client-side extraction
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   ├── UploadModal.tsx   # PDF upload with bank/card dropdowns
│   │   ├── ValidationView.tsx # Detailed results with Partner Transfers tab
│   │   ├── JsonModal.tsx     # Raw JSON viewer
│   │   ├── PartnerConversionPanel.tsx # Transfer partner display UI
│   │   └── ui/               # Shadcn UI components (Button, Card, Tabs, etc.)
│   ├── services/
│   │   ├── aiService.ts      # PDF extraction & AI analysis logic
│   │   ├── supabaseService.ts # Database & storage operations
│   │   └── rewardsEngine/    # Rewards calculation engine
│   │       ├── index.ts      # Barrel exports
│   │       ├── types.ts      # TypeScript type definitions
│   │       ├── redemptions.ts # Partner transfer logic
│   │       ├── calculator.ts # Transaction rewards calculator
│   │       └── missingDataHandler.ts # Missing ratio tracking
│   ├── lib/
│   │   └── supabase.ts       # Supabase client configuration
│   ├── types.ts              # TypeScript interfaces
│   ├── constants.ts          # Category keys & labels
│   └── App.tsx               # Main application with dashboard
├── redemption_data.json      # Card reward types & transfer partner data
├── supabase-schema.sql       # Database schema
├── .env.example              # Environment variables template
└── README.md
```

---

## 🎯 Rewards Engine

The Rewards Engine provides comprehensive credit card reward calculations and partner program transfer functionality.

### Features

- **Card Type Detection** - Automatically determine if a card earns cashback or transferable reward points
- **Partner Transfer Lookup** - Find available airline/hotel transfer partners for any card
- **Conversion Calculations** - Calculate partner points from bank points with ratio support (e.g., 3:1, 1:1)
- **Transaction Rewards** - Calculate rewards earned from spending transactions with category-wise breakdown
- **Reference Valuations** - Display-only estimated values in INR/USD (with appropriate warnings)
- **Missing Data Tracking** - Track and report missing conversion ratios for product improvement
- **Subcategory Support** - Domestic vs International partner categorization
- **Partner Points Types** - Display proper point names ("Club Vistara Points", "Marriott Bonvoy Points", etc.)

### Partner Transfers Tab in ValidationView

The ValidationView now includes a **Partner Transfers** tab that displays:
- Category-wise reward points earned (based on extracted reward rates)
- Available partner transfer options for each category
- Conversion ratios and minimum points requirements
- Estimated values with appropriate disclaimers
- Filtering by partner category (Airlines, Hotels, Vouchers)
- Sorting by value, ratio, or name

### Quick Start

```typescript
import {
  getCardType,
  calculateRewardsForTransaction,
  getAvailablePartners,
  calculatePartnerPoints,
} from '@/services/rewardsEngine';

// Check if card earns rewards or cashback
const cardType = getCardType('HDFC Infinia Credit Card');
// => 'rewards'

// Calculate rewards from a transaction
const result = calculateRewardsForTransaction(
  1000,                        // Transaction amount (Rs.)
  'Axis Atlas Credit Card',    // Card name
  5,                           // Reward rate (points per Rs.100)
  'Travel'                     // Spending category
);
// => { earned: 50, partnerConversions: [...], bankPointsType: 'EDGE Rewards', ... }

// Get available transfer partners
const partners = getAvailablePartners('HDFC Infinia Credit Card');
// => [{ partnerId: 'marriott_bonvoy', partnerName: 'Marriott Bonvoy', ratio: '1:1', ... }]

// Calculate partner points
const conversion = calculatePartnerPoints(10000, 'HDFC Infinia', 'marriott_bonvoy');
// => { partnerPoints: 10000, conversionRatio: '1:1', canConvert: true, ... }
```

### Supported Transfer Partners

| Category | Partners | Subcategory |
|----------|----------|-------------|
| Airlines | British Airways Avios, Emirates Skywards, Singapore KrisFlyer, Etihad Guest, Club Vistara, Air India Flying Returns, United MileagePlus, Cathay Pacific Asia Miles, Qantas, Miles & More, IndiGo 6E Rewards | Domestic / International |
| Hotels | Marriott Bonvoy, Hilton Honors, IHG Rewards, Accor Live Limitless, Wyndham Rewards | - |
| Vouchers | Amazon Pay, Flipkart, Tanishq | - |

### Supported Card Programs

| Bank | Reward Program | Example Cards |
|------|----------------|---------------|
| HDFC | Infinia/Diners Points | Infinia, Diners Black, Regalia Gold, Millenia |
| American Express | Membership Rewards | Platinum, Gold, Smart Earn, MRCC, Platinum Travel |
| Axis Bank | EDGE Rewards | Atlas, Magnus, Horizon, My Zone, Vistara |
| AU Bank | Reward Points | Zenith, Zenith Plus, Altura, Altura Plus |
| SBI | Reward Points | Elite, Prime, BPCL Octane |
| ICICI | Reward Points | Emeralde, Coral |
| IndusInd | Avios/Reward Points | Avios, Iconia |
| Standard Chartered | Reward Points | Emirates |
| Kotak | Reward Points | 6E Rewards |
| IDFC FIRST | Reward Points | Club Vistara |

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
3. Enter **Card Name** - autocomplete from 170+ cards or enter custom name
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
  - **Partner Transfers Tab** - See available partner transfer options with conversion ratios
- **JSON Export** - View raw extracted JSON data
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
  max_tokens: 32768,          // Maximum for complete responses
  response_format: { type: "json_object" }
}
```

### Chunk Processing

- **Chunk size**: ~45,000 characters (safe under OpenRouter limits)
- **Parallel processing**: All chunks analyzed simultaneously via `Promise.all`
- **Smart splitting**: Tries to break at newlines to preserve context
- **Result merging**: Higher confidence results override lower ones

### PDF Text Extraction

Client-side extraction using pdfjs-dist:
- Preserves table structure by tracking Y-coordinates of text items
- New line when Y position changes by > 5 units
- Spaces added between items on same line
- Detects scanned PDFs (< 50 chars extracted) and throws error

### Confidence Scoring Penalties

```
📉 Missing category: -5%
📉 Missing reward rate: -3%
📉 Missing MITC citation: -10%
📉 Low confidence (< 70): -5%
📉 Vague caps/limits: -2%
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
**Solution**: The AI response was truncated or malformed. The system gracefully handles this by returning empty results for that chunk.

### Issue: PDFs not uploading
**Solution**: Check Supabase storage bucket `audit-pdfs` exists and has public access enabled

### Issue: Empty results (all N/A)
**Solution**:
1. Verify OpenRouter API key is valid and has credits
2. Check that PDF contains actual text (not scanned images)
3. Ensure card name somewhat matches content in the MITC

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
| OpenRouter | - | AI Model Access |

---

## 📊 Performance

- **Text Extraction**: ~1-3 seconds per PDF (client-side)
- **AI Analysis**: ~30-120 seconds (depends on document size)
- **Total Processing**: ~1-3 minutes per card
- **Concurrent Jobs**: Up to 3 jobs can run simultaneously

---

## 🔐 Security

- **Client-Side PDF Processing**: PDFs processed in browser, not sent to external servers for text extraction
- **RLS Policies**: Row-level security enabled on all Supabase tables
- **Public Storage**: PDFs in public bucket (contains no sensitive PII)
- **API Keys**: Stored in `.env` (never committed - use `.env.example` as template)
- **No Secrets Logged**: Error messages sanitized to avoid exposing API keys

---

## 🚧 Future Enhancements

- [ ] Support for more AI models (GPT-4, Claude)
- [ ] Batch processing (multiple cards at once)
- [ ] Historical comparison (track MITC changes over time)
- [ ] Export to Excel/CSV
- [ ] Email notifications on completion
- [ ] Dark mode toggle
- [ ] OCR support for scanned PDFs

---

## 📝 License

Internal tool for Pouring Pounds India Pvt. Ltd.

---

## 🤝 Support

For issues or questions, contact the development team.

**Built with ❤️ using React, TypeScript, Supabase, and AI**
