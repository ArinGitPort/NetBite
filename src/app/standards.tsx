import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { fetchRfcMetadata, RFC_REFERENCES, RfcRequestError, type RfcCacheEntry, type RfcReference } from '@/core/standards/ietf-api';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { DisclosureSection } from '@/shared/components/disclosure-section';
import { IconButton } from '@/shared/components/icon-button';
import { Screen } from '@/shared/components/screen';
import { AppRoutes } from '@/shared/routes';
import { Fonts, Palette, Space } from '@/shared/theme';
import { useStandardsStore } from '@/store/use-standards-store';

const INITIAL_REFERENCE = RFC_REFERENCES.find((reference) => reference.id === 'rfc826') ?? RFC_REFERENCES[0];

export default function NetworkStandardsScreen() {
  const cacheMetadata = useStandardsStore((state) => state.cacheMetadata);
  const getCachedMetadata = useStandardsStore((state) => state.getCachedMetadata);
  const [selected, setSelected] = useState<RfcReference>(INITIAL_REFERENCE);
  const [entry, setEntry] = useState<RfcCacheEntry | undefined>(() => getCachedMetadata(INITIAL_REFERENCE.documentName));
  const [source, setSource] = useState<'live' | 'cache' | undefined>(entry ? 'cache' : undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [linkError, setLinkError] = useState<string>();
  const initialRequestStarted = useRef(false);

  const retrieve = useCallback(async (reference: RfcReference) => {
    const cached = getCachedMetadata(reference.documentName);
    setEntry(cached);
    setSource(cached ? 'cache' : undefined);
    setError(undefined);
    setLinkError(undefined);
    setLoading(true);
    try {
      const metadata = await fetchRfcMetadata(reference.documentName);
      const nextEntry = cacheMetadata(metadata);
      setEntry(nextEntry);
      setSource('live');
    } catch (requestError) {
      const message = requestError instanceof RfcRequestError
        ? requestError.message
        : 'The official standards service could not be reached.';
      setError(cached ? `${message} Showing the last valid cached record.` : message);
      setSource(cached ? 'cache' : undefined);
    } finally {
      setLoading(false);
    }
  }, [cacheMetadata, getCachedMetadata]);

  useEffect(() => {
    if (initialRequestStarted.current) return;
    initialRequestStarted.current = true;
    void retrieve(INITIAL_REFERENCE);
  }, [retrieve]);

  const chooseReference = (reference: RfcReference) => {
    if (reference.id === selected.id && (entry || loading)) return;
    setSelected(reference);
    void retrieve(reference);
  };

  const openOfficialDocument = async () => {
    if (!entry) return;
    setLinkError(undefined);
    try {
      await Linking.openURL(entry.metadata.officialUrl);
    } catch {
      setLinkError('The official document could not be opened on this device.');
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Back to learning path" icon="arrow-left" label="LEARN" onPress={() => router.replace(AppRoutes.learningPath)} />
        <Text variant="label" style={styles.apiBadge}>OFFICIAL IETF API</Text>
      </View>

      <Text variant="label" style={styles.eyebrow}>REFERENCE TERMINAL</Text>
      <Text variant="screenTitle" style={styles.title}>NETWORK STANDARDS</Text>
      <Text variant="body" style={styles.intro}>Choose a networking topic to retrieve its official RFC metadata from the IETF Datatracker. Successful responses are saved on this device for offline reference.</Text>

      <View accessibilityLabel="Curated RFC references" accessibilityRole="list" style={styles.referenceGrid}>
        {RFC_REFERENCES.map((reference) => {
          const active = selected.id === reference.id;
          return (
            <Pressable
              key={reference.id}
              accessibilityHint={`Retrieves official metadata for ${reference.topic}`}
              accessibilityLabel={`${reference.rfcNumber}, ${reference.topic}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => chooseReference(reference)}
              style={({ pressed }) => [styles.referenceButton, active && styles.referenceButtonActive, pressed && styles.pressed]}>
              <Text variant="label" style={[styles.referenceNumber, active && styles.referenceActiveText]}>{reference.rfcNumber}</Text>
              <Text variant="technical" style={styles.referenceTopic}>{reference.topic}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.requestPanel}>
        <View style={styles.requestHeading}>
          <View style={styles.requestCopy}>
            <Text variant="label" style={styles.panelEyebrow}>HTTP GET</Text>
            <Text selectable variant="technical" style={styles.endpoint}>datatracker.ietf.org/doc/{selected.documentName}/doc.json</Text>
          </View>
          <Text variant="technical" style={[styles.sourceBadge, source === 'live' ? styles.liveBadge : styles.cacheBadge]}>{loading ? 'LOADING' : source === 'live' ? 'LIVE / VALIDATED' : source === 'cache' ? 'CACHED' : 'NOT RETRIEVED'}</Text>
        </View>
        <AppButton label={loading ? 'Retrieving metadata' : 'Refresh official data'} loading={loading} disabled={loading} onPress={() => void retrieve(selected)} />
      </View>

      {error ? (
        <View accessibilityLiveRegion="polite" style={styles.errorPanel}>
          <Text variant="label" style={styles.errorTitle}>{entry ? 'OFFLINE FALLBACK' : 'REQUEST FAILED'}</Text>
          <Text variant="bodySmall" style={styles.errorCopy}>{error}</Text>
          {!entry ? <View style={styles.actionRow}><AppButton label="Retry" onPress={() => void retrieve(selected)} /><AppButton label="Return to learning" variant="secondary" onPress={() => router.replace(AppRoutes.learningPath)} /></View> : null}
        </View>
      ) : null}

      {entry ? <RfcRecord entry={entry} source={source ?? 'cache'} onOpenOfficialDocument={() => void openOfficialDocument()} /> : loading ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingPanel}>
          <Text variant="sectionHeading">RETRIEVING {selected.rfcNumber}</Text>
          <Text variant="bodySmall" style={styles.muted}>Waiting for the IETF Datatracker. The request stops after eight seconds.</Text>
        </View>
      ) : null}
      {linkError ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.errorCopy}>{linkError}</Text> : null}

      <DisclosureSection title="API METHOD NOTE" summary="Why this integration uses GET rather than POST.">
        <Text variant="bodySmall">This feature reads public standards metadata. The IETF document endpoint is read-only, so GET is the correct request method. POST is not applicable because NetBite does not create or modify IETF records.</Text>
      </DisclosureSection>
    </Screen>
  );
}

function RfcRecord({ entry, source, onOpenOfficialDocument }: { entry: RfcCacheEntry; source: 'live' | 'cache'; onOpenOfficialDocument: () => void }) {
  const { metadata } = entry;
  const published = metadata.revisions.map((revision) => revision.published).filter(Boolean).join(', ') || 'NOT LISTED';
  const authorText = metadata.authors.length
    ? metadata.authors.map((author) => author.affiliation ? `${author.name} / ${author.affiliation}` : author.name).join(', ')
    : 'NOT LISTED';
  return (
    <View style={styles.record}>
      <View style={styles.recordHeader}>
        <View style={styles.requestCopy}>
          <Text variant="label" style={styles.panelEyebrow}>{metadata.name.toUpperCase()} / {source === 'live' ? 'OFFICIAL RESPONSE' : 'CACHED RESPONSE'}</Text>
          <Text variant="sectionHeading" style={styles.recordTitle}>{metadata.title}</Text>
        </View>
        <Text variant="technical" style={source === 'live' ? styles.liveBadge : styles.cacheBadge}>{source === 'live' ? 'LIVE' : 'CACHED'}</Text>
      </View>
      <View style={styles.fieldGrid}>
        <MetadataField label="PUBLICATION STATE" value={metadata.state} />
        <MetadataField label="STANDARD LEVEL" value={metadata.standardLevel ?? 'NOT CLASSIFIED'} />
        <MetadataField label="PAGE COUNT" value={String(metadata.pageCount)} />
        <MetadataField label="PUBLICATION HISTORY" value={published} />
        <MetadataField label="AUTHORS" value={authorText} wide />
        <MetadataField label="LAST RETRIEVED" value={formatTimestamp(entry.retrievedAt)} wide />
      </View>
      <View style={styles.abstractPanel}>
        <Text variant="label" style={styles.panelEyebrow}>ABSTRACT</Text>
        <Text selectable variant="bodySmall" style={styles.abstract}>{metadata.abstract}</Text>
      </View>
      <AppButton label="Open official RFC" variant="secondary" trailingIcon="arrow-right" onPress={onOpenOfficialDocument} />
      <DisclosureSection title="JSON RESPONSE" summary="Parsed response sample for inspection and assignment evidence.">
        <Text selectable variant="technical" style={styles.json}>{JSON.stringify(metadata.rawResponse, null, 2)}</Text>
      </DisclosureSection>
    </View>
  );
}

function MetadataField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <View style={[styles.field, wide && styles.fieldWide]}><Text variant="technical" style={styles.fieldLabel}>{label}</Text><Text selectable variant="bodySmall" style={styles.fieldValue}>{value}</Text></View>;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const styles = StyleSheet.create({
  header: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.md, marginBottom: Space.xl },
  apiBadge: { color: Palette.green },
  eyebrow: { color: Palette.orange },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs },
  intro: { color: Palette.textMuted, marginTop: Space.md, marginBottom: Space.xl },
  referenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, marginBottom: Space.xl },
  referenceButton: { minHeight: 64, minWidth: 118, flexGrow: 1, flexBasis: '30%', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, justifyContent: 'center', padding: Space.md },
  referenceButtonActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  referenceNumber: { color: Palette.text },
  referenceActiveText: { color: Palette.orange },
  referenceTopic: { color: Palette.textMuted, marginTop: Space.xs },
  pressed: { opacity: 0.72 },
  requestPanel: { borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.md, marginBottom: Space.lg },
  requestHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: Space.md },
  requestCopy: { flex: 1, minWidth: 0 },
  panelEyebrow: { color: Palette.orange },
  endpoint: { color: Palette.text, marginTop: Space.xs },
  sourceBadge: { borderWidth: 1, paddingHorizontal: Space.sm, paddingVertical: Space.xs },
  liveBadge: { color: Palette.green, borderColor: Palette.green },
  cacheBadge: { color: Palette.orange, borderColor: Palette.orange },
  errorPanel: { borderWidth: 1, borderColor: Palette.danger, backgroundColor: Palette.dangerSoft, padding: Space.lg, gap: Space.md, marginBottom: Space.lg },
  errorTitle: { color: Palette.danger },
  errorCopy: { color: Palette.orange },
  actionRow: { gap: Space.sm },
  loadingPanel: { minHeight: 140, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, justifyContent: 'center', padding: Space.xl, gap: Space.sm, marginBottom: Space.lg },
  muted: { color: Palette.textMuted },
  record: { gap: Space.lg, marginBottom: Space.lg },
  recordHeader: { borderWidth: 1, borderColor: Palette.green, backgroundColor: Palette.greenSoft, padding: Space.lg, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Space.md },
  recordTitle: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  field: { minWidth: 180, flexGrow: 1, flexBasis: '46%', borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.md },
  fieldWide: { flexBasis: '100%' },
  fieldLabel: { color: Palette.textMuted },
  fieldValue: { color: Palette.text, marginTop: Space.xs },
  abstractPanel: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg },
  abstract: { color: Palette.text, marginTop: Space.sm },
  json: { color: Palette.green, fontFamily: Fonts.mono, textTransform: 'none' },
});
