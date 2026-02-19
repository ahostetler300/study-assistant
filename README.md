# Study Assistant 📚

An AI-powered, family-oriented study mastery platform designed for the Raspberry Pi 4. Transform complex technical manuals, textbooks, and web pages into rigorous, high-retention study guides.

## 🚀 Key Features

- **Four-Tier Architecture**: Data Sources → Study Sets → Quizzes → Results.
- **Multi-User Hub**: Personalized profile tracking for the whole family.
- **⚡ Context Caching**: Optimized for large documents (like 700+ page technical manuals) with 99% token efficiency.
- **Secure Vault**: AES-256-GCM encryption for API keys and sensitive data.
- **Universal Ingestion**: Supports PDF, EPUB, DOCX, XLSX, Images (OCR), and Web Scraping.
- **AI-Powered Tutoring**: Grounded, pedagogical deep-dives for every quiz question.
- **PWA Support**: Installable on mobile with standalone mode and branded splash screens.
- **Modern UI**: Apple-style aesthetic with glassmorphic elements and high-contrast accessibility.

## 🛠️ Installation on Raspberry Pi

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/ahostetler300/study-assistant.git
    cd study-assistant
    ```

2.  **Environment Setup**:
    - Copy `web/.env.example` to `web/.env.local`
    - Generate a master secret: `openssl rand -base64 32`
    - Add it to `VAULT_MASTER_SECRET` in `.env.local`

3.  **Install & Start**:
    ```bash
    ./setup-pi.sh
    ```

4.  **Automatic Updates**:
    Run `./update-and-run.sh` to pull the latest changes and restart the stack.

## 🛡️ Security
This project uses a dual-file vault system. API keys are encrypted at rest using a master secret stored only on your local hardware.

## 📜 License
MIT
