export const RFC_REFERENCES = [
  { id: 'rfc768', documentName: 'rfc768', rfcNumber: 'RFC 768', topic: 'UDP', plainPurpose: 'Defines how UDP sends small messages between application ports without creating a TCP connection.' },
  { id: 'rfc791', documentName: 'rfc791', rfcNumber: 'RFC 791', topic: 'IPv4', plainPurpose: 'Defines the IPv4 packet format and the addressing information routers use to forward traffic.' },
  { id: 'rfc792', documentName: 'rfc792', rfcNumber: 'RFC 792', topic: 'ICMP', plainPurpose: 'Defines control messages such as the Echo Request and Echo Reply used by ping.' },
  { id: 'rfc826', documentName: 'rfc826', rfcNumber: 'RFC 826', topic: 'ARP', plainPurpose: 'Explains how a device discovers the MAC address that belongs to a local IPv4 address.' },
  { id: 'rfc1034', documentName: 'rfc1034', rfcNumber: 'RFC 1034', topic: 'DNS concepts', plainPurpose: 'Explains the DNS hierarchy and how names are resolved through DNS servers.' },
  { id: 'rfc1035', documentName: 'rfc1035', rfcNumber: 'RFC 1035', topic: 'DNS messages', plainPurpose: 'Defines DNS message formats and common records used to answer name queries.' },
  { id: 'rfc1812', documentName: 'rfc1812', rfcNumber: 'RFC 1812', topic: 'IPv4 routers', plainPurpose: 'Describes how IPv4 routers should inspect, forward, and report problems with packets.' },
  { id: 'rfc2131', documentName: 'rfc2131', rfcNumber: 'RFC 2131', topic: 'DHCP', plainPurpose: 'Defines how a client can automatically receive an IPv4 address and other network settings.' },
  { id: 'rfc2328', documentName: 'rfc2328', rfcNumber: 'RFC 2328', topic: 'OSPFv2', plainPurpose: 'Defines how OSPF routers share link information and calculate routes inside one routing system.' },
  { id: 'rfc4861', documentName: 'rfc4861', rfcNumber: 'RFC 4861', topic: 'IPv6 Neighbor Discovery', plainPurpose: 'Explains how IPv6 devices discover neighbors and routers without using ARP.' },
  { id: 'rfc8200', documentName: 'rfc8200', rfcNumber: 'RFC 8200', topic: 'IPv6', plainPurpose: 'Defines the main IPv6 packet format and how IPv6 packets are processed.' },
  { id: 'rfc9293', documentName: 'rfc9293', rfcNumber: 'RFC 9293', topic: 'TCP', plainPurpose: 'Defines how TCP creates reliable, ordered communication between application endpoints.' },
] as const satisfies readonly RfcReference[];

export interface RfcReference {
  id: string;
  documentName: string;
  rfcNumber: string;
  topic: string;
  plainPurpose: string;
}

export interface RfcAuthor {
  name: string;
  affiliation?: string;
}

export interface RfcRevision {
  name: string;
  revision?: string;
  published?: string;
  url?: string;
}

export interface RfcMetadata {
  name: string;
  title: string;
  state: string;
  standardLevel?: string;
  abstract: string;
  pageCount: number;
  authors: RfcAuthor[];
  revisions: RfcRevision[];
  officialUrl: string;
  rawResponse: Record<string, unknown>;
}

export interface RfcCacheEntry {
  metadata: RfcMetadata;
  retrievedAt: string;
}

export type RfcRequestState =
  | { status: 'idle' }
  | { status: 'loading'; documentName: string }
  | { status: 'success'; source: 'live' | 'cache'; entry: RfcCacheEntry }
  | { status: 'error'; kind: RfcRequestErrorKind; message: string; cachedEntry?: RfcCacheEntry };

export type RfcRequestErrorKind = 'invalid-selection' | 'timeout' | 'offline' | 'not-found' | 'http' | 'malformed';

export class RfcRequestError extends Error {
  constructor(public readonly kind: RfcRequestErrorKind, message: string) {
    super(message);
    this.name = 'RfcRequestError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const optionalString = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;

export function isValidRfcDocumentName(value: string) {
  return /^rfc\d{1,5}$/i.test(value.trim());
}

export function parseRfcMetadataResponse(value: unknown): RfcMetadata {
  if (!isRecord(value)) throw new RfcRequestError('malformed', 'The IETF response was not a JSON object.');
  const name = optionalString(value.name)?.toLowerCase();
  const title = optionalString(value.title);
  const state = optionalString(value.state);
  const abstract = optionalString(value.abstract);
  const pageCount = value.pages;
  if (!name || !isValidRfcDocumentName(name) || !title || !state || !abstract || typeof pageCount !== 'number' || !Number.isInteger(pageCount) || pageCount < 1) {
    throw new RfcRequestError('malformed', 'The IETF response is missing required RFC metadata.');
  }
  if (!Array.isArray(value.authors) || !Array.isArray(value.rev_history)) {
    throw new RfcRequestError('malformed', 'The IETF response has incomplete author or publication history data.');
  }
  const authors = value.authors.flatMap<RfcAuthor>((author) => {
    if (!isRecord(author)) return [];
    const authorName = optionalString(author.name);
    if (!authorName) return [];
    return [{ name: authorName, affiliation: optionalString(author.affiliation) }];
  });
  const revisions = value.rev_history.flatMap<RfcRevision>((revision) => {
    if (!isRecord(revision)) return [];
    const revisionName = optionalString(revision.name);
    if (!revisionName) return [];
    return [{ name: revisionName, revision: optionalString(revision.rev), published: optionalString(revision.published), url: optionalString(revision.url) }];
  });
  return {
    name,
    title,
    state,
    standardLevel: optionalString(value.std_level) ?? optionalString(value.intended_std_level),
    abstract,
    pageCount,
    authors,
    revisions,
    officialUrl: `https://datatracker.ietf.org/doc/${name}/`,
    rawResponse: value,
  };
}

export async function fetchRfcMetadata(documentName: string, options: { timeoutMs?: number; fetchImpl?: typeof fetch } = {}) {
  const normalized = documentName.trim().toLowerCase();
  if (!isValidRfcDocumentName(normalized)) throw new RfcRequestError('invalid-selection', 'Choose a valid RFC from the curated list.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8_000);
  try {
    const response = await (options.fetchImpl ?? fetch)(`https://datatracker.ietf.org/doc/${normalized}/doc.json`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (response.status === 404) throw new RfcRequestError('not-found', `${normalized.toUpperCase()} was not found by the IETF Datatracker.`);
    if (!response.ok) throw new RfcRequestError('http', `The IETF Datatracker returned HTTP ${response.status}.`);
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new RfcRequestError('malformed', 'The IETF response was not valid JSON.');
    }
    return parseRfcMetadataResponse(json);
  } catch (error) {
    if (error instanceof RfcRequestError) throw error;
    if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new RfcRequestError('timeout', 'The IETF request took longer than eight seconds.');
    }
    throw new RfcRequestError('offline', 'The IETF Datatracker could not be reached. Check the connection and try again.');
  } finally {
    clearTimeout(timeout);
  }
}
