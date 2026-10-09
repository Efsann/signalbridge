# SignalBridge — Autonomous Infrastructure & Telecom Signal Router

SignalBridge is an enterprise-grade signal triage and incident routing platform designed for large-scale civic and telecommunications infrastructure (DemoTel Baku context). It combines multi-modal ingestion with strict code-side deterministic routing, ensuring automated efficiency while eliminating non-deterministic LLM routing errors.

---

## 🔗 Live Deployment & Repository

- **Live Production URL:** [https://signalbridge-psi.vercel.app/](https://signalbridge-psi.vercel.app/)
- **GitHub Repository:** [https://github.com/Efsann/signalbridge](https://github.com/Efsann/signalbridge)

---

## 🌟 Key Features

- **Multi-Channel Signal Ingestion:** Collects incident signals across Mobile App Chat, Web Portal, and Voice Transcriptions[cite: 2].
- **Gemini 1.5 Flash Triage Engine:** Performs real-time sentiment extraction, department categorization, severity ranking, and confidence scoring.
- **Deterministic Code-Side Routing:** Final routing decisions are strictly executed via rule-based software logic—never blindly delegated to generative AI outputs[cite: 2].
- **Safety Fallback & Circuit Breaker:** In cases of API rate limiting (429), quota exhaustion, or schema drift, the system automatically redirects to an audit-logged `Manual Review` queue[cite: 2].
- **Processed Complaints Ledger:** In-memory, compliance-ready immutable signal registry with live metrics and export capabilities[cite: 2].

---

## 🏗️ Architecture & Safety Pipeline

```mermaid
flowchart TD
    A[Incoming Signal: Mobile / Web] --> B[Gemini 1.5 Flash Analysis]
    
    B -- Timeout / Malformed JSON --> SO[SAFETY OVERRIDE: Manual Review]
    B --> C{JSON Schema Verification}
    
    C -- Fails Rules --> SO
    C -- Passes --> D[Code-Side Routing Engine]
    
    D -- Low Confidence < 0.7 --> SO
    D -- High Confidence --> E[Target Department: NOC, Billing, Field Tech]

    style SO fill:#ffefe5,stroke:#ff6b4a,stroke-width:2px,color:#d9381e
    style D fill:#eef7ff,stroke:#2b7fff,stroke-width:2px,color:#1a56db
    style E fill:#eafbf1,stroke:#22c55e,stroke-width:2px,color:#15803d

```

---

## 🛠️ Tech Stack

* **Frontend:** React 18/19, TypeScript, Vite
* **Styling:** Tailwind CSS (v4 via PostCSS), Lucide Icons
* **AI Engine:** Google Gemini 1.5 Flash API
* **Deployment:** Vercel

---

## 🚀 Local Setup

### 1. Clone & Install

```bash
git clone [https://github.com/Efsann/signalbridge.git](https://github.com/Efsann/signalbridge.git)
cd signalbridge
npm install --legacy-peer-deps

```

### 2. Environment Variables (`.env`)

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
APP_URL=http://localhost:5173

```

### 3. Run Development Server

```bash
npm run dev

```

---

## 📊 NeuroBridge Evaluation Notes

* **Zero-Hallucination Policy:** Models only extract attributes according to rigid schemas; they do not execute final actions.
* **Fault Tolerance:** Includes a UI toggle to simulate API outages, proving the system's graceful degradation to code-side manual routing.
* **Enterprise Readiness:** Features a `.JSON` exportable Audit Log and live KPI metrics dashboard.

