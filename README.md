# ValidateKaro - Internal Credit Card Audit Tool

ValidateKaro is a professional-grade internal compliance and data orchestration tool designed for Product Managers and Compliance Architects. It automates the extraction and validation of credit card rewards data from bank-issued PDF documents (MITC, Terms & Conditions, and Reward Catalogs) against a strict 19-key canonical schema.

## Key Features

- **AI-Powered Extraction**: Utilizes OpenRouter (GLM-4.5-Air) for high-precision document analysis
- **Strict Compliance Gates**:
    - ≥90% Confidence: **Production Ready** (Automated Approval)
    - 75-89% Confidence: **Review Required** (Human-in-the-loop)
    - <75% Confidence: **Rejected** (Must Re-run)
- **Comprehensive Dashboard**: Track active jobs, historical pass rates, and mean extraction scores
- **Rich Audit Reports**: Human-readable summaries of validation issues, missing citations, and low-confidence data points
- **Advanced Filtering**: Filter by Status (Approved/Review/Rejected) and Sort by Date or Confidence
- **Power User Experience**: Vim-style keyboard navigation (`J`/`K`), quick search (`/`), and rapid validation (`N`)
- **Persistent Storage**: Supabase database for audit history and cloud storage for uploaded PDFs

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **UI Components**: shadcn/ui, Radix UI primitives
- **AI Engine**: OpenRouter GLM-4.5-Air (PDF-native processing)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (audit-pdfs bucket)
- **Icons**: Lucide Icons

## Setup & Installation

1. **Install Dependencies**:
    ```bash
    bun install
    ```

2. **Environment Variables**:
    Create a `.env` file with the following:
    ```env
    VITE_OPENROUTER_API_KEY=your_openrouter_api_key
    VITE_SUPABASE_URL=https://your-project.supabase.co
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

3. **Start Development Server**:
    ```bash
    bun run dev
    ```

## Database Schema

The app uses a Supabase `audits` table with the following structure:

| Column | Type | Description |
| :--- | :--- | :--- |
| id | uuid | Primary key |
| process_id | text | Unique audit process identifier |
| bank_name | text | Name of the issuing bank |
| card_name | text | Credit card product name |
| status | text | pending/approved/rejected/review |
| confidence_score | integer | AI extraction confidence (0-100) |
| extracted_data | jsonb | Canonical 19-key rewards schema |
| issues | jsonb | Array of validation issues |
| created_at | timestamptz | Audit timestamp |

## Confidence Calculation Logic

The "Truth Score" is calculated starting at 100% and applying penalties for compliance violations:

| Violation | Penalty |
| :--- | :--- |
| Missing Category | -5% |
| Missing Required Field (Rate/Limit) | -3% |
| Missing Page/Section Citation | -10% |
| Low Confidence Model Output (<70) | -5% |
| Ambiguous Caps/Limits | -2% |

## Keyboard Shortcuts

- `/` : Focus Search
- `N` : Initialize New Audit Validation
- `Esc` : Close Modals / Return to Dashboard
- `J` / `K` : Navigate up/down through the process list (Vim-style)

## Project Structure

```
src/
├── components/          # React components
│   └── ui/              # shadcn/ui components
├── lib/                 # Utilities and Supabase client
│   └── hooks/           # Custom React hooks
├── services/            # Business logic
│   ├── aiService.ts     # OpenRouter AI integration
│   └── supabaseService.ts # Database operations
├── types.ts             # TypeScript definitions
└── App.tsx              # Main application
```

## Deployment

1. Connect your repository to Vercel/Netlify
2. Add environment variables in project settings:
   - `VITE_OPENROUTER_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy

---
*ValidateKaro - Building the Single Source of Truth for Fintech.*
