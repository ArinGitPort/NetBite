import { createClient } from '@supabase/supabase-js';

import { chapters } from '../../apps/mobile/src/content/chapters';
import { courses } from '../../apps/mobile/src/content/courses';
import { educationalIllustrationIds } from '../../apps/mobile/src/features/lessons/educational-illustration-registry';

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dryRun = process.argv.includes('--dry-run');
if ((!url || !serviceKey) && !dryRun) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding. Never place the service key in an EXPO_PUBLIC variable.');

const supabase = url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : undefined;

async function upsert(table: string, values: Record<string, unknown>[]) {
  if (!supabase) return;
  const { error } = await supabase.from(table).upsert(values);
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function seed() {
  const lessonCount = chapters.reduce((total, chapter) => total + chapter.lessons.length, 0);
  if (dryRun) {
    console.log(`Seed input valid: ${courses.length} courses, ${chapters.length} chapters, ${lessonCount} lessons, and ${educationalIllustrationIds.length} supported illustrations.`);
    return;
  }
  await upsert('content_courses', courses.map((course, index) => ({ id: course.id, position: index + 1, definition: course })));
  await upsert('content_chapters', chapters.map(({ lessons: _lessons, quiz: _quiz, flashcards: _flashcards, ...chapter }) => ({ id: chapter.id, course_id: chapter.courseId, position: chapter.courseOrder, definition: chapter })));
  await upsert('content_allowed_illustrations', educationalIllustrationIds.map((id) => ({ id })));
  await upsert('content_core_lessons', chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ id: lesson.id }))));
  await upsert('content_lessons', chapters.flatMap((chapter) => chapter.lessons.map((lesson, index) => ({ id: lesson.id, chapter_id: chapter.id, position: index + 1, requirement: 'core', draft: { ...lesson, requirement: 'core' }, archived: false }))));
  await upsert('content_quiz_questions', chapters.flatMap((chapter) => chapter.quiz.map((question, index) => ({ id: question.id, chapter_id: chapter.id, lesson_id: question.lessonId, position: index + 1, draft: question, archived: false }))));
  await upsert('content_flashcards', chapters.flatMap((chapter) => chapter.flashcards.map((card, index) => ({ id: card.id, chapter_id: chapter.id, lesson_id: card.lessonId, position: index + 1, draft: card, archived: false }))));
  console.log(`Seeded ${courses.length} courses, ${chapters.length} chapters, and ${lessonCount} lessons.`);
}

void seed();
