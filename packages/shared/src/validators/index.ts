// Export all validators

// Import and re-export with explicit names
import * as dnsConfigValidators from './dnsConfigValidator';
import * as dnsFormValidators from './dnsFormValidator';
import * as userValidators from './userValidator';
import * as dnsTransformers from './dnsTransformers';
import * as httpFormValidators from './httpFormValidator';
import * as httpTransformers from './httpTransformers';

// Re-export everything from dnsConfigValidator
export * from './dnsConfigValidator';

// Re-export from dnsFormValidator with renamed zoneSchema to avoid conflict
export { 
  isNonEmptyString,
  isNumeric,
  RECORD_TYPES,
  dnsRecordUISchema,
  soaSettingsSchema,
  dnsConfigSchema
} from './dnsFormValidator';
export { zoneSchema as uiZoneSchema } from './dnsFormValidator';
export type { UiRecordType } from './dnsFormValidator';

// Re-export transformers
export { 
  transformUiRecordToApiRecord, 
  parseStringToArray, 
  transformFormToApiData 
} from './dnsTransformers';

// Re-export HTTP validators and transformers
export {
  isValidPort,
  isValidPath,
  isValidServerName,
  isValidEmail,
  virtualHostSchema,
  httpConfigSchema
} from './httpFormValidator';
export type { HttpConfigFormValues, VirtualHostFormValues } from './httpFormValidator';

export {
  transformUiVirtualHostToApi,
  transformApiVirtualHostToUi,
  parsePortString,
  transformHttpFormToApi,
  transformHttpApiToForm
} from './httpTransformers';

// Re-export everything from userValidator
export * from './userValidator'; 