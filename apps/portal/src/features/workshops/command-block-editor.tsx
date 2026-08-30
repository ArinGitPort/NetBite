import { Plus, RefreshCw, TerminalSquare, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  commandGroupsTextFallback,
  fingerprintTopologyConfiguration,
  generateTopologyCommandGroups,
} from "@netbite/workshops/command-generator";
import type {
  WorkshopCommandGroup,
  WorkshopLessonBlock,
  WorkshopTopology,
} from "@netbite/workshops/contracts";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/dialog";
import { Feedback } from "@/components/ui/feedback";
import { SelectField } from "@/components/ui/select";
import type { WorkshopTopologyRow } from "@/lib/api/types";

function newGroup(): WorkshopCommandGroup {
  return {
    id: crypto.randomUUID(),
    title: "Manual command group",
    commands: [],
  };
}

export function CommandBlockEditor({
  block,
  topologies,
  onChange,
}: {
  block: WorkshopLessonBlock;
  topologies: WorkshopTopologyRow[];
  onChange: (patch: Partial<WorkshopLessonBlock>) => void;
}) {
  const [generationWarnings, setGenerationWarnings] = useState<string[]>([]);
  const groups = block.commandGroups ?? [];
  const topologyRow = topologies.find(
    (topology) => topology.stable_id === block.topologyId,
  );
  const topology = topologyRow?.definition as unknown as
    WorkshopTopology | undefined;
  const currentFingerprint = topology
    ? fingerprintTopologyConfiguration(topology)
    : undefined;
  const stale = Boolean(
    topology &&
    block.generatedSourceFingerprint &&
    currentFingerprint !== block.generatedSourceFingerprint,
  );

  const applyGroups = (
    nextGroups: WorkshopCommandGroup[],
    fingerprint?: string,
  ) =>
    onChange({
      commandGroups: nextGroups,
      generatedSourceFingerprint: fingerprint,
      text: commandGroupsTextFallback(nextGroups),
    });
  const generate = () => {
    if (!topology) return;
    const result = generateTopologyCommandGroups(topology);
    setGenerationWarnings(result.warnings);
    applyGroups(result.groups, result.fingerprint);
  };
  const updateGroup = (index: number, patch: Partial<WorkshopCommandGroup>) =>
    applyGroups(
      groups.map((group, current) =>
        current === index ? { ...group, ...patch } : group,
      ),
      block.generatedSourceFingerprint,
    );

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
          <span>Block title</span>
          <input
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Configuration commands"
            value={block.title ?? ""}
          />
        </label>
        <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
          <span>Linked topology (optional)</span>
          <SelectField
            ariaLabel="Linked topology"
            onValueChange={(topologyId) =>
              onChange({ topologyId: topologyId || undefined })
            }
            options={topologies.map((item) => ({
              value: item.stable_id,
              label: String(item.definition.title ?? item.stable_id),
            }))}
            placeholder="No linked topology"
            value={block.topologyId ?? ""}
          />
        </label>
      </div>
      <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
        <span>Introduction</span>
        <textarea
          onChange={(event) => onChange({ introduction: event.target.value })}
          placeholder="Explain what these commands configure and what students should notice."
          rows={2}
          value={block.introduction ?? ""}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 border-y border-line py-3">
        {groups.length ? (
          <ConfirmationDialog
            confirmLabel="REPLACE COMMAND GROUPS"
            description="Generating again replaces all command groups in this block, including manual edits."
            onConfirm={generate}
            title="Generate commands again?"
            trigger={
              <Button disabled={!topology} tone="secondary">
                <RefreshCw /> GENERATE FROM TOPOLOGY
              </Button>
            }
          />
        ) : (
          <Button disabled={!topology} onClick={generate} tone="secondary">
            <TerminalSquare /> GENERATE FROM TOPOLOGY
          </Button>
        )}
        <Button
          onClick={() => applyGroups([...groups, newGroup()])}
          tone="outline"
        >
          <Plus /> ADD MANUAL GROUP
        </Button>
      </div>
      {!topology ? (
        <Feedback tone="warning">
          Link a topology to generate a starter, or add a manual command group.
        </Feedback>
      ) : null}
      {stale ? (
        <Feedback tone="warning">
          <strong>COMMANDS MAY BE OUT OF DATE.</strong> The linked topology has
          changed since these commands were generated. Review the edits or
          generate a fresh starter.
        </Feedback>
      ) : null}
      {generationWarnings.map((warning) => (
        <Feedback key={warning} tone="warning">
          {warning}
        </Feedback>
      ))}
      <div className="grid gap-3">
        {groups.map((group, index) => (
          <section
            className="grid gap-3 border-t border-line pt-4"
            key={group.id}
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid min-w-0 flex-1 gap-2 text-[0.7rem] font-semibold text-copy">
                <span>Device or group name</span>
                <input
                  onChange={(event) =>
                    updateGroup(index, { title: event.target.value })
                  }
                  placeholder="Example: R1"
                  value={group.title}
                />
              </label>
              <Button
                aria-label={`Remove ${group.title}`}
                onClick={() =>
                  applyGroups(groups.filter((_, current) => current !== index))
                }
                size="icon"
                tone="destructive"
              >
                <Trash2 />
              </Button>
            </div>
            <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
              <span>Commands (one command per line)</span>
              <textarea
                className="font-mono"
                onChange={(event) =>
                  updateGroup(index, {
                    commands: event.target.value.split("\n"),
                  })
                }
                placeholder={"enable\nconfigure terminal\ninterface G0/0"}
                rows={Math.max(6, Math.min(14, group.commands.length + 1))}
                value={group.commands.join("\n")}
              />
            </label>
            <label className="grid gap-2 text-[0.7rem] font-semibold text-copy">
              <span>Plain-English explanation (optional)</span>
              <textarea
                onChange={(event) =>
                  updateGroup(index, { explanation: event.target.value })
                }
                placeholder="Explain what this device configuration accomplishes."
                rows={2}
                value={group.explanation ?? ""}
              />
            </label>
          </section>
        ))}
      </div>
    </div>
  );
}
