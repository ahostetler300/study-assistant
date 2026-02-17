---
name: study-guide-processor
description: Universally process documents (EPUB, PDF, Office, YouTube) into Gemini-optimized Markdown for study guides. Specialized in hierarchical extraction from large EPUB textbooks and autonomous bulk web scraping for "Discovery Portals". Use when you need to ingest textbooks, lecture videos, or complex multi-page web resources and prepare them for AI-driven question generation.
---

# Study Guide Content Processor

## Overview
This skill converts diverse educational content into structured Markdown. It is specifically designed to feed into the Gemini File Search tool, ensuring that headers and hierarchies are preserved for precise question generation and topical targeting.

## Key Capabilities
- **Large EPUB Processing**: Extract full textbooks into a single Markdown file while preserving `# Chapter` and `## Section` headers.
- **Universal Formats**: Supports PDF, EPUB, DOCX, PPTX, XLSX, HTML, Markdown, and Images (PNG/JPG) via the `MarkItDown` engine.
- **Single-File Output**: Every job produces exactly one `.md` file, making it easy to manage in Gemini.

## Workflows

### 1. Atomic Content (Single File or Direct URL)
Use this workflow for `.docx`, `.epub`, `.pdf`, `.png`, or direct content URLs.
- **Action**: Run `universal_processor.py`.
- **Note**: Spidering/Scanning multiple URLs is **irrelevant** here.

```bash
python3 scripts/universal_processor.py path/to/source.epub path/to/output_dir/
```

### 2. Discovery Portals (Index/Unit URLs)
Use this workflow if the provided URL is a "Portal" (e.g., a Unit summary, Table of Contents, or list of lesson links).
1. **Intelligence Check**: Analyze the URL first. If sub-links are required to get the full story, trigger this mode.
2. **Spider**: Invoke the **`agent-browser`** skill to navigate the site, expand menus, and extract the complete list of target sub-URLs.
3. **Bulk Fetch**: Process each sub-URL using the conversion tools.
4. **Consolidate**: Merge all content into a single `# Master_Source_Name.md`.

### 3. Bulk Process a Local Directory
Point the processor to a folder to convert all supported files within it. Each file will result in its own Markdown counterpart in the output directory.

```bash
python3 scripts/universal_processor.py path/to/input_folder/ path/to/output_dir/
```

## Content Structuring Rules
Regardless of subject matter, follow these rules during consolidation to ensure the highest quality AI generation:

| Content Type | Structuring Rule |
| :--- | :--- |
| **Terminology/Vocab** | Convert lists/definitions into **Markdown Tables** (`| Term | Definition |`). |
| **Multi-Topic** | Wrap every sub-source/lesson in a `## [Topic Name]` header. |
| **Prose/Narrative** | Maintain clear `### sub-headers` for internal logic. |
| **Code Snippets** | Use standard triple-backtick fence with the language identifier. |
| **Visual Sources** | Images are processed via OCR; ensure clarity for high-accuracy text extraction. |
