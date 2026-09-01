import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { prepareWorkshopLibraryAssets } from "@/core/workshops/workshop-assets";
import { fetchWorkshopLibrary } from "@/core/workshops/workshop-service";
import { useAuth } from "@/features/account/auth-context";
import { ActionCard } from "@/shared/components/action-card";
import { AppButton } from "@/shared/components/app-button";
import { IconButton } from "@/shared/components/icon-button";
import { Text } from "@/shared/components/console-text";
import { PageHeader } from "@/shared/components/page-header";
import { Screen } from "@/shared/components/screen";
import {
  AppRoutes,
  workshopLessonRoute,
  workshopRoute,
} from "@/shared/routes";
import { Space, type ThemeColors } from "@/shared/theme";
import { useThemeStyles } from "@/shared/theme-context";
import { useWorkshopStore } from "@/store/use-workshop-store";

export default function MyClassesScreen() {
  const styles = useThemeStyles(createStyles);
  const { status, accountRole } = useAuth();
  const library = useWorkshopStore((state) => state.library);
  const lastUpdatedAt = useWorkshopStore((state) => state.lastUpdatedAt);
  const replaceLibrary = useWorkshopStore((state) => state.replaceLibrary);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string>();

  const refresh = useCallback(async () => {
    if (status !== "authenticated") return;
    setRefreshing(true);
    setMessage(undefined);
    try {
      const nextLibrary = await fetchWorkshopLibrary();
      const nextAssets = await prepareWorkshopLibraryAssets(
        nextLibrary,
        useWorkshopStore.getState().assetUris,
      );
      replaceLibrary(nextLibrary, nextAssets);
    } catch {
      setMessage(
        library.length
          ? "Could not refresh classes. Your downloaded lessons remain available."
          : "Connect to the internet and try again to download your classes.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [library.length, replaceLibrary, status]);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const saved = library
    .flatMap((entry) =>
      entry.savedLessonIds.map((lessonId) => ({
        entry,
        lesson: entry.manifest.lessons.find((lesson) => lesson.id === lessonId),
      })),
    )
    .filter((item) => item.lesson);

  return (
    <Screen
      header={
        <PageHeader
          leading={{
            accessibilityLabel: "Back to main menu",
            icon: "arrow-left",
            label: "BACK / MENU",
            onPress: () => router.replace(AppRoutes.menu),
          }}
          trailingContent={
            <View
              accessibilityLabel="Class library actions"
              style={styles.headerActions}
            >
              <IconButton
                accessibilityHint="Opens options to enter a class code or scan an instructor QR code"
                accessibilityLabel="Join a class"
                onPress={() => router.push(AppRoutes.workshopJoin)}
                semanticIcon="add"
              />
              <IconButton
                accessibilityHint="Downloads current class versions for offline use"
                accessibilityLabel={
                  refreshing ? "Refreshing classes" : "Refresh classes"
                }
                disabled={refreshing || status !== "authenticated"}
                onPress={() => void refresh()}
                semanticIcon="refresh"
              />
            </View>
          }
        />
      }
    >
      <Text variant="label" style={styles.eyebrow}>
        STUDENT LIBRARY
      </Text>
      <Text variant="screenTitle">MY CLASSES</Text>
      <Text variant="body" style={styles.copy}>
        Join a private class from your instructor, study published lessons
        offline, and submit graded work when connected.
      </Text>
      <Text variant="technical" style={styles.availability}>
        {library.length ? "AVAILABLE OFFLINE" : "PRIVATE CLASSES"}
      </Text>

      {status !== "authenticated" ? (
        <View style={styles.notice}>
          <Text variant="sectionHeading">SIGN IN REQUIRED</Text>
          <Text variant="bodySmall">
            A signed-in account keeps enrollment and graded submissions
            connected to the correct student.
          </Text>
          <AppButton
            label="Sign in"
            onPress={() => router.push(AppRoutes.auth)}
          />
        </View>
      ) : null}
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          variant="bodySmall"
          style={styles.warning}
        >
          {message}
        </Text>
      ) : null}
      {accountRole === "instructor" ? (
        <ActionCard
          detail="Preview workshops and share class codes from this device."
          icon="account"
          onPress={() => router.push(AppRoutes.instructor)}
          priority="utility"
          status="INSTRUCTOR TOOLS"
          title="MONITOR & SHARE"
        />
      ) : null}
      {status === "authenticated" && accountRole === "student" ? (
        <ActionCard
          detail="Verified instructors can create private workshops for their students."
          icon="account"
          onPress={() => router.push(AppRoutes.instructorRequest)}
          priority="utility"
          status="TEACH WITH NETBITE"
          title="REQUEST INSTRUCTOR ACCESS"
        />
      ) : null}

      <Text variant="label" style={styles.section}>
        ENROLLED CLASSES
      </Text>
      <View style={styles.list}>
        {library.map((entry) => (
          <ActionCard
            badge={entry.manifest.archived ? "ARCHIVED" : undefined}
            detail={`${entry.manifest.instructorName} · ${entry.manifest.description}`}
            icon="learn"
            key={entry.classId}
            onPress={() => router.push(workshopRoute(entry.classId))}
            status={`${entry.manifest.lessons.length} LESSONS / VERSION ${entry.manifest.version}`}
            title={entry.manifest.title}
          />
        ))}
      </View>
      {!library.length && status === "authenticated" ? (
        <View style={styles.empty}>
          <Text variant="sectionHeading">NO CLASSES YET</Text>
          <Text variant="bodySmall">
            Use the plus button above to enter a class code or scan an
            instructor QR code.
          </Text>
        </View>
      ) : null}
      {saved.length ? (
        <>
          <Text variant="label" style={styles.section}>
            SAVED LESSONS
          </Text>
          <View style={styles.list}>
            {saved.map(({ entry, lesson }) => (
              <ActionCard
                detail={`Saved from version ${entry.manifest.version} for offline study.`}
                icon="saved"
                key={`${entry.classId}-${lesson!.id}`}
                onPress={() =>
                  router.push(workshopLessonRoute(entry.classId, lesson!.id))
                }
                status={entry.manifest.title.toUpperCase()}
                title={lesson!.title}
              />
            ))}
          </View>
        </>
      ) : null}
      {lastUpdatedAt ? (
        <Text variant="technical" style={styles.updated}>
          Last refreshed {new Date(lastUpdatedAt).toLocaleString()}
        </Text>
      ) : null}
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  headerActions: { flexDirection: "row", alignItems: "center", gap: Space.xs },
  eyebrow: { color: colors.orange },
  copy: { color: colors.textMuted, marginTop: Space.sm },
  availability: { color: colors.green, marginTop: Space.md, marginBottom: Space.lg },
  notice: {
    gap: Space.md,
    borderWidth: 1,
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
    padding: Space.lg,
  },
  warning: { color: colors.orange, marginVertical: Space.md },
  section: {
    color: colors.green,
    marginTop: Space.xl,
    marginBottom: Space.sm,
  },
  list: { gap: Space.md },
  empty: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: Space.xl,
    gap: Space.sm,
  },
  updated: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: Space.xl,
  },
});
