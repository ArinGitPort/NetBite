import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, StyleSheet, View } from 'react-native';

import { chapters } from '@/content/chapters';
import { canAccessChapter } from '@/core/account/access';
import { getActiveReviewQueue, type ReviewQueueItem } from '@/core/learning/adaptive-learning';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { IconButton } from '@/shared/components/icon-button';
import { Screen } from '@/shared/components/screen';
import { Text } from '@/shared/components/console-text';
import { returnToLearningPath } from '@/shared/navigation';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

function resolveItem(item: ReviewQueueItem) {
  const chapter = chapters.find((candidate) => candidate.id === item.chapterId);
  if (!chapter) return undefined;
  if (item.kind === 'quiz') return { chapter, quiz: chapter.quiz.find((question) => question.id === item.contentId) };
  return { chapter, card: chapter.flashcards.find((card) => card.id === item.contentId) };
}

export default function ReviewScreen() {
  const { hasContentAccess } = useAuth();
  const signals = useGameStore((state) => state.reviewSignals);
  const recordResult = useGameStore((state) => state.recordReviewResult);
  const accessible = useMemo(() => new Set(chapters.filter((chapter) => canAccessChapter(chapter.id, hasContentAccess)).map((chapter) => chapter.id)), [hasContentAccess]);
  const versions = useMemo(() => Object.fromEntries(chapters.map((chapter) => [chapter.id, { quiz: chapter.contentVersion, flashcard: chapter.flashcardVersion }])), []);
  const initial = useMemo(() => getActiveReviewQueue(signals, versions, accessible), [accessible, signals, versions]);
  const [queue, setQueue] = useState(initial);
  const [selected, setSelected] = useState<number>();
  const [revealed, setRevealed] = useState(false);
  const reviewItemRef = useRef<View>(null);
  const current = queue[0];
  const currentKey = current?.key;
  const resolved = current ? resolveItem(current) : undefined;

  useEffect(() => {
    if (!currentKey) return;
    const timer = setTimeout(() => {
      const node = findNodeHandle(reviewItemRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 50);
    return () => clearTimeout(timer);
  }, [currentKey]);

  const advance = (correct: boolean) => {
    if (!current) return;
    const version = current.kind === 'quiz' ? resolved?.chapter.contentVersion : resolved?.chapter.flashcardVersion;
    if (version) recordResult({ kind: current.kind, contentId: current.contentId, lessonId: current.lessonId, chapterId: current.chapterId, contentVersion: version }, correct);
    setQueue((items) => correct ? items.slice(1) : [...items.slice(1), items[0]]);
    setSelected(undefined);
    setRevealed(false);
  };

  if (!current || !resolved) return <Screen><IconButton accessibilityLabel="Back to learning path" icon="arrow-left" label="BACK / LEARN" onPress={returnToLearningPath} /><View style={styles.empty}><Text variant="label" style={styles.success}>REVIEW QUEUE CLEAR</Text><Text variant="screenTitle" style={styles.title}>NO WEAK TOPICS DUE</Text><Text variant="body" style={styles.muted}>Missed quiz concepts and cards marked Review Again will appear here.</Text><AppButton label="Back to learning" onPress={returnToLearningPath} /></View></Screen>;

  const quiz = 'quiz' in resolved ? resolved.quiz : undefined;
  const card = 'card' in resolved ? resolved.card : undefined;
  if (!quiz && !card) return null;
  const answered = selected !== undefined;
  const correct = quiz ? selected === quiz.correctAnswerIndex : false;

  return <Screen>
    <View style={styles.header}><IconButton accessibilityLabel="Close weak-topic review" icon="close" onPress={returnToLearningPath} /><Text variant="label" style={styles.count}>{queue.length} DUE</Text></View>
    <View accessible accessibilityLabel={`Chapter ${resolved.chapter.numberLabel}. ${current.kind === 'quiz' ? 'Scenario retry' : 'Active recall'}. Review weak topics.`} ref={reviewItemRef}><Text variant="label" style={styles.eyebrow}>CHAPTER {resolved.chapter.numberLabel} / {current.kind === 'quiz' ? 'SCENARIO RETRY' : 'ACTIVE RECALL'}</Text><Text variant="screenTitle" style={styles.title}>REVIEW WEAK TOPICS</Text></View>
    {quiz ? <>
      <Text variant="sectionHeading" style={styles.prompt}>{quiz.prompt}</Text>
      <View style={styles.answers}>{quiz.answers.map((answer, index) => <Pressable key={answer} accessibilityRole="radio" accessibilityState={{ checked: selected === index, disabled: answered }} disabled={answered} onPress={() => setSelected(index)} style={[styles.answer, selected === index && styles.selectedAnswer, answered && index === quiz.correctAnswerIndex && styles.correctAnswer]}><Text variant="body" style={styles.answerText}>{String.fromCharCode(65 + index)} / {answer}</Text></Pressable>)}</View>
      {answered ? <View accessibilityLiveRegion="assertive" style={[styles.feedback, correct ? styles.feedbackSuccess : styles.feedbackWarning]}><Text variant="label" style={correct ? styles.success : styles.warning}>{correct ? 'RETRIEVED' : 'REVIEW AGAIN LATER'}</Text><Text variant="bodySmall" style={styles.feedbackText}>{quiz.explanation}</Text></View> : null}
      <AppButton disabled={!answered} label={correct ? 'Resolve topic' : 'Requeue topic'} onPress={() => advance(correct)} />
    </> : null}
    {card ? <>
      <View style={styles.recallCard}><Text variant="label" style={styles.cardLabel}>{revealed ? 'ANSWER' : 'QUESTION'}</Text><Text variant="sectionHeading" style={styles.prompt}>{revealed ? card.answer : card.prompt}</Text>{revealed ? <Text variant="bodySmall" style={styles.explanation}>{card.explanation}</Text> : null}</View>
      {!revealed ? <AppButton label="Reveal answer" onPress={() => setRevealed(true)} /> : <View style={styles.rating}><AppButton label="Review again" variant="secondary" onPress={() => advance(false)} /><AppButton label="Got it" onPress={() => advance(true)} /></View>}
    </> : null}
    <Text variant="technical" style={styles.boundary}>NO SCORE / ITEMS REMAIN UNTIL RETRIEVED CORRECTLY</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Space.xl }, count: { color: Palette.textMuted }, eyebrow: { color: Palette.orange }, title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm, marginBottom: Space.xl }, prompt: { color: Palette.white }, answers: { gap: Space.sm, marginVertical: Space.xl }, answer: { minHeight: 52, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.md, justifyContent: 'center' }, selectedAnswer: { borderColor: Palette.orange }, correctAnswer: { borderColor: Palette.green }, answerText: { color: Palette.text }, feedback: { borderWidth: 1, padding: Space.lg, gap: Space.sm, marginBottom: Space.lg }, feedbackSuccess: { borderColor: Palette.green }, feedbackWarning: { borderColor: Palette.orange }, feedbackText: { color: Palette.text }, success: { color: Palette.green }, warning: { color: Palette.orange }, muted: { color: Palette.textMuted }, recallCard: { minHeight: 300, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surfaceRaised, padding: Space.xl, justifyContent: 'center', alignItems: 'center', gap: Space.lg, marginBottom: Space.lg }, cardLabel: { color: Palette.accentBright }, explanation: { color: Palette.textMuted, textAlign: 'center' }, rating: { gap: Space.md }, boundary: { color: Palette.textMuted, textAlign: 'center', marginTop: Space.xl }, empty: { flex: 1, minHeight: 420, justifyContent: 'center', gap: Space.lg },
});
