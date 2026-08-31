import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  ToastAndroid,
  View,
} from "react-native";

import { setWorkshopLessonSaved } from "@/core/workshops/workshop-service";
import { resolveWorkshopImageUri } from "@/core/workshops/workshop-assets";
import type { WorkshopLessonBlock } from "@/core/workshops/types";
import { WorkshopTopologyView } from "@/features/workshops/workshop-topology";
import { WorkshopCommandBlock } from "@/features/workshops/workshop-command-block";
import { Text } from "@/shared/components/console-text";
import { IconButton } from "@/shared/components/icon-button";
import { PageHeader } from "@/shared/components/page-header";
import { Screen } from "@/shared/components/screen";
import { successHaptic } from "@/shared/haptics";
import { workshopRoute } from "@/shared/routes";
import { Palette, Space } from "@/shared/theme";
import { useWorkshopStore } from "@/store/use-workshop-store";

export default function WorkshopLessonScreen() {
  const { classId, lessonId } = useLocalSearchParams<{
    classId: string;
    lessonId: string;
  }>();
  const entry = useWorkshopStore((state) =>
    state.library.find((item) => item.classId === classId),
  );
  const toggleSaved = useWorkshopStore((state) => state.toggleSavedLesson);
  const assetUris = useWorkshopStore((state) => state.assetUris);
  const lesson = entry?.manifest.lessons.find((item) => item.id === lessonId);
  const saved = entry?.savedLessonIds.includes(lessonId) ?? false;
  if (!entry || !lesson)
    return (
      <Screen>
        <Text variant="screenTitle">LESSON NOT AVAILABLE</Text>
      </Screen>
    );
  const save = () => {
    const next = toggleSaved(entry.classId, lesson.id);
    successHaptic();
    notifySaveAction(next ? "Lesson saved" : "Lesson unsaved");
    void setWorkshopLessonSaved(entry.classId, lesson.id, next).catch(() =>
      notifySaveAction(
        next
          ? "Saved on this device. Online status will update when the service is available."
          : "Removed on this device. Online status will update when the service is available.",
      ),
    );
  };
  return (
    <Screen
      header={
        <PageHeader
          leading={{
            accessibilityLabel: "Back to workshop",
            icon: "close",
            label: "CLOSE",
            onPress: () => router.replace(workshopRoute(entry.classId)),
          }}
          trailingContent={
            <View
              accessibilityLabel="Lesson save actions"
              style={styles.headerSaveActions}
            >
              <IconButton
                accessibilityHint={
                  saved
                    ? "Removes this workshop lesson from Saved Learning."
                    : "Saves this workshop lesson for quick access later."
                }
                accessibilityLabel={saved ? "Unsave lesson" : "Save lesson"}
                iconSize={22}
                label="LESSON"
                onPress={save}
                selected={saved}
                semanticIcon={saved ? "saved" : "bookmark"}
              />
            </View>
          }
        />
      }
    >
      <Text variant="label" style={styles.eyebrow}>
        {entry.manifest.title.toUpperCase()}
      </Text>
      <Text variant="screenTitle">{lesson.title.toUpperCase()}</Text>
      <Text variant="body" style={styles.summary}>
        {lesson.summary}
      </Text>
      <View style={styles.blocks}>
        {lesson.blocks.map((block) => (
          <LessonBlock
            assetUris={assetUris}
            block={block}
            entry={entry}
            key={block.id}
          />
        ))}
      </View>
    </Screen>
  );
}

function LessonBlock({
  block,
  entry,
  assetUris,
}: {
  block: WorkshopLessonBlock;
  entry: NonNullable<
    ReturnType<typeof useWorkshopStore.getState>["library"][number]
  >;
  assetUris: ReturnType<typeof useWorkshopStore.getState>["assetUris"];
}) {
  if (block.type === "commands") return <WorkshopCommandBlock block={block} />;
  if (block.type === "topology") {
    const topology = entry.manifest.topologies.find(
      (item) => item.id === block.topologyId,
    );
    return topology ? (
      <WorkshopTopologyView topology={topology} />
    ) : (
      <View style={styles.callout}>
        <Text variant="bodySmall">
          This topology is not available in the downloaded workshop version.
        </Text>
      </View>
    );
  }
  if (block.type === "image") {
    const uri = resolveWorkshopImageUri(
      entry.manifest.versionId,
      block.imageUrl,
      assetUris,
    );
    return (
      <View style={styles.imageBlock}>
        {uri ? (
          <Image
            accessibilityLabel={block.altText}
            contentFit="contain"
            source={{ uri }}
            style={styles.image}
          />
        ) : null}
        <Text variant="bodySmall" style={styles.caption}>
          {block.altText}
        </Text>
      </View>
    );
  }
  if (block.type === "heading")
    return (
      <Text variant="sectionHeading" style={styles.heading}>
        {block.text}
      </Text>
    );
  if (block.type === "callout" || block.type === "example")
    return (
      <View
        style={[styles.callout, block.type === "example" && styles.example]}
      >
        <Text variant="label" style={styles.eyebrow}>
          {block.type === "example"
            ? "EXAMPLE"
            : (block.title?.toUpperCase() ?? "IMPORTANT")}
        </Text>
        <Text selectable variant="body">
          {block.text}
        </Text>
      </View>
    );
  return (
    <Text selectable variant="body" style={styles.paragraph}>
      {block.text}
    </Text>
  );
}

function notifySaveAction(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
}

const styles = StyleSheet.create({
  eyebrow: { color: Palette.orange },
  summary: { color: Palette.textMuted, marginVertical: Space.md },
  headerSaveActions: { alignItems: "flex-end" },
  blocks: { gap: Space.lg, marginTop: Space.xl },
  heading: {
    color: Palette.white,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    paddingBottom: Space.sm,
  },
  paragraph: { color: Palette.text },
  callout: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: Palette.orange,
    backgroundColor: Palette.orangeSoft,
    padding: Space.lg,
    gap: Space.sm,
  },
  example: { borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  imageBlock: {
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Space.sm,
  },
  image: { width: "100%", height: 260 },
  caption: { color: Palette.textMuted, marginTop: Space.sm },
});
