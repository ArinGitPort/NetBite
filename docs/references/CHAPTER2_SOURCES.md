# Chapter 2 Technical Sources

Jeremy’s IT Lab is a reference for beginner-friendly CCNA sequencing and teaching emphasis. NetBite’s technical claims are independently checked against standards and vendor documentation.

## Ethernet and Frames

- [IEEE 802.3 Ethernet overview](https://www.ieee802.org/misc-docs/GlobeCom2009/IEEE_802d3_Law.pdf) — frame structure, destination and source address fields, client data, frame check sequence, and Ethernet physical media.
- [Cisco: What Is Ethernet?](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-ethernet.html) — practical overview of wired Ethernet, switches, copper, and fiber.
- [Cisco: What Is an Ethernet Switch?](https://www.cisco.com/site/us/en/learn/topics/networking/what-is-an-ethernet-switch.html) — devices connect to switch ports and data is carried in Ethernet frames containing sender and destination MAC addresses.

## Cabling Accuracy

- [Cisco: Configuring Auto-MDIX](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3650/software/release/16-9/configuration_guide/int_hw/b_169_int_and_hw_3650_cg/configuring_auto_mdix.html) — auto-MDIX automatically detects straight-through or crossover requirements; without it, unlike device types use straight-through and like network-device types use crossover wiring.

The Chapter 2 lab is explicitly marked `LEGACY MODE` so learners understand why the manual cable rule matters without mistaking it for a universal modern requirement.

## Ports and Indicators

- [Cisco: Troubleshoot Switch Port and Interface Problems](https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/12027-53.html) — a good physical connection produces link state, while a link light alone does not prove end-to-end network connectivity.
- [Cisco ASR 9000 Ethernet line-card guide](https://www.cisco.com/c/en/us/td/docs/iosxr/asr9000/hardware-install/ethernet-line-card-installation-guide/b-asr9k-ethernt-line-card-install-guide/b-asr9k-ethernt-line-card-install-guide_chapter_010.pdf) — port LEDs indicate established physical link and link activity.

## Content Decisions

- Detailed MAC address formatting, switch learning, flooding, broadcast behavior, and forwarding are reserved for Chapter 3.
- Ethernet frame content is simplified to destination, source, data, and error-checking concepts. Exact field sizes are intentionally deferred.
- Fiber is introduced as optical media, while the lab focuses only on traditional copper wiring choices.
- Manual cabling graphics show conceptual transmit and receive paths. They are explicitly not RJ-45 pinouts or a representation of conductor count.
- Ethernet scope, frame structure, media choice, manual pair orientation, auto-MDIX, and link-state evidence are taught as separate concepts.
- Worked examples distinguish payload, Ethernet frame, NIC action, and physical signal instead of treating them as one object.
