import {
  assertObject,
  type JsonObject,
  requiredText,
  ServiceError,
} from "./service-core.ts";
export function optionalIpv4(value: unknown, label: string) {
  if (value == null || value === "") return undefined;
  const text = String(value);
  if (
    !/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(text)
  ) {
    throw new ServiceError(
      "INVALID_TOPOLOGY",
      `${label} is not a valid IPv4 address.`,
    );
  }
  return text;
}

export function optionalIpv4Network(value: unknown, label: string) {
  if (value == null || value === "") return undefined;
  const [address, prefix, extra] = String(value).split("/");
  const parsedPrefix = Number(prefix);
  if (
    extra != null ||
    !address ||
    optionalIpv4(address, label) == null ||
    !Number.isInteger(parsedPrefix) ||
    parsedPrefix < 0 ||
    parsedPrefix > 32
  ) {
    throw new ServiceError(
      "INVALID_TOPOLOGY",
      `${label} must use network and prefix notation such as 192.168.10.0/24.`,
    );
  }
  return `${address}/${parsedPrefix}`;
}

export function optionalInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new ServiceError(
      "INVALID_TOPOLOGY",
      `${label} must be between ${minimum} and ${maximum}.`,
    );
  }
  return parsed;
}

export function optionalIpv6(value: unknown, label: string) {
  if (value == null || value === "") return undefined;
  const text = String(value).trim();
  if (!text.includes(":") || !/^[0-9a-f:]+$/i.test(text)) {
    throw new ServiceError(
      "INVALID_TOPOLOGY",
      `${label} is not a valid IPv6 address.`,
    );
  }
  return text;
}

export function sanitizeDeviceConfiguration(
  value: unknown,
  deviceName: string,
  interfaceIds: Set<string>,
) {
  if (value == null) return undefined;
  assertObject(value, `${deviceName} configuration`);
  const configuration: JsonObject = {};
  if (Array.isArray(value.vlans)) {
    configuration.vlans = value.vlans.slice(0, 256).map((raw, index) => {
      assertObject(raw, `${deviceName} VLAN ${index + 1}`);
      return {
        id: optionalInteger(raw.id, `${deviceName} VLAN`, 1, 4094)!,
        name: raw.name ? String(raw.name).slice(0, 40) : undefined,
      };
    });
  }
  if (value.services != null) {
    assertObject(value.services, `${deviceName} services`);
    const services = value.services;
    configuration.services = {
      addressMode: services.addressMode === "dhcp" ? "dhcp" : "static",
      resolver: optionalIpv4(services.resolver, `${deviceName} resolver`),
      transportListeners: Array.isArray(services.transportListeners)
        ? services.transportListeners.slice(0, 64).map((raw, index) => {
          assertObject(raw, `${deviceName} listener ${index + 1}`);
          return {
            id: requiredText(raw.id, `${deviceName} listener code`, 100),
            protocol: raw.protocol === "udp" ? "udp" : "tcp",
            port: optionalInteger(
              raw.port,
              `${deviceName} listener port`,
              1,
              65535,
            )!,
            service: requiredText(raw.service, `${deviceName} service`, 80),
          };
        })
        : undefined,
      dhcpPools: Array.isArray(services.dhcpPools)
        ? services.dhcpPools.slice(0, 32).map((raw, index) => {
          assertObject(raw, `${deviceName} DHCP pool ${index + 1}`);
          return {
            id: requiredText(raw.id, `${deviceName} DHCP pool code`, 100),
            name: requiredText(raw.name, `${deviceName} DHCP pool name`, 80),
            network: optionalIpv4(
              raw.network,
              `${deviceName} DHCP pool network`,
            ),
            prefix: optionalInteger(
              raw.prefix,
              `${deviceName} DHCP pool prefix`,
              0,
              32,
            )!,
            firstAddress: optionalIpv4(
              raw.firstAddress,
              `${deviceName} first pool address`,
            ),
            lastAddress: optionalIpv4(
              raw.lastAddress,
              `${deviceName} last pool address`,
            ),
            exclusions: Array.isArray(raw.exclusions)
              ? raw.exclusions.slice(0, 128).map((address) =>
                optionalIpv4(address, `${deviceName} excluded address`)!
              )
              : undefined,
            gateway: optionalIpv4(raw.gateway, `${deviceName} DHCP gateway`),
            dnsServer: optionalIpv4(
              raw.dnsServer,
              `${deviceName} DHCP DNS server`,
            ),
            leaseMinutes: optionalInteger(
              raw.leaseMinutes,
              `${deviceName} lease duration`,
              1,
              525600,
            ),
          };
        })
        : undefined,
      dnsRecords: Array.isArray(services.dnsRecords)
        ? services.dnsRecords.slice(0, 256).map((raw, index) => {
          assertObject(raw, `${deviceName} DNS record ${index + 1}`);
          const recordType = raw.type === "AAAA" ? "AAAA" : "A";
          return {
            id: requiredText(raw.id, `${deviceName} DNS record code`, 100),
            name: requiredText(raw.name, `${deviceName} DNS name`, 255),
            type: recordType,
            value: recordType === "AAAA"
              ? optionalIpv6(raw.value, `${deviceName} DNS value`)
              : optionalIpv4(raw.value, `${deviceName} DNS value`),
            ttl: optionalInteger(
              raw.ttl,
              `${deviceName} DNS TTL`,
              0,
              2147483647,
            ),
          };
        })
        : undefined,
    };
  }
  if (value.acl != null) {
    assertObject(value.acl, `${deviceName} ACL`);
    configuration.acl = {
      name: requiredText(value.acl.name, `${deviceName} ACL name`, 80),
      rules: Array.isArray(value.acl.rules)
        ? value.acl.rules.slice(0, 256).map((raw, index) => {
          assertObject(raw, `${deviceName} ACL rule ${index + 1}`);
          const protocol = String(raw.protocol);
          if (!["ip", "tcp", "udp", "icmp"].includes(protocol)) {
            throw new ServiceError(
              "INVALID_TOPOLOGY",
              `${deviceName} has an unsupported ACL protocol.`,
            );
          }
          return {
            id: requiredText(raw.id, `${deviceName} ACL rule code`, 100),
            sequence: optionalInteger(
              raw.sequence,
              `${deviceName} ACL sequence`,
              1,
              2147483647,
            )!,
            action: raw.action === "deny" ? "deny" : "permit",
            protocol,
            source: requiredText(raw.source, `${deviceName} ACL source`, 100),
            destination: requiredText(
              raw.destination,
              `${deviceName} ACL destination`,
              100,
            ),
            destinationPort: optionalInteger(
              raw.destinationPort,
              `${deviceName} ACL port`,
              1,
              65535,
            ),
          };
        })
        : [],
      applications: Array.isArray(value.acl.applications)
        ? value.acl.applications.slice(0, 64).map((raw, index) => {
          assertObject(raw, `${deviceName} ACL application ${index + 1}`);
          const interfaceId = requiredText(
            raw.interfaceId,
            `${deviceName} ACL interface`,
            40,
          );
          if (!interfaceIds.has(interfaceId)) {
            throw new ServiceError(
              "INVALID_TOPOLOGY",
              `${deviceName} ACL refers to a missing interface.`,
            );
          }
          return {
            interfaceId,
            direction: raw.direction === "out" ? "out" : "in",
          };
        })
        : undefined,
    };
  }
  if (value.nat != null) {
    assertObject(value.nat, `${deviceName} NAT configuration`);
    const overloadInterfaceId = value.nat.overloadInterfaceId
      ? requiredText(
        value.nat.overloadInterfaceId,
        `${deviceName} NAT overload interface`,
        40,
      )
      : undefined;
    if (overloadInterfaceId && !interfaceIds.has(overloadInterfaceId)) {
      throw new ServiceError(
        "INVALID_TOPOLOGY",
        `${deviceName} NAT refers to a missing interface.`,
      );
    }
    configuration.nat = {
      eligibleNetworks: Array.isArray(value.nat.eligibleNetworks)
        ? value.nat.eligibleNetworks.slice(0, 64).map((network) =>
          optionalIpv4Network(network, `${deviceName} NAT network`)!
        )
        : undefined,
      overloadInterfaceId,
      staticMappings: Array.isArray(value.nat.staticMappings)
        ? value.nat.staticMappings.slice(0, 128).map((raw, index) => {
          assertObject(raw, `${deviceName} NAT mapping ${index + 1}`);
          return {
            id: requiredText(raw.id, `${deviceName} NAT mapping code`, 100),
            insideLocal: optionalIpv4(
              raw.insideLocal,
              `${deviceName} inside local address`,
            )!,
            insideGlobal: optionalIpv4(
              raw.insideGlobal,
              `${deviceName} inside global address`,
            )!,
          };
        })
        : undefined,
    };
  }
  if (value.stp != null) {
    assertObject(value.stp, `${deviceName} STP configuration`);
    configuration.stp = {
      bridgePriority: optionalInteger(
        value.stp.bridgePriority,
        `${deviceName} bridge priority`,
        0,
        61440,
      ),
      rootRole: value.stp.rootRole === "root"
        ? "root"
        : value.stp.rootRole === "non-root"
        ? "non-root"
        : undefined,
      portStates: Array.isArray(value.stp.portStates)
        ? value.stp.portStates.slice(0, 128).map((raw, index) => {
          assertObject(raw, `${deviceName} STP port ${index + 1}`);
          const interfaceId = requiredText(
            raw.interfaceId,
            `${deviceName} STP interface`,
            40,
          );
          if (!interfaceIds.has(interfaceId)) {
            throw new ServiceError(
              "INVALID_TOPOLOGY",
              `${deviceName} STP refers to a missing interface.`,
            );
          }
          return {
            interfaceId,
            role: ["root", "alternate"].includes(String(raw.role))
              ? String(raw.role)
              : "designated",
            state: raw.state === "discarding" ? "discarding" : "forwarding",
            cost: optionalInteger(
              raw.cost,
              `${deviceName} STP cost`,
              1,
              200000000,
            ),
          };
        })
        : undefined,
    };
  }
  if (value.etherChannel != null) {
    assertObject(
      value.etherChannel,
      `${deviceName} EtherChannel configuration`,
    );
    configuration.etherChannel = {
      groups: Array.isArray(value.etherChannel.groups)
        ? value.etherChannel.groups.slice(0, 32).map((raw, index) => {
          assertObject(raw, `${deviceName} EtherChannel group ${index + 1}`);
          const portChannelInterfaceId = requiredText(
            raw.portChannelInterfaceId,
            `${deviceName} Port-channel interface`,
            40,
          );
          const memberInterfaceIds = Array.isArray(raw.memberInterfaceIds)
            ? raw.memberInterfaceIds.slice(0, 16).map((member) =>
              requiredText(member, `${deviceName} EtherChannel member`, 40)
            )
            : [];
          if (
            !interfaceIds.has(portChannelInterfaceId) ||
            memberInterfaceIds.some((member) => !interfaceIds.has(member))
          ) {
            throw new ServiceError(
              "INVALID_TOPOLOGY",
              `${deviceName} EtherChannel refers to a missing interface.`,
            );
          }
          return {
            id: requiredText(raw.id, `${deviceName} EtherChannel code`, 100),
            number: optionalInteger(
              raw.number,
              `${deviceName} channel number`,
              1,
              4096,
            )!,
            portChannelInterfaceId,
            memberInterfaceIds,
            lacpMode: raw.lacpMode === "passive" ? "passive" : "active",
            state: ["formed", "suspended", "down"].includes(String(raw.state))
              ? String(raw.state)
              : undefined,
          };
        })
        : [],
    };
  }
  if (value.ospf != null) {
    assertObject(value.ospf, `${deviceName} OSPF configuration`);
    configuration.ospf = {
      processId: optionalInteger(
        value.ospf.processId,
        `${deviceName} OSPF process`,
        1,
        65535,
      )!,
      routerId: optionalIpv4(
        value.ospf.routerId,
        `${deviceName} OSPF router ID`,
      )!,
      networks: Array.isArray(value.ospf.networks)
        ? value.ospf.networks.slice(0, 128).map((raw, index) => {
          assertObject(raw, `${deviceName} OSPF network ${index + 1}`);
          return {
            id: requiredText(raw.id, `${deviceName} OSPF network code`, 100),
            network: optionalIpv4Network(
              raw.network,
              `${deviceName} OSPF network`,
            )!,
            area: optionalInteger(
              raw.area,
              `${deviceName} OSPF area`,
              0,
              4294967295,
            )!,
          };
        })
        : [],
      neighbors: Array.isArray(value.ospf.neighbors)
        ? value.ospf.neighbors.slice(0, 128).map((raw, index) => {
          assertObject(raw, `${deviceName} OSPF neighbor ${index + 1}`);
          return {
            id: requiredText(raw.id, `${deviceName} OSPF neighbor code`, 100),
            routerId: optionalIpv4(
              raw.routerId,
              `${deviceName} OSPF neighbor ID`,
            )!,
            state: requiredText(
              raw.state,
              `${deviceName} OSPF neighbor state`,
              40,
            ),
          };
        })
        : undefined,
    };
  }
  if (value.expectedState != null) {
    assertObject(value.expectedState, `${deviceName} expected state`);
    configuration.expectedState = {
      macTable: Array.isArray(value.expectedState.macTable)
        ? value.expectedState.macTable.slice(0, 256).map((raw, index) => {
          assertObject(raw, `${deviceName} MAC entry ${index + 1}`);
          const interfaceId = requiredText(
            raw.interfaceId,
            `${deviceName} MAC entry interface`,
            40,
          );
          if (!interfaceIds.has(interfaceId)) {
            throw new ServiceError(
              "INVALID_TOPOLOGY",
              `${deviceName} MAC entry refers to a missing interface.`,
            );
          }
          return {
            interfaceId,
            macAddress: requiredText(
              raw.macAddress,
              `${deviceName} MAC address`,
              32,
            ),
            vlan: optionalInteger(
              raw.vlan,
              `${deviceName} MAC entry VLAN`,
              1,
              4094,
            ),
          };
        })
        : undefined,
      neighborEntries: Array.isArray(value.expectedState.neighborEntries)
        ? value.expectedState.neighborEntries.slice(0, 256).map(
          (raw, index) => {
            assertObject(raw, `${deviceName} neighbor entry ${index + 1}`);
            const interfaceId = requiredText(
              raw.interfaceId,
              `${deviceName} neighbor interface`,
              40,
            );
            if (!interfaceIds.has(interfaceId)) {
              throw new ServiceError(
                "INVALID_TOPOLOGY",
                `${deviceName} neighbor entry refers to a missing interface.`,
              );
            }
            return {
              interfaceId,
              address: requiredText(
                raw.address,
                `${deviceName} neighbor address`,
                100,
              ),
              neighbor: requiredText(
                raw.neighbor,
                `${deviceName} neighbor`,
                100,
              ),
            };
          },
        )
        : undefined,
      routeEntries: Array.isArray(value.expectedState.routeEntries)
        ? value.expectedState.routeEntries.slice(0, 256).map((raw, index) => {
          assertObject(raw, `${deviceName} expected route ${index + 1}`);
          return {
            destination: requiredText(
              raw.destination,
              `${deviceName} expected route destination`,
              100,
            ),
            source: requiredText(raw.source, `${deviceName} route source`, 60),
            nextHop: raw.nextHop
              ? String(raw.nextHop).slice(0, 100)
              : undefined,
            metric: optionalInteger(
              raw.metric,
              `${deviceName} route metric`,
              0,
              2147483647,
            ),
          };
        })
        : undefined,
      natTranslations: Array.isArray(value.expectedState.natTranslations)
        ? value.expectedState.natTranslations.slice(0, 256).map(
          (raw, index) => {
            assertObject(raw, `${deviceName} NAT translation ${index + 1}`);
            return {
              insideLocal: optionalIpv4(
                raw.insideLocal,
                `${deviceName} translated local address`,
              )!,
              insideGlobal: optionalIpv4(
                raw.insideGlobal,
                `${deviceName} translated global address`,
              )!,
              outside: raw.outside
                ? String(raw.outside).slice(0, 100)
                : undefined,
            };
          },
        )
        : undefined,
      aclResult: value.expectedState.aclResult == null ? undefined : (() => {
        assertObject(value.expectedState.aclResult, `${deviceName} ACL result`);
        return {
          aclName: requiredText(
            value.expectedState.aclResult.aclName,
            `${deviceName} ACL result name`,
            80,
          ),
          ruleId: value.expectedState.aclResult.ruleId
            ? String(value.expectedState.aclResult.ruleId).slice(0, 100)
            : undefined,
          result: value.expectedState.aclResult.result === "deny"
            ? "deny"
            : "permit",
        };
      })(),
      notes: Array.isArray(value.expectedState.notes)
        ? value.expectedState.notes.slice(0, 100).map((note) =>
          String(note).slice(0, 500)
        )
        : undefined,
    };
  }
  return configuration;
}

export function sanitizeTopology(row: JsonObject) {
  const definition = row.definition as JsonObject;
  const rawDevices = definition.devices;
  const rawLinks = definition.links;
  if (
    !Array.isArray(rawDevices) ||
    !Array.isArray(rawLinks) ||
    rawDevices.length > 12
  ) {
    throw new ServiceError(
      "INVALID_TOPOLOGY",
      "A topology must contain no more than 12 valid devices.",
    );
  }
  const deviceIds = new Set<string>();
  const names = new Set<string>();
  const endpoints = new Set<string>();
  const endpointKinds = new Map<string, string>();
  const devices = rawDevices.map((value, index) => {
    assertObject(value, `Topology device ${index + 1}`);
    const id = requiredText(value.id, `Topology device ${index + 1} code`, 100);
    const name = requiredText(
      value.name,
      `Topology device ${index + 1} name`,
      40,
    );
    const type = String(value.type);
    if (
      deviceIds.has(id) ||
      names.has(name.toLowerCase()) ||
      !["pc", "switch", "router", "server"].includes(type)
    ) {
      throw new ServiceError(
        "INVALID_TOPOLOGY",
        "Topology device codes and names must be unique, and device types must be supported.",
      );
    }
    deviceIds.add(id);
    names.add(name.toLowerCase());
    const x = Number(value.x);
    const y = Number(value.y);
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > 1 ||
      y < 0 ||
      y > 1
    ) {
      throw new ServiceError(
        "INVALID_TOPOLOGY",
        `${name} must remain inside the topology canvas.`,
      );
    }
    if (!Array.isArray(value.interfaces)) {
      throw new ServiceError(
        "INVALID_TOPOLOGY",
        `${name} needs an interface list.`,
      );
    }
    const interfaceIds = new Set<string>();
    const interfaceKinds = new Map<string, string>();
    const interfaces = value.interfaces.map((rawInterface, interfaceIndex) => {
      assertObject(rawInterface, `${name} interface ${interfaceIndex + 1}`);
      const interfaceId = requiredText(
        rawInterface.id,
        `${name} interface code`,
        40,
      );
      if (interfaceIds.has(interfaceId)) {
        throw new ServiceError(
          "INVALID_TOPOLOGY",
          `${name} has a repeated interface code.`,
        );
      }
      interfaceIds.add(interfaceId);
      endpoints.add(`${id}:${interfaceId}`);
      const kind = ["physical", "subinterface", "svi", "port-channel"].includes(
          String(rawInterface.kind),
        )
        ? String(rawInterface.kind)
        : "physical";
      interfaceKinds.set(interfaceId, kind);
      endpointKinds.set(`${id}:${interfaceId}`, kind);
      const prefix = rawInterface.prefix == null
        ? undefined
        : Number(rawInterface.prefix);
      const vlan = rawInterface.vlan == null
        ? undefined
        : Number(rawInterface.vlan);
      if (
        prefix != null &&
        (!Number.isInteger(prefix) || prefix < 0 || prefix > 32)
      ) {
        throw new ServiceError(
          "INVALID_TOPOLOGY",
          `${name} has an invalid IPv4 prefix.`,
        );
      }
      if (
        vlan != null && (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094)
      ) {
        throw new ServiceError(
          "INVALID_TOPOLOGY",
          `${name} has an invalid VLAN.`,
        );
      }
      const parentInterfaceId = rawInterface.parentInterfaceId
        ? requiredText(
          rawInterface.parentInterfaceId,
          `${name} parent interface`,
          40,
        )
        : undefined;
      const encapsulationVlan = optionalInteger(
        rawInterface.encapsulationVlan,
        `${name} encapsulation VLAN`,
        1,
        4094,
      );
      const ipv6Addresses = Array.isArray(rawInterface.ipv6Addresses)
        ? rawInterface.ipv6Addresses.slice(0, 32).map(
          (assignment, assignmentIndex) => {
            assertObject(
              assignment,
              `${name} IPv6 address ${assignmentIndex + 1}`,
            );
            return {
              id: requiredText(assignment.id, `${name} IPv6 address code`, 100),
              address: optionalIpv6(
                assignment.address,
                `${name} IPv6 address`,
              )!,
              prefix: optionalInteger(
                assignment.prefix,
                `${name} IPv6 prefix`,
                0,
                128,
              )!,
              scope: ["global", "link-local", "multicast", "anycast"].includes(
                  String(assignment.scope),
                )
                ? String(assignment.scope)
                : undefined,
            };
          },
        )
        : undefined;
      let switchport: JsonObject | undefined;
      if (rawInterface.switchport != null) {
        assertObject(rawInterface.switchport, `${name} switchport`);
        switchport = {
          mode: rawInterface.switchport.mode === "trunk" ? "trunk" : "access",
          accessVlan: optionalInteger(
            rawInterface.switchport.accessVlan,
            `${name} access VLAN`,
            1,
            4094,
          ),
          allowedVlans: Array.isArray(rawInterface.switchport.allowedVlans)
            ? rawInterface.switchport.allowedVlans.slice(0, 256).map((item) =>
              optionalInteger(item, `${name} allowed VLAN`, 1, 4094)!
            )
            : undefined,
          nativeVlan: optionalInteger(
            rawInterface.switchport.nativeVlan,
            `${name} native VLAN`,
            1,
            4094,
          ),
        };
      }
      let protocolSettings: JsonObject | undefined;
      if (rawInterface.protocolSettings != null) {
        assertObject(
          rawInterface.protocolSettings,
          `${name} interface protocol settings`,
        );
        protocolSettings = {
          dhcpRelayAddress: optionalIpv4(
            rawInterface.protocolSettings.dhcpRelayAddress,
            `${name} DHCP relay`,
          ),
          natRole: ["inside", "outside"].includes(
              String(rawInterface.protocolSettings.natRole),
            )
            ? String(rawInterface.protocolSettings.natRole)
            : undefined,
          ospfArea: optionalInteger(
            rawInterface.protocolSettings.ospfArea,
            `${name} OSPF area`,
            0,
            4294967295,
          ),
          ospfCost: optionalInteger(
            rawInterface.protocolSettings.ospfCost,
            `${name} OSPF cost`,
            1,
            65535,
          ),
          routerAdvertisement:
            rawInterface.protocolSettings.routerAdvertisement == null
              ? undefined
              : Boolean(rawInterface.protocolSettings.routerAdvertisement),
        };
      }
      return {
        id: interfaceId,
        name: requiredText(rawInterface.name, `${name} interface name`, 40),
        kind,
        parentInterfaceId,
        encapsulationVlan,
        ipv4Address: optionalIpv4(rawInterface.ipv4Address, `${name} address`),
        prefix,
        gateway: optionalIpv4(rawInterface.gateway, `${name} gateway`),
        vlan,
        ipv6Addresses,
        switchport,
        protocolSettings,
        state: rawInterface.state === "down" ? "down" : "up",
      };
    });
    for (const networkInterface of interfaces) {
      if (
        networkInterface.kind === "subinterface" &&
        (!networkInterface.parentInterfaceId ||
          interfaceKinds.get(networkInterface.parentInterfaceId) !==
            "physical" ||
          networkInterface.encapsulationVlan == null)
      ) {
        throw new ServiceError(
          "INVALID_TOPOLOGY",
          `${name} has a subinterface without a valid physical parent and VLAN tag.`,
        );
      }
    }
    const routes = Array.isArray(value.routes)
      ? value.routes.map((route, routeIndex) => {
        assertObject(route, `${name} route ${routeIndex + 1}`);
        const addressFamily = route.addressFamily === "ipv6" ? "ipv6" : "ipv4";
        const prefix = Number(route.prefix);
        const maximumPrefix = addressFamily === "ipv6" ? 128 : 32;
        if (!Number.isInteger(prefix) || prefix < 0 || prefix > maximumPrefix) {
          throw new ServiceError(
            "INVALID_TOPOLOGY",
            `${name} has an invalid route prefix.`,
          );
        }
        return {
          destination: addressFamily === "ipv6"
            ? optionalIpv6(route.destination, `${name} route destination`)!
            : optionalIpv4(route.destination, `${name} route destination`)!,
          prefix,
          nextHop: addressFamily === "ipv6"
            ? optionalIpv6(route.nextHop, `${name} route next hop`)!
            : optionalIpv4(route.nextHop, `${name} route next hop`)!,
          addressFamily,
        };
      })
      : [];
    return {
      id,
      type,
      name,
      x,
      y,
      interfaces,
      routes,
      configuration: sanitizeDeviceConfiguration(
        value.configuration,
        name,
        interfaceIds,
      ),
      notes: value.notes ? String(value.notes).slice(0, 1000) : undefined,
    };
  });
  const usedEndpoints = new Set<string>();
  const links = rawLinks.map((value, index) => {
    assertObject(value, `Topology connection ${index + 1}`);
    const fromDeviceId = String(value.fromDeviceId ?? "");
    const fromInterfaceId = String(value.fromInterfaceId ?? "");
    const toDeviceId = String(value.toDeviceId ?? "");
    const toInterfaceId = String(value.toInterfaceId ?? "");
    const from = `${fromDeviceId}:${fromInterfaceId}`;
    const to = `${toDeviceId}:${toInterfaceId}`;
    if (
      !endpoints.has(from) ||
      !endpoints.has(to) ||
      from === to ||
      usedEndpoints.has(from) ||
      usedEndpoints.has(to) ||
      endpointKinds.get(from) !== "physical" ||
      endpointKinds.get(to) !== "physical"
    ) {
      throw new ServiceError(
        "INVALID_TOPOLOGY",
        `Topology connection ${index + 1} has a missing or reused endpoint.`,
      );
    }
    usedEndpoints.add(from);
    usedEndpoints.add(to);
    const accessVlan = value.accessVlan == null
      ? undefined
      : Number(value.accessVlan);
    const trunkVlans = Array.isArray(value.trunkVlans)
      ? value.trunkVlans.map(Number)
      : undefined;
    if (
      accessVlan != null &&
      (!Number.isInteger(accessVlan) || accessVlan < 1 || accessVlan > 4094)
    ) {
      throw new ServiceError(
        "INVALID_TOPOLOGY",
        `Topology connection ${index + 1} has an invalid access VLAN.`,
      );
    }
    if (
      trunkVlans?.some(
        (vlan) => !Number.isInteger(vlan) || vlan < 1 || vlan > 4094,
      )
    ) {
      throw new ServiceError(
        "INVALID_TOPOLOGY",
        `Topology connection ${index + 1} has an invalid trunk VLAN.`,
      );
    }
    return {
      id: requiredText(value.id, `Topology connection ${index + 1} code`, 100),
      fromDeviceId,
      fromInterfaceId,
      toDeviceId,
      toInterfaceId,
      label: value.label ? String(value.label).slice(0, 100) : undefined,
      network: optionalIpv4Network(
        value.network,
        `Topology connection ${index + 1} network`,
      ),
      accessVlan,
      trunkVlans,
      state: value.state === "down" ? "down" : "up",
    };
  });
  const hasTeachingWarnings = links.some(
    (link) =>
      link.state === "down" ||
      (link.accessVlan != null && (link.trunkVlans?.length ?? 0) > 0),
  );
  if (hasTeachingWarnings && definition.warningsAcknowledged !== true) {
    throw new ServiceError(
      "TOPOLOGY_WARNING_REVIEW_REQUIRED",
      "Review and acknowledge the topology warnings before publishing.",
    );
  }
  return {
    schemaVersion: definition.schemaVersion === 2 ? 2 : 1,
    id: String(row.stable_id),
    title: requiredText(definition.title, "Topology title", 160),
    accessibilityDescription: requiredText(
      definition.accessibilityDescription,
      "Topology accessibility description",
      1000,
    ),
    devices,
    links,
    starterId: definition.starterId
      ? String(definition.starterId).slice(0, 80)
      : undefined,
    checklist: Array.isArray(definition.checklist)
      ? definition.checklist.slice(0, 64).map((item) =>
        String(item).slice(0, 300)
      )
      : undefined,
    warningsAcknowledged: hasTeachingWarnings
      ? definition.warningsAcknowledged === true
      : undefined,
  };
}
