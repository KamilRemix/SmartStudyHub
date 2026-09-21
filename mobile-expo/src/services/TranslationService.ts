export interface TranslateResult {
  translatedText: string;
  sourceLang?: string;
}

export class TranslationService {
  /**
   * Translates text using Google Translate single gtx endpoint.
   * Resolves multi-sentence and multi-paragraph text via data[0].map(item => item[0]).join('').
   */
  static async translate(text: string, fromLang: string, toLang: string): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return '';

    const sl = fromLang === 'auto' ? 'auto' : fromLang;
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=${sl}&tl=${toLang}&q=${encodeURIComponent(trimmed)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Translation request failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data && Array.isArray(data[0])) {
      const translated = data[0].map((item: any) => item?.[0] || '').join('');
      if (!translated.trim()) {
        throw new Error('Received empty translation from endpoint');
      }
      return translated;
    }

    throw new Error('Unexpected translation response format');
  }
}
