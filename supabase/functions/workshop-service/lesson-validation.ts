import {
  assertObject,
  type JsonObject,
  requiredText,
  safePublicImageUrl,
  ServiceError,
} from "./service-core.ts";
export function sanitizeLesson(row: JsonObject) {
  const draft = row.draft as JsonObject;
  const blocks = draft.blocks;
  if (!Array.isArray(blocks)) {
    throw new ServiceError(
      "INVALID_LESSON",
      "Every lesson needs structured content.",
    );
  }
  const allowed = new Set([
    "heading",
    "paragraph",
    "callout",
    "example",
    "image",
    "topology",
    "commands",
  ]);
  const safeBlocks = blocks.map((value, index) => {
    assertObject(value, `Lesson block ${index + 1}`);
    const type = String(value.type ?? "");
    if (!allowed.has(type)) {
      throw new ServiceError(
        "INVALID_LESSON",
        `Lesson block ${index + 1} uses an unsupported content type.`,
      );
    }
    const base = {
      id: requiredText(value.id, `Lesson block ${index + 1} code`, 100),
      type,
    };
    if (type === "image") {
      return {
        ...base,
        imageUrl: safePublicImageUrl(value.imageUrl),
        altText: requiredText(
          value.altText,
          `Lesson image ${index + 1} alternative text`,
          500,
        ),
      };
    }
    if (type === "topology") {
      return {
        ...base,
        topologyId: requiredText(
          value.topologyId,
          `Lesson topology ${index + 1}`,
          100,
        ),
      };
    }
    if (type === "commands") {
      const rawGroups = value.commandGroups;
      if (
        !Array.isArray(rawGroups) ||
        !rawGroups.length ||
        rawGroups.length > 12
      ) {
        throw new ServiceError(
          "INVALID_LESSON",
          `Configuration commands block ${
            index + 1
          } needs 1 to 12 device groups.`,
        );
      }
      let totalSize = 0;
      const commandGroups = rawGroups.map((rawGroup, groupIndex) => {
        assertObject(rawGroup, `Command group ${groupIndex + 1}`);
        if (
          !Array.isArray(rawGroup.commands) ||
          !rawGroup.commands.length ||
          rawGroup.commands.length > 100
        ) {
          throw new ServiceError(
            "INVALID_LESSON",
            `Command group ${groupIndex + 1} needs 1 to 100 command lines.`,
          );
        }
        const commands = rawGroup.commands.map((line, lineIndex) => {
          const command = String(line ?? "").replace(/\r/g, "");
          if (
            !command.trim() ||
            command.length > 200 ||
            /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(command)
          ) {
            throw new ServiceError(
              "INVALID_LESSON",
              `Command group ${groupIndex + 1}, line ${
                lineIndex + 1
              } is empty, too long, or contains unsupported characters.`,
            );
          }
          totalSize += command.length;
          return command;
        });
        return {
          id: requiredText(
            rawGroup.id,
            `Command group ${groupIndex + 1} code`,
            100,
          ),
          title: requiredText(
            rawGroup.title,
            `Command group ${groupIndex + 1} title`,
            80,
          ),
          deviceId: rawGroup.deviceId
            ? requiredText(
              rawGroup.deviceId,
              `Command group ${groupIndex + 1} device`,
              100,
            )
            : undefined,
          commands,
          explanation: rawGroup.explanation
            ? String(rawGroup.explanation).trim().slice(0, 2000)
            : undefined,
        };
      });
      if (totalSize > 12000) {
        throw new ServiceError(
          "INVALID_LESSON",
          `Configuration commands block ${index + 1} is too large.`,
        );
      }
      const text = commandGroups
        .map((group) => `${group.title}\n${group.commands.join("\n")}`)
        .join("\n\n");
      const fingerprint = value.generatedSourceFingerprint
        ? String(value.generatedSourceFingerprint)
        : undefined;
      if (fingerprint && !/^[0-9a-f]{8}$/i.test(fingerprint)) {
        throw new ServiceError(
          "INVALID_LESSON",
          `Configuration commands block ${
            index + 1
          } has an invalid topology reference fingerprint.`,
        );
      }
      return {
        ...base,
        title: value.title
          ? String(value.title).trim().slice(0, 120)
          : "Configuration commands",
        introduction: value.introduction
          ? String(value.introduction).trim().slice(0, 2000)
          : undefined,
        topologyId: value.topologyId
          ? requiredText(value.topologyId, `Command topology ${index + 1}`, 100)
          : undefined,
        commandGroups,
        generatedSourceFingerprint: fingerprint,
        text,
      };
    }
    return {
      ...base,
      title: value.title ? String(value.title).slice(0, 120) : undefined,
      text: requiredText(value.text, `Lesson block ${index + 1}`, 12000),
    };
  });
  return {
    id: String(row.stable_id),
    title: requiredText(draft.title, "Lesson title", 160),
    summary: String(draft.summary ?? "")
      .trim()
      .slice(0, 500),
    order: Number(row.position),
    blocks: safeBlocks,
  };
}

export function sanitizeNamedLesson(row: JsonObject) {
  const draft = row.draft as JsonObject | undefined;
  const title = String(draft?.title ?? "Untitled lesson").trim() ||
    "Untitled lesson";
  const position = Number(row.position);
  const lessonLabel = Number.isInteger(position)
    ? `Lesson ${position} “${title}”`
    : `Lesson “${title}”`;
  try {
    return sanitizeLesson(row);
  } catch (error) {
    if (
      error instanceof ServiceError &&
      ["INVALID_CONTENT", "INVALID_IMAGE", "INVALID_LESSON"].includes(
        error.code,
      )
    ) {
      throw new ServiceError(
        error.code,
        `${lessonLabel}: ${error.message}`,
        error.status,
      );
    }
    throw error;
  }
}
