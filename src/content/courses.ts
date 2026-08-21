import { foundationChapters, operationsChapters } from '@/content/chapters';
import type { CourseDefinition, CourseId } from '@/content/types';
import { isChapterComplete, type LearningProgress } from '@/content/progress';

export const courses: CourseDefinition[] = [
  {
    id: 'network-foundations', version: 1, title: 'Network Foundations', shortTitle: 'Foundations', accessTier: 'free',
    summary: 'Build the Ethernet, IPv4, routing, VLAN, and troubleshooting foundation needed for guided network practice.',
    chapterIds: foundationChapters.map(({ id }) => id), certificateTitle: 'NetBite Network Foundations',
  },
  {
    id: 'network-operations', version: 1, title: 'Network Operations', shortTitle: 'Operations', accessTier: 'pro',
    prerequisiteCourseId: 'network-foundations',
    prerequisitePolicy: { diagnosticId: 'network-operations-readiness', questionCount: 12, masteryScore: 10 },
    summary: 'Operate services, IPv6, resilient switching, traffic policy, translation, and single-area dynamic routing.',
    chapterIds: operationsChapters.map(({ id }) => id),
    capstone: { id: 'network-operations-capstone', title: 'Integrated Network Operations Lab', detail: 'Configure an IPv4 small office and troubleshoot an IPv6 branch.' },
    certificateTitle: 'NetBite Network Operations',
  },
];

export const getCourse = (courseId: string | undefined) => courses.find(({ id }) => id === courseId);
export const getCourseChapters = (courseId: CourseId) => courseId === 'network-operations' ? operationsChapters : foundationChapters;
export const isCourseComplete = (courseId: CourseId, progress: LearningProgress & { completedCapstoneIds?: string[] }) => {
  const course = getCourse(courseId);
  if (!course) return false;
  const chapterComplete = getCourseChapters(courseId).every((chapter) => isChapterComplete(chapter, progress));
  return chapterComplete && (!course.capstone || progress.completedCapstoneIds?.includes(course.capstone.id) === true);
};

export function canEnterOperations(progress: LearningProgress & { readinessScores?: Record<string, number> }) {
  return isCourseComplete('network-foundations', progress) || (progress.readinessScores?.['network-operations'] ?? 0) >= 10;
}
