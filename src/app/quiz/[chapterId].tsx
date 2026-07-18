import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { getChapter } from '@/content/chapters';
import { getQuizMasteryScore } from '@/content/progress';
import { AppButton } from '@/shared/components/app-button';
import { AppIcon } from '@/shared/components/app-icon';
import { ContentNotFound } from '@/shared/components/content-not-found';
import { Text } from '@/shared/components/console-text';
import { IconButton } from '@/shared/components/icon-button';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { successHaptic, warningHaptic } from '@/shared/haptics';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function QuizScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const saveQuizScore = useGameStore((state) => state.saveQuizScore);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [score, setScore] = useState(0);
  const [missedLessonIds, setMissedLessonIds] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const answered = selectedIndex !== undefined;
  const chapter = getChapter(chapterId);

  if (!chapter) return <ContentNotFound label="Quiz" />;
  const question = chapter.quiz[questionIndex];
  const masteryScore = getQuizMasteryScore(chapter);
  const mastered = score >= masteryScore;

  const chooseAnswer = (answerIndex: number) => {
    if (answered) return;
    setSelectedIndex(answerIndex);
    if (answerIndex === question.correctAnswerIndex) {
      setScore((current) => current + 1);
      successHaptic();
    } else {
      setMissedLessonIds((current) => current.includes(question.lessonId) ? current : [...current, question.lessonId]);
      warningHaptic();
    }
  };

  const retry = () => {
    setQuestionIndex(0);
    setSelectedIndex(undefined);
    setScore(0);
    setMissedLessonIds([]);
    setFinished(false);
  };

  const next = () => {
    if (questionIndex === chapter.quiz.length - 1) {
      saveQuizScore(chapter.id, score, chapter.contentVersion);
      setFinished(true);
      return;
    }
    setQuestionIndex((current) => current + 1);
    setSelectedIndex(undefined);
  };

  if (finished) {
    const lessonsToReview = chapter.lessons
      .filter((lesson) => missedLessonIds.includes(lesson.id))
      .map((lesson) => lesson.title)
      .join(', ');
    return (
      <Screen>
        <View style={styles.resultHero}>
          <View style={[styles.statusBlock, !mastered && styles.statusBlockAttempted]}><AppIcon name={mastered ? 'check' : 'reset'} size={28} /></View>
          <Text variant="label" style={[styles.resultEyebrow, !mastered && styles.resultEyebrowAttempted]}>{mastered ? 'QUIZ MASTERED' : 'ATTEMPT RECORDED'}</Text>
          <Text variant="screenTitle" style={styles.resultTitle}>{score} / {chapter.quiz.length}</Text>
          <Text variant="body" style={styles.resultCopy}>{mastered
            ? 'You have the foundations down.'
            : `Reach ${masteryScore}/${chapter.quiz.length} for mastery. Review: ${lessonsToReview || 'the chapter lessons'}.`}</Text>
        </View>
        <View style={styles.resultActions}>
          {mastered ? (
            <AppButton label="Review flashcards" trailingIcon="arrow-right" onPress={() => router.replace({ pathname: '/flashcards/[chapterId]', params: { chapterId: chapter.id } })} />
          ) : (
            <AppButton label="Retry quiz" onPress={retry} />
          )}
          <AppButton label="Back to chapter" leadingIcon="arrow-left" variant="secondary" onPress={() => router.replace({ pathname: '/chapter/[chapterId]', params: { chapterId: chapter.id } })} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Close quiz" icon="close" onPress={() => router.dismissTo({ pathname: '/chapter/[chapterId]', params: { chapterId: chapter.id } })} />
        <View style={styles.progress}><ProgressBar progress={(questionIndex + 1) / chapter.quiz.length} /></View>
        <Text variant="label" style={styles.count}>{questionIndex + 1}/{chapter.quiz.length}</Text>
      </View>
      <Text variant="label" style={styles.eyebrow}>CHECK YOUR UNDERSTANDING</Text>
      <Text variant="screenTitle" style={styles.question}>{question.prompt}</Text>
      <View style={styles.answers}>
        {question.answers.map((answer, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = answered && index === question.correctAnswerIndex;
          const isWrong = isSelected && index !== question.correctAnswerIndex;
          return (
            <Pressable
              key={answer}
              accessibilityLabel={`${answer}${isCorrect ? ', correct answer' : isWrong ? ', incorrect answer' : ''}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled: answered }}
              disabled={answered}
              onPress={() => chooseAnswer(index)}
              style={({ pressed }) => [styles.answer, isCorrect && styles.correctAnswer, isWrong && styles.wrongAnswer, pressed && !answered && styles.pressed]}>
              <View style={[styles.answerLetter, isCorrect && styles.correctLetter, isWrong && styles.wrongLetter]}>
                <Text variant="label" style={styles.answerLetterText}>{String.fromCharCode(65 + index)}</Text>
              </View>
              <Text variant="body" style={styles.answerText}>{answer}</Text>
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={[styles.explanation, selectedIndex === question.correctAnswerIndex ? styles.correctExplanation : styles.wrongExplanation]}>
          <Text variant="label" style={styles.explanationTitle}>{selectedIndex === question.correctAnswerIndex ? 'CORRECT' : 'SYSTEM NOTE'}</Text>
          <Text variant="body" style={styles.explanationText}>{question.explanation}</Text>
        </View>
      ) : null}
      <View style={styles.spacer} />
      <AppButton
        label={questionIndex === chapter.quiz.length - 1 ? 'See my score' : 'Next question'}
        trailingIcon={questionIndex === chapter.quiz.length - 1 ? 'check' : 'arrow-right'}
        disabled={!answered}
        onPress={next}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  progress: { flex: 1 },
  count: { width: 56, textAlign: 'right', color: Palette.textMuted },
  eyebrow: { color: Palette.accentBright, fontFamily: Fonts.medium },
  question: { color: Palette.text, fontFamily: Fonts.semibold, textTransform: 'uppercase', marginTop: Space.sm, marginBottom: Space.xl },
  answers: { gap: Space.md },
  answer: { minHeight: 56, flexDirection: 'row', alignItems: 'center', padding: Space.md, borderRadius: Radius.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  answerLetter: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  answerLetterText: { color: Palette.text },
  answerText: { flex: 1, minWidth: 0, marginLeft: Space.md, color: Palette.text },
  correctAnswer: { borderColor: Palette.green, backgroundColor: Palette.surface },
  wrongAnswer: { borderColor: Palette.danger, backgroundColor: Palette.surface },
  correctLetter: { backgroundColor: Palette.greenSoft },
  wrongLetter: { backgroundColor: Palette.dangerSoft },
  pressed: { backgroundColor: Palette.accentSoft },
  explanation: { padding: Space.lg, borderRadius: Radius.md, borderWidth: 1, marginTop: Space.xl },
  correctExplanation: { backgroundColor: Palette.surface, borderColor: Palette.green },
  wrongExplanation: { backgroundColor: Palette.surface, borderColor: Palette.orange },
  explanationTitle: { color: Palette.text, fontFamily: Fonts.medium },
  explanationText: { color: Palette.text, marginTop: Space.xs },
  spacer: { flex: 1, minHeight: Space.xl },
  resultHero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  statusBlock: { width: 48, height: 32, borderWidth: 1, borderColor: Palette.green, alignItems: 'center', justifyContent: 'center' },
  statusBlockAttempted: { borderColor: Palette.orange },
  resultEyebrow: { color: Palette.green, fontFamily: Fonts.medium, marginTop: Space.xl },
  resultEyebrowAttempted: { color: Palette.orange },
  resultTitle: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.sm },
  resultCopy: { color: Palette.textMuted, textAlign: 'center', marginTop: Space.md, maxWidth: 360 },
  resultActions: { gap: Space.md },
});
