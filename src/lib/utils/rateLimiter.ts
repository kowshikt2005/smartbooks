import type { RateLimitConfig, RateLimitState } from '@/types/twilio';

/**
 * Token Bucket Rate Limiter
 * Implements rate limiting for Twilio API calls using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(capacity: number = 80, refillRate: number = 80) {
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token (wait if necessary)
   */
  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    
    // Calculate wait time for next token
    const waitTime = Math.ceil(1000 / this.refillRate);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    return this.acquire();
  }

  /**
   * Try to acquire a token without waiting
   */
  tryAcquire(): boolean {
    this.refill();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  /**
   * Get current rate limit state
   */
  getState(): RateLimitState {
    this.refill();
    
    return {
      tokens: this.tokens,
      lastRefill: this.lastRefill,
      isLimited: this.tokens === 0,
      nextAvailableAt: this.tokens === 0 ? 
        new Date(Date.now() + Math.ceil(1000 / this.refillRate)) : 
        undefined
    };
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = Math.floor(timePassed * this.refillRate / 1000);
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Get time until next token is available (in milliseconds)
   */
  getTimeUntilNextToken(): number {
    this.refill();
    
    if (this.tokens > 0) {
      return 0;
    }
    
    return Math.ceil(1000 / this.refillRate);
  }
}

/**
 * Exponential backoff utility for retry logic
 */
export class ExponentialBackoff {
  private attempt: number = 0;
  private readonly maxAttempts: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;

  constructor(maxAttempts: number = 3, baseDelay: number = 1000, maxDelay: number = 30000) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  /**
   * Get delay for current attempt
   */
  getDelay(): number {
    if (this.attempt >= this.maxAttempts) {
      return -1; // No more attempts
    }
    
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.attempt),
      this.maxDelay
    );
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.max(0, delay + jitter);
  }

  /**
   * Wait for the calculated delay
   */
  async wait(): Promise<boolean> {
    const delay = this.getDelay();
    
    if (delay < 0) {
      return false; // No more attempts
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
    this.attempt++;
    return true;
  }

  /**
   * Check if more attempts are available
   */
  hasMoreAttempts(): boolean {
    return this.attempt < this.maxAttempts;
  }

  /**
   * Reset the backoff counter
   */
  reset(): void {
    this.attempt = 0;
  }

  /**
   * Get current attempt number
   */
  getCurrentAttempt(): number {
    return this.attempt;
  }
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  shouldRetry: (error: any) => boolean,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  const backoff = new ExponentialBackoff(maxAttempts, baseDelay);
  let lastError: any;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!shouldRetry(error) || !backoff.hasMoreAttempts()) {
        throw error;
      }
      
      const canRetry = await backoff.wait();
      if (!canRetry) {
        throw lastError;
      }
    }
  }
}

/**
 * Batch processor with rate limiting
 */
export class BatchProcessor<T, R> {
  private readonly rateLimiter: RateLimiter;
  private readonly batchSize: number;

  constructor(rateLimiter: RateLimiter, batchSize: number = 10) {
    this.rateLimiter = rateLimiter;
    this.batchSize = batchSize;
  }

  /**
   * Process items in batches with rate limiting
   */
  async process(
    items: T[],
    processor: (item: T) => Promise<R>,
    onProgress?: (processed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      // Process batch in parallel with rate limiting
      const batchPromises = batch.map(async (item) => {
        await this.rateLimiter.acquire();
        return processor(item);
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Collect results and handle failures
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Handle failed items - could be logged or retried
          console.error('Batch item failed:', result.reason);
          throw result.reason;
        }
      }
      
      // Report progress
      onProgress?.(i + batch.length, items.length);
      
      // Small delay between batches to prevent overwhelming
      if (i + this.batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
}