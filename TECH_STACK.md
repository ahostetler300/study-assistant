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

---

### **8. Leaner PWA Implementation (Next.js Native Capabilities)**

This section outlines the streamlined approach to configuring Progressive Web App (PWA) features within the Study Assistant, leveraging Next.js's built-in capabilities for icon and manifest generation. This method prioritizes convention over configuration, reducing boilerplate and simplifying maintenance.

#### **Key Steps:**

1.  **Standardize Icon Asset**: Place your primary SVG icon directly in the `web/src/app` directory and name it `icon.svg`. This allows Next.js to automatically generate all necessary icon sizes and link tags, including `apple-touch-icon`.

    *   **Example Location**: `web/src/app/icon.svg`

2.  **Remove Custom Manifests**: Delete any manually created `manifest.ts` or `manifest.json` files within your `web/src/app` directory. Next.js will automatically generate the `manifest.webmanifest` file based on your `app/icon.svg` and the metadata defined in your `layout.tsx`.

    *   **Action**: Ensure `web/src/app/manifest.ts` (if it exists) is removed.

3.  **Configure Metadata in `layout.tsx`**: Ensure your root `layout.tsx` file (`web/src/app/layout.tsx`) includes the following `metadata` and `viewport` configurations:

    *   **`appleWebApp`**: This object informs iOS about the PWA's behavior and styling for an installable experience.
        ```typescript
        export const metadata: Metadata = {
          // ... other metadata
          appleWebApp: {
            capable: true,
            statusBarStyle: 'black-translucent',
            title: 'Study Assistant', // Use your application's title
          },
        };
        ```
    *   **`themeColor`**: Set the `themeColor` in the `viewport` object to match your application's primary background color for a consistent splash screen appearance.
        ```typescript
        export const viewport: Viewport = {
          // ... other viewport settings
          themeColor: '#020617', // Example: Slate-950
        };
        ```

By following these steps, you leverage Next.js's native PWA capabilities to ensure your application is properly recognized, installed, and displayed on mobile home screens with minimal manual configuration.

---

### **9. General Guidelines for Enhanced Mobile Experience**

To ensure applications built within this ecosystem provide a consistent, high-quality mobile experience while preserving desktop aesthetics, adhere to the following responsive design principles:

### **1. Prioritize Mobile-First Design (Tailwind `sm:` Breakpoint)**

*   **Principle**: Always design and style for the smallest screen size first, then use responsive prefixes (e.g., `sm:`, `md:`, `lg:`) to apply larger screen styles. This ensures mobile legibility and usability are the baseline.
*   **Implementation**: Apply mobile-specific values directly (e.g., `p-4`, `text-base`). For larger screens, explicitly override these with responsive utility classes (e.g., `sm:p-8`, `sm:text-xl`). This guarantees desktop layouts remain unaffected.

### **2. Optimize Viewport & Accessibility**

*   **Viewport Meta Tag**: Configure the `viewport` meta tag in `layout.tsx` to allow natural scaling and prevent content from being artificially shrunk. Avoid `maximum-scale=1` and `user-scalable=no` unless absolutely necessary for specific interactive elements.
    *   **Recommended**: `width=device-width, initial-scale=1`
*   **Tap Targets**: Ensure all interactive elements (buttons, icons, links) have a minimum tap target area of **48x48 pixels** (or equivalent sizing with padding) on mobile. This significantly improves usability and reduces accidental taps.

### **3. Responsive Spacing & Typography**

*   **Fluid Padding & Margins**: Use responsive utility classes to reduce padding and margins on smaller screens, recovering valuable horizontal screen real estate.
    *   **Example**: From `p-8` (desktop) to `p-4 sm:p-8` (mobile-first).
*   **Dynamic Typography**: Scale font sizes appropriately for mobile to ensure legibility without eye strain. Large headers on desktop may need to be smaller on mobile, and small labels might need to be increased.
    *   **Example**: From `text-4xl` (desktop) to `text-2xl sm:text-4xl` (mobile-first). Ensure base body text is at least `text-base` (16px) for readability.
*   **Line Height**: Adjust `leading-` utilities (`leading-tight`, `leading-relaxed`) to optimize vertical spacing of text blocks, especially for multi-line content on small screens.

### **4. Component-Specific Adaptations**

*   **Icon Scaling**: Increase the size of icons (e.g., Lucide React `size` prop) on mobile to match larger tap targets and improve visual clarity.
*   **Header Prominence**: Adjust header heights and font sizes on mobile to give navigation and branding appropriate visual weight, ensuring they are easily tappable and readable.
*   **Card Layouts**: When using grid or multi-column layouts on desktop, ensure they gracefully stack into a single column on mobile, with optimized vertical `gap-` utilities to prevent a cramped feeling.
*   **Interactive Elements**: For buttons that contain significant text, increase their height and internal padding on mobile to improve readability and tap accuracy.

### **5. Glassmorphism & UI Accents**

*   **Consistent Aesthetic**: Maintain the established "Apple-Style" glassmorphic and color palette principles (`rounded-3xl`, `bg-primary/5` with `backdrop-blur`, `Slate/Indigo` theme) across all responsive adaptations.
*   **Visual Feedback**: Ensure hover effects (e.g., `hover:scale-110`) are also implemented for tap states on mobile devices (though often handled automatically by browsers).

---

These guidelines aim to provide a robust framework for developing mobile-friendly interfaces that are both aesthetically pleasing and highly functional across various device sizes.