// import { z } from 'zod'; // z is no longer used directly in this file

// Helper validation functions (can be moved to a general utils file if used elsewhere)
export const isNonEmptyString = (val: string | undefined): val is string =>
  val !== undefined && val.trim() !== '';

export const isNumeric = (val: string | undefined): val is string =>
  isNonEmptyString(val) && !isNaN(parseInt(val));

// Record types for the UI select dropdown
export const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'] as const;
export type UiRecordType = typeof RECORD_TYPES[number];

// Note: The Zod schemas previously in this file (dnsRecordUISchema, 
// soaSettingsSchema, zoneSchema, dnsConfigSchema specific to form structure)
// have been removed. The main API schemas from 'dnsConfigValidator.ts'
// are now used directly by the form resolver in DNSConfig.tsx, and those
// API schemas include transformations to handle various input formats (e.g.,
// semicolon-separated strings to arrays, string numbers to actual numbers).
// This consolidation simplifies the validation pipeline.
// If any UI-specific validation logic (beyond what the API schema enforces)
// is needed, it can be handled directly in the component or via a separate,
// more focused UI validation schema if necessary.