import { useLocalSearchParams } from 'expo-router';

import { getCourse, canEnterOperations, getCourseChapters } from '@/content/courses';
import { isChapterComplete } from '@/content/progress';
import { ContentNotFound } from '@/shared/components/content-not-found';
import { CourseLockedScreen } from '@/features/account/components/course-locked-screen';
import { OperationsGuidedLab } from '@/features/operations/components/operations-guided-lab';
import { operationsLabDefinitions } from '@/features/operations/operations-lab-definitions';
import { useAuth } from '@/features/account/auth-context';
import { useGameStore } from '@/store/use-game-store';

export default function CapstoneScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const { hasContentAccess, presentationActive, testProEnabled } = useAuth();
  const accessBypass = presentationActive || testProEnabled;
  const progress = useGameStore();
  const completeCapstone = useGameStore((state) => state.completeCapstone);
  const course = getCourse(courseId);
  if (!course?.capstone || courseId !== 'network-operations') return <ContentNotFound label="Capstone" />;
  if (!hasContentAccess) return <CourseLockedScreen reason="NetBite Pro access is required for Network Operations." />;
  if (!accessBypass && !canEnterOperations(progress)) return <CourseLockedScreen reason="Complete Network Foundations or pass the readiness diagnostic first." />;
  if (!accessBypass && !getCourseChapters('network-operations').every((chapter) => isChapterComplete(chapter, progress))) return <CourseLockedScreen reason="Complete all 11 Network Operations modules before beginning the capstone." />;
  return <OperationsGuidedLab definition={operationsLabDefinitions[course.capstone.id]} onComplete={() => completeCapstone(course.capstone!.id)} />;
}
