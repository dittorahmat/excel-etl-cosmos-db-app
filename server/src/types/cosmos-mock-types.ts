/**
 * Mock types for Azure Cosmos DB SDK
 * These types are not exported by the @azure/cosmos package,
 * so we define them here for use in our mock implementation.
 */

/**
 * Represents diagnostic information for a Cosmos DB operation.
 */
export interface CosmosDiagnostics {
  diagnosticNode: DiagnosticNode;
  clientSideRequestStatistics: ClientSideRequestStatistics;
}

/**
 * Represents a node in the diagnostic tree.
 */
export interface DiagnosticNode {
  id: string;
  nodeType: string;
  data: Record<string, unknown>;
  children: DiagnosticNode[];
  startTimeUTCInMs: number;
  durationInMs: number;
  record: () => void;
}

/**
 * Represents client-side request statistics.
 */
export interface ClientSideRequestStatistics {
  requestStartTimeUTC: Date;
  requestEndTimeUTC: Date;
  requestLatencyInMs: number;
  retryCount: number;
  metadataCallCount: number;
  metadataCallsDurationInMs: number;
  requestPayloadLengthInBytes: number;
  responsePayloadLengthInBytes: number;
  operationType: string;
  resourceType: string;
  statusCode: number;
  requestId: string;
  activityId: string;
  requestCharge: number;
  requestPayloadLength: number;
  responsePayloadLength: number;
  locationEndpointToAddress: Record<string, string>;
  gatewayStatistics: GatewayStatistics[];
  clientCorrelationId: string;
  connectionReused: boolean;
  connectionId: string;
  connectionTimeoutInMs: number;
  failedAttempts: unknown[];
  metadataLookupInMs: number;
  partitionKeyRangeId: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  serializationDiagnostics: Record<string, unknown>;
  systemInformation: Record<string, unknown>;
  transportRequestTimeline: unknown[];
  useMultipleWriteLocations: boolean;
  payloadSentInBytes: number;
  payloadReceivedInBytes: number;
  requestPayloadLengthInBytesToRead: number;
  responsePayloadLengthInBytesToRead: number;
  requestPayloadReadInBytes: number;
  responsePayloadReadInBytes: number;
  payloadSentInBytesToFlush: number;
  payloadSentInBytesFlushed: number;
  requestPayloadStartTimeUTC: Date;
  requestPayloadEndTimeUTC: Date;
  responsePayloadStartTimeUTC: Date;
  responsePayloadEndTimeUTC: Date;
  serializationStartTimeUTC: Date;
  serializationEndTimeUTC: Date;
  serializationDurationInMs: number;
  requestPayloadDurationInMs: number;
  responsePayloadDurationInMs: number;
  requestPayloadFlushDurationInMs: number;
  requestPayloadReadDurationInMs: number;
  responsePayloadReadDurationInMs: number;
  requestPayloadFlushStartTimeUTC: Date;
  requestPayloadFlushEndTimeUTC: Date;
  requestPayloadReadStartTimeUTC: Date;
  requestPayloadReadEndTimeUTC: Date;
  responsePayloadReadStartTimeUTC: Date;
  responsePayloadReadEndTimeUTC: Date;
}

/**
 * Represents gateway statistics for a request.
 */
export interface GatewayStatistics {
  startTimeUTC: Date;
  endTimeUTC: Date;
  statusCode: number;
  activityId: string;
  partitionKeyRangeId?: string;
  requestPayloadLengthInBytes: number;
  responsePayloadLengthInBytes: number;
  operationType: string;
  resourceType: string;
  requestUri: string;
  requestResourceType: string;
  requestOperationType: string;
  location: string;
  regionName: string;
  backendLatencyInMs: number;
  retryAfterInMs?: number;
  retryReason?: string;
  requestCharge: number;
  requestChargeHeaders: Record<string, unknown>;
  requestHeaders: Record<string, unknown>;
  responseHeaders: Record<string, unknown>;
  responseStatistics: unknown[];
  addressResolutionStatistics: unknown[];
  storeResult: unknown;
  transportRequestTimeline: unknown[];
}
