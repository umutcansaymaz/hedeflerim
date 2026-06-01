// ===== Utility Function Tests =====
// Tests for escapeHtml, truncateText, sanitizeColor, normalizeDateValue
// Functions are loaded from app-v5.js via the setup file.
import { describe, it, expect } from 'vitest';

describe('escapeHtml()', () => {
  it('should escape <script> tags', () => {
    expect(globalThis.escapeHtml('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('should escape ampersands', () => {
    expect(globalThis.escapeHtml('a & b & c')).toBe('a &amp; b &amp; c');
  });

  it('should escape double quotes', () => {
    expect(globalThis.escapeHtml('he said "hello"')).toBe('he said &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(globalThis.escapeHtml("it's a test")).toBe('it&#39;s a test');
  });

  it('should escape all XSS vectors combined', () => {
    const input = `<img src=x onerror="alert('XSS')"> &`;
    const output = globalThis.escapeHtml(input);
    expect(output).toContain('&lt;img');
    expect(output).toContain('&gt;');
    expect(output).toContain('&quot;');
    expect(output).toContain('&#39;');
    expect(output).toContain('&amp;');
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
    expect(output).not.toContain('"');
  });

  it('should return empty string for null', () => {
    expect(globalThis.escapeHtml(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(globalThis.escapeHtml(undefined)).toBe('');
  });

  it('should return empty string for empty input', () => {
    expect(globalThis.escapeHtml('')).toBe('');
  });

  it('should return plain text unchanged', () => {
    expect(globalThis.escapeHtml('Merhaba Dünya')).toBe('Merhaba Dünya');
  });

  it('should handle numbers by converting to string', () => {
    expect(globalThis.escapeHtml(42)).toBe('42');
    expect(globalThis.escapeHtml(0)).toBe('0');
  });
});

describe('truncateText()', () => {
  it('should return text unchanged when within limit', () => {
    expect(globalThis.truncateText('hello', 10)).toBe('hello');
  });

  it('should truncate text exceeding maxLength', () => {
    expect(globalThis.truncateText('hello world this is long', 10)).toBe('hello worl');
  });

  it('should return text at exact maxLength boundary', () => {
    expect(globalThis.truncateText('exactly10', 10)).toBe('exactly10');
  });

  it('should return empty string for empty input', () => {
    expect(globalThis.truncateText('', 10)).toBe('');
  });

  it('should return empty string for null input', () => {
    expect(globalThis.truncateText(null, 10)).toBe('');
  });

  it('should return empty string for undefined input', () => {
    expect(globalThis.truncateText(undefined, 10)).toBe('');
  });

  it('should return empty string when maxLength is zero', () => {
    expect(globalThis.truncateText('hello', 0)).toBe('');
  });

  it('should return empty string when maxLength is negative', () => {
    expect(globalThis.truncateText('hello', -1)).toBe('');
  });

  it('should return empty string when maxLength is NaN', () => {
    expect(globalThis.truncateText('hello', NaN)).toBe('');
  });

  it('should handle non-string input by converting', () => {
    expect(globalThis.truncateText(12345, 3)).toBe('123');
  });

  it('should not add ellipsis (spec says slice only)', () => {
    const result = globalThis.truncateText('abcdefghij', 5);
    expect(result).toBe('abcde');
    expect(result).not.toContain('...');
  });
});

describe('sanitizeColor()', () => {
  it('should return valid 6-digit hex color', () => {
    expect(globalThis.sanitizeColor('#8B5CF6')).toBe('#8B5CF6');
    expect(globalThis.sanitizeColor('#ff0000')).toBe('#ff0000');
    expect(globalThis.sanitizeColor('#0EA5E9')).toBe('#0EA5E9');
  });

  it('should return valid 3-digit hex color', () => {
    expect(globalThis.sanitizeColor('#FFF')).toBe('#FFF');
    expect(globalThis.sanitizeColor('#abc')).toBe('#abc');
  });

  it('should return fallback for invalid hex color', () => {
    expect(globalThis.sanitizeColor('red')).toBe('#8B5CF6');
    expect(globalThis.sanitizeColor('#GGGGGG')).toBe('#8B5CF6');
    expect(globalThis.sanitizeColor('123456')).toBe('#8B5CF6');
  });

  it('should return fallback for empty string', () => {
    expect(globalThis.sanitizeColor('')).toBe('#8B5CF6');
  });

  it('should return fallback for null', () => {
    expect(globalThis.sanitizeColor(null)).toBe('#8B5CF6');
  });

  it('should return fallback for undefined', () => {
    expect(globalThis.sanitizeColor(undefined)).toBe('#8B5CF6');
  });

  it('should use custom fallback when provided', () => {
    expect(globalThis.sanitizeColor('invalid', '#000000')).toBe('#000000');
    expect(globalThis.sanitizeColor('', '#ffffff')).toBe('#ffffff');
  });

  it('should trim whitespace from input', () => {
    expect(globalThis.sanitizeColor('  #FF0000  ')).toBe('#FF0000');
  });

  it('should handle lowercase hex', () => {
    expect(globalThis.sanitizeColor('#aabbcc')).toBe('#aabbcc');
  });

  it('should handle uppercase hex', () => {
    expect(globalThis.sanitizeColor('#AABBCC')).toBe('#AABBCC');
  });
});

describe('normalizeDateValue()', () => {
  const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

  it('should return ISO string from valid date string', () => {
    const result = globalThis.normalizeDateValue('2024-01-15T10:30:00.000Z', 'fallback');
    expect(result).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should return trimmed ISO string when input has whitespace', () => {
    const result = globalThis.normalizeDateValue('  2024-06-01T12:00:00.000Z  ', 'fallback');
    expect(result).toBe('2024-06-01T12:00:00.000Z');
  });

  it('should return fallback for invalid date string', () => {
    const result = globalThis.normalizeDateValue('not-a-date', 'fallback-value');
    expect(result).toBe('fallback-value');
  });

  it('should return fallback for empty string', () => {
    const result = globalThis.normalizeDateValue('', 'fallback-value');
    expect(result).toBe('fallback-value');
  });

  it('should return fallback for null', () => {
    const result = globalThis.normalizeDateValue(null, 'fallback-value');
    expect(result).toBe('fallback-value');
  });

  it('should return fallback for undefined', () => {
    const result = globalThis.normalizeDateValue(undefined, 'fallback-value');
    expect(result).toBe('fallback-value');
  });

  it('should handle Date object', () => {
    const date = new Date('2024-03-15T08:00:00.000Z');
    const result = globalThis.normalizeDateValue(date, 'fallback');
    expect(result).toBe('2024-03-15T08:00:00.000Z');
  });

  it('should handle Firestore Timestamp-like object with toDate()', () => {
    const timestampLike = { toDate: () => new Date('2024-07-04T12:00:00.000Z') };
    const result = globalThis.normalizeDateValue(timestampLike, 'fallback');
    expect(result).toBe('2024-07-04T12:00:00.000Z');
  });

  it('should handle Firestore Timestamp with invalid toDate()', () => {
    const timestampLike = { toDate: () => 'invalid' };
    const result = globalThis.normalizeDateValue(timestampLike, 'fallback-value');
    expect(result).toBe('fallback-value');
  });

  it('should use default fallback (current date ISO) when not provided', () => {
    const before = new Date().toISOString();
    const result = globalThis.normalizeDateValue(null);
    const after = new Date().toISOString();
    expect(result >= before && result <= after).toBe(true);
  });

  it('should handle number (timestamp)', () => {
    const timestamp = 1705300000000;
    const result = globalThis.normalizeDateValue(timestamp, 'fallback');
    expect(result).toMatch(isoDatePattern);
  });

  it('should handle whitespace-only as invalid', () => {
    const result = globalThis.normalizeDateValue('   ', 'fallback-value');
    expect(result).toBe('fallback-value');
  });
});
