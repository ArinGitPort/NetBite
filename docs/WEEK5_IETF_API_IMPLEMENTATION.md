# Week 5 — IETF Datatracker API Integration

## API purpose

The **Internet Engineering Task Force (IETF)** is an international technical community that develops and publishes many of the specifications used by internet technologies. These technical documents are commonly published as **Requests for Comments (RFCs)**. For example, RFC 826 documents ARP, RFC 2131 documents DHCP, and RFC 9293 specifies TCP.

NetBite’s **Network Standards** screen connects lessons to these official documents. The IETF Datatracker API returns information about an RFC: its number, title, authors, abstract, publication state, standard level, page count, publication history, and official link. NetBite validates the returned JSON and formats it as a readable reference.

The API does not create the lesson explanation and does not operate the simulator. NetBite supplies the beginner-friendly teaching, while the API gives learners and instructors an authoritative record that can be used to verify the topic’s official source. It therefore provides more than a citation without attempting to reproduce the complete RFC.

The integration uses no API key, Supabase session, or Pro entitlement.

## Endpoint and method

```text
GET https://datatracker.ietf.org/doc/{document-name}/doc.json
```

Example:

```text
GET https://datatracker.ietf.org/doc/rfc826/doc.json
Accept: application/json
```

`GET` is used because the feature reads public standards metadata. `POST` is not applicable: NetBite does not create or modify IETF records, and the public document metadata endpoint is read-only.

## Retrieved and displayed data

The app parses and displays:

- RFC number and official title
- Publication state
- Standard level
- Authors and affiliations
- Abstract
- Page count
- Publication history
- Retrieval timestamp
- Official IETF document link
- A collapsible copy of the validated JSON response

The curated list covers RFCs used by the curriculum, including UDP, IPv4, ICMP, ARP, DNS, IPv4 routers, DHCP, OSPFv2, IPv6 Neighbor Discovery, IPv6, and TCP.

## Request processing

1. The learner selects an RFC.
2. NetBite sends an HTTP GET request with an `Accept: application/json` header.
3. An `AbortController` stops the request after eight seconds.
4. The response status and JSON structure are validated.
5. Required fields are parsed into typed application data.
6. Only a valid response replaces the local cached record.
7. The screen renders selectable text and an expandable JSON panel.

## Error and offline behavior

NetBite distinguishes invalid selection, timeout, DNS/offline failure, HTTP 404, other HTTP failures, invalid JSON, and incomplete metadata. A malformed response never replaces valid cached content.

Successful records are stored in a separate versioned Zustand store backed by Expo SQLite key-value storage. If refresh fails and a record exists, the screen shows `CACHED / LAST RETRIEVED` with the reason for the failed refresh. Without a cached record, the learner receives Retry and Return to Learning actions.

Primary implementation files:

- `src/core/standards/ietf-api.ts`
- `src/store/use-standards-store.ts`
- `src/app/standards.tsx`
- `src/app/learn.tsx`

## JSON response sample

```json
{
  "name": "rfc826",
  "pages": 10,
  "title": "An Ethernet Address Resolution Protocol: Or Converting Network Protocol Addresses to 48.bit Ethernet Address for Transmission on Ethernet Hardware",
  "state": "Published",
  "std_level": "Internet Standard",
  "authors": [
    {
      "name": "D. Plummer",
      "affiliation": "MIT"
    }
  ],
  "rev_history": [
    {
      "name": "rfc826",
      "published": "1982-11-01T08:00:00+00:00"
    }
  ]
}
```

## Verification

Automated tests mock successful GET, parsing, timeout, offline failure, 404, invalid JSON, incomplete data, caching, and cached fallback. A live RFC 826 request is used only for manual Android/web verification so the automated suite remains reliable without internet access.
