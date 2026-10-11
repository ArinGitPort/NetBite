import { deriveIpv4Network } from "@netbite/networking";
import type {
  WorkshopDeviceInterface,
  WorkshopDeviceType,
  WorkshopLinkPurpose,
  WorkshopTopology,
  WorkshopTopologyDevice,
  WorkshopTopologyLink,
  WorkshopTopologyStarterId,
} from "./workshop-contract";

export const topologyStarters: Array<{
  id: WorkshopTopologyStarterId;
  title: string;
  description: string;
}> = [
  {
    id: "first-network",
    title: "First switched network",
    description: "Two PCs connected through one switch.",
  },
  {
    id: "static-routing",
    title: "Static routing",
    description: "Two LANs connected by three routers.",
  },
  {
    id: "vlan-trunk",
    title: "VLAN access and trunking",
    description: "Two switches carrying VLANs 10 and 20.",
  },
  {
    id: "router-on-a-stick",
    title: "Router-on-a-Stick",
    description: "One router trunk with VLAN subinterfaces.",
  },
  {
    id: "dhcp-relay",
    title: "DHCP relay",
    description: "A client reaches a DHCP server through a relay router.",
  },
  {
    id: "dns-service",
    title: "DNS service path",
    description: "A client resolves a name before reaching a server.",
  },
  {
    id: "acl-placement",
    title: "ACL placement",
    description: "A routed flow crosses an interface policy.",
  },
  {
    id: "nat-pat",
    title: "NAT and PAT",
    description: "An inside LAN reaches an outside network through PAT.",
  },
  {
    id: "ipv6-delivery",
    title: "IPv6 delivery",
    description: "Two IPv6 LANs connected through routers.",
  },
  {
    id: "stp-redundancy",
    title: "Redundant STP switching",
    description: "Three switches form a redundant triangle.",
  },
  {
    id: "lacp-etherchannel",
    title: "LACP EtherChannel",
    description: "Two switches use two physical bundle members.",
  },
  {
    id: "route-source",
    title: "Route-source comparison",
    description: "A router compares connected, static, and OSPF candidates.",
  },
  {
    id: "single-area-ospf",
    title: "Single-area OSPF",
    description: "Three routers share Area 0 topology information.",
  },
];
