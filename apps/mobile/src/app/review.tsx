import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapters } from '@/content/chapters';
import { canAccessChapter } from '@/core/account/access';
import { getActiveReviewQueue, type ReviewQueueItem } from '@/core/learning/adaptive-learning';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { Text } from '@/shared/components/console-text';
import { returnToLearningPath } from '@/shared/navigation';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { useGameStore } from '@/store/use-game-store';

function resolveItem(item: ReviewQueueItem) {
  const chapter = chapters.find((candidate) => candidate.id === item.chapterId);
  if (!chapter) return undefined;
  if (item.kind === 'quiz') return { kind: 'quiz' as const, chapter, quiz: chapter.quiz.find((question) => question.id === item.contentId) };
  if (item.kind === 'checkpoint') {
    const lesson = chapter.lessons.find((candidate) => candidate.id === item.lessonId && candidate.checkpoint);
    return { kind: 'checkpoint' as const, chapter, lesson, checkpoint: lesson?.checkpoint };
  }
  return { kind: 'flashcard' as const, chapter, card: chapter.flashcards.find((card) => card.id === item.contentId) };
}

export default function ReviewScreen() {
  const styles = useThemeStyles(createStyles);
  const { hasContentAccess } = useAuth();
  const signals = useGameStore((state) => state.reviewSignals);
  const recordResult = useGameStore((state) => state.recordReviewResult);
  const accessible = useMemo(() => new Set(chapters.filter((chapter) => canAccessChapter(chapter.id, hasContentAccess)).map((chapter) => chapter.id)), [hasContentAccess]);
  const versions = useMemo(() => Object.fromEntries(chapters.map((chapter) => [chapter.id, { quiz: chapter.contentVersion, flashcard: chapter.flashcardVersion, checkpoint: chapter.checkpointVersion ?? 1 }])), []);
  const initial = useMemo(() => getActiveReviewQueue(signals, versions, accessible), [accessible, signals, versions]);
  const [queue, setQueue] = useState(initial);
  const [selected, setSelected] = useState<number>();
  const [revealed, setRevealed] = useState(false);
  const [checkpointChoicesVisible, setCheckpointChoicesVisible] = useState(false);
  const reviewItemRef = useRef<View>(null);
  const current = queue[0];
  const currentKey = current?.key;
  const resolved = current ? resolveItem(current) : undefined;

  useEffect(() => {
    if (!currentKey) return;
    const timer = setTimeout(() => {
      (reviewItemRef.current as (View & { focus?: () => void }) | null)?.focus?.();
    }, 50);
    return () => clearTimeout(timer);
  }, [currentKey]);

  const advance = (correct: boolean) => {
    if (!current) return;
    const version = current.kind === 'quiz'
      ? resolved?.chapter.contentVersion
      : current.kind === 'flashcard'
        ? resolved?.chapter.flashcardVersion
        : resolved?.chapter.checkpointVersion ?? 1;
    if (version) recordResult({ kind: current.kind, contentId: current.contentId, lessonId: current.lessonId, chapterId: current.chapterId, contentVersion: version }, correct);
    setQueue((items) => correct ? items.slice(1) : [...items.slice(1), items[0]]);
    setSelected(undefined);
    setRevealed(false);
    setCheckpointChoicesVisible(false);
  };

  if (!current || !resolved) return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to learning path', icon: 'arrow-left', label: 'BACK / LEARN', onPress: returnToLearningPath }} />}><View style={styles.empty}><Text variant="label" style={styles.success}>REVIEW QUEUE CLEAR</Text><Text variant="screenTitle" style={styles.title}>NO WEAK TOPICS DUE</Text><Text variant="body" style={styles.muted}>Missed quiz or checkpoint scenarios and cards marked Review Again will appear here.</Text></View></Screen>;

  const quiz = resolved.kind === 'quiz' ? resolved.quiz : undefined;
  const card = resolved.kind === 'flashcard' ? resolved.card : undefined;
  const checkpoint = resolved.kind === 'checkpoint' ? resolved.checkpoint : undefined;
  if (!quiz && !card && !checkpoint) return null;
  const answered = selected !== undefined;
  const correct = quiz
    ? selected === quiz.correctAnswerIndex
    : checkpoint
      ? checkpoint.choices[selected ?? -1]?.id === checkpoint.correctChoiceId
      : false;

  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Close weak-topic review', icon: 'close', label: 'CLOSE', onPress: returnToLearningPath }} status={`${queue.length} DUE`} />}>
    <View accessible focusable accessibilityLabel={`Chapter ${resolved.chapter.numberLabel}. ${current.kind === 'flashcard' ? 'Active recall' : 'Scenario retry'}. Review weak topics.`} ref={reviewItemRef}><Text variant="label" style={styles.eyebrow}>CHAPTER {resolved.chapter.numberLabel} / {current.kind === 'flashcard' ? 'ACTIVE RECALL' : current.kind === 'checkpoint' ? 'CHECKPOINT RETRY' : 'SCENARIO RETRY'}</Text><Text variant="screenTitle" style={styles.title}>REVIEW WEAK TOPICS</Text></View>
    {quiz ? <>
      <Text variant="sectionHeading" style={styles.prompt}>{quiz.prompt}</Text>
      <View style={styles.answers}>{quiz.answers.map((answer, index) => <Pressable key={answer} accessibilityRole="radio" accessibilityState={{ checked: selected === index, disabled: answered }} disabled={answered} onPress={() => setSelected(index)} style={[styles.answer, selected === index && styles.selectedAnswer, answered && index === quiz.correctAnswerIndex && styles.correctAnswer]}><Text variant="body" style={styles.answerText}>{String.fromCharCode(65 + index)} / {answer}</Text></Pressable>)}</View>
      {answered ? <View accessibilityLiveRegion="assertive" style={[styles.feedback, correct ? styles.feedbackSuccess : styles.feedbackWarning]}><Text variant="label" style={correct ? styles.success : styles.warning}>{correct ? 'RETRIEVED' : 'REVIEW AGAIN LATER'}</Text><Text variant="bodySmall" style={styles.feedbackText}>{quiz.explanation}</Text></View> : null}
      <AppButton disabled={!answered} label={correct ? 'Resolve topic' : 'Requeue topic'} onPress={() => advance(correct)} />
    </> : null}
    {checkpoint ? <>
      <Text variant="sectionHeading" style={styles.prompt}>{checkpoint.prompt}</Text>
      {!checkpointChoicesVisible ? <View style={styles.recallPrompt}><Text variant="label" style={styles.cardLabel}>THINK OF THE ANSWER FIRST</Text><Text variant="bodySmall" style={styles.muted}>Form your answer before viewing the choices.</Text><AppButton label="I have an answer" onPress={() => setCheckpointChoicesVisible(true)} /></View> : <View style={styles.answers}>{checkpoint.choices.map((choice, index) => <Pressable key={choice.id} accessibilityRole="radio" accessibilityState={{ checked: selected === index, disabled: answered }} disabled={answered} onPress={() => setSelected(index)} style={[styles.answer, selected === index && styles.selectedAnswer, answered && choice.id === checkpoint.correctChoiceId && styles.correctAnswer]}><Text variant="body" style={styles.answerText}>{String.fromCharCode(65 + index)} / {choice.label}</Text></Pressable>)}</View>}
      {answered ? <View accessibilityLiveRegion="assertive" style={[styles.feedback, correct ? styles.feedbackSuccess : styles.feedbackWarning]}><Text variant="label" style={correct ? styles.success : styles.warning}>{correct ? 'RETRIEVED' : 'REVIEW AGAIN LATER'}</Text><Text variant="bodySmall" style={styles.feedbackText}>{checkpoint.choices[selected]?.feedback}</Text></View> : null}
      <AppButton disabled={!answered} label={correct ? 'Resolve topic' : 'Requeue topic'} onPress={() => advance(correct)} />
    </> : null}
    {card ? <>
      <View style={styles.recallCard}><Text variant="label" style={styles.cardLabel}>{revealed ? 'ANSWER' : 'QUESTION'}</Text><Text variant="sectionHeading" style={styles.prompt}>{revealed ? card.answer : card.prompt}</Text>{revealed ? <Text variant="bodySmall" style={styles.explanation}>{card.explanation}</Text> : null}</View>
      {!revealed ? <AppButton label="Reveal answer" onPress={() => setRevealed(true)} /> : <View style={styles.rating}><AppButton label="Review again" variant="secondary" onPress={() => advance(false)} /><AppButton label="Got it" onPress={() => advance(true)} /></View>}
    </> : null}
    <Text variant="technical" style={styles.boundary}>NO SCORE / ITEMS REMAIN UNTIL RETRIEVED CORRECTLY</Text>
  </Screen>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Space.xl }, count: { color: colors.textMuted }, eyebrow: { color: colors.orange }, title: { color: colors.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.xl }, prompt: { color: colors.text }, answers: { gap: Space.sm, marginVertical: Space.xl }, answer: { minHeight: 52, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: Space.md, justifyContent: 'center' }, selectedAnswer: { borderColor: colors.orange, backgroundColor: colors.orangeSoft }, correctAnswer: { borderColor: colors.green, backgroundColor: colors.greenSoft }, answerText: { color: colors.text }, feedback: { borderWidth: 1, padding: Space.lg, gap: Space.sm, marginBottom: Space.lg }, feedbackSuccess: { borderColor: colors.green, backgroundColor: colors.greenSoft }, feedbackWarning: { borderColor: colors.orange, backgroundColor: colors.orangeSoft }, feedbackText: { color: colors.text }, success: { color: colors.green }, warning: { color: colors.orange }, muted: { color: colors.textMuted }, recallPrompt: { gap: Space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: Space.lg, marginVertical: Space.xl }, recallCard: { minHeight: 300, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceRaised, padding: Space.xl, justifyContent: 'center', alignItems: 'center', gap: Space.lg, marginBottom: Space.lg }, cardLabel: { color: colors.accentBright }, explanation: { color: colors.textMuted, textAlign: 'center' }, rating: { gap: Space.md }, boundary: { color: colors.textMuted, textAlign: 'center', marginTop: Space.xl }, empty: { flex: 1, minHeight: 420, justifyContent: 'center', gap: Space.lg },
});
