import { boundedCliCommands } from "./operations-simulator-definitions";
import {
  type GuidedSimulationDefinition,
  type OperationsSimulationSession,
  type SimulationValue,
} from "./operations-simulator-types";

export function executeOperationsCliCommand(
  definition: GuidedSimulationDefinition,
  session: OperationsSimulationSession,
  input: string,
) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");
  const parsed = parseOperationsCliCommand(definition.labId, normalized);
  if (parsed) {
    return {
      accepted: true,
      configuration: { ...session.configuration, ...parsed.updates },
      output: parsed.output,
    };
  }
  const bounded = boundedCliCommands[definition.labId]?.find((entry) =>
    entry.command === normalized
  );
  if (bounded) {
    return {
      accepted: true,
      configuration: { ...session.configuration, ...bounded.updates },
      output: `ACCEPTED / ${Object.keys(bounded.updates).length} SETTING${
        Object.keys(bounded.updates).length === 1 ? "" : "S"
      } UPDATED`,
    };
  }
  for (const stageDefinition of definition.stages) {
    for (const field of stageDefinition.fields) {
      const match = field.options?.find((entry) =>
        entry.command?.toLowerCase() === normalized
      );
      if (match) {
        return {
          accepted: true,
          configuration: { ...session.configuration, [field.id]: match.value },
          output: `ACCEPTED / ${field.label.toUpperCase()} = ${
            String(match.value).toUpperCase()
          }`,
        };
      }
    }
  }
  return {
    accepted: false,
    configuration: session.configuration,
    output:
      "Unsupported NetBite command. Use a visible suggestion or the inspector.",
  };
}

export function parseOperationsCliCommand(
  labId: string,
  command: string,
): { updates: Record<string, SimulationValue>; output: string } | undefined {
  let match: RegExpMatchArray | null;
  if (labId === "acl-policy-desk") {
    match = command.match(
      /^test-flow (tcp|udp|icmp) (\d+\.\d+\.\d+\.\d+) (\d+\.\d+\.\d+\.\d+)(?: eq (\d+))?$/,
    );
    if (match) {
      return {
        updates: {
          "acl.protocol": match[1],
          "acl.source": match[2],
          "acl.destination": match[3],
          "acl.port": Number(match[4] ?? 0),
        },
        output: `FLOW SAVED / ${match[1].toUpperCase()} ${match[2]} -> ${
          match[3]
        }:${match[4] ?? "ANY"}`,
      };
    }
    match = command.match(/^source (\d+\.\d+\.\d+\.\d+) (\d+\.\d+\.\d+\.\d+)$/);
    if (match) {
      return {
        updates: { "acl.network": match[1], "acl.wildcard": match[2] },
        output: `SOURCE MATCH SAVED / ${match[1]} ${match[2]}`,
      };
    }
    match = command.match(
      /^(\d+) (permit|deny) tcp (\d+\.\d+\.\d+\.\d+) (\d+\.\d+\.\d+\.\d+) host (\d+\.\d+\.\d+\.\d+) eq (\d+)$/,
    );
    if (match) {
      return {
        updates: {
          "acl.sequence": Number(match[1]),
          "acl.action": match[2],
          "acl.network": match[3],
          "acl.wildcard": match[4],
          "acl.destination": match[5],
          "acl.port": Number(match[6]),
        },
        output: `ACL ENTRY ${match[1]} SAVED / ${match[2].toUpperCase()}`,
      };
    }
    match = command.match(
      /^interface ([a-z]+\d+\/\d+) ip access-group [a-z0-9-]+ (in|out)$/,
    );
    if (match) {
      return {
        updates: {
          "acl.interface": match[1].toUpperCase(),
          "acl.direction": match[2],
        },
        output: `ACL APPLIED / ${match[1].toUpperCase()} ${
          match[2].toUpperCase()
        }`,
      };
    }
  }
  if (labId === "nat-translation-desk") {
    match = command.match(
      /^interface ([a-z]+\d+\/\d+) ip nat (inside|outside)$/,
    );
    if (match) {
      return {
        updates: { [`nat.${match[2]}Up`]: true },
        output: `${match[1].toUpperCase()} / NAT ${
          match[2].toUpperCase()
        } / ENABLED`,
      };
    }
    match = command.match(/^ip nat select (\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
    if (match) {
      return {
        updates: { "nat.network": match[1], "nat.prefix": Number(match[2]) },
        output: `NAT SELECTION / ${match[1]}/${match[2]}`,
      };
    }
    match = command.match(
      /^ip nat pool [a-z0-9-]+ (\d+\.\d+\.\d+\.\d+) overload$/,
    );
    if (match) {
      return {
        updates: { "nat.global": match[1], "nat.flowCount": 2 },
        output: `PAT GLOBAL / ${match[1]} / OVERLOAD`,
      };
    }
    if (command === "show ip nat translations") {
      return {
        updates: { "nat.returnCheck": "table" },
        output:
          "TRANSLATION TABLE REQUESTED / CURRENT CONFIGURATION WILL BE USED",
      };
    }
  }
  if (labId === "ipv6-neighbor-desk") {
    match = command.match(/^neighbor ([0-9a-f:]+) ([0-9a-f:.]+)$/);
    if (match) {
      return {
        updates: {
          "nd.target": match[1],
          "nd.ownerMac": match[2].toUpperCase(),
        },
        output: `NEIGHBOR EVIDENCE / ${match[1]} -> ${match[2].toUpperCase()}`,
      };
    }
    match = command.match(/^ipv6 default-router ([0-9a-f:]+)$/);
    if (match) {
      return {
        updates: { "nd.router": match[1], "nd.ra": true },
        output: `ROUTER INFORMATION / ${match[1]}`,
      };
    }
    match = command.match(/^ipv6 route ([0-9a-f:]+)\/(\d+) ([0-9a-f:]+)$/);
    if (match) {
      return {
        updates: {
          "nd.routePrefix": match[1],
          "nd.routeLength": Number(match[2]),
          "nd.nextHop": match[3],
        },
        output: `IPV6 ROUTE / ${match[1]}/${match[2]} VIA ${match[3]}`,
      };
    }
    if (command === "verify ipv6 bidirectional") {
      return {
        updates: { "nd.forwardRoute": true, "nd.returnRoute": true },
        output:
          "VERIFICATION REQUESTED / FORWARD AND RETURN STATE WILL BE DERIVED",
      };
    }
  }
  if (labId === "etherchannel-desk") {
    match = command.match(
      /^(sw-a|sw-b) channel-group (\d+) mode (active|passive)$/,
    );
    if (match) {
      return {
        updates: {
          [match[1] === "sw-a" ? "lacp.modeA" : "lacp.modeB"]: match[3],
        },
        output: `${match[1].toUpperCase()} / CHANNEL-GROUP ${match[2]} / ${
          match[3].toUpperCase()
        }`,
      };
    }
    match = command.match(
      /^members speed (\d+) switchport mode (access|trunk)$/,
    );
    if (match) {
      return {
        updates: {
          "lacp.speedA": Number(match[1]),
          "lacp.speedB": Number(match[1]),
          "lacp.switchportMode": match[2],
        },
        output: `MEMBERS / ${match[1]} MBPS / ${match[2].toUpperCase()}`,
      };
    }
    match = command.match(/^interface port-channel(\d+) no shutdown$/);
    if (match) {
      return {
        updates: {
          "lacp.channel": `Port-channel${match[1]}`,
          "lacp.membersUp": true,
        },
        output: `PORT-CHANNEL${match[1]} / ADMIN UP`,
      };
    }
    match = command.match(/^switchport trunk allowed vlan (\d+(?:,\d+)*)$/);
    if (match) {
      return {
        updates: { "lacp.vlans": match[1] },
        output: `TRUNK VLANS / ${match[1]}`,
      };
    }
  }
  if (labId === "ospf-area-desk") {
    match = command.match(/^(r[123]) router-id (\d+\.\d+\.\d+\.\d+)$/);
    if (match) {
      return {
        updates: { [`ospf.${match[1]}`]: match[2] },
        output: `${match[1].toUpperCase()} / ROUTER ID ${match[2]}`,
      };
    }
    match = command.match(/^links area (\d+) no shutdown$/);
    if (match) {
      return {
        updates: {
          "ospf.area12": Number(match[1]),
          "ospf.area23": Number(match[1]),
          "ospf.linksUp": true,
        },
        output: `OSPF LINKS / AREA ${match[1]} / UP`,
      };
    }
    match = command.match(
      /^links cost (\d+) advertise (\d+\.\d+\.\d+\.\d+)\/(\d+)$/,
    );
    if (match) {
      return {
        updates: {
          "ospf.cost12": Number(match[1]),
          "ospf.cost23": Number(match[1]),
          "ospf.advertise": true,
        },
        output: `OSPF COST ${match[1]} / ADVERTISE ${match[2]}/${match[3]}`,
      };
    }
    if (command === "link r2-r3 shutdown recalculate spf") {
      return {
        updates: {
          "ospf.failedLink": "r2-r3-down",
          "ospf.response": "recalculate",
        },
        output: "R2-R3 DOWN / LSDB REBUILT / SPF RECALCULATED",
      };
    }
  }
  return undefined;
}

export function getOperationsCliSuggestions(
  definition: GuidedSimulationDefinition,
  stageIndex: number,
) {
  const current = definition.stages[stageIndex];
  const authored =
    current?.fields.flatMap((field) =>
      field.options?.flatMap((entry) => entry.command ? [entry.command] : []) ??
        []
    ) ?? [];
  const bounded =
    boundedCliCommands[definition.labId]?.filter((entry) =>
      entry.stageId === current?.id
    ).map(({ command }) => command) ?? [];
  return [...new Set([...bounded, ...authored])];
}
