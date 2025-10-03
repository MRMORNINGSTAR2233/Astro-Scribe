#!/usr/bin/env python3
"""
Simple PDF Downloader for NCBI PMC Articles
===========================================

This script provides a simpler approach to downloading PDFs from NCBI PMC links.
It also generates a list of URLs for manual checking if automated download fails.

Author: Generated for Astro-Scribe project
Date: 2025-09-30
"""

import csv
import requests
import os
import re
import time
import logging
from pathlib import Path
from urllib.parse import urljoin
import webbrowser

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def sanitize_filename(filename, max_length=180):
    """Sanitize filename for cross-platform compatibility."""
    # Remove problematic characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    filename = re.sub(r'[^\w\s\-_\.]', '_', filename)
    filename = re.sub(r'\s+', '_', filename)
    filename = re.sub(r'_+', '_', filename).strip('_')
    
    # Limit length
    if len(filename) > max_length:
        name, ext = os.path.splitext(filename)
        filename = name[:max_length-len(ext)] + ext
    
    return filename

def extract_pmc_id(url):
    """Extract PMC ID from URL."""
    match = re.search(r'PMC(\d+)', url)
    return match.group(1) if match else None

def get_pdf_urls(pmc_url):
    """Get potential PDF URLs for a PMC article."""
    pmc_id = extract_pmc_id(pmc_url)
    if not pmc_id:
        return []
    
    # Various PDF URL patterns to try
    pdf_urls = [
        f"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{pmc_id}/pdf/",
        f"https://europepmc.org/articles/PMC{pmc_id}?pdf=render",
        f"https://www.ncbi.nlm.nih.gov/pmc/utils/epdf/?artid=PMC{pmc_id}",
        f"https://europepmc.org/backend/ptpmcrender.fcgi?accid=PMC{pmc_id}&blobtype=pdf",
    ]
    
    return pdf_urls

def download_pdf(url, filepath, timeout=30):
    """Download PDF from URL."""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, stream=True, timeout=timeout)
        response.raise_for_status()
        
        # Check if it's actually a PDF
        content_type = response.headers.get('Content-Type', '').lower()
        first_chunk = next(response.iter_content(chunk_size=1024), b'')
        
        if not (first_chunk.startswith(b'%PDF') or 'pdf' in content_type):
            return False, "Not a PDF file"
        
        # Download the file
        with open(filepath, 'wb') as f:
            f.write(first_chunk)  # Write the first chunk we already read
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        # Check file size
        if filepath.stat().st_size < 5000:  # Less than 5KB is suspicious
            return False, "File too small"
        
        return True, "Success"
        
    except requests.exceptions.RequestException as e:
        return False, f"Network error: {e}"
    except Exception as e:
        return False, f"Error: {e}"

def process_csv(csv_file, output_dir="downloaded_pdfs", limit=None):
    """Process the CSV file and attempt to download PDFs."""
    
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(exist_ok=True)
    
    success_dir = output_path / "successful_downloads"
    failed_dir = output_path / "failed_attempts"
    success_dir.mkdir(exist_ok=True)
    failed_dir.mkdir(exist_ok=True)
    
    # Read CSV
    publications = []
    with open(csv_file, 'r', encoding='utf-8-sig') as f:
        content = f.read()
        lines = content.strip().split('\n')
        reader = csv.reader(lines)
        next(reader)  # Skip header
        
        for row in reader:
            if len(row) >= 2:
                publications.append((row[0].strip(), row[1].strip()))
    
    if limit:
        publications = publications[:limit]
    
    logger.info(f"Processing {len(publications)} publications...")
    
    # Statistics
    stats = {'success': 0, 'failed': 0, 'total': len(publications)}
    
    # Create logs
    url_log = output_path / "all_pdf_urls.txt"
    failed_log = output_path / "failed_downloads.txt"
    
    with open(url_log, 'w') as url_file, open(failed_log, 'w') as fail_file:
        url_file.write("All PDF URLs for Manual Review\n")
        url_file.write("=" * 50 + "\n\n")
        
        fail_file.write("Failed Downloads Log\n")
        fail_file.write("=" * 50 + "\n\n")
        
        for i, (title, link) in enumerate(publications, 1):
            logger.info(f"Processing {i}/{len(publications)}: {title[:50]}...")
            
            # Generate filename
            clean_title = sanitize_filename(title)
            filename = f"{i:03d}_{clean_title}.pdf"
            filepath = success_dir / filename
            
            # Skip if already exists
            if filepath.exists():
                logger.info(f"Already exists: {filename}")
                stats['success'] += 1
                continue
            
            # Get PDF URLs
            pdf_urls = get_pdf_urls(link)
            
            # Log all URLs for manual review
            url_file.write(f"{i}. {title}\n")
            url_file.write(f"   Original: {link}\n")
            for j, pdf_url in enumerate(pdf_urls, 1):
                url_file.write(f"   PDF {j}: {pdf_url}\n")
            url_file.write("\n")
            
            # Try to download
            downloaded = False
            last_error = ""
            
            for pdf_url in pdf_urls:
                success, message = download_pdf(pdf_url, filepath, timeout=30)
                if success:
                    logger.info(f"Successfully downloaded: {filename}")
                    downloaded = True
                    stats['success'] += 1
                    break
                else:
                    last_error = message
                    logger.debug(f"Failed {pdf_url}: {message}")
                
                time.sleep(0.5)  # Small delay between attempts
            
            if not downloaded:
                stats['failed'] += 1
                fail_file.write(f"{i}. {title}\n")
                fail_file.write(f"   Original URL: {link}\n")
                fail_file.write(f"   Last error: {last_error}\n")
                fail_file.write(f"   PDF URLs tried:\n")
                for pdf_url in pdf_urls:
                    fail_file.write(f"     - {pdf_url}\n")
                fail_file.write("\n")
            
            # Progress update
            if i % 10 == 0:
                logger.info(f"Progress: {i}/{len(publications)}, Success: {stats['success']}")
            
            # Respectful delay
            time.sleep(1.0)
    
    # Final report
    logger.info("\n" + "="*60)
    logger.info("DOWNLOAD SUMMARY")
    logger.info("="*60)
    logger.info(f"Total publications: {stats['total']}")
    logger.info(f"Successfully downloaded: {stats['success']}")
    logger.info(f"Failed downloads: {stats['failed']}")
    logger.info(f"Success rate: {(stats['success']/stats['total']*100):.1f}%")
    logger.info(f"\nFiles saved in: {output_path}")
    logger.info(f"All PDF URLs logged in: {url_log}")
    logger.info(f"Failed downloads logged in: {failed_log}")
    logger.info("="*60)

def main():
    """Main function."""
    print("Simple PDF Downloader for NCBI PMC Articles")
    print("=" * 50)
    
    csv_file = "articles.csv"
    if not os.path.exists(csv_file):
        print(f"Error: CSV file '{csv_file}' not found!")
        return
    
    print(f"CSV file: {csv_file}")
    print()
    
    choice = input("Choose an option:\n1. Test with first 3 publications\n2. Download all publications\n3. Just generate URL list (no downloads)\nEnter choice (1-3): ").strip()
    
    if choice == "1":
        print("Testing with first 3 publications...")
        process_csv(csv_file, limit=3)
    elif choice == "2":
        confirm = input("Download all publications? This may take a while. (y/N): ").lower().strip()
        if confirm == 'y':
            process_csv(csv_file)
        else:
            print("Cancelled.")
    elif choice == "3":
        print("Generating URL list only...")
        # Create URL list without downloading
        output_path = Path("pdf_urls_only")
        output_path.mkdir(exist_ok=True)
        
        with open("publication.csv", 'r', encoding='utf-8-sig') as f:
            content = f.read()
            lines = content.strip().split('\n')
            reader = csv.reader(lines)
            next(reader)  # Skip header
            
            with open(output_path / "all_pdf_urls.txt", 'w') as url_file:
                url_file.write("All Potential PDF URLs\n")
                url_file.write("=" * 50 + "\n\n")
                
                for i, row in enumerate(reader, 1):
                    if len(row) >= 2:
                        title, link = row[0].strip(), row[1].strip()
                        pdf_urls = get_pdf_urls(link)
                        
                        url_file.write(f"{i}. {title}\n")
                        url_file.write(f"   Original: {link}\n")
                        for j, pdf_url in enumerate(pdf_urls, 1):
                            url_file.write(f"   PDF {j}: {pdf_url}\n")
                        url_file.write("\n")
        
        print(f"URL list saved to: {output_path / 'all_pdf_urls.txt'}")
    else:
        print("Invalid choice.")

if __name__ == "__main__":
    main()