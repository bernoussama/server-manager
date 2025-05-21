// Service Types

// Core service-related types are now defined and inferred from Zod schemas
// in 'packages/shared/src/validators/serviceValidator.ts'.
// This ensures a single source of truth for these types across
// the backend (tRPC routers) and frontend.

// Examples of types available from serviceValidator.ts:
// - AllowedServiceType (for 'named' | 'dhcpd' | 'httpd')
// - ServiceStatusType (for 'running' | 'stopped' | 'failed' | 'unknown')
// - ServiceResponseType (for the structure of a single service status object)
// - ServiceInputType (for operations targeting a specific service)

// Old API wrapper types like ServiceResponseWrapper and ServicesStatusResponse
// are no longer needed as tRPC handles the overall response structure and
// error shapes consistently. The frontend client will directly receive
// the data type defined in the tRPC router's output (e.g., ServiceResponseType
// or an array ServiceResponseType[]).