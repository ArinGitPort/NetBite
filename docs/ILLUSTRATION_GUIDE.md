# NetBite Educational Illustration Guide

## Purpose

Lesson illustrations must make the networking relationship easier to understand before they decorate the page. “16-bit” describes the crisp visual treatment of device and protocol-object artwork; it does not change a protocol, layer order, address, range, table entry, or direction.

## Hybrid construction rule

- React Native owns every factual label, address, prefix, bit count, range, arrow, port, table, layer name, layer number, state, and mapping.
- Raster assets are unlabeled examples: devices, frames, datagrams, requests, replies, cache modules, and application objects.
- Never accept technical text generated inside an image. Never infer a protocol fact from the shape or color of a sprite.
- Use measured responsive layouts that account for system font scaling. Content may grow vertically; text must not shrink below the shared 11px technical minimum.
- Compact diagrams stack full IPv4 values, multi-node flows, table records, and cross-model mappings. Horizontal composition is used only when every value meets its readable minimum width.
- Full address ranges are structured as network, first usable, last usable, and broadcast values. Do not render a long usable range as one unbreakable line.
- Lesson diagrams never require horizontal scrolling, truncate factual text, or hide overflow.
- Use text and shape differences alongside color. Every panel requires one complete accessibility description.
- Diagrams describe deterministic educational states, not packet timing, queues, sockets, or a live protocol simulation.

## Visual treatment

- Crisp pixel clusters, hard edges, two or three flat shading planes, and a compact isometric or front-three-quarter view.
- No gradients, glow, blur, cast shadows, logos, photographic texture, or decorative circuitry outside the object.
- Neutral reading surfaces are preferred. Red, orange, sage, blue, violet, and gold communicate categories or active paths, but color never carries meaning alone.
- Existing PC, switch, router, NIC, cable, port, and packet art remains valid when its technical role is clear.

## Reusable generated asset prompt

Use the existing NetBite PC and NIC art as style references. Replace `[OBJECT]` and `[IDENTIFYING GEOMETRY]` for each asset:

> Create one compact 16-bit-inspired pixel-art `[OBJECT]` for a mobile networking education game. Make it recognizable through `[IDENTIFYING GEOMETRY]`. Use crisp pixel clusters, thick geometry, hard edges, limited muted industrial colors, and only two or three flat shading planes. Render one centered object in a three-quarter isometric view, filling about 75% of a square canvas. Use a perfectly flat #FF00FF background for chroma-key removal. Do not include text, letters, numbers, arrows, logos, frames, cast shadows, glow, blur, gradients, particles, or scenery.

The library contains separate server/terminal, Ethernet frame, IPv4 datagram, ARP request/reply/cache, ICMP Echo Request/Reply, route-table, 802.1Q-tagged frame, transport-channel, session-handshake, presentation/encoding, and application-window assets.

## Asset pipeline

1. Generate each object separately at 1024x1024 on flat `#FF00FF`.
2. Remove the chroma key with a soft alpha matte and magenta despill.
3. Keep the cleaned source under `assets/images/education/source/`.
4. Produce a nearest-neighbor 256x256 mobile variant under `assets/images/education/` with the `-mobile.png` suffix.
5. Run `scripts/validate-education-assets.ps1` and `npm run assets:optimize` after changing a source asset.

## Required factual presentations

- OSI is always shown vertically from Layer 7 Application at the top to Layer 1 Physical at the bottom.
- TCP/IP is shown as Application, Transport, Internet, and Network Access / Link.
- Model mapping is deterministic: OSI Application/Presentation/Session to TCP/IP Application; Transport to Transport; Network to Internet; Data Link/Physical to Network Access / Link.
- IPv4, subnet, routing, ARP, ICMP, Ethernet, MAC-learning, and VLAN diagrams must match the claims and boundaries recorded in `references/ILLUSTRATION_SOURCES.md`.
- Subnet bit strips label every position as network or host and connect active bit values to the decimal mask octet.
- Subnet maps use vertical rows with complete network, usable, and broadcast IPv4 addresses; unexplained final-octet shorthand is not permitted.
