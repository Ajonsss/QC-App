export async function checkGrammar(text: string) {
  if (!text || text.trim() === "") return [];

  try {
    // Pointing directly to your local Java server!
    // Inside src/utils/languageTool.ts
const response = await fetch('https://parade-junkie-shampoo.ngrok-free.dev', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'ngrok-skip-browser-warning': 'true' // This bypasses the free-tier warning page!
  },
  body: new URLSearchParams({
    text: textToCheck,
    language: 'en-US'
  })
});

    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    console.error("LanguageTool local server error:", error);
    return [];
  }
}