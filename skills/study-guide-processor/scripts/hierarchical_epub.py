#!/usr/bin/env python3
import ebooklib
from ebooklib import epub
from bs4 import BeautifulSoup
import argparse
import os
import re
from pathlib import Path

def clean_html(html_content):
    """Converts HTML to clean, readable text/markdown-lite."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Remove scripts and styles
    for script in soup(["script", "style"]):
        script.extract()

    # Convert common tags to markdown-like structure
    for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
        level = int(h.name[1])
        h.replace_with(f"\n\n{'#' * level} {h.get_text().strip()}\n\n")
    
    for p in soup.find_all('p'):
        p.replace_with(f"\n{p.get_text().strip()}\n")
        
    for li in soup.find_all('li'):
        li.replace_with(f"\n* {li.get_text().strip()}")

    # Get text
    text = soup.get_text()
    
    # Clean up whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def process_epub(epub_path, output_path):
    """Processes an EPUB into a single hierarchical Markdown file."""
    print(f"Reading EPUB: {epub_path}")
    book = epub.read_epub(epub_path)
    
    full_content = []
    
    # Try to get the book title
    title = book.get_metadata('DC', 'title')
    if title:
        full_content.append(f"# {title[0][0]}\n")
    else:
        full_content.append(f"# {Path(epub_path).stem}\n")

    # Iterate through the items in the order they appear in the spine
    for item_id, linear in book.spine:
        item = book.get_item_with_id(item_id)
        if item and item.get_type() == ebooklib.ITEM_DOCUMENT:
            content = item.get_content()
            clean_text = clean_html(content)
            if clean_text:
                full_content.append(clean_text)
    
    # Join everything
    final_markdown = "\n\n---\n\n".join(full_content)
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_markdown)
    
    print(f"✓ Successfully processed into: {output_path}")
    print(f"  Final size: {len(final_markdown)} characters")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert EPUB to a single hierarchical Markdown file.")
    parser.add_argument("input", help="Path to the input EPUB file")
    parser.add_argument("output", help="Path to the output Markdown file")
    
    args = parser.parse_args()
    process_epub(args.input, args.output)
