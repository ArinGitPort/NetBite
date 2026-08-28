import { fireEvent, render } from "@testing-library/react-native";

import { WorkshopCommandBlock } from "./workshop-command-block";

describe("WorkshopCommandBlock", () => {
  const block = {
    id: "commands-1",
    type: "commands" as const,
    title: "Configuration commands",
    introduction: "Compare the interface and route commands.",
    text: "R1\nenable\nconfigure terminal",
    commandGroups: [
      {
        id: "r1",
        title: "R1",
        deviceId: "r1",
        commands: ["enable", "configure terminal"],
        explanation: "These commands enter configuration mode.",
      },
    ],
  };

  it("is collapsed initially and reveals selectable read-only commands", async () => {
    const screen = await render(<WorkshopCommandBlock block={block} />);
    expect(screen.queryByText("enable")).toBeNull();
    await fireEvent.press(screen.getByText("SHOW COMMANDS"));
    expect(screen.getByText("enable\nconfigure terminal")).toBeTruthy();
    expect(screen.getByText(/does not execute these commands/i)).toBeTruthy();
    await fireEvent.press(screen.getByText("HIDE COMMANDS"));
    expect(screen.queryByText("enable\nconfigure terminal")).toBeNull();
  });
});
