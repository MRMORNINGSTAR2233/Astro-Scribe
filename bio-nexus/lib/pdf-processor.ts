import fs from 'fs'
import path from 'path'
import pdf from 'pdf-parse'  // PDF parsing library
import mammoth from 'mammoth'
// Partial OCR support
import { createWorker } from 'tesseract.js'
// import { fromPath } from 'pdf2pic'

export interface PDFExtractionResult {
  text: string
  metadata: {
    title?: string
    authors?: string[]
    year?: number
    source?: string
    abstract?: string
    keywords?: string[]
    pageCount?: number
    fileSize?: number
    processingMethod: 'pdf-parse' | 'ocr' | 'hybrid'
    publicationDate?: string | null
  }
}

export class PDFProcessor {
  private authorPatterns = [
    /author[s]?[\s:]+([^.]+)/i,
    /by[\s:]+([^.]+)/i,
    /authors?[\s:]+((?:[A-Z][a-z]+ [A-Z][a-z]+(?:,|;| and | & )?)+)/i
  ];

  private affiliationPatterns = [
    /affiliation[s]?[\s:]+([^.]+)/i,
    /department[s]?[\s:]+([^.]+)/i,
    /institute[s]?[\s:]+([^.]+)/i,
    /university[\s:]+([^.]+)/i,
    /address[es]?[\s:]+([^.]+)/i,
  ];

  private abstractPatterns = [
    /abstract[\s:]+([^.]+(\.[^.]+){1,10})/i,
    /summary[\s:]+([^.]+(\.[^.]+){1,5})/i
  ];

  private datePatterns = [
    /(?:published|date|received):?\s*(\d{1,2}[\s\.\/-]\d{1,2}[\s\.\/-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4}|\d{4})/i,
    /(?:\d{1,2}[\s\.\/-]\d{1,2}[\s\.\/-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/i
  ];
  
  /**
   * Extract text and metadata from a PDF file
   */
  async extractFromFile(filePath: string): Promise<PDFExtractionResult> {
    try {
      // Get file stats
      const stats = fs.statSync(filePath)
      const fileSize = stats.size
      const fileName = path.basename(filePath)

      // First, try standard PDF text extraction
      const buffer = fs.readFileSync(filePath)
      let extractionResult = await this.extractWithPdfParse(buffer)
      
      // Extract basic file metadata if not available
      if (!extractionResult.metadata.title) {
        extractionResult.metadata.title = fileName.replace('.pdf', '').replace(/[_-]/g, ' ')
      }
      
      if (!extractionResult.metadata.authors || extractionResult.metadata.authors.length === 0) {
        extractionResult.metadata.authors = ['NASA Research Team']
      }
      
      extractionResult.metadata.fileSize = fileSize
      
      // If text extraction yields poor results, try OCR
      if (this.isTextExtractionPoor(extractionResult.text)) {
        console.log('Text extraction poor, attempting OCR...')
        const ocrResult = await this.extractWithOCR(filePath)
        
        if (ocrResult.text.length > extractionResult.text.length) {
          extractionResult = {
            text: ocrResult.text,
            metadata: {
              ...extractionResult.metadata,
              ...ocrResult.metadata,
              processingMethod: 'ocr' as const
            }
          }
        } else {
          extractionResult.metadata.processingMethod = 'hybrid'
        }
      }

      // Enhance metadata extraction
      const enhancedMetadata = await this.extractMetadata(extractionResult.text)
      
      return {
        text: extractionResult.text,
        metadata: {
          ...extractionResult.metadata,
          ...enhancedMetadata,
          fileSize,
          pageCount: extractionResult.metadata.pageCount
        }
      }

    } catch (error) {
      console.error('PDF processing error:', error)
      throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract text using pdf-parse library
   */
  private async extractWithPdfParse(buffer: Buffer): Promise<PDFExtractionResult> {
    try {
      console.log('Parsing PDF with pdf-parse...');
      
      // Use actual pdf-parse library to extract text
      const data = await pdf(buffer, {
        max: 0, // No page limit
        pagerender: function pagerender(pageData) {
          return pageData.getTextContent()
            .then(function(textContent: any) {
              let lastY: number | undefined, text = '';
              for (let item of textContent.items) {
                if (lastY == item.transform[5] || !lastY){
                  text += item.str;
                } else {
                  text += '\n' + item.str;
                }    
                lastY = item.transform[5];
              }
              return text;
            });
        }
      });
      
      // Extract text and metadata from the result
      const text = data.text || '';
      const info = data.info || {};
      const metadata = {
        title: info.Title || info.title || '',
        authors: info.Author ? [info.Author] : (info.author ? [info.author] : []),
        pageCount: data.numpages || 0,
        processingMethod: 'pdf-parse' as const
      };
      
      console.log('PDF parsing complete. Text length:', text.length, 'Pages:', metadata.pageCount);
      
      return {
        text: text,
        metadata: metadata
      }
    } catch (error) {
      console.error('PDF parse error:', error)
      throw new Error('Failed to parse PDF with pdf-parse')
    }
  }

  /**
   * Extract text using OCR (for scanned PDFs or poor quality text)
   * Currently disabled to avoid build issues
   */
  private async extractWithOCR(filePath: string): Promise<PDFExtractionResult> {
    // TODO: Re-enable OCR functionality
    throw new Error('OCR functionality temporarily disabled')
  }

  /**
   * Extract metadata from the document text
   */
  private async extractMetadata(text: string): Promise<Partial<PDFExtractionResult['metadata']>> {
    const metadata: Partial<PDFExtractionResult['metadata']> = {}

    try {
      // Extract title (usually in the first few lines)
      const lines = text.split('\n').filter(line => line.trim().length > 0)
      if (lines.length > 0) {
        // Check for specific title patterns first
        const titlePatterns = [
          /Title:\s*([^\n]+)/i,
          /^(?:TITLE|RESEARCH PAPER|ARTICLE|PUBLICATION):\s*([^\n]+)/im
        ];
        
        let foundTitle = false;
        for (const pattern of titlePatterns) {
          const match = text.match(pattern);
          if (match && match[1] && match[1].length > 5) {
            metadata.title = match[1].trim();
            foundTitle = true;
            break;
          }
        }
        
        // If no specific title pattern found, use the longest line in the first 10 lines
        if (!foundTitle) {
          const titleCandidate = lines.slice(0, 10)
            .reduce((longest, current) => 
              (current.length > longest.length && current.length < 200) ? current : longest, '')
            .trim()
          
          if (titleCandidate.length > 10 && titleCandidate.length < 200) {
            metadata.title = titleCandidate
          }
        }
      }

      // Extract authors using multiple approaches
      // 1. First, check for specific author patterns
      const authorPatterns = [
        /(?:Author[s]?|By)\s*:?\s*([A-Za-z][a-z]+(?: [A-Za-z][a-z.]+)+(,\s*[A-Za-z][a-z]+(?: [A-Za-z][a-z.]+)+)*)/i,
        /([A-Za-z][a-z]+ [A-Za-z]\. [A-Za-z][a-z]+(?:,\s*[A-Za-z][a-z]+ [A-Za-z]\. [A-Za-z][a-z]+)*)/,
        /^(?:AUTHORS|RESEARCHER[S]?):\s*([^\n]+)/im,
        // Look for typical author listing formats
        /\b([A-Za-z][a-z]+(?: [A-Za-z][a-z.]+){1,3}(?:,\s*(?:and\s*)?[A-Za-z][a-z]+(?: [A-Za-z][a-z.]+){1,3})*)\b/
      ]

      // 2. Check for authors with affiliations pattern (common in research papers)
      const affiliationPatterns = [
        /([A-Za-z][a-z]+(?: [A-Za-z][a-z.]+)+)(?:\s*\d+|\s*\*)(?:,\s*([A-Za-z][a-z]+(?: [A-Za-z][a-z.]+)+)(?:\s*\d+|\s*\*))*/
      ]
      
      let authorFound = false;
      
      // Try all author patterns
      for (const pattern of [...authorPatterns, ...affiliationPatterns]) {
        const match = text.match(pattern)
        if (match && match[1]) {
          // Split by common separators
          const authorText = match[1];
          const authors = authorText.split(/,|;|and/).map(author => author.trim()).filter(a => a.length > 0);
          
          if (authors.length > 0) {
            metadata.authors = authors;
            authorFound = true;
            break;
          }
        }
      }
      
      // If no authors found yet, try a more aggressive search in the first few paragraphs
      if (!authorFound) {
        // Look for lines that likely contain author names in the first 20 lines
        const potentialAuthorLines = lines.slice(0, 20).filter(line => {
          // Lines with multiple names but not too long (avoid table of contents)
          return line.length > 5 && 
                line.length < 100 && 
                /[A-Z][a-z]+ [A-Z]/.test(line) && 
                !/title|abstract|introduction|chapter|section|table|figure/i.test(line);
        });
        
        if (potentialAuthorLines.length > 0) {
          // Use the shortest line that likely has names as it's most likely the author list
          const authorLine = potentialAuthorLines.reduce((shortest, current) => 
            current.length < shortest.length ? current : shortest, potentialAuthorLines[0]);
            
          // Extract names from this line
          const names = authorLine.split(/,|;|and|\s{2,}/).map(name => name.trim()).filter(name => {
            return name.length > 0 && /[A-Z][a-z]+/.test(name);
          });
          
          if (names.length > 0) {
            metadata.authors = names;
            authorFound = true;
          }
        }
      }
      
      // If still no authors found, extract from filename or use default
      if (!metadata.authors || metadata.authors.length === 0) {
        console.log('No authors found in text, using default');
        metadata.authors = ['NASA Research Team'];
      }

      // Extract publication date and year
      // First try to find a full date
      for (const pattern of this.datePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          metadata.publicationDate = match[1].trim();
          
          // Extract year from date
          const yearMatch = metadata.publicationDate.match(/\d{4}/);
          if (yearMatch) {
            metadata.year = parseInt(yearMatch[0], 10);
            break;
          }
        }
      }
      
      // If no year found from date, try to find just a year
      if (!metadata.year) {
        const yearPattern = /(?:19|20)\d{2}/g
        const years = text.match(yearPattern)
        if (years) {
          // Take the most recent reasonable year
          const recentYears = years
            .map(y => parseInt(y))
            .filter(y => y >= 1900 && y <= new Date().getFullYear())
            .sort((a, b) => b - a)
          
          if (recentYears.length > 0) {
            metadata.year = recentYears[0];
            
            // Set publication date to year only if not already set
            if (!metadata.publicationDate) {
              metadata.publicationDate = recentYears[0].toString();
            }
          }
        }
      }
      
      // Default to current year if none found
      if (!metadata.year) {
        metadata.year = new Date().getFullYear();
        metadata.publicationDate = metadata.publicationDate || new Date().toISOString().split('T')[0];
      }

      // Extract abstract (look for "Abstract" section)
      const abstractPattern = new RegExp('(?:Abstract|ABSTRACT)\\s*:?\\s*(.*?)(?:\\n\\s*\\n|\\n\\s*(?:Keywords|Introduction|1\\.|I\\.))', 'si')
      const abstractMatch = text.match(abstractPattern)
      if (abstractMatch) {
        metadata.abstract = abstractMatch[1].trim().substring(0, 1000)
      }

      // Extract keywords
      const keywordMatch = text.match(/(?:Keywords|Key words|KEYWORDS)\s*:?\s*(.*?)(?:\n\s*\n|$)/i)
      if (keywordMatch) {
        metadata.keywords = keywordMatch[1]
          .split(/[,;]/)
          .map(kw => kw.trim())
          .filter(kw => kw.length > 2 && kw.length < 50)
          .slice(0, 20) // Limit to 20 keywords
      }

      // Detect source/journal
      const journalPatterns = [
        /Journal of ([^,\n]+)/i,
        /Proceedings of ([^,\n]+)/i,
        /([A-Z][a-z]+ (?:Journal|Review|Science|Medicine))/i
      ]

      for (const pattern of journalPatterns) {
        const match = text.match(pattern)
        if (match) {
          metadata.source = match[1] || match[0]
          break
        }
      }

      return metadata

    } catch (error) {
      console.error('Metadata extraction error:', error)
      return metadata
    }
  }

  /**
   * Determine if text extraction quality is poor
   */
  private isTextExtractionPoor(text: string): boolean {
    if (!text || text.length < 100) return true
    
    // Check for high ratio of special characters (indicates poor extraction)
    const specialCharRatio = (text.match(/[^\w\s]/g) || []).length / text.length
    if (specialCharRatio > 0.3) return true

    // Check for reasonable word density
    const words = text.split(/\s+/).filter(word => word.length > 1)
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
    if (avgWordLength > 15 || avgWordLength < 3) return true

    // Check for reasonable sentence structure
    const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10)
    if (sentences.length < text.length / 200) return true

    return false
  }

  /**
   * Extract text from Word documents (bonus feature)
   */
  async extractFromWordDoc(buffer: Buffer): Promise<PDFExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      
      const metadata = await this.extractMetadata(result.value)
      
      return {
        text: result.value,
        metadata: {
          ...metadata,
          processingMethod: 'pdf-parse', // Using same enum for simplicity
          fileSize: buffer.length
        }
      }
    } catch (error) {
      throw new Error(`Word document processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}