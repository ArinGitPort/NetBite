import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { fetchInstructorRequest, requestInstructorAccess } from '@/core/workshops/workshop-service';
import { useAuth } from '@/features/account/auth-context';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { PageHeader } from '@/shared/components/page-header';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';

type RequestStatus = Awaited<ReturnType<typeof fetchInstructorRequest>>;

export default function InstructorRequestScreen() {
  const { profile, accountRole } = useAuth(); const [name, setName] = useState(profile?.displayName ?? ''); const [institution, setInstitution] = useState(''); const [reason, setReason] = useState(''); const [request, setRequest] = useState<RequestStatus>(); const [loading, setLoading] = useState(false); const [message, setMessage] = useState<string>();
  const load = useCallback(async () => { try { const row = await fetchInstructorRequest(); setRequest(row); if (row) { setName(row.display_name); setInstitution(row.institution); setReason(row.reason); } } catch { setMessage('Instructor access status could not be checked right now.'); } }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  const submit = async () => { setLoading(true); setMessage(undefined); try { await requestInstructorAccess(name, institution, reason); await load(); setMessage('Request submitted. An administrator must approve it before instructor tools appear.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'The request could not be submitted.'); } finally { setLoading(false); } };
  if (accountRole === 'instructor') return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to My Classes', icon: 'arrow-left', label: 'BACK / CLASSES', onPress: () => router.replace(AppRoutes.workshops) }} />}><Text variant="screenTitle">INSTRUCTOR ACCESS ACTIVE</Text><Text variant="body">This account can already create workshops on the instructor website and monitor classes from Android.</Text><AppButton label="Open instructor tools" onPress={() => router.replace(AppRoutes.instructor)} /></Screen>;
  return <Screen header={<PageHeader leading={{ accessibilityLabel: 'Back to My Classes', icon: 'arrow-left', label: 'BACK / CLASSES', onPress: () => router.replace(AppRoutes.workshops) }} status={request?.status?.toUpperCase() ?? 'NOT SUBMITTED'} />}>
    <Text variant="label" style={styles.eyebrow}>VERIFIED TEACHING ACCOUNT</Text><Text variant="screenTitle">REQUEST INSTRUCTOR ACCESS</Text><Text variant="body" style={styles.copy}>Instructor access is reviewed manually. It allows private workshop authoring but does not grant control over NetBite’s official curriculum.</Text>
    {request ? <View style={styles.status}><Text variant="label">CURRENT STATUS / {request.status.toUpperCase()}</Text><Text variant="bodySmall">Submitted {new Date(request.requested_at).toLocaleString()}</Text>{request.status === 'pending' ? <Text variant="bodySmall">You may update the information below while the request is waiting for review.</Text> : null}</View> : null}
    <View style={styles.form}><Field label="Display name" value={name} onChangeText={setName} /><Field label="School or institution" value={institution} onChangeText={setInstitution} /><Text variant="label">HOW WILL YOU USE WORKSHOPS?</Text><TextInput accessibilityLabel="How you will use workshops" multiline onChangeText={setReason} placeholder="Briefly describe the class or learners you support." placeholderTextColor={Palette.textMuted} style={[styles.input, styles.textarea]} value={reason} /><AppButton label={loading ? 'Submitting request' : request ? 'Update request' : 'Submit request'} loading={loading} disabled={loading || name.trim().length < 2 || institution.trim().length < 2} onPress={() => void submit()} />{message ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.message}>{message}</Text> : null}</View>
  </Screen>;
}
function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) { return <><Text variant="label">{label.toUpperCase()}</Text><TextInput accessibilityLabel={label} onChangeText={onChangeText} placeholderTextColor={Palette.textMuted} style={styles.input} value={value} /></>; }
const styles = StyleSheet.create({ eyebrow: { color: Palette.orange }, copy: { color: Palette.textMuted, marginVertical: Space.md }, status: { gap: Space.sm, borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft, padding: Space.md }, form: { gap: Space.sm, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, marginTop: Space.lg }, input: { minHeight: 48, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background, paddingHorizontal: Space.md, color: Palette.white, fontFamily: Fonts.regular }, textarea: { minHeight: 110, paddingTop: Space.md, textAlignVertical: 'top' }, message: { color: Palette.orange, marginTop: Space.sm } });
