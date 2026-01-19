# ValidateKaro - Internal Credit Card Audit Tool

ValidateKaro is a professional-grade internal compliance and data orchestration tool designed for Product Managers and Compliance Architects. It automates the extraction and validation of credit card rewards data from bank-issued PDF documents (MITC, Terms & Conditions, and Reward Catalogs) against a strict 19-key canonical schema.

## 🚀 Key Features

- **AI-Powered Extraction**: Utilizes OpenRouter (GLM-4.5-Air) for high-precision document analysis.
- **Strict Compliance Gates**:
    - ≥90% Confidence: **Production Ready** (Automated Approval)
    - 75-89% Confidence: **Review Required** (Human-in-the-loop)
    - <75% Confidence: **Rejected** (Must Re-run)
- **Comprehensive Dashboard**: Track active jobs, historical pass rates, and mean extraction scores.
- **Rich Audit Reports**: Human-readable summaries of validation issues, missing citations, and low-confidence data points.
- **Advanced Filtering**: Filter by Status (Approved/Review/Rejected) and Sort by Date or Confidence.
- **Power User Experience**: Vim-style keyboard navigation (`J`/`K`), quick search (`/`), and rapid validation (`N`).
- **Data Integrity**: Local persistence for process history, raw JSON inspection, and detailed audit logs per process.

## 🛠 Tech Stack

- **Frontend**: React (v19), TypeScript, Tailwind CSS
- **Navigation**: React Router (v7)
- **AI Engine**: OpenRouter GLM-4.5-Air (PDF-native processing)
- **Icons**: Lucide Icons
- **Storage**: Browser LocalStorage (Simulated Production DB)

## 📦 Setup & Installation

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-org/validatekaro.git
    cd validatekaro
    ```

2.  **Environment Variables**:
    Create a `.env` file or ensure the environment where the app is hosted has the following:
    - `API_KEY`: Your OpenRouter API Key (Must have access to `zhipuai/glm-4.5-air`).

3.  **Local Development**:
    Since the project uses ES6 modules and a custom import map, it can be served using any local web server (e.g., `npx serve .`).

## 🧠 Confidence Calculation Logic

The "Truth Score" is calculated starting at 100% and applying penalties for compliance violations:

| Violation | Penalty |
| :--- | :--- |
| Missing Category | -5% |
| Missing Required Field (Rate/Limit) | -3% |
| Missing Page/Section Citation | -10% |
| Low Confidence Model Output (<70) | -5% |
| Ambiguous Caps/Limits | -2% |

## ⌨️ Keyboard Shortcuts

- `/` : Focus Search
- `N` : Initialize New Audit Validation
- `Esc` : Close Modals / Return to Dashboard
- `J` / `K` : Navigate up/down through the process list (Vim-style)

## 🧪 Deployment (Vercel)

1.  Connect your repository to Vercel.
2.  Add the `API_KEY` to **Project Settings > Environment Variables**.
3.  Deploy. The project is already configured for high-performance static hosting.

---
*ValidateKaro - Building the Single Source of Truth for Fintech.*
