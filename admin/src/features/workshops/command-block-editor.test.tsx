import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import type { WorkshopLessonBlock } from "../../../../shared/workshop-contract";
import { CommandBlockEditor } from "./command-block-editor";

describe("CommandBlockEditor", () => {
  test("generates an editable starter from a linked topology", () => {
    const block: WorkshopLessonBlock = {
      id: "commands-1",
      type: "commands",
      title: "Configuration commands",
      topologyId: "topology-1",
      commandGroups: [],
    };
    const onChange = vi.fn();
    render(
      <CommandBlockEditor
        block={block}
        onChange={onChange}
        topologies={[
          {
            id: "row-1",
            workshop_id: "workshop-1",
            stable_id: "topology-1",
            definition: {
              id: "topology-1",
              title: "Static routing",
              accessibilityDescription: "R1 routes a LAN.",
              devices: [
                {
                  id: "r1",
                  type: "router",
                  name: "R1",
                  x: 0.5,
                  y: 0.5,
                  interfaces: [
                    {
                      id: "g0",
                      name: "G0/0",
                      ipv4Address: "192.168.10.1",
                      prefix: 24,
                      state: "up",
                    },
                  ],
                  routes: [],
                },
              ],
              links: [],
            },
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByText("GENERATE FROM TOPOLOGY"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        generatedSourceFingerprint: expect.stringMatching(/^[0-9a-f]{8}$/),
        text: expect.stringContaining("ip address 192.168.10.1 255.255.255.0"),
      }),
    );
  });
});
