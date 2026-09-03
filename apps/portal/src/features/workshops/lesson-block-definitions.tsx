import {
  AlignLeft,
  Heading1,
  Image as ImageIcon,
  Lightbulb,
  MessageSquareText,
  Network,
  TerminalSquare,
  type LucideIcon,
} from "lucide-react";

import type { WorkshopLessonBlock } from "@netbite/workshops/contracts";

export interface LessonBlockOption {
  type: WorkshopLessonBlock["type"];
  label: string;
  description: string;
  icon: LucideIcon;
}

export const lessonBlockOptions: LessonBlockOption[] = [
  { type: "heading", label: "Section title", description: "Start a new lesson section", icon: Heading1 },
  { type: "paragraph", label: "Body text", description: "Explain a concept in detail", icon: AlignLeft },
  { type: "callout", label: "Important note", description: "Emphasize a rule or warning", icon: MessageSquareText },
  { type: "example", label: "Worked example", description: "Show how to apply the concept", icon: Lightbulb },
  { type: "image", label: "Supporting image", description: "Add an accessible visual", icon: ImageIcon },
  { type: "topology", label: "Network diagram", description: "Insert a saved topology", icon: Network },
  { type: "commands", label: "Configuration commands", description: "Add read-only commands by device", icon: TerminalSquare },
];

export const lessonBlockFieldCopy: Record<
  Exclude<WorkshopLessonBlock["type"], "topology" | "commands">,
  { label: string; placeholder: string }
> = {
  heading: { label: "Section title", placeholder: "Example: How a router chooses the next hop" },
  paragraph: { label: "Body text", placeholder: "Explain the concept in clear, complete sentences." },
  callout: { label: "Important note", placeholder: "State the rule or warning students should remember." },
  example: { label: "Worked example", placeholder: "Walk through an example using all supplied values." },
  image: { label: "Image address", placeholder: "https://example.com/network-diagram.png" },
};

export function createLessonBlock(type: WorkshopLessonBlock["type"]): WorkshopLessonBlock {
  return {
    id: crypto.randomUUID(),
    type,
    text: "",
    ...(type === "commands" ? { title: "Configuration commands", commandGroups: [] } : {}),
  };
}

export function getLessonBlockLabel(type: WorkshopLessonBlock["type"]) {
  return lessonBlockOptions.find((option) => option.type === type)?.label ?? type;
}

export function getLessonBlockSummary(block: WorkshopLessonBlock) {
  if (block.type === "image") return block.altText?.trim() || block.imageUrl?.trim() || "No image added";
  if (block.type === "topology") return block.topologyId ? "Saved topology selected" : "No topology selected";
  if (block.type === "commands") {
    const count = block.commandGroups?.length ?? 0;
    return count ? `${count} device command group${count === 1 ? "" : "s"}` : "No command groups yet";
  }
  return block.text?.trim() || "No content yet";
}

export function getLessonBlockStatus(block: WorkshopLessonBlock): {
  complete: boolean;
  label: string;
} {
  if (block.type === "image") {
    if (!block.imageUrl?.trim()) return { complete: false, label: "IMAGE REQUIRED" };
    if (!block.altText?.trim()) return { complete: false, label: "ALT TEXT REQUIRED" };
  } else if (block.type === "topology") {
    if (!block.topologyId) return { complete: false, label: "TOPOLOGY REQUIRED" };
  } else if (block.type === "commands") {
    const hasCommands = block.commandGroups?.some((group) =>
      group.commands.some((command) => command.trim()),
    );
    if (!hasCommands) return { complete: false, label: "COMMANDS REQUIRED" };
  } else if (!block.text?.trim()) {
    return { complete: false, label: "CONTENT REQUIRED" };
  }
  return { complete: true, label: "COMPLETE" };
}
