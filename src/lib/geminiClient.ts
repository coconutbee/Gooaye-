// ============================================================================
// Gemini 結構化呼叫模組 (deep module)
// ----------------------------------------------------------------------------
// 把「向 Gemini 要一段 JSON」這件事收斂成單一介面：
//   - 自動套用多金鑰輪替與重試（透過 server_utils 的 keyManager）
//   - 統一去除模型偶爾加上的 ```json 圍欄並 JSON.parse
//   - 額度用盡 (429 / RESOURCE_EXHAUSTED) 自動換下一把 key；其他暫時性錯誤自動重試
//
// 後端所有 Gemini「要 JSON」的呼叫都應走這裡，不要再各自手刻 call → 切圍欄 → parse。
// ============================================================================

import { keyManager } from '../../server_utils';

export interface GeminiJsonOptions {
  /** 啟用 Google Search grounding（需要最新網路資訊時開啟） */
  search?: boolean;
  /** 覆寫模型，預設 gemini-3.5-flash */
  model?: string;
  /** 最多嘗試次數（含換 key），預設 5 */
  maxAttempts?: number;
  /** 每次實際使用某把 key 時回呼，方便上層做遙測（如顯示目前用哪把金鑰） */
  onKeyUsed?: (maskedKey: string) => void;
}

const DEFAULT_MODEL = 'gemini-3.5-flash';

/** 去除模型偶爾加上的 ```json / ``` 圍欄後 JSON.parse */
export function parseGeminiJson<T = any>(rawText: string): T {
  let text = (rawText || '').trim();
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  return JSON.parse(text.trim()) as T;
}

function isQuotaError(message: string): boolean {
  return /429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(message);
}

/**
 * 向 Gemini 要一段 JSON，並解析成型別 T。
 *
 * 內含多金鑰輪替 + 重試：
 *   - 額度/限流錯誤 → 把該 key 冷凍，換下一把重試
 *   - 壞 JSON 等暫時性錯誤 → 直接重試
 * 所有 key 耗盡或連續失敗到 maxAttempts 時，throw 最後一個錯誤。
 */
export async function geminiJson<T = any>(
  prompt: string,
  opts: GeminiJsonOptions = {}
): Promise<T> {
  const model = opts.model ?? DEFAULT_MODEL;
  const maxAttempts = opts.maxAttempts ?? 5;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let active;
    try {
      active = keyManager.getActiveClient();
    } catch (keyErr) {
      // 沒有任何可用的 key 了，無須再試
      lastError = keyErr;
      break;
    }

    opts.onKeyUsed?.(active.masked);

    try {
      const response = await active.client.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          ...(opts.search ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });
      return parseGeminiJson<T>(response.text || '');
    } catch (err) {
      lastError = err;
      const message = (err as Error)?.message || String(err);
      console.error(`[geminiJson] attempt ${attempt}/${maxAttempts} via ${active.masked} failed: ${message}`);
      // 只有額度/限流錯誤才冷凍 key；壞 JSON 等暫時性錯誤直接重試
      if (isQuotaError(message)) {
        keyManager.markAsExhausted(active.keyString, message);
      }
    }
  }

  throw lastError ?? new Error('geminiJson: 無法取得有效回應');
}
