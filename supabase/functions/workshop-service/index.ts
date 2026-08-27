import { adminJson, adminPreflight, requestId, safeAdminFailure } from '../_shared/admin-http.ts';
import { adminClient, userClient } from '../_shared/supabase.ts';

type JsonObject = Record<string, unknown>;

class ServiceError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
  }
}

function safeError(request: Request, error: unknown, id: string) {
  if (error instanceof ServiceError) {
    return adminJson(request, { error: { code: error.code, message: error.message, requestId: id } }, error.status);
  }
  console.error(`[workshop-service:${id}]`, error);
  return safeAdminFailure(request, id, 'The workshop service could not complete this request. Try again.', 500);
}

async function signedInUser(request: Request) {
  const { data, error } = await userClient(request).auth.getUser();
  if (error || !data.user) throw new ServiceError('AUTH_REQUIRED', 'Sign in to continue.', 401);
  return data.user;
}

async function requireInstructor(request: Request) {
  const user = await signedInUser(request);
  const { data, error } = await adminClient()
    .from('instructors')
    .select('user_id')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .maybeSingle();
  if (error || !data) throw new ServiceError('INSTRUCTOR_REQUIRED', 'An approved instructor account is required.', 403);
  return user;
}

async function requireOwnedWorkshop(userId: string, workshopId: string) {
  const { data, error } = await adminClient()
    .from('workshops')
    .select('id,title,description,archived,current_version_id')
    .eq('id', workshopId)
    .eq('instructor_id', userId)
    .maybeSingle();
  if (error || !data) throw new ServiceError('WORKSHOP_NOT_FOUND', 'The workshop was not found.', 404);
  return data;
}

function assertObject(value: unknown, label: string): asserts value is JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ServiceError('INVALID_CONTENT', `${label} is incomplete.`);
  }
}

function assertQuestions(value: unknown, assessmentTitle: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ServiceError('INVALID_ASSESSMENT', `${assessmentTitle} needs at least one question.`);
  }
  const ids = new Set<string>();
  for (const question of value) {
    assertObject(question, 'Question');
    const id = String(question.id ?? '');
    const choices = question.choices;
    if (!id || ids.has(id) || !String(question.prompt ?? '').trim() || !Array.isArray(choices) || choices.length < 2) {
      throw new ServiceError('INVALID_ASSESSMENT', `${assessmentTitle} contains an incomplete question.`);
    }
    ids.add(id);
    const choiceIds = new Set(choices.map((choice) => String((choice as JsonObject)?.id ?? '')));
    if (choiceIds.size !== choices.length || !choiceIds.has(String(question.correctChoiceId ?? ''))) {
      throw new ServiceError('INVALID_ASSESSMENT', `${assessmentTitle} has an invalid correct answer.`);
    }
  }
}

function requiredText(value: unknown, label: string, maximum = 4000) {
  const text = String(value ?? '').trim();
  if (!text || text.length > maximum) throw new ServiceError('INVALID_CONTENT', `${label} is required and must be shorter than ${maximum} characters.`);
  return text;
}

function safePublicImageUrl(value: unknown) {
  let url: URL;
  try { url = new URL(String(value ?? '')); } catch { throw new ServiceError('INVALID_IMAGE', 'Every lesson image needs a valid HTTPS address.'); }
  const hostname = url.hostname.toLowerCase();
  const privateIpv4 = /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  if (url.protocol !== 'https:' || url.username || url.password || hostname === 'localhost' || hostname.endsWith('.local') || privateIpv4) {
    throw new ServiceError('INVALID_IMAGE', 'Lesson images must use a safe public HTTPS address.');
  }
  return url.toString();
}

function sanitizeLesson(row: JsonObject) {
  const draft = row.draft as JsonObject;
  const blocks = draft.blocks;
  if (!Array.isArray(blocks)) throw new ServiceError('INVALID_LESSON', 'Every lesson needs structured content.');
  const allowed = new Set(['heading', 'paragraph', 'callout', 'example', 'image', 'topology']);
  const safeBlocks = blocks.map((value, index) => {
    assertObject(value, `Lesson block ${index + 1}`);
    const type = String(value.type ?? '');
    if (!allowed.has(type)) throw new ServiceError('INVALID_LESSON', `Lesson block ${index + 1} uses an unsupported content type.`);
    const base = { id: requiredText(value.id, `Lesson block ${index + 1} code`, 100), type };
    if (type === 'image') return { ...base, imageUrl: safePublicImageUrl(value.imageUrl), altText: requiredText(value.altText, `Lesson image ${index + 1} alternative text`, 500) };
    if (type === 'topology') return { ...base, topologyId: requiredText(value.topologyId, `Lesson topology ${index + 1}`, 100) };
    return { ...base, title: value.title ? String(value.title).slice(0, 120) : undefined, text: requiredText(value.text, `Lesson block ${index + 1}`, 12000) };
  });
  return {
    id: String(row.stable_id),
    title: requiredText(draft.title, 'Lesson title', 160),
    summary: String(draft.summary ?? '').trim().slice(0, 500),
    order: Number(row.position),
    blocks: safeBlocks,
  };
}

function optionalIpv4(value: unknown, label: string) {
  if (value == null || value === '') return undefined;
  const text = String(value);
  if (!/^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(text)) throw new ServiceError('INVALID_TOPOLOGY', `${label} is not a valid IPv4 address.`);
  return text;
}

function optionalIpv4Network(value: unknown, label: string) {
  if (value == null || value === '') return undefined;
  const [address, prefix, extra] = String(value).split('/');
  const parsedPrefix = Number(prefix);
  if (extra != null || !address || optionalIpv4(address, label) == null || !Number.isInteger(parsedPrefix) || parsedPrefix < 0 || parsedPrefix > 32) {
    throw new ServiceError('INVALID_TOPOLOGY', `${label} must use network and prefix notation such as 192.168.10.0/24.`);
  }
  return `${address}/${parsedPrefix}`;
}

function sanitizeTopology(row: JsonObject) {
  const definition = row.definition as JsonObject;
  const rawDevices = definition.devices;
  const rawLinks = definition.links;
  if (!Array.isArray(rawDevices) || !Array.isArray(rawLinks) || rawDevices.length > 12) throw new ServiceError('INVALID_TOPOLOGY', 'A topology must contain no more than 12 valid devices.');
  const deviceIds = new Set<string>(); const names = new Set<string>(); const endpoints = new Set<string>();
  const devices = rawDevices.map((value, index) => {
    assertObject(value, `Topology device ${index + 1}`);
    const id = requiredText(value.id, `Topology device ${index + 1} code`, 100);
    const name = requiredText(value.name, `Topology device ${index + 1} name`, 40);
    const type = String(value.type);
    if (deviceIds.has(id) || names.has(name.toLowerCase()) || !['pc', 'switch', 'router', 'server'].includes(type)) throw new ServiceError('INVALID_TOPOLOGY', 'Topology device codes and names must be unique, and device types must be supported.');
    deviceIds.add(id); names.add(name.toLowerCase());
    const x = Number(value.x); const y = Number(value.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) throw new ServiceError('INVALID_TOPOLOGY', `${name} must remain inside the topology canvas.`);
    if (!Array.isArray(value.interfaces)) throw new ServiceError('INVALID_TOPOLOGY', `${name} needs an interface list.`);
    const interfaceIds = new Set<string>();
    const interfaces = value.interfaces.map((rawInterface, interfaceIndex) => {
      assertObject(rawInterface, `${name} interface ${interfaceIndex + 1}`);
      const interfaceId = requiredText(rawInterface.id, `${name} interface code`, 40);
      if (interfaceIds.has(interfaceId)) throw new ServiceError('INVALID_TOPOLOGY', `${name} has a repeated interface code.`);
      interfaceIds.add(interfaceId); endpoints.add(`${id}:${interfaceId}`);
      const prefix = rawInterface.prefix == null ? undefined : Number(rawInterface.prefix);
      const vlan = rawInterface.vlan == null ? undefined : Number(rawInterface.vlan);
      if (prefix != null && (!Number.isInteger(prefix) || prefix < 0 || prefix > 32)) throw new ServiceError('INVALID_TOPOLOGY', `${name} has an invalid IPv4 prefix.`);
      if (vlan != null && (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094)) throw new ServiceError('INVALID_TOPOLOGY', `${name} has an invalid VLAN.`);
      return { id: interfaceId, name: requiredText(rawInterface.name, `${name} interface name`, 40), ipv4Address: optionalIpv4(rawInterface.ipv4Address, `${name} address`), prefix, gateway: optionalIpv4(rawInterface.gateway, `${name} gateway`), vlan, state: rawInterface.state === 'down' ? 'down' : 'up' };
    });
    const routes = Array.isArray(value.routes) ? value.routes.map((route, routeIndex) => { assertObject(route, `${name} route ${routeIndex + 1}`); const prefix = Number(route.prefix); if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new ServiceError('INVALID_TOPOLOGY', `${name} has an invalid route prefix.`); return { destination: optionalIpv4(route.destination, `${name} route destination`)!, prefix, nextHop: optionalIpv4(route.nextHop, `${name} route next hop`)! }; }) : [];
    return { id, type, name, x, y, interfaces, routes, notes: value.notes ? String(value.notes).slice(0, 1000) : undefined };
  });
  const usedEndpoints = new Set<string>();
  const links = rawLinks.map((value, index) => {
    assertObject(value, `Topology connection ${index + 1}`);
    const fromDeviceId = String(value.fromDeviceId ?? ''); const fromInterfaceId = String(value.fromInterfaceId ?? ''); const toDeviceId = String(value.toDeviceId ?? ''); const toInterfaceId = String(value.toInterfaceId ?? '');
    const from = `${fromDeviceId}:${fromInterfaceId}`; const to = `${toDeviceId}:${toInterfaceId}`;
    if (!endpoints.has(from) || !endpoints.has(to) || from === to || usedEndpoints.has(from) || usedEndpoints.has(to)) throw new ServiceError('INVALID_TOPOLOGY', `Topology connection ${index + 1} has a missing or reused endpoint.`);
    usedEndpoints.add(from); usedEndpoints.add(to);
    const accessVlan = value.accessVlan == null ? undefined : Number(value.accessVlan);
    const trunkVlans = Array.isArray(value.trunkVlans) ? value.trunkVlans.map(Number) : undefined;
    if (accessVlan != null && (!Number.isInteger(accessVlan) || accessVlan < 1 || accessVlan > 4094)) throw new ServiceError('INVALID_TOPOLOGY', `Topology connection ${index + 1} has an invalid access VLAN.`);
    if (trunkVlans?.some((vlan) => !Number.isInteger(vlan) || vlan < 1 || vlan > 4094)) throw new ServiceError('INVALID_TOPOLOGY', `Topology connection ${index + 1} has an invalid trunk VLAN.`);
    return { id: requiredText(value.id, `Topology connection ${index + 1} code`, 100), fromDeviceId, fromInterfaceId, toDeviceId, toInterfaceId, label: value.label ? String(value.label).slice(0, 100) : undefined, network: optionalIpv4Network(value.network, `Topology connection ${index + 1} network`), accessVlan, trunkVlans, state: value.state === 'down' ? 'down' : 'up' };
  });
  return { id: String(row.stable_id), title: requiredText(definition.title, 'Topology title', 160), accessibilityDescription: requiredText(definition.accessibilityDescription, 'Topology accessibility description', 1000), devices, links };
}

function sanitizeGradedSettings(value: unknown) {
  assertObject(value, 'Graded assessment settings');
  const maximumAttempts = Number(value.maximumAttempts); const passingPercentage = Number(value.passingPercentage);
  const gradePolicy = String(value.gradePolicy); const feedbackRelease = String(value.feedbackRelease);
  if (!Number.isInteger(maximumAttempts) || maximumAttempts < 1 || maximumAttempts > 20 || !Number.isFinite(passingPercentage) || passingPercentage < 0 || passingPercentage > 100 || !['highest', 'latest', 'first'].includes(gradePolicy) || !['immediate', 'final-attempt', 'due-date'].includes(feedbackRelease)) throw new ServiceError('INVALID_ASSESSMENT', 'Correct the graded assessment rules before publishing.');
  const opensAt = value.opensAt ? new Date(String(value.opensAt)) : undefined; const dueAt = value.dueAt ? new Date(String(value.dueAt)) : undefined;
  if (opensAt && Number.isNaN(opensAt.valueOf()) || dueAt && Number.isNaN(dueAt.valueOf()) || opensAt && dueAt && dueAt <= opensAt || feedbackRelease === 'due-date' && !dueAt) throw new ServiceError('INVALID_ASSESSMENT', 'Correct the assessment opening, due date, and result-release settings.');
  return { opensAt: opensAt?.toISOString(), dueAt: dueAt?.toISOString(), maximumAttempts, gradePolicy, passingPercentage, feedbackRelease, shuffleQuestions: Boolean(value.shuffleQuestions), shuffleAnswers: Boolean(value.shuffleAnswers) };
}

function publicAssessment(row: JsonObject) {
  const draft = row.draft as JsonObject;
  const mode = String(row.mode);
  const questions = (draft.questions as JsonObject[]).map((question) => {
    const base = {
      id: String(question.id),
      lessonId: question.lessonId ? String(question.lessonId) : undefined,
      prompt: String(question.prompt),
      choices: (question.choices as JsonObject[]).map((choice) => ({ id: requiredText(choice.id, 'Answer choice code', 100), label: requiredText(choice.label, 'Answer choice', 1000) })),
      explanation: mode === 'practice' && question.explanation ? String(question.explanation).slice(0, 2000) : undefined,
    };
    return mode === 'practice' ? { ...base, correctChoiceId: String(question.correctChoiceId) } : base;
  });
  return {
    id: String(row.stable_id),
    title: String(row.title),
    mode,
    instructions: String(draft.instructions ?? ''),
    questions,
    settings: mode === 'graded' ? sanitizeGradedSettings(row.settings) : undefined,
  };
}

function answerKey(row: JsonObject) {
  const draft = row.draft as JsonObject;
  return Object.fromEntries((draft.questions as JsonObject[]).map((question) => [String(question.id), String(question.correctChoiceId)]));
}

async function checksum(value: unknown) {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function publishWorkshop(request: Request, body: JsonObject, id: string) {
  const user = await requireInstructor(request);
  const workshopId = String(body.workshopId ?? '');
  const publishRequestId = String(body.requestId ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(publishRequestId)) throw new ServiceError('INVALID_REQUEST', 'Start a new publish request and try again.');
  const workshop = await requireOwnedWorkshop(user.id, workshopId);
  if (workshop.archived) throw new ServiceError('WORKSHOP_ARCHIVED', 'Restore the workshop before publishing it.');
  const db = adminClient();
  const [lessonResult, topologyResult, assessmentResult, flashcardResult, profileResult, versionResult] = await Promise.all([
    db.from('workshop_lessons').select('stable_id,position,draft').eq('workshop_id', workshopId).eq('archived', false).order('position'),
    db.from('workshop_topologies').select('stable_id,definition').eq('workshop_id', workshopId).order('stable_id'),
    db.from('workshop_assessments').select('stable_id,title,mode,draft,settings').eq('workshop_id', workshopId).eq('archived', false).order('stable_id'),
    db.from('workshop_flashcards').select('stable_id,lesson_stable_id,position,draft').eq('workshop_id', workshopId).eq('archived', false).order('position'),
    db.from('profiles').select('display_name').eq('id', user.id).maybeSingle(),
    db.from('workshop_versions').select('version').eq('workshop_id', workshopId).order('version', { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [lessonResult, topologyResult, assessmentResult, flashcardResult]) {
    if (result.error) throw result.error;
  }
  const lessons = (lessonResult.data ?? []).map((row) => sanitizeLesson(row as unknown as JsonObject));
  if (!lessons.length) throw new ServiceError('LESSON_REQUIRED', 'Add at least one lesson before publishing.');
  const lessonIds = new Set(lessons.map((lesson) => String(lesson.id)));
  const topologies = (topologyResult.data ?? []).map((row) => sanitizeTopology(row as unknown as JsonObject));
  const topologyIds = new Set(topologies.map((topology) => topology.id));
  for (const lesson of lessons) for (const block of lesson.blocks) {
    if (block.type === 'topology' && 'topologyId' in block && !topologyIds.has(String(block.topologyId))) throw new ServiceError('INVALID_LESSON', `${lesson.title} refers to a topology that is not available.`);
  }
  const assessments = (assessmentResult.data ?? []) as unknown as JsonObject[];
  for (const assessment of assessments) {
    assertObject(assessment.draft, String(assessment.title));
    assertQuestions((assessment.draft as JsonObject).questions, String(assessment.title));
  }
  const version = Number(versionResult.data?.version ?? 0) + 1;
  const versionId = crypto.randomUUID();
  const packageValue = {
    workshopId,
    versionId,
    version,
    title: workshop.title,
    description: workshop.description,
    instructorName: profileResult.data?.display_name || user.email?.split('@')[0] || 'NetBite instructor',
    publishedAt: new Date().toISOString(),
    archived: false,
    lessons,
    topologies,
    flashcards: (flashcardResult.data ?? []).filter((row) => lessonIds.has(row.lesson_stable_id)).map((row) => {
      const draft = row.draft as JsonObject;
      return { id: row.stable_id, lessonId: row.lesson_stable_id, question: requiredText(draft.question, 'Flashcard question', 2000), answer: requiredText(draft.answer, 'Flashcard answer', 4000), explanation: draft.explanation ? String(draft.explanation).slice(0, 4000) : undefined };
    }),
    assessments: assessments.map(publicAssessment),
  };
  const packageChecksum = await checksum(packageValue);
  const protectedRows = assessments.filter((row) => row.mode === 'graded').map((row) => ({
    assessmentId: row.stable_id,
    answerKey: answerKey(row),
    explanations: Object.fromEntries((((row.draft as JsonObject).questions as JsonObject[]) ?? []).map((question) => [String(question.id), String(question.explanation ?? '')])),
  }));
  const { data: published, error: publishError } = await db.rpc('publish_workshop_release', {
    p_actor_id: user.id,
    p_request_id: publishRequestId,
    p_workshop_id: workshopId,
    p_version_id: versionId,
    p_version: version,
    p_manifest: { workshopId, versionId, version, publishedAt: packageValue.publishedAt },
    p_package: packageValue,
    p_checksum: packageChecksum,
    p_answer_keys: protectedRows,
  });
  if (publishError) throw publishError;
  return adminJson(request, { ...published, requestId: id });
}

async function createClass(request: Request, body: JsonObject) {
  const user = await requireInstructor(request);
  const workshopId = String(body.workshopId ?? '');
  const workshop = await requireOwnedWorkshop(user.id, workshopId);
  if (!workshop.current_version_id) throw new ServiceError('PUBLISH_REQUIRED', 'Publish the workshop before creating a class.');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const joinCode = Array.from(bytes).map((byte) => alphabet[byte % alphabet.length]).join('');
  const title = String(body.title ?? '').trim();
  if (title.length < 3 || title.length > 120) throw new ServiceError('INVALID_CLASS_TITLE', 'Enter a class name between 3 and 120 characters.');
  const { data, error } = await adminClient().from('workshop_classes').insert({
    workshop_id: workshopId,
    version_id: workshop.current_version_id,
    instructor_id: user.id,
    title,
    join_code: joinCode,
  }).select('id,title,join_code,version_id').single();
  if (error) throw error;
  return adminJson(request, { classId: data.id, title: data.title, joinCode: data.join_code, versionId: data.version_id });
}

function shouldReleaseFeedback(settings: JsonObject, attemptNumber: number, submittedAt: Date) {
  const release = String(settings.feedbackRelease ?? 'final-attempt');
  if (release === 'immediate') return true;
  if (release === 'final-attempt') return attemptNumber >= Number(settings.maximumAttempts ?? 1);
  const dueAt = settings.dueAt ? new Date(String(settings.dueAt)) : undefined;
  return Boolean(dueAt && submittedAt >= dueAt);
}

async function submitAssessment(request: Request, body: JsonObject) {
  const user = await signedInUser(request);
  const classId = String(body.classId ?? '');
  const assessmentId = String(body.assessmentId ?? '');
  const requestKey = String(body.requestId ?? '');
  const answers = body.answers;
  if (!/^[0-9a-f-]{36}$/i.test(requestKey)) throw new ServiceError('INVALID_REQUEST', 'The submission could not be identified. Try again.');
  assertObject(answers, 'Answers');
  const db = adminClient();
  const { data: enrollment } = await db.from('workshop_enrollments').select('class_id').eq('class_id', classId).eq('student_id', user.id).is('left_at', null).maybeSingle();
  if (!enrollment) throw new ServiceError('ENROLLMENT_REQUIRED', 'Join this class before submitting an assessment.', 403);
  const { data: classRow } = await db.from('workshop_classes').select('version_id,archived').eq('id', classId).maybeSingle();
  if (!classRow) throw new ServiceError('CLASS_NOT_FOUND', 'The class was not found.', 404);
  const { data: versionRow } = await db.from('workshop_versions').select('package').eq('id', classRow.version_id).single();
  const assessment = ((versionRow?.package as JsonObject)?.assessments as JsonObject[] | undefined)?.find((item) => item.id === assessmentId);
  if (!assessment || assessment.mode !== 'graded') throw new ServiceError('ASSESSMENT_NOT_FOUND', 'The graded assessment was not found.', 404);
  const settings = assessment.settings as JsonObject;
  const now = new Date();
  if (settings.opensAt && now < new Date(String(settings.opensAt))) throw new ServiceError('ASSESSMENT_NOT_OPEN', 'This assessment is not open yet.');
  const maximumAttempts = Number(settings.maximumAttempts ?? 1);
  if (!Number.isInteger(maximumAttempts) || maximumAttempts < 1 || maximumAttempts > 20) throw new ServiceError('INVALID_SETTINGS', 'The instructor must correct this assessment before it can be submitted.');
  const { data: keyRow } = await db.from('workshop_assessment_keys').select('answer_key,explanations').eq('version_id', classRow.version_id).eq('assessment_id', assessmentId).single();
  if (!keyRow) throw new ServiceError('ASSESSMENT_NOT_READY', 'The instructor must republish this assessment before it can accept submissions.');
  const key = keyRow.answer_key as Record<string, string>;
  const questionIds = Object.keys(key);
  if (Object.keys(answers).length !== questionIds.length || Object.keys(answers).some((questionId) => !questionIds.includes(questionId))) throw new ServiceError('INVALID_ANSWERS', 'Answer every question in this assessment version before submitting.');
  const score = questionIds.filter((questionId) => answers[questionId] === key[questionId]).length;
  const total = questionIds.length;
  const percentage = Math.round((score / total) * 10000) / 100;
  const late = Boolean(settings.dueAt && now > new Date(String(settings.dueAt)));
  const policy = String(settings.gradePolicy ?? 'highest');
  const { data: inserted, error } = await db.rpc('record_workshop_submission', {
    p_request_id: requestKey,
    p_student_id: user.id,
    p_class_id: classId,
    p_version_id: classRow.version_id,
    p_assessment_id: assessmentId,
    p_answers: answers,
    p_score: score,
    p_total: total,
    p_percentage: percentage,
    p_passed: percentage >= Number(settings.passingPercentage ?? 80),
    p_late: late,
    p_maximum_attempts: maximumAttempts,
    p_grade_policy: policy,
    p_submitted_at: now.toISOString(),
  });
  if (error) {
    if (error.message.includes('ATTEMPT_LIMIT')) throw new ServiceError('ATTEMPT_LIMIT', 'You have used every available attempt.');
    if (error.message.includes('ENROLLMENT_REQUIRED')) throw new ServiceError('ENROLLMENT_REQUIRED', 'Join this class before submitting an assessment.', 403);
    throw error;
  }
  const attempt = inserted as JsonObject;
  const feedbackReleased = shouldReleaseFeedback(settings, Number(attempt.attempt_number), now);
  return adminJson(request, formatSubmission(attempt, feedbackReleased, feedbackReleased ? key : undefined, feedbackReleased ? keyRow.explanations : undefined));
}

async function assessmentStatus(request: Request, body: JsonObject) {
  const user = await signedInUser(request);
  const classId = String(body.classId ?? '');
  const assessmentId = String(body.assessmentId ?? '');
  const db = adminClient();
  const { data: enrollment } = await db.from('workshop_enrollments').select('class_id').eq('class_id', classId).eq('student_id', user.id).is('left_at', null).maybeSingle();
  if (!enrollment) throw new ServiceError('ENROLLMENT_REQUIRED', 'Join this class before viewing assessment results.', 403);
  const { data: classRow } = await db.from('workshop_classes').select('version_id').eq('id', classId).single();
  if (!classRow) throw new ServiceError('CLASS_NOT_FOUND', 'The class was not found.', 404);
  const { data: versionRow } = await db.from('workshop_versions').select('package').eq('id', classRow.version_id).single();
  if (!versionRow) throw new ServiceError('ASSESSMENT_NOT_FOUND', 'The workshop version was not found.', 404);
  const assessment = (((versionRow.package as JsonObject).assessments as JsonObject[]) ?? []).find((item) => item.id === assessmentId && item.mode === 'graded');
  if (!assessment) throw new ServiceError('ASSESSMENT_NOT_FOUND', 'The graded assessment was not found.', 404);
  const { data: attempt } = await db.from('workshop_attempts').select('*').eq('class_id', classId).eq('assessment_id', assessmentId).eq('student_id', user.id).order('attempt_number', { ascending: false }).limit(1).maybeSingle();
  if (!attempt) return adminJson(request, { submitted: false });
  const settings = assessment.settings as JsonObject;
  const feedbackReleased = shouldReleaseFeedback(settings, Number(attempt.attempt_number), new Date());
  const { data: keyRow } = feedbackReleased
    ? await db.from('workshop_assessment_keys').select('answer_key,explanations').eq('version_id', classRow.version_id).eq('assessment_id', assessmentId).single()
    : { data: undefined };
  return adminJson(request, { submitted: true, result: formatSubmission(attempt, feedbackReleased, feedbackReleased ? keyRow?.answer_key : undefined, feedbackReleased ? keyRow?.explanations : undefined) });
}

function formatSubmission(row: JsonObject, feedbackReleased: boolean, key?: Record<string, string>, explanations?: Record<string, string>) {
  return {
    attemptId: row.id,
    assessmentId: row.assessment_id,
    attemptNumber: row.attempt_number,
    submittedAt: row.submitted_at,
    late: row.late,
    score: row.score,
    total: row.total,
    percentage: row.percentage,
    passed: row.passed,
    feedbackReleased,
    answers: key ? Object.entries(key).map(([questionId, correctChoiceId]) => ({ questionId, correctChoiceId, explanation: explanations?.[questionId] })) : undefined,
  };
}

async function gradebook(request: Request, body: JsonObject) {
  const user = await requireInstructor(request);
  const classId = String(body.classId ?? '');
  const { data: classRow } = await adminClient().from('workshop_classes').select('id,workshop_id,version_id').eq('id', classId).eq('instructor_id', user.id).maybeSingle();
  if (!classRow) throw new ServiceError('CLASS_NOT_FOUND', 'The class was not found.', 404);
  const db = adminClient();
  const [{ data: enrollments }, { data: grades }, { data: attempts }, { data: version }] = await Promise.all([
    db.from('workshop_enrollments').select('student_id,joined_at').eq('class_id', classId).is('left_at', null),
    db.from('workshop_grades').select('*').eq('class_id', classId),
    db.from('workshop_attempts').select('student_id,assessment_id,submitted_at,late').eq('class_id', classId),
    db.from('workshop_versions').select('package').eq('id', classRow.version_id).single(),
  ]);
  const students = (enrollments ?? []).map((entry) => entry.student_id);
  const { data: profiles } = students.length ? await db.from('profiles').select('id,display_name').in('id', students) : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name || 'Student']));
  const assessments = (((version?.package as JsonObject)?.assessments as JsonObject[]) ?? []).filter((item) => item.mode === 'graded');
  const rows = students.flatMap((studentId) => assessments.map((assessment) => {
    const grade = (grades ?? []).find((item) => item.student_id === studentId && item.assessment_id === assessment.id);
    const matchingAttempts = (attempts ?? []).filter((item) => item.student_id === studentId && item.assessment_id === assessment.id);
    const latest = matchingAttempts.sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at))[0];
    const passing = Number((assessment.settings as JsonObject)?.passingPercentage ?? 80);
    return {
      studentId,
      studentName: names.get(studentId) || 'Student',
      assessmentId: String(assessment.id),
      assessmentTitle: String(assessment.title),
      recordedScore: grade?.recorded_score,
      total: grade?.total ?? (assessment.questions as unknown[])?.length ?? 0,
      percentage: grade?.percentage == null ? undefined : Number(grade.percentage),
      attempts: matchingAttempts.length,
      submittedAt: latest?.submitted_at,
      status: !grade ? 'missing' : latest?.late ? 'late' : Number(grade.percentage) >= passing ? 'passed' : 'needs-review',
    };
  }));
  return adminJson(request, { rows });
}

Deno.serve(async (request) => {
  const preflight = adminPreflight(request);
  if (preflight) return preflight;
  const id = requestId();
  if (request.method !== 'POST') return adminJson(request, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST.', requestId: id } }, 405);
  try {
    const body = await request.json() as JsonObject;
    switch (body.action) {
      case 'publish': return await publishWorkshop(request, body, id);
      case 'create-class': return await createClass(request, body);
      case 'submit': return await submitAssessment(request, body);
      case 'assessment-status': return await assessmentStatus(request, body);
      case 'gradebook': return await gradebook(request, body);
      default: throw new ServiceError('UNKNOWN_ACTION', 'Choose a supported workshop action.');
    }
  } catch (error) {
    return safeError(request, error, id);
  }
});
