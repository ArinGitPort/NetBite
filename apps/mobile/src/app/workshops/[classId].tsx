import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { WorkshopFlashcard } from '@/core/workshops/types';
import { ActionCard } from '@/shared/components/action-card';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { AppRoutes, workshopAssessmentRoute, workshopLessonRoute } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useWorkshopStore } from '@/store/use-workshop-store';

export default function WorkshopOverviewScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const entry = useWorkshopStore((state) => state.library.find((item) => item.classId === classId));
  if (!entry) return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to My Classes', icon: 'arrow-left', label: 'BACK / CLASSES', onPress: () => router.replace(AppRoutes.workshops) }} />}><Text variant="screenTitle">CLASS NOT AVAILABLE</Text><Text variant="body">Refresh My Classes while connected. A downloaded class will remain available offline.</Text></Screen>;
  const manifest = entry.manifest;
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to My Classes', icon: 'arrow-left', label: 'BACK / CLASSES', onPress: () => router.replace(AppRoutes.workshops) }} status={`VERSION ${manifest.version}`} />}>
    <Text variant="label" style={styles.eyebrow}>{manifest.archived ? 'ARCHIVED / READ-ONLY' : 'INSTRUCTOR WORKSHOP'}</Text><Text variant="screenTitle">{manifest.title.toUpperCase()}</Text><Text variant="body" style={styles.description}>{manifest.description}</Text><View style={styles.instructor}><Text variant="label">INSTRUCTOR</Text><Text variant="bodySmall">{manifest.instructorName}</Text><Text variant="technical" style={styles.muted}>Published {new Date(manifest.publishedAt).toLocaleDateString()}</Text></View>
    <Text variant="label" style={styles.section}>LESSONS</Text><View style={styles.list}>{manifest.lessons.sort((a, b) => a.order - b.order).map((lesson, index) => <ActionCard key={lesson.id} icon={entry.savedLessonIds.includes(lesson.id) ? 'saved' : 'lesson'} status={`LESSON ${index + 1}`} title={lesson.title} detail={lesson.summary} badge={entry.savedLessonIds.includes(lesson.id) ? 'SAVED' : undefined} onPress={() => router.push(workshopLessonRoute(entry.classId, lesson.id))} />)}</View>
    {manifest.assessments.length ? <><Text variant="label" style={styles.section}>ASSESSMENTS</Text><View style={styles.list}>{manifest.assessments.map((assessment) => <ActionCard key={assessment.id} icon="quiz" status={assessment.mode === 'graded' ? 'GRADED / INTERNET REQUIRED' : 'PRACTICE / OFFLINE READY'} title={assessment.title} detail={assessment.instructions} badge={assessment.mode === 'graded' ? `${assessment.settings?.maximumAttempts ?? 1} ATTEMPT${assessment.settings?.maximumAttempts === 1 ? '' : 'S'}` : 'UNLIMITED'} onPress={() => router.push(workshopAssessmentRoute(entry.classId, assessment.id))} />)}</View></> : null}
    {manifest.flashcards.length ? <FlashcardPreview cards={manifest.flashcards} /> : null}
  </Screen>;
}

function FlashcardPreview({ cards }: { cards: WorkshopFlashcard[] }) {
  const [index, setIndex] = useState(0); const [answer, setAnswer] = useState(false); const card = cards[index];
  return <View style={styles.cards}><Text variant="label" style={styles.section}>FLASHCARDS</Text><Pressable accessibilityHint="Flips between the question and answer" accessibilityLabel={`${answer ? 'Answer' : 'Question'}: ${answer ? card.answer : card.question}`} accessibilityRole="button" onPress={() => setAnswer((value) => !value)} style={({ pressed }) => [styles.card, pressed && styles.pressed]}><Text variant="label" style={styles.eyebrow}>{answer ? 'ANSWER' : 'QUESTION'}</Text><Text variant="sectionHeading" style={styles.cardText}>{answer ? card.answer : card.question}</Text>{answer && card.explanation ? <Text variant="bodySmall" style={styles.muted}>{card.explanation}</Text> : null}<Text variant="technical" style={styles.muted}>TAP TO FLIP</Text></Pressable><View style={styles.cardActions}><Pressable disabled={index === 0} onPress={() => { setIndex((value) => value - 1); setAnswer(false); }} style={styles.cardButton}><Text variant="label">PREVIOUS</Text></Pressable><Text variant="technical">{index + 1} / {cards.length}</Text><Pressable disabled={index === cards.length - 1} onPress={() => { setIndex((value) => value + 1); setAnswer(false); }} style={styles.cardButton}><Text variant="label">NEXT</Text></Pressable></View></View>;
}
const styles = StyleSheet.create({ eyebrow: { color: Palette.orange }, description: { color: Palette.textMuted, marginTop: Space.sm }, instructor: { marginTop: Space.lg, borderWidth: 1, borderColor: Palette.border, padding: Space.md, gap: Space.xs }, muted: { color: Palette.textMuted }, section: { color: Palette.green, marginTop: Space.xl, marginBottom: Space.sm }, list: { gap: Space.md }, cards: { gap: Space.sm }, card: { minHeight: 250, borderWidth: 1, borderTopWidth: 3, borderColor: Palette.accent, backgroundColor: Palette.surfaceRaised, padding: Space.xl, justifyContent: 'space-between', gap: Space.lg }, pressed: { opacity: .85 }, cardText: { textAlign: 'center', fontFamily: Fonts.semibold }, cardActions: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, cardButton: { minHeight: 44, minWidth: 100, borderWidth: 1, borderColor: Palette.border, justifyContent: 'center', alignItems: 'center' } });
