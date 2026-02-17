# 🛠️ Family Appliance Blueprint: Tech Stack & Standards

This document defines the mandatory architecture, security protocols, and UI standards for all standardized applications running in the family's Raspberry Pi environment. Use this as a reference for initializing and standardizing any future project.

---

### **1. Core Framework & Stability**
| Requirement | Standard Solution | Reasoning |
| :--- | :--- | :--- |
| **Full-Stack UI** | **Next.js 14 (App Router)** | Maximum stability on Pi; avoids hydration/pre-render issues found in v15/16. |
| **Language** | **TypeScript** | Strict typing for reliability and easier debugging. |
| **Runtime** | **Node.js v22 LTS** | Optimal balance of performance and long-term support. |

**Safe Hydration Pattern**: All context-dependent components (Headers, Navs, Toasters) must use a `mounted` state guard to prevent SSR mismatches:
```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null; // Or return a static skeleton
```

---

### **2. Database & Data Modeling**
*   **Prisma 6.2.x**: Mandatory ORM. Avoid version 7+ to maintain standard `datasource` URL behavior for SQLite.
*   **SQLite**: Zero-latency, file-based persistence.
*   **Location**: Database files must live in a dedicated `/database` root directory (outside of `/web`) for easier backups and merging.
*   **Hierarchy Pattern**: Organize data into a logical flow of **Source (Shared) → Collection (Shared) → User Instance → Result**.

---

### **3. The "Vault" Protocol (Security)**
Standardized dual-file security architecture for all family appliances to allow **"Hot-Swapping"** credentials without server restarts.

1.  **`.env.local` (Infrastructure)**:
    *   Stores `DATABASE_URL` and the `SETTINGS_SECRET` (Master Key).
    *   Used by Next.js for initial system config.
2.  **`.secrets.env` (Managed Vault)**:
    *   Stores **Encrypted** user credentials (e.g., `GEMINI_API_KEY_ENCRYPTED`).
    *   **Logic**: Read this file directly via `fs` in a helper (e.g., `lib/secrets.ts`) to ensure updates are live immediately.

**Cryptographic Standard**:
*   **Algorithm**: AES-256-GCM.
*   **Key Derivation**: Scrypt (N=16384).
*   **Stored Format**: `iv:authTag:ciphertext` (hex-encoded).

---

### **4. Visual Identity & UI Standards**
Maintain a consistent "Apple-Style" modern aesthetic using **Tailwind CSS**.

*   **Geometry**:
    *   **Outer Containers/Cards**: `rounded-3xl` (Soft and friendly).
    *   **Interactive Elements**: `rounded-2xl` (Buttons, Inputs).
*   **Color Palette (Slate/Indigo)**:
    *   **Light Mode**: `bg-slate-50` with `text-slate-900`. High contrast for readability.
    *   **Dark Mode**: `bg-slate-950` with `text-slate-50`.
    *   **Accents**: `Indigo-600` (Primary) and `Emerald-600` (Success/Start).
*   **Glassmorphism**: Use `backdrop-blur-md` with `bg-background/80` for sticky headers.
*   **Icons**: **Lucide React** (Default `size={20}` for headers, `size={24}` for dashboard tiles).
*   **Typography**: **Geist Variable** font.
    *   Headers: `font-black tracking-tight`.
    *   Body: `font-medium leading-relaxed`.

---

### **5. Intelligence Layer (AI Standards)**
*   **Default Model**: **Gemini 2.5 Flash**.
*   **Prompt Synthesis Pattern**:
    1.  **Persona**: Configurable text for the AI's "character."
    2.  **User Task**: Dynamic instruction from the UI.
    3.  **Hardcoded Schema**: **Mandatory**. A hidden block appended to the *end* of every prompt to enforce JSON formatting and prevent app crashes.
*   **Fuzzy Mapping**: Code must handle minor AI key variations (e.g., `q` vs `question`) gracefully.

---

### **6. Standard Directory Structure**
```text
/                    # Root: Deployment & Setup
├── /web             # Next.js Application Source
├── /database        # Persistent SQLite .db files
├── /data            # Unstructured data (uploads, raw files)
├── /scripts         # PM2 configs and maintenance scripts
├── setup-pi.sh      # Mandatory Interactive Setup Utility
└── start-prod.sh    # PM2 Process Entry Point
```

---

### **7. Standardized `setup-pi.sh` Template**
Every family appliance must include an interactive setup script with this flow:
1.  **Dependency Check**: Ensure `node v22` and `python3` are present.
2.  **Vault Init**: Generate a unique 32-byte `SETTINGS_SECRET` via `openssl` if missing.
3.  **Environment Sync**: Create `.env.local` and `.secrets.env` boilerplate.
4.  **Dependencies**: Run `npm install`.
5.  **Database**: Synchronize schema via `npx prisma db push`.
6.  **Build**: Execute `npm run build` with `unset NODE_ENV` to prevent build-time conflicts.
7.  **PM2**: Configure auto-restart and save the process list.
