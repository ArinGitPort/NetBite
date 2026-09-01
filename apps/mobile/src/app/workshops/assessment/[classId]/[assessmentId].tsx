import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { fetchWorkshopAssessmentStatus, submitWorkshopAssessment } from '@/core/workshops/workshop-service';
import { getCompatibleWorkshopDraft } from '@/core/workshops/workshop-drafts';
import type { WorkshopAssessment, WorkshopPracticeQuestion, WorkshopSubmissionResult } from '@/core/workshops/types';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { ScreenActionBar } from '@/shared/components/screen-action-bar';
import { workshopRoute } from '@/shared/routes';
import { Fonts, Space, type ThemeColors } from '@/shared/theme';
import { useThemeStyles } from '@/shared/theme-context';
import { getWorkshopDraft, useWorkshopStore } from '@/store/use-workshop-store';

export default function WorkshopAssessmentScreen() {
  const styles = useThemeStyles(createStyles);
  const { classId, assessmentId } = useLocalSearchParams<{ classId: string; assessmentId: string }>();
  const { status, user } = useAuth();
  const entry = useWorkshopStore((state) => state.library.find((item) => item.classId === classId));
  const assessment = entry?.manifest.assessments.find((item) => item.id === assessmentId);
  const saveDraft = useWorkshopStore((state) => state.saveDraft); const clearDraft = useWorkshopStore((state) => state.clearDraft);
  const storedDraft = getWorkshopDraft(classId, assessmentId);
  const compatibleDraft = getCompatibleWorkshopDraft(storedDraft, entry?.manifest.versionId ?? '', assessment?.questions.map((question) => question.id) ?? []);
  const initial = compatibleDraft.answers;
  const [requestId, setRequestId] = useState(() => compatibleDraft.requestId ?? Crypto.randomUUID());
  const [answers, setAnswers] = useState<Record<string, string>>(initial); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string>(); const [result, setResult] = useState<WorkshopSubmissionResult>();
  const complete = Boolean(assessment?.questions.every((question) => answers[question.id]));
  const displayQuestions = useMemo(() => {
    if (!entry || !assessment) return [];
    const seed = `${user?.id ?? 'practice'}:${entry.manifest.versionId}:${assessment.id}`;
    const questions = assessment.settings?.shuffleQuestions ? stableShuffle(assessment.questions, seed) : assessment.questions;
    return questions.map((question) => ({ ...question, choices: assessment.settings?.shuffleAnswers ? stableShuffle(question.choices, `${seed}:${question.id}`) : question.choices }));
  }, [assessment, entry, user?.id]);
  const refreshResult = useCallback(async () => {
    if (status !== 'authenticated' || assessment?.mode !== 'graded') return;
    try {
      const response = await fetchWorkshopAssessmentStatus(classId, assessmentId);
      if (response.submitted && response.result) setResult(response.result);
    } catch { /* The cached workshop and answer draft remain available. */ }
  }, [assessment?.mode, assessmentId, classId, setResult, status]);
  useEffect(() => { const timer = setTimeout(() => void refreshResult(), 0); return () => clearTimeout(timer); }, [refreshResult]);
  if (!entry || !assessment) return <Screen><Text variant="screenTitle">ASSESSMENT NOT AVAILABLE</Text></Screen>;
  const opensAt = assessment.settings?.opensAt ? new Date(assessment.settings.opensAt) : undefined;
  const dueAt = assessment.settings?.dueAt ? new Date(assessment.settings.dueAt) : undefined;
  const notOpen = Boolean(opensAt && opensAt > new Date());
  const choose = (questionId: string, choiceId: string) => { const next = { ...answers, [questionId]: choiceId }; setAnswers(next); setMessage(undefined); if (assessment.mode === 'graded') saveDraft({ classId, versionId: entry.manifest.versionId, assessmentId, requestId, answers: next, updatedAt: new Date().toISOString() }); };
  const checkPractice = () => { const questions = assessment.questions as WorkshopPracticeQuestion[]; const score = questions.filter((question) => answers[question.id] === question.correctChoiceId).length; setResult({ attemptId: 'practice', assessmentId, attemptNumber: 1, submittedAt: new Date().toISOString(), late: false, score, total: questions.length, percentage: score / questions.length * 100, passed: true, feedbackReleased: true, answers: questions.map((question) => ({ questionId: question.id, correctChoiceId: question.correctChoiceId, explanation: question.explanation })) }); };
  const submit = async () => { if (status !== 'authenticated') return setMessage('Sign in before submitting graded work.'); setBusy(true); setMessage(undefined); try { const response = await submitWorkshopAssessment({ classId, assessmentId, answers, requestId }); setResult(response); clearDraft(classId, assessmentId); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'The assessment was not submitted. Your answers remain saved.'); } finally { setBusy(false); } };
  const startAnotherAttempt = () => { const nextRequestId = Crypto.randomUUID(); setAnswers({}); setResult(undefined); setRequestId(nextRequestId); saveDraft({ classId, versionId: entry.manifest.versionId, assessmentId, requestId: nextRequestId, answers: {}, updatedAt: new Date().toISOString() }); };
  const answeredCount = assessment.questions.filter((question) => answers[question.id]).length;
  const actionLabel = notOpen ? 'Assessment not open' : busy ? 'Submitting assessment' : assessment.mode === 'graded' ? 'Submit graded assessment' : 'Check practice answers';
  const footer = result ? undefined : <ScreenActionBar feedback={message} label={notOpen ? 'WAITING FOR OPEN TIME' : `${answeredCount} OF ${assessment.questions.length} ANSWERED`} tone={message ? 'error' : 'normal'}><AppButton label={actionLabel} loading={busy} disabled={!complete || busy || notOpen} onPress={() => assessment.mode === 'graded' ? void submit() : checkPractice()} /></ScreenActionBar>;
  return <Screen footer={footer} header={<PageHeader leading={{ accessibilityLabel: 'Back to workshop', icon: 'close', label: 'CLOSE', onPress: () => router.replace(workshopRoute(classId)) }} status={assessment.mode === 'graded' ? 'GRADED' : 'PRACTICE'} />}>
    <Text variant="label" style={styles.eyebrow}>{assessment.mode === 'graded' ? 'OFFICIAL CLASS ASSESSMENT' : 'PRACTICE ACTIVITY'}</Text><Text variant="screenTitle">{assessment.title.toUpperCase()}</Text><Text variant="body" style={styles.instructions}>{assessment.instructions}</Text>{assessment.mode === 'graded' ? <View style={styles.policy}><Text variant="label">SUBMISSION RULES</Text><Text variant="bodySmall">Attempts: {assessment.settings?.maximumAttempts ?? 1}</Text><Text variant="bodySmall">Recorded score: {policyLabel(assessment)}</Text><Text variant="bodySmall">Passing score: {assessment.settings?.passingPercentage ?? 80}%</Text>{opensAt ? <Text variant="bodySmall">Opens: {opensAt.toLocaleString()}</Text> : null}{dueAt ? <Text variant="bodySmall">Due: {dueAt.toLocaleString()}</Text> : null}<Text variant="technical" style={styles.muted}>An official grade is recorded only after the server confirms submission.</Text></View> : null}
    {notOpen ? <View style={styles.notOpen}><Text variant="label">NOT OPEN YET</Text><Text variant="bodySmall">You can review the instructions now. Answers can be submitted after {opensAt?.toLocaleString()}.</Text></View> : null}
    <View style={styles.questions}>{displayQuestions.map((question, index) => <View style={styles.question} key={question.id}><Text variant="label" style={styles.eyebrow}>QUESTION {index + 1} OF {assessment.questions.length}</Text><Text variant="sectionHeading">{question.prompt}</Text><View style={styles.choices}>{question.choices.map((choice) => { const selected = answers[question.id] === choice.id; const correct = result?.feedbackReleased && result.answers?.find((answer) => answer.questionId === question.id)?.correctChoiceId === choice.id; return <Pressable key={choice.id} accessibilityRole="radio" accessibilityState={{ selected }} disabled={Boolean(result)} onPress={() => choose(question.id, choice.id)} style={[styles.choice, selected && styles.choiceSelected, correct && styles.choiceCorrect]}><View style={[styles.circle, selected && styles.circleSelected]} /><Text variant="bodySmall" style={styles.choiceText}>{choice.label}</Text>{correct ? <Text variant="technical" style={styles.correct}>CORRECT</Text> : null}</Pressable>; })}</View>{result?.feedbackReleased ? <Text variant="bodySmall" style={styles.explanation}>{result.answers?.find((answer) => answer.questionId === question.id)?.explanation}</Text> : null}</View>)}</View>
    {result ? <View accessibilityLiveRegion="polite" style={styles.result}><Text variant="label">{assessment.mode === 'graded' ? 'SUBMISSION CONFIRMED' : 'PRACTICE RESULT'}</Text><Text variant="screenTitle">{result.score} / {result.total}</Text><Text variant="bodySmall">{result.feedbackReleased ? `${Number(result.percentage).toFixed(0)}% · ${result.passed ? 'PASSING SCORE' : 'BELOW PASSING SCORE'}` : 'Your grade was recorded. Answers will be released according to the instructor’s settings.'}</Text>{assessment.mode === 'graded' && !result.feedbackReleased ? <AppButton label="Refresh released results" variant="secondary" onPress={() => void refreshResult()} /> : null}{assessment.mode === 'graded' && result.attemptNumber < (assessment.settings?.maximumAttempts ?? 1) ? <AppButton label="Start another attempt" variant="secondary" onPress={startAnotherAttempt} /> : null}</View> : null}
  </Screen>;
}
function policyLabel(assessment: WorkshopAssessment) { const value = assessment.settings?.gradePolicy; return value === 'first' ? 'First attempt' : value === 'latest' ? 'Latest attempt' : 'Highest attempt'; }
function stableShuffle<T>(values: T[], seedText: string) {
  let seed = 2166136261;
  for (const character of seedText) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
    const target = Math.abs(seed) % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({ eyebrow: { color: colors.orange }, instructions: { color: colors.textMuted, marginVertical: Space.md }, muted: { color: colors.textMuted }, policy: { gap: Space.xs, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: Space.md }, notOpen: { gap: Space.xs, borderWidth: 1, borderColor: colors.orange, backgroundColor: colors.orangeSoft, padding: Space.md, marginTop: Space.md }, questions: { gap: Space.lg, marginVertical: Space.xl }, question: { gap: Space.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: Space.lg }, choices: { gap: Space.sm }, choice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: Space.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, padding: Space.md }, choiceSelected: { borderColor: colors.orange, backgroundColor: colors.orangeSoft }, choiceCorrect: { borderColor: colors.green, backgroundColor: colors.greenSoft }, circle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.textMuted }, circleSelected: { borderWidth: 5, borderColor: colors.orange }, choiceText: { flex: 1, color: colors.text, fontFamily: Fonts.medium }, correct: { color: colors.green }, explanation: { color: colors.green }, result: { gap: Space.sm, borderWidth: 1, borderColor: colors.green, backgroundColor: colors.greenSoft, padding: Space.xl }, error: { color: colors.danger, marginTop: Space.md } });
