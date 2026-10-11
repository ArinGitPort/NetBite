import type { ChapterDefinition } from '@/content/types';
import type { SavedLearningItem } from '@/core/learning/adaptive-learning';
import type { WorkshopLibraryEntry } from '@/core/workshops/types';
import { cliCommandCatalog } from '@/core/network/cli-command-catalog';

export interface LearningSearchEntry {
  id: string;
  kind: 'lesson' | 'flashcard' | 'saved-lesson' | 'saved-flashcard' | 'workshop-lesson' | 'workshop-flashcard' | 'command';
  title: string;
  context: string;
  text: string;
  chapterId?: string;
  classId?: string;
  targetId: string;
  sectionIndex?: number;
}

export function buildLearningSearchIndex(chapters: ChapterDefinition[], library: WorkshopLibraryEntry[], saved: Record<string, SavedLearningItem>, includeCommands = false): LearningSearchEntry[] {
  const entries: LearningSearchEntry[] = [];
  for (const chapter of chapters) {
    for (const lesson of chapter.lessons) {
      entries.push({ id: `lesson:${lesson.id}`, kind: 'lesson', title: lesson.title, context: chapter.title, text: [lesson.body, lesson.takeaway, lesson.termNote?.term, lesson.termNote?.definition].filter(Boolean).join(' '), chapterId: chapter.id, targetId: lesson.id });
      lesson.sections?.forEach((section, index) => entries.push({ id: `section:${lesson.id}:${index}`, kind: 'lesson', title: section.heading, context: `${chapter.title} / ${lesson.title}`, text: section.body, chapterId: chapter.id, targetId: lesson.id, sectionIndex: index }));
    }
    for (const card of chapter.flashcards) entries.push({ id: `flashcard:${card.id}`, kind: 'flashcard', title: card.prompt, context: `${chapter.title} / flashcards`, text: `${card.answer} ${card.explanation}`, chapterId: chapter.id, targetId: chapter.id });
  }
  for (const item of library) {
    for (const lesson of item.manifest.lessons) entries.push({ id: `workshop:${item.classId}:${lesson.id}`, kind: 'workshop-lesson', title: lesson.title, context: item.manifest.title, text: `${lesson.summary} ${lesson.blocks.map((block) => [block.title, block.text, block.introduction, block.commandGroups?.map((group) => `${group.title} ${group.commands.join(' ')}`).join(' ')].filter(Boolean).join(' ')).join(' ')}`, classId: item.classId, targetId: lesson.id });
    for (const card of item.manifest.flashcards) entries.push({ id: `workshop-card:${item.classId}:${card.id}`, kind: 'workshop-flashcard', title: card.question, context: `${item.manifest.title} / flashcards`, text: `${card.answer} ${card.explanation ?? ''}`, classId: item.classId, targetId: item.classId });
  }
  for (const bookmark of Object.values(saved)) {
    if (bookmark.deletedAt) continue;
    if (bookmark.targetType === 'cli-command') entries.push({ id: bookmark.key, kind: 'command', title: bookmark.title, context: 'Saved CLI reference', text: bookmark.note, targetId: bookmark.targetId });
    else if (bookmark.note.trim() && bookmark.targetType === 'lesson') entries.push({ id: bookmark.key, kind: 'saved-lesson', title: bookmark.title, context: 'Saved lesson note', text: bookmark.note, chapterId: bookmark.chapterId, targetId: bookmark.targetId });
    else if (bookmark.note.trim() && bookmark.targetType === 'flashcard') entries.push({ id: bookmark.key, kind: 'saved-flashcard', title: bookmark.title, context: 'Saved flashcard note', text: bookmark.note, chapterId: bookmark.chapterId, targetId: bookmark.chapterId });
  }
  if (includeCommands) for (const command of cliCommandCatalog) entries.push({ id: command.id, kind: 'command', title: command.command, context: 'Supported Sandbox command', text: command.description, targetId: command.id });
  return entries;
}

export function searchLearning(entries: LearningSearchEntry[], query: string, limit = 40) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return entries.map((entry) => {
    const title = entry.title.toLocaleLowerCase();
    const context = entry.context.toLocaleLowerCase();
    const text = entry.text.toLocaleLowerCase();
    if (!terms.every((term) => title.includes(term) || context.includes(term) || text.includes(term))) return undefined;
    const score = terms.reduce((total, term) => total + (title.includes(term) ? 8 : 0) + (context.includes(term) ? 3 : 0) + (text.includes(term) ? 1 : 0), 0);
    return { entry, score };
  }).filter((item): item is { entry: LearningSearchEntry; score: number } => Boolean(item))
    .sort((first, second) => second.score - first.score || first.entry.title.localeCompare(second.entry.title))
    .slice(0, limit).map((item) => item.entry);
}
