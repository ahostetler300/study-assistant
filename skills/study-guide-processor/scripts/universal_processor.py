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

def process_file(input_path, output_dir, output_filename, md_engine):
    input_path = Path(input_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    output_file = output_dir / output_filename
    
    print(f"Processing: {input_path.name}...")
    
    # Special handling for EPUB
    if input_path.suffix.lower() == '.epub':
        try:
            # We call our specialized script for EPUBs
            script_path = Path(__file__).parent / "hierarchical_epub.py"
            subprocess.run([sys.executable, str(script_path), str(input_path), str(output_file)], check=True)
            return output_file
        except Exception as e:
            print(f"✗ Hierarchical EPUB extraction failed: {e}")
            return None

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
            return output_file
        except Exception as e:
            print(f"✗ Error processing markdown {input_path.name}: {e}")
            return None
            
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
        return output_file
    except Exception as e:
        print(f"✗ Error converting {input_path.name}: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Universal Study Guide Content Processor")
    parser.add_argument("input", help="Input file or URL")
    parser.add_argument("output_filename", help="Desired output filename (e.g., file_id.md)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--output_dir", help="Absolute path to the output directory for processed Markdown files.")
    
    args = parser.parse_args()
    
    # Initialize MarkItDown for non-EPUB formats
    md = MarkItDown()
    
    # Fixed output directory for processed Markdown files
    output_dir = Path(args.output_dir) if args.output_dir else Path("./data/processed_content")
    output_dir.mkdir(parents=True, exist_ok=True)

    processed_file_path = None

    # Check if input is a URL
    if args.input.startswith(('http://', 'https://')):
        print(f"Processing URL: {args.input}...")
        try:
            result = md.convert(args.input)
            output_file = output_dir / args.output_filename # Use provided filename
            
            content = f"# {result.title or 'Web Content'}\n\n"
            content += f"**Source**: {args.input}\n"
            content += f"**Format**: URL\n\n"
            content += "---\n\n"
            content += result.text_content
            
            output_file.write_text(content, encoding='utf-8')
            print(f"✓ Saved to: {output_file.name}")
            processed_file_path = output_file
        except Exception as e:
            print(f"✗ Error converting URL: {e}")
            sys.exit(1)

    else: # Assume input is a file path
        input_path = Path(args.input)
        
        if not input_path.is_file():
            print(f"Error: {input_path} is not a valid file.")
            sys.exit(1)

        processed_file_path = process_file(input_path, output_dir, args.output_filename, md)
    
    if processed_file_path:
        print(f"SUCCESS: {processed_file_path}") # Print the path for Node.js to capture
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
