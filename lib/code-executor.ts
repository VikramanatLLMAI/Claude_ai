/**
 * Code Execution Utility
 * Provides safe math evaluation and code analysis tools
 *
 * Note: Full sandboxed code execution requires additional setup.
 * This module provides safe alternatives for common use cases.
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Safe math evaluation tool
 * Evaluates mathematical expressions in a controlled environment
 */
export const mathTool = tool({
  description: 'Evaluate mathematical expressions safely. Use this for calculations, unit conversions, statistics, or numeric operations. Supports basic arithmetic, trigonometry, logarithms, and common math functions.',
  inputSchema: z.object({
    expression: z.string().describe('The mathematical expression to evaluate. Examples: "2 + 2", "sqrt(16)", "sin(PI/2)", "pow(2, 10)"'),
  }),
  execute: async ({ expression }) => {
    try {
      // Safe math functions
      const mathFunctions: Record<string, unknown> = {
        // Basic operations
        abs: Math.abs,
        ceil: Math.ceil,
        floor: Math.floor,
        round: Math.round,
        trunc: Math.trunc,
        sign: Math.sign,
        max: Math.max,
        min: Math.min,

        // Exponential and logarithmic
        sqrt: Math.sqrt,
        cbrt: Math.cbrt,
        pow: Math.pow,
        exp: Math.exp,
        log: Math.log,
        log10: Math.log10,
        log2: Math.log2,

        // Trigonometric
        sin: Math.sin,
        cos: Math.cos,
        tan: Math.tan,
        asin: Math.asin,
        acos: Math.acos,
        atan: Math.atan,
        atan2: Math.atan2,
        sinh: Math.sinh,
        cosh: Math.cosh,
        tanh: Math.tanh,

        // Constants
        PI: Math.PI,
        E: Math.E,
        LN2: Math.LN2,
        LN10: Math.LN10,
        LOG2E: Math.LOG2E,
        LOG10E: Math.LOG10E,
        SQRT2: Math.SQRT2,
        SQRT1_2: Math.SQRT1_2,

        // Random
        random: Math.random,

        // Utility
        hypot: Math.hypot,
        fround: Math.fround,
        clz32: Math.clz32,
        imul: Math.imul,
      };

      // Sanitize expression - only allow safe characters
      const sanitized = expression.replace(/[^0-9+\-*/().,%\s\w]/g, '');

      // Build evaluation context
      const contextKeys = Object.keys(mathFunctions);
      const contextValues = Object.values(mathFunctions);

      // Create and execute safe function
      const evalFunc = new Function(...contextKeys, `"use strict"; return (${sanitized})`);
      const result = evalFunc(...contextValues);

      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Result is not a valid number');
      }

      return JSON.stringify({
        success: true,
        expression: expression,
        result: result,
        formatted: Number.isInteger(result) ? String(result) : result.toFixed(10).replace(/\.?0+$/, ''),
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        expression: expression,
        error: error instanceof Error ? error.message : 'Failed to evaluate expression',
      });
    }
  },
});

/**
 * Unit conversion tool
 */
export const unitConversionTool = tool({
  description: 'Convert between units of measurement. Supports length, weight, temperature, time, and data sizes.',
  inputSchema: z.object({
    value: z.number().describe('The numeric value to convert'),
    fromUnit: z.string().describe('The source unit (e.g., "km", "lb", "celsius", "hours", "GB")'),
    toUnit: z.string().describe('The target unit (e.g., "miles", "kg", "fahrenheit", "minutes", "MB")'),
  }),
  execute: async ({ value, fromUnit, toUnit }) => {
    // Unit conversion factors to base units
    const conversions: Record<string, { base: string; factor: number }> = {
      // Length (base: meters)
      m: { base: 'length', factor: 1 },
      km: { base: 'length', factor: 1000 },
      cm: { base: 'length', factor: 0.01 },
      mm: { base: 'length', factor: 0.001 },
      miles: { base: 'length', factor: 1609.344 },
      mi: { base: 'length', factor: 1609.344 },
      feet: { base: 'length', factor: 0.3048 },
      ft: { base: 'length', factor: 0.3048 },
      inches: { base: 'length', factor: 0.0254 },
      in: { base: 'length', factor: 0.0254 },
      yards: { base: 'length', factor: 0.9144 },
      yd: { base: 'length', factor: 0.9144 },

      // Weight (base: grams)
      g: { base: 'weight', factor: 1 },
      kg: { base: 'weight', factor: 1000 },
      mg: { base: 'weight', factor: 0.001 },
      lb: { base: 'weight', factor: 453.592 },
      lbs: { base: 'weight', factor: 453.592 },
      oz: { base: 'weight', factor: 28.3495 },
      ton: { base: 'weight', factor: 907185 },

      // Time (base: seconds)
      seconds: { base: 'time', factor: 1 },
      sec: { base: 'time', factor: 1 },
      s: { base: 'time', factor: 1 },
      minutes: { base: 'time', factor: 60 },
      min: { base: 'time', factor: 60 },
      hours: { base: 'time', factor: 3600 },
      hr: { base: 'time', factor: 3600 },
      h: { base: 'time', factor: 3600 },
      days: { base: 'time', factor: 86400 },
      d: { base: 'time', factor: 86400 },
      weeks: { base: 'time', factor: 604800 },
      wk: { base: 'time', factor: 604800 },

      // Data (base: bytes)
      bytes: { base: 'data', factor: 1 },
      b: { base: 'data', factor: 1 },
      kb: { base: 'data', factor: 1024 },
      mb: { base: 'data', factor: 1024 * 1024 },
      gb: { base: 'data', factor: 1024 * 1024 * 1024 },
      tb: { base: 'data', factor: 1024 * 1024 * 1024 * 1024 },
    };

    const fromLower = fromUnit.toLowerCase();
    const toLower = toUnit.toLowerCase();

    // Handle temperature separately
    if (['celsius', 'c', 'fahrenheit', 'f', 'kelvin', 'k'].includes(fromLower)) {
      let celsius: number;

      // Convert to Celsius first
      switch (fromLower) {
        case 'celsius':
        case 'c':
          celsius = value;
          break;
        case 'fahrenheit':
        case 'f':
          celsius = (value - 32) * 5 / 9;
          break;
        case 'kelvin':
        case 'k':
          celsius = value - 273.15;
          break;
        default:
          return JSON.stringify({ success: false, error: 'Unknown temperature unit' });
      }

      // Convert from Celsius to target
      let result: number;
      switch (toLower) {
        case 'celsius':
        case 'c':
          result = celsius;
          break;
        case 'fahrenheit':
        case 'f':
          result = celsius * 9 / 5 + 32;
          break;
        case 'kelvin':
        case 'k':
          result = celsius + 273.15;
          break;
        default:
          return JSON.stringify({ success: false, error: 'Unknown temperature unit' });
      }

      return JSON.stringify({
        success: true,
        value,
        fromUnit,
        toUnit,
        result: Math.round(result * 1000000) / 1000000,
      });
    }

    // Standard conversion
    const from = conversions[fromLower];
    const to = conversions[toLower];

    if (!from || !to) {
      return JSON.stringify({
        success: false,
        error: `Unknown unit: ${!from ? fromUnit : toUnit}`,
      });
    }

    if (from.base !== to.base) {
      return JSON.stringify({
        success: false,
        error: `Cannot convert between ${from.base} and ${to.base}`,
      });
    }

    const result = value * from.factor / to.factor;

    return JSON.stringify({
      success: true,
      value,
      fromUnit,
      toUnit,
      result: Math.round(result * 1000000) / 1000000,
    });
  },
});

/**
 * JSON formatter tool
 */
export const jsonFormatterTool = tool({
  description: 'Format, validate, or parse JSON data. Use this to prettify JSON, check if JSON is valid, or extract specific fields.',
  inputSchema: z.object({
    json: z.string().describe('The JSON string to process'),
    action: z.enum(['format', 'validate', 'minify']).describe('The action to perform'),
  }),
  execute: async ({ json, action }) => {
    try {
      const parsed = JSON.parse(json);

      switch (action) {
        case 'format':
          return JSON.stringify({
            success: true,
            result: JSON.stringify(parsed, null, 2),
          });
        case 'validate':
          return JSON.stringify({
            success: true,
            valid: true,
            type: Array.isArray(parsed) ? 'array' : typeof parsed,
          });
        case 'minify':
          return JSON.stringify({
            success: true,
            result: JSON.stringify(parsed),
          });
        default:
          return JSON.stringify({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid JSON',
      });
    }
  },
});

/**
 * Web search tool (placeholder)
 * Note: In production, integrate with a real search API (Tavily, Serper, Google, etc.)
 */
export const webSearchTool = tool({
  description: 'Search the web for current information. Use this when you need up-to-date information or when the user asks about recent events, news, or current data.',
  inputSchema: z.object({
    query: z.string().describe('The search query to use'),
    maxResults: z.number().describe('Maximum number of results to return (default: 5)'),
  }),
  execute: async ({ query, maxResults }) => {
    // This is a placeholder implementation
    // In production, integrate with a real search API (Tavily, Serper, Google, etc.)
    const limit = maxResults || 5;
    console.log(`[WebSearch] Query: "${query}", Max results: ${limit}`);

    // Return mock results for now - replace with actual search API call
    return JSON.stringify({
      query,
      results: [
        {
          title: `Search result for: ${query}`,
          url: 'https://example.com/result',
          snippet: `This is a placeholder result for the search query "${query}". Integrate with a real search API for actual results.`,
        },
      ],
      note: 'Web search is not yet configured. Contact administrator to set up search API integration.',
    });
  },
});
