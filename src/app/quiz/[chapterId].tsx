import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { chapterOneQuiz } from '@/content/chapter-one';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { ProgressBar } from '@/shared/components/progress-bar';
import { Screen } from '@/shared/components/screen';
import { Fonts, Palette, Radius, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function QuizScreen() {
  const saveQuizScore = useGameStore((state) => state.saveQuizScore);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number>();
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const question = chapterOneQuiz[questionIndex];
  const answered = selectedIndex !== undefined;

  const chooseAnswer = (answerIndex: number) => {
    if (answered) return;
    setSelectedIndex(answerIndex);
    if (answerIndex === question.correctAnswerIndex) setScore((current) => current + 1);
  };

  const next = () => {
    if (questionIndex === chapterOneQuiz.length - 1) {
      saveQuizScore(score);
      setFinished(true);
      return;
    }
    setQuestionIndex((current) => current + 1);
    setSelectedIndex(undefined);
  };

  if (finished) {
    return (
      <Screen>
        <View style={styles.resultHero}>
          <View style={styles.statusBlock}><Text style={styles.statusCode}>[OK]</Text></View>
          <Text style={styles.resultEyebrow}>QUIZ COMPLETE</Text>
          <Text style={styles.resultTitle}>{score} / {chapterOneQuiz.length}</Text>
          <Text style={styles.resultCopy}>{score >= 4 ? 'You have the foundations down.' : 'Good start. Review the lessons and try again anytime.'}</Text>
        </View>
        <View style={styles.resultActions}>
          <AppButton label="Back to chapter" onPress={() => router.replace('/chapter/1')} />
          <AppButton label="Review flashcards" variant="secondary" onPress={() => router.replace('/flashcards/1')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text onPress={() => router.back()} style={styles.close}>[X]</Text>
        <View style={styles.progress}><ProgressBar progress={(questionIndex + 1) / chapterOneQuiz.length} /></View>
        <Text style={styles.count}>{questionIndex + 1}/{chapterOneQuiz.length}</Text>
      </View>
      <Text style={styles.eyebrow}>CHECK YOUR UNDERSTANDING</Text>
      <Text style={styles.question}>{question.prompt}</Text>
      <View style={styles.answers}>
        {question.answers.map((answer, index) => {
          const isSelected = selectedIndex === index;
          const isCorrect = answered && index === question.correctAnswerIndex;
          const isWrong = isSelected && index !== question.correctAnswerIndex;
          return (
            <Pressable
              key={answer}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              onPress={() => chooseAnswer(index)}
              style={({ pressed }) => [styles.answer, isCorrect && styles.correctAnswer, isWrong && styles.wrongAnswer, pressed && !answered && styles.pressed]}>
              <View style={[styles.answerLetter, isCorrect && styles.correctLetter, isWrong && styles.wrongLetter]}>
                <Text style={styles.answerLetterText}>{String.fromCharCode(65 + index)}</Text>
              </View>
              <Text style={styles.answerText}>{answer}</Text>
            </Pressable>
          );
        })}
      </View>

      {answered ? (
        <View style={[styles.explanation, selectedIndex === question.correctAnswerIndex ? styles.correctExplanation : styles.wrongExplanation]}>
          <Text style={styles.explanationTitle}>{selectedIndex === question.correctAnswerIndex ? 'CORRECT' : 'SYSTEM NOTE'}</Text>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      ) : null}
      <View style={styles.spacer} />
      <AppButton label={questionIndex === chapterOneQuiz.length - 1 ? 'See my score' : 'Next question'} disabled={!answered} onPress={next} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Space.xxl },
  close: { width: 44, color: Palette.text, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  progress: { flex: 1 },
  count: { width: 48, textAlign: 'right', color: Palette.textMuted, fontSize: 11, letterSpacing: 1.5 },
  eyebrow: { color: Palette.accentBright, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  question: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: Space.sm, marginBottom: Space.xl },
  answers: { gap: Space.md },
  answer: { minHeight: 56, flexDirection: 'row', alignItems: 'center', padding: Space.md, borderRadius: Radius.md, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  answerLetter: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  answerLetterText: { color: Palette.text, fontSize: 11, letterSpacing: 1.5 },
  answerText: { flex: 1, marginLeft: Space.md, color: Palette.text, fontSize: 12, lineHeight: 18 },
  correctAnswer: { borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  wrongAnswer: { borderColor: Palette.danger, backgroundColor: Palette.dangerSoft },
  correctLetter: { backgroundColor: Palette.greenSoft },
  wrongLetter: { backgroundColor: Palette.dangerSoft },
  pressed: { backgroundColor: Palette.accentSoft },
  explanation: { padding: Space.lg, borderRadius: Radius.md, borderWidth: 1, marginTop: Space.xl },
  correctExplanation: { backgroundColor: Palette.greenSoft, borderColor: Palette.green },
  wrongExplanation: { backgroundColor: Palette.orangeSoft, borderColor: Palette.orange },
  explanationTitle: { color: Palette.text, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5 },
  explanationText: { color: Palette.text, fontSize: 12, lineHeight: 20, marginTop: Space.xs },
  spacer: { flex: 1, minHeight: Space.xl },
  resultHero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
  statusBlock: { width: 48, height: 32, borderWidth: 1, borderColor: Palette.green, alignItems: 'center', justifyContent: 'center' },
  statusCode: { color: Palette.green, fontSize: 11, letterSpacing: 1.5 },
  resultEyebrow: { color: Palette.green, fontFamily: Fonts.medium, fontSize: 11, letterSpacing: 1.5, marginTop: Space.xl },
  resultTitle: { color: Palette.text, fontFamily: Fonts.semibold, fontSize: 16, letterSpacing: 1.5, marginTop: Space.sm },
  resultCopy: { color: Palette.textMuted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: Space.md, maxWidth: 360 },
  resultActions: { gap: Space.md },
});
