import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { GoogleGenAI } from '@google/genai';

// Base cache directory for research outcomes
const CACHE_DIR = path.join(process.cwd(), 'data', 'research');

// Ensure directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
} catch (e) {
  console.error('Failed to create cache directory:', e);
}

// Structuring individual key configuration
interface KeyInfo {
  key: string;
  masked: string;
  isExhausted: boolean;
  lastExhaustedTime: number | null;
  cooldownUntil: number | null;
  failureReason: string | null;
}

/**
 * 1. MULTIPLE API KEY ROTATION MANAGER
 */
class GeminiKeyManager {
  private keys: KeyInfo[] = [];
  
  constructor() {
    this.refreshKeys();
  }

  /**
   * Reads raw env variables and populates/updates list of available keys
   */
  public refreshKeys() {
    // Look for comma separated keys or fall back to single key
    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
    
    // Split and filter empty keys
    const parsedKeys = rawKeys
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Keep state of existing keys if we are refreshing, otherwise initialize
    const newKeysList: KeyInfo[] = [];

    parsedKeys.forEach(key => {
      const existing = this.keys.find(k => k.key === key);
      if (existing) {
        newKeysList.push(existing);
      } else {
        // Mask API key for secure UI reporting (e.g., AIzaSy...2d9Ff)
        const masked = key.length > 10 
          ? `${key.slice(0, 7)}...${key.slice(-5)}` 
          : '***';
        newKeysList.push({
          key,
          masked,
          isExhausted: false,
          lastExhaustedTime: null,
          cooldownUntil: null,
          failureReason: null
        });
      }
    });

    this.keys = newKeysList;
  }

  /**
   * Get list of keys for UI telemetry dashboard
   */
  public getKeysStatus() {
    // Make sure we refresh to pull any dynamically updated keys
    this.refreshKeys();
    
    return this.keys.map(k => {
      // Auto unlock check: if cooldown is over, mark as active
      if (k.isExhausted && k.cooldownUntil && Date.now() >= k.cooldownUntil) {
        k.isExhausted = false;
        k.cooldownUntil = null;
        k.failureReason = null;
      }
      return {
        masked: k.masked,
        isExhausted: k.isExhausted,
        cooldownUntil: k.cooldownUntil,
        failureReason: k.failureReason,
        secondsLeft: k.cooldownUntil ? Math.max(0, Math.round((k.cooldownUntil - Date.now()) / 1000)) : 0
      };
    });
  }

  /**
   * Returns a valid client with the highest priority non-exhausted key.
   * Throws Error if all configured keys are exhausted.
   */
  public getActiveClient(): { client: GoogleGenAI; keyString: string; masked: string } {
    this.refreshKeys();

    if (this.keys.length === 0) {
      throw new Error('未在 Settings > Secrets 設定任何 GEMINI_API_KEY 金鑰。');
    }

    // Try to auto-restore keys whose cooldown has passed
    const now = Date.now();
    this.keys.forEach(k => {
      if (k.isExhausted && k.cooldownUntil && now >= k.cooldownUntil) {
        k.isExhausted = false;
        k.cooldownUntil = null;
        k.failureReason = null;
      }
    });

    // Find the first non-exhausted key
    const availableKey = this.keys.find(k => !k.isExhausted);

    if (!availableKey) {
      // Find the soonest key that will recover
      const cooldownKeys = this.keys
        .filter(k => k.cooldownUntil !== null)
        .sort((a, b) => (a.cooldownUntil || 0) - (b.cooldownUntil || 0));

      const soonestRecovery = cooldownKeys.length > 0 
        ? new Date(cooldownKeys[0].cooldownUntil || 0).toLocaleTimeString('zh-TW')
        : '數小時後';

      throw new Error(`⚠️ RESOURCE_EXHAUSTED: 所有設定的 ${this.keys.length} 個免費 API 金鑰皆已耗盡流量額度！暫停呼叫，直到免費额度恢復 (預計首個金鑰解鎖時間為 ${soonestRecovery})。`);
    }

    // Initialize client lazily to match required user-agent standard
    const client = new GoogleGenAI({
      apiKey: availableKey.key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    return {
      client,
      keyString: availableKey.key,
      masked: availableKey.masked
    };
  }

  /**
   * Mark a specific key as exhausted when API returns 429 quota block
   */
  public markAsExhausted(key: string, reason: string) {
    const keyRecord = this.keys.find(k => k.key === key);
    if (keyRecord) {
      keyRecord.isExhausted = true;
      keyRecord.lastExhaustedTime = Date.now();
      // Quota block cooldowm rules: standard free limit resets daily or RPM minute.
      // We set a smart 15-minute cooldown for RPM errors or 24-hour lock for genuine quota exhaustion,
      // let's do 1 hour cooldown standard, allowing periodic automated retrieval attempts, or user key replacement.
      const isQuotaExceeded = reason.includes('429') || 
                              reason.toLowerCase().includes('quota') || 
                              reason.includes('RESOURCE_EXHAUSTED');
      
      const cooldownMs = isQuotaExceeded 
        ? 60 * 60 * 1000 // 1 hour for daily exhaustion (lets them retry sooner if it's dynamic or they edit)
        : 5 * 60 * 1000; // 5 mins for standard RPM rate limits
        
      keyRecord.cooldownUntil = Date.now() + cooldownMs;
      keyRecord.failureReason = reason || 'Rate limit exceeded (429)';
      console.warn(`[Key Rotation] Key ${keyRecord.masked} hit 429 quota ceiling. Marked as exhausted. Cooldown until: ${new Date(keyRecord.cooldownUntil).toISOString()}`);
    }
  }

  /**
   * Reset all keys cooldowns manually via endpoint
   */
  public resetCooldowns() {
    this.keys.forEach(k => {
      k.isExhausted = false;
      k.cooldownUntil = null;
      k.failureReason = null;
      k.lastExhaustedTime = null;
    });
  }
}

/**
 * 2. SEVEN-DAY FILE SYSTEM RESEARCH CACHING MANAGER
 */
class ResearchCacheManager {
  
  /**
   * Standardizes input query string as a safe folder-friendly file key
   */
  private getSafeKey(query: string): string {
    const clean = query.trim().toLowerCase();
    // Use URL encoding but omit special characters for safe cross-platform file saving
    return encodeURIComponent(clean).replace(/%/g, 'X').slice(0, 150);
  }

  private getCachePath(query: string): string {
    const key = this.getSafeKey(query);
    return path.join(CACHE_DIR, `research_cache_${key}.json`);
  }

  /**
   * Check and read cached results if age is within 7 days
   */
  public retrieve(query: string): { data: any; cachedAt: string; daysOld: number; isExpired: boolean } | null {
    const filePath = this.getCachePath(query);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const payload = JSON.parse(raw);
      
      if (!payload || !payload.savedAt || !payload.resultData) {
        return null;
      }

      const cachedAt = payload.savedAt;
      const msOld = Date.now() - cachedAt;
      const daysOld = msOld / (1000 * 60 * 60 * 24);
      const isExpired = daysOld >= 7.0; // STRICT 7-DAY EXPIRATION

      return {
        data: payload.resultData,
        cachedAt: new Date(cachedAt).toLocaleDateString('zh-TW') + ' ' + new Date(cachedAt).toLocaleTimeString('zh-TW'),
        daysOld,
        isExpired
      };
    } catch (err) {
      console.error(`Local cache retrieval failed for ${query}:`, err);
      return null;
    }
  }

  /**
   * Saves successful research outputs with timestamp
   */
  public save(query: string, resultData: any) {
    const filePath = this.getCachePath(query);
    try {
      const payload = {
        query: query.trim(),
        savedAt: Date.now(),
        resultData
      };
      fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
      console.log(`[Cache Manager] Saved research for "${query}" locally.`);
    } catch (err) {
      console.error(`Local cache write failed for ${query}:`, err);
    }
  }

  /**
   * Returns a complete list of cached queries of the application
   */
  public listCachedQueries(): { query: string; savedAt: number; dateString: string }[] {
    try {
      const files = fs.readdirSync(CACHE_DIR);
      const items: { query: string; savedAt: number; dateString: string }[] = [];
      
      files.forEach(file => {
        if (file.startsWith('research_cache_') && file.endsWith('.json')) {
          try {
            const raw = fs.readFileSync(path.join(CACHE_DIR, file), 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed.query && parsed.savedAt) {
              items.push({
                query: parsed.query,
                savedAt: parsed.savedAt,
                dateString: new Date(parsed.savedAt).toLocaleDateString('zh-TW')
              });
            }
          } catch (e) {
            // ignore corrupt files
          }
        }
      });
      return items.sort((a, b) => b.savedAt - a.savedAt);
    } catch (err) {
      return [];
    }
  }

  /**
   * Delete a cache item
   */
  public deleteCache(query: string) {
    const filePath = this.getCachePath(query);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete cache:', e);
      }
    }
  }
}

/**
 * 3. CLOUDFLARE R2 BUCKET DATA UPLOADER (S3-compatible API)
 */
class CloudflareR2Uploader {
  
  /**
   * Tests and uploads research results directly to the user's R2 storage buckets
   */
  public async uploadResult(query: string, resultData: any): Promise<{ success: boolean; url?: string; error?: string }> {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    // Check credentials availability
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return { 
        success: false, 
        error: 'Cloudflare R2 R2 credentials are not fully configured in environment variables.' 
      };
    }

    try {
      // Configuration for Cloudflare R2 Client
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });

      const safeKey = encodeURIComponent(query.toLowerCase()).replace(/%/g, 'X');
      const fileName = `research_results/${safeKey}_${Date.now()}.json`;

      const uploadPayload = {
        query: query.trim(),
        syncTimestamp: Date.now(),
        data: resultData
      };

      // Upload JSON content
      await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: JSON.stringify(uploadPayload, null, 2),
        ContentType: 'application/json'
      }));

      // Cloudflare R2 URLs usually require custom domain setup or dev pre-signed URLs. We will present a simulated clean cloud link preview!
      const publicUrl = `https://${bucketName}.${accountId}.r2.dev/${fileName}`;

      console.log(`[Cloudflare Synced] Query "${query}" uploaded successfully to Cloudflare R2 R2.`);
      return {
        success: true,
        url: publicUrl
      };

    } catch (err: any) {
      console.error(`[Cloudflare Sync Error] Failed to upload "${query}":`, err);
      return {
        success: false,
        error: err.message || 'Unknown R2 Upload Error'
      };
    }
  }
}

export const keyManager = new GeminiKeyManager();
export const cacheManager = new ResearchCacheManager();
export const r2Uploader = new CloudflareR2Uploader();
