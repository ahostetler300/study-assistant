#!/usr/bin/env python3
import argparse
import os
import sys
import re
from pathlib import Path
from markitdown import MarkItDown
import subprocess

# Add current directory to path so we can import our sibling script if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def process_file(input_path, output_dir, md_engine):
    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / f"{input_path.stem}.md"
    
    print(f"Processing: {input_path.name}...")
    
    # Special handling for EPUB
    if input_path.suffix.lower() == '.epub':
        try:
            # We call our specialized script for EPUBs
            script_path = Path(__file__).parent / "hierarchical_epub.py"
            subprocess.run([sys.executable, str(script_path), str(input_path), str(output_file)], check=True)
            return True
        except Exception as e:
            print(f"✗ Hierarchical EPUB extraction failed: {e}")
            return False

    # Special handling for Markdown (Pass-through)
    if input_path.suffix.lower() == '.md':
        try:
            raw_text = input_path.read_text(encoding='utf-8')
            # Extract existing title if present
            title_match = re.search(r'^# (.*)', raw_text, re.MULTILINE)
            title = title_match.group(1).strip() if title_match else input_path.stem
            
            content = f"# {title}\n\n"
            content += f"**Source**: {input_path.name}\n"
            content += f"**Format**: Markdown (Pass-through)\n\n"
            content += "---\n\n"
            content += raw_text
            
            output_file.write_text(content, encoding='utf-8')
            print(f"✓ Markdown preserved: {output_file.name}")
            return True
        except Exception as e:
            print(f"✗ Error processing markdown {input_path.name}: {e}")
            return False
            
    # Standard handling for all other formats
    try:
        result = md_engine.convert(str(input_path))
        
        # Build the final content
        content = f"# {result.title or input_path.stem}\n\n"
        content += f"**Source**: {input_path.name}\n"
        content += f"**Format**: {input_path.suffix}\n\n"
        content += "---\n\n"
        content += result.text_content
        
        output_file.write_text(content, encoding='utf-8')
        print(f"✓ Saved to: {output_file.name}")
        return True
    except Exception as e:
        print(f"✗ Error converting {input_path.name}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Universal Study Guide Content Processor")
    parser.add_argument("input", help="Input file, directory, or URL")
    parser.add_argument("output_dir", help="Output directory for Markdown files")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    
    args = parser.parse_args()
    
    # Initialize MarkItDown for non-EPUB formats
    md = MarkItDown()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Check if input is a URL
    if args.input.startswith(('http://', 'https://')):
        print(f"Processing URL: {args.input}...")
        try:
            result = md.convert(args.input)
            # Create a filename from the title or domain
            safe_title = "".join([c if c.isalnum() else "_" for c in (result.title or "web_content")])
            output_file = output_dir / f"{safe_title[:50]}.md"
            
            content = f"# {result.title or 'Web Content'}\n\n"
            content += f"**Source**: {args.input}\n"
            content += f"**Format**: URL\n\n"
            content += "---\n\n"
            content += result.text_content
            
            output_file.write_text(content, encoding='utf-8')
            print(f"✓ Saved to: {output_file.name}")
            sys.exit(0)
        except Exception as e:
            print(f"✗ Error converting URL: {e}")
            sys.exit(1)

    input_path = Path(args.input)
    
    if input_path.is_file():
        success = process_file(input_path, args.output_dir, md)
        sys.exit(0 if success else 1)
    elif input_path.is_dir():
        # Process all supported files in the directory
        supported_exts = {'.pdf', '.docx', '.pptx', '.xlsx', '.html', '.epub', '.jpg', '.png', '.md', '.txt'}
        files = [f for f in input_path.iterdir() if f.is_file() and f.suffix.lower() in supported_exts]
        
        if not files:
            print("No supported files found in directory.")
            sys.exit(0)
            
        print(f"Found {len(files)} files to process.")
        success_count = 0
        for f in files:
            if process_file(f, args.output_dir, md):
                success_count += 1
                
        print(f"\nSummary: {success_count}/{len(files)} files processed successfully.")
        sys.exit(0 if success_count == len(files) else 1)
    else:
        print(f"Error: {input_path} is not a valid file or directory.")
        sys.exit(1)

if __name__ == "__main__":
    main()
