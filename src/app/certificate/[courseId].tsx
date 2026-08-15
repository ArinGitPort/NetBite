import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { getCourse, isCourseComplete } from "@/content/courses";
import { useAuth } from "@/features/account/auth-context";
import { AppButton } from "@/shared/components/app-button";
import { ContentNotFound } from "@/shared/components/content-not-found";
import { PageHeader } from "@/shared/components/page-header";
import { Text } from "@/shared/components/console-text";
import { Screen } from "@/shared/components/screen";
import { goBackOrReplace } from "@/shared/navigation";
import { AppRoutes } from "@/shared/routes";
import { Fonts, Palette, Space } from "@/shared/theme";
import { useGameStore } from "@/store/use-game-store";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

export default function CertificateScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const course = getCourse(courseId);
  const progress = useGameStore();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  if (!course || !isCourseComplete(course.id, progress))
    return <ContentNotFound label="Earned certificate" />;
  const achievement = progress.courseAchievements[course.id];
  const learner = profile?.displayName || "NetBite Learner";
  const date = achievement?.awardedAt
    ? new Date(achievement.awardedAt).toLocaleDateString()
    : new Date().toLocaleDateString();
  const exportPdf = async () => {
    setBusy(true);
    try {
      const html = `<!doctype html><html><body style="font-family:monospace;background:#f5f2ef;color:#242126;padding:64px;text-align:center"><div style="border:3px solid #c04848;padding:56px"><p style="letter-spacing:3px;color:#c04848">NETBITE / COURSE ACHIEVEMENT</p><h1>${escapeHtml(course.certificateTitle)}</h1><p>This non-accredited learning certificate recognizes</p><h2>${escapeHtml(learner)}</h2><p>for completing all required lessons, guided simulations, assessments${course.capstone ? ", and the operations capstone" : ""}.</p><p>${escapeHtml(date)}</p><small>Educational achievement / not a professional certification</small></div></body></html>`;
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Share NetBite certificate",
        });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      header={
        <PageHeader
          leading={{
            accessibilityLabel: 'Back to course library',
            icon: 'arrow-left',
            label: 'BACK / COURSES',
            onPress: () => goBackOrReplace(AppRoutes.courses),
          }}
        />
      }>
      <View style={styles.frame}>
        <Text variant="label" style={styles.eyebrow}>
          NETBITE / COURSE ACHIEVEMENT
        </Text>
        <Text variant="screenTitle" style={styles.title}>
          {course.certificateTitle.toUpperCase()}
        </Text>
        <Text variant="body" style={styles.copy}>
          Awarded to
        </Text>
        <Text variant="sectionHeading" style={styles.name}>
          {learner}
        </Text>
        <Text variant="bodySmall" style={styles.copy}>
          Completed {date}
        </Text>
        <Text variant="technical" style={styles.note}>
          NON-ACCREDITED EDUCATIONAL CERTIFICATE
        </Text>
      </View>
      <AppButton
        label="Export certificate PDF"
        loading={busy}
        onPress={() => void exportPdf()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 2,
    borderColor: Palette.accent,
    padding: Space.xxl,
    gap: Space.lg,
    alignItems: "center",
    marginVertical: Space.xxl,
  },
  eyebrow: { color: Palette.accentBright },
  title: {
    color: Palette.text,
    fontFamily: Fonts.semibold,
    textAlign: "center",
  },
  copy: { color: Palette.textMuted, textAlign: "center" },
  name: { color: Palette.orange, textAlign: "center" },
  note: { color: Palette.textMuted, textAlign: "center", marginTop: Space.xl },
});
