// DNS Types

// Most DNS related types (for API inputs, outputs, and core configurations)
// are now inferred from Zod schemas defined in:
// 'packages/shared/src/validators/dnsConfigValidator.ts'

// Examples of types available from dnsConfigValidator.ts:
// - DnsRecordType (or DnsRecord)
// - SoaSettingsType (or SoaSettings)
// - ZoneType (or Zone)
// - DnsConfigurationType (or DnsConfiguration)

// If there are any DNS-related types that are purely for UI state or specific frontend logic
// and *cannot* be derived from the Zod schemas, they can remain here.
// Otherwise, this file can be kept minimal or eventually removed if all types
// are consolidated and inferred from the validator schemas.

// For example, a very specific UI-only helper type might be:
// export type DnsZoneDisplayMode = 'simple' | 'advanced';

// However, based on current review, the primary configuration and record types
// are well-covered by the Zod schemas.
// The DnsConfigFormValues and DnsUpdateResponse previously in this file are
// also made redundant by tRPC's input/output typing and React Hook Form's
// integration with Zod schemas.