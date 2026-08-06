import { router, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useEffect } from 'react';

import { courses, getCourseChapters, isCourseComplete, canEnterOperations } from '@/content/courses';
import { isChapterComplete } from '@/content/progress';
import type { CourseId } from '@/content/types';
import { useAuth } from '@/features/account/auth-context';
import { ActionCard } from '@/shared/components/action-card';
import { AppButton } from '@/shared/components/app-button';
import { IconButton } from '@/shared/components/icon-button';
import { Text } from '@/shared/components/console-text';
import { Screen } from '@/shared/components/screen';
import { returnToMenu } from '@/shared/navigation';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useGameStore } from '@/store/use-game-store';

export default function CourseLibraryScreen() {
  const { hasContentAccess, presentationActive, testProEnabled } = useAuth();
  const accessBypass = presentationActive || testProEnabled;
  const state = useGameStore();
  const awardCourseAchievement = useGameStore((current) => current.awardCourseAchievement);
  const progress = state;
  const foundationComplete = isCourseComplete('network-foundations', progress);
  const operationsComplete = isCourseComplete('network-operations', progress);
  useEffect(() => {
    if (foundationComplete) awardCourseAchievement('network-foundations', 'NetBite Network Foundations');
    if (operationsComplete) awardCourseAchievement('network-operations', 'NetBite Network Operations');
  }, [awardCourseAchievement, foundationComplete, operationsComplete]);

  return <Screen>
    <IconButton accessibilityLabel="Back to main menu" icon="arrow-left" label="BACK / MENU" onPress={returnToMenu} />
    <View style={styles.hero}>
      <Text variant="label" style={styles.eyebrow}>COURSE LIBRARY</Text>
      <Text variant="screenTitle" style={styles.title}>CHOOSE YOUR TRAINING PATH</Text>
      <Text variant="body" style={styles.detail}>Foundations teaches the core model. Operations applies it to services, resilient networks, IPv6, and dynamic routing.</Text>
    </View>
    <View style={styles.list}>{courses.map((course) => {
      const courseId = course.id as CourseId;
      const courseChapters = getCourseChapters(courseId);
      const completed = courseChapters.filter((chapter) => isChapterComplete(chapter, progress)).length;
      const ready = courseId === 'network-foundations' || canEnterOperations(progress) || accessBypass;
      const accessible = course.accessTier === 'free' || hasContentAccess;
      const lockedReason = !accessible ? 'NETBITE PRO REQUIRED' : !ready ? 'FOUNDATIONS OR 10/12 DIAGNOSTIC REQUIRED' : undefined;
      const open = () => {
        if (!accessible) return router.push('/pro');
        if (!ready) return router.push(AppRoutes.readiness);
        router.push({ pathname: '/learn', params: { courseId } });
      };
      const fullyComplete = isCourseComplete(courseId, progress);
      const modulesComplete = completed === courseChapters.length;
      const footer = fullyComplete
        ? <AppButton label="View certificate" variant="utility" onPress={() => router.push(`/certificate/${courseId}` as Href)} />
        : course.capstone && (modulesComplete || accessBypass)
          ? <AppButton label="Start operations capstone" variant="secondary" onPress={() => router.push(`/capstone/${courseId}` as Href)} />
          : undefined;
      return <ActionCard key={course.id} badge={`${completed}/${courseChapters.length} MODULES`} detail={lockedReason ?? course.summary} endIcon={lockedReason ? 'lock' : 'arrow-right'} footer={footer} icon="learn" priority={courseId === 'network-foundations' ? 'primary' : 'secondary'} progress={completed / courseChapters.length} status={courseId === 'network-foundations' ? 'COURSE 1' : presentationActive ? 'COURSE 2 / DEMO BYPASS' : testProEnabled ? 'COURSE 2 / TEST ACCESS' : 'COURSE 2'} title={course.title.toUpperCase()} tone={courseId === 'network-foundations' ? 'learning' : 'sandbox'} onPress={open} />;
    })}</View>
  </Screen>;
}

const styles = StyleSheet.create({ hero: { marginVertical: Space.xl, gap: Space.sm }, eyebrow: { color: Palette.orange }, title: { color: Palette.text, fontFamily: Fonts.semibold }, detail: { color: Palette.textMuted }, list: { gap: Space.lg } });
