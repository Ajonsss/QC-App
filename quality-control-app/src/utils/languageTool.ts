// src/utils/languageTool.ts

export interface GrammarError {
  message: string;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  replacements: { value: string }[];
  rule: {
    description: string;
    issueType: string;
  };
}

/**
 * Sends text to the local LanguageTool server for grammar checking.
 */
export async function checkGrammar(text: string): Promise<GrammarError[]> {
  if (!text || text.trim() === '') return [];

  try {
    // We use URLSearchParams because the API expects x-www-form-urlencoded data
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', 'en-US'); // Change this if checking other languages

    const response = await fetch('http://localhost:8081/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error("Failed to check grammar:", error);
    return [];
  }
}