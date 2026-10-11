import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { createWorkshopTopologyStarter } from "@netbite/workshops/topology-authoring";
import { TopologyDeviceEditor } from "@/features/workshops/topology-device-editor";

describe("topology device editor", () => {
  test("keeps overview edits and router configuration controls available", () => {
    const router = createWorkshopTopologyStarter("static-routing").devices.find(
      (device) => device.type === "router",
    );
    if (!router) throw new Error("Static-route starter needs a router");
    const update = vi.fn();
    render(
      <TopologyDeviceEditor
        device={router}
        update={update}
        onAddInterface={vi.fn()}
        onRemoveInterface={vi.fn()}
        isInterfaceConnected={() => false}
        onConnect={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Device name"), {
      target: { value: "Core Router" },
    });
    expect(update).toHaveBeenCalledWith({ name: "Core Router" });
    expect(screen.getByText("Routing")).toBeTruthy();
    expect(screen.getByText("Expected protocol state")).toBeTruthy();
  });
});
