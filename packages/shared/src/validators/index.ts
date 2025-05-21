// Export all validators

// Re-export everything from dnsConfigValidator.ts
// This includes the main API schemas like dnsConfigurationSchema, zoneSchema, dnsRecordSchema, soaSettingsSchema
// and their inferred types (DnsConfigurationType, ZoneType, DnsRecordType, SoaSettingsType, 
// plus aliases DnsConfiguration, Zone, DnsRecord, SoaSettings).
export * from './dnsConfigValidator';

// Re-export helper functions and UI-specific constants from dnsFormValidator.ts
export { 
  isNonEmptyString,
  isNumeric,
  RECORD_TYPES,
  UiRecordType
} from './dnsFormValidator';

// Re-export everything from userValidator.ts
// This includes input schemas (userSignupInput, userLoginInput, userCreateInput, userUpdateInput, userIdInput)
// and output schemas (userOutput, loginOutput) and their inferred types.
export * from './userValidator'; 

// Re-export everything from serviceValidator.ts (newly created)
// This includes allowedServiceSchema, serviceStatusSchema, serviceResponseSchema, serviceInputSchema
// and their inferred types.
export * from './serviceValidator';