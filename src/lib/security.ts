// Security utility functions for input validation and sanitization

/**
 * Sanitizes text input to prevent XSS and other injection attacks
 */
export function sanitizeText(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, ''); // Remove data: protocol
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validates text input length and content
 */
export function validateTextInput(
  input: string, 
  minLength: number = 0, 
  maxLength: number = 500
): { isValid: boolean; error?: string } {
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Input must be text' };
  }
  
  const trimmed = input.trim();
  
  if (trimmed.length < minLength) {
    return { isValid: false, error: `Text must be at least ${minLength} characters` };
  }
  
  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Text must be less than ${maxLength} characters` };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:text\/html/i
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return { isValid: false, error: 'Invalid characters detected' };
    }
  }
  
  return { isValid: true };
}

/**
 * Rate limiting helper (client-side)
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  canAttempt(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}