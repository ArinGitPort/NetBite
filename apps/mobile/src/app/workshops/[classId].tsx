import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { WorkshopFlashcard } from "@/core/workshops/types";
import { WorkshopSavedLessons } from "@/features/workshops/workshop-saved-lessons";
import { ActionCard } from "@/shared/components/action-card";
import { Text } from "@/shared/components/console-text";
import { PageHeader } from "@/shared/components/page-header";
import { Screen } from "@/shared/components/screen";
import {
  AppRoutes,
  workshopAssessmentRoute,
  workshopLessonRoute,
} from "@/shared/routes";
import { Fonts, Space, type ThemeColors } from "@/shared/theme";
import { useThemeStyles } from "@/shared/theme-context";
import { useWorkshopStore } from "@/store/use-workshop-store";

export default function WorkshopOverviewScreen() {
  const styles = useThemeStyles(createStyles);
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const entry = useWorkshopStore((state) =>
    state.library.find((item) => item.classId === classId),
  );
  if (!entry) {
    return (
      <Screen
        header={
          <PageHeader
            leading={{
              accessibilityLabel: "Back to My Classes",
              icon: "arrow-left",
              label: "BACK / CLASSES",
              onPress: () => router.replace(AppRoutes.workshops),
            }}
          />
        }
      >
        <Text variant="screenTitle">CLASS NOT AVAILABLE</Text>
        <Text variant="body">
          Refresh My Classes while connected. A downloaded class will remain
          available offline.
        </Text>
      </Screen>
    );
  }

  const manifest = entry.manifest;
  const lessons = [...manifest.lessons].sort((first, second) =>
    first.order - second.order,
  );
  const openLesson = (lessonId: string) =>
    router.push(workshopLessonRoute(entry.classId, lessonId));

  return (
    <Screen
      header={
        <PageHeader
          leading={{
            accessibilityLabel: "Back to My Classes",
            icon: "arrow-left",
            label: "BACK / CLASSES",
            onPress: () => router.replace(AppRoutes.workshops),
          }}
          status={`VERSION ${manifest.version}`}
        />
      }
    >
      <Text variant="label" style={styles.eyebrow}>
        {manifest.archived ? "ARCHIVED / READ-ONLY" : "INSTRUCTOR WORKSHOP"}
      </Text>
      <Text variant="screenTitle">{manifest.title.toUpperCase()}</Text>
      <Text variant="body" style={styles.description}>
        {manifest.description}
      </Text>
      <View style={styles.instructor}>
        <Text variant="label">INSTRUCTOR</Text>
        <Text variant="bodySmall">{manifest.instructorName}</Text>
        <Text variant="technical" style={styles.muted}>
          Published {new Date(manifest.publishedAt).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.savedLessons}>
        <WorkshopSavedLessons
          lessons={lessons}
          onOpen={openLesson}
          savedLessonIds={entry.savedLessonIds}
        />
      </View>

      <Text variant="label" style={styles.section}>
        LESSONS
      </Text>
      <View style={styles.list}>
        {lessons.map((lesson, index) => {
          const saved = entry.savedLessonIds.includes(lesson.id);
          return (
            <ActionCard
              badge={saved ? "SAVED" : undefined}
              detail={lesson.summary}
              icon={saved ? "saved" : "lesson"}
              key={lesson.id}
              onPress={() => openLesson(lesson.id)}
              status={`LESSON ${index + 1}`}
              title={lesson.title}
            />
          );
        })}
      </View>

      {manifest.assessments.length ? (
        <>
          <Text variant="label" style={styles.section}>
            ASSESSMENTS
          </Text>
          <View style={styles.list}>
            {manifest.assessments.map((assessment) => (
              <ActionCard
                badge={
                  assessment.mode === "graded"
                    ? `${assessment.settings?.maximumAttempts ?? 1} ATTEMPT${assessment.settings?.maximumAttempts === 1 ? "" : "S"}`
                    : "UNLIMITED"
                }
                detail={assessment.instructions}
                icon="quiz"
                key={assessment.id}
                onPress={() =>
                  router.push(
                    workshopAssessmentRoute(entry.classId, assessment.id),
                  )
                }
                status={
                  assessment.mode === "graded"
                    ? "GRADED / INTERNET REQUIRED"
                    : "PRACTICE / OFFLINE READY"
                }
                title={assessment.title}
              />
            ))}
          </View>
        </>
      ) : null}
      {manifest.flashcards.length ? (
        <FlashcardPreview cards={manifest.flashcards} />
      ) : null}
    </Screen>
  );
}

function FlashcardPreview({ cards }: { cards: WorkshopFlashcard[] }) {
  const styles = useThemeStyles(createStyles);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(false);
  const card = cards[index];
  return (
    <View style={styles.cards}>
      <Text variant="label" style={styles.section}>
        FLASHCARDS
      </Text>
      <Pressable
        accessibilityHint="Flips between the question and answer"
        accessibilityLabel={`${answer ? "Answer" : "Question"}: ${answer ? card.answer : card.question}`}
        accessibilityRole="button"
        onPress={() => setAnswer((value) => !value)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        <Text variant="label" style={styles.eyebrow}>
          {answer ? "ANSWER" : "QUESTION"}
        </Text>
        <Text variant="sectionHeading" style={styles.cardText}>
          {answer ? card.answer : card.question}
        </Text>
        {answer && card.explanation ? (
          <Text variant="bodySmall" style={styles.muted}>
            {card.explanation}
          </Text>
        ) : null}
        <Text variant="technical" style={styles.muted}>
          TAP TO FLIP
        </Text>
      </Pressable>
      <View style={styles.cardActions}>
        <Pressable
          disabled={index === 0}
          onPress={() => {
            setIndex((value) => value - 1);
            setAnswer(false);
          }}
          style={styles.cardButton}
        >
          <Text variant="label">PREVIOUS</Text>
        </Pressable>
        <Text variant="technical">
          {index + 1} / {cards.length}
        </Text>
        <Pressable
          disabled={index === cards.length - 1}
          onPress={() => {
            setIndex((value) => value + 1);
            setAnswer(false);
          }}
          style={styles.cardButton}
        >
          <Text variant="label">NEXT</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  eyebrow: { color: colors.orange },
  description: { color: colors.textMuted, marginTop: Space.sm },
  instructor: {
    marginTop: Space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Space.md,
    gap: Space.xs,
  },
  savedLessons: { marginTop: Space.lg },
  muted: { color: colors.textMuted },
  section: {
    color: colors.green,
    marginTop: Space.xl,
    marginBottom: Space.sm,
  },
  list: { gap: Space.md },
  cards: { gap: Space.sm },
  card: {
    minHeight: 250,
    borderWidth: 1,
    borderTopWidth: 3,
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
    padding: Space.xl,
    justifyContent: "space-between",
    gap: Space.lg,
  },
  pressed: { opacity: 0.85 },
  cardText: { textAlign: "center", fontFamily: Fonts.semibold },
  cardActions: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardButton: {
    minHeight: 44,
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
});
