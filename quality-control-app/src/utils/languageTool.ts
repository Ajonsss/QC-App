export async function checkGrammar(text: string) {
  if (!text || text.trim() === "") return [];

  try {
    // Pointing directly to your local Java server!
    const response = await fetch('http://localhost:8081/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // 'en-US' checks for standard American English rules
      body: new URLSearchParams({
        text: text,
        language: 'en-US', 
      }),
    });

    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error("LanguageTool local server error:", error);
    return [];
  }
}