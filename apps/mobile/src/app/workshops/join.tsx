import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, StyleSheet, TextInput, View } from "react-native";

import { prepareWorkshopLibraryAssets } from "@/core/workshops/workshop-assets";
import { fetchWorkshopLibrary, joinWorkshopClass } from "@/core/workshops/workshop-service";
import { useAuth } from "@/features/account/auth-context";
import { extractWorkshopClassCode, normalizeWorkshopClassCode } from "@/features/workshops/class-join-code";
import { AppButton } from "@/shared/components/app-button";
import { Text } from "@/shared/components/console-text";
import { IconButton } from "@/shared/components/icon-button";
import { PageHeader } from "@/shared/components/page-header";
import { Screen } from "@/shared/components/screen";
import { AppRoutes, workshopRoute } from "@/shared/routes";
import { Fonts, Palette, Space } from "@/shared/theme";
import { useWorkshopStore } from "@/store/use-workshop-store";

export default function JoinClassScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = typeof params.code === "string" ? normalizeWorkshopClassCode(params.code) : "";
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const [scanPaused, setScanPaused] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { status } = useAuth();
  const replaceLibrary = useWorkshopStore((state) => state.replaceLibrary);
  const assetUris = useWorkshopStore((state) => state.assetUris);

  const join = async (candidate = code) => {
    const classCode = normalizeWorkshopClassCode(candidate);
    if (classCode.length < 6) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await joinWorkshopClass(classCode);
      const library = await fetchWorkshopLibrary();
      const assets = await prepareWorkshopLibraryAssets(library, assetUris);
      replaceLibrary(library, assets);
      router.replace(workshopRoute(result.classId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The class could not be joined.");
    } finally {
      setBusy(false);
    }
  };

  const openScanner = async () => {
    setError(undefined);
    setScanPaused(false);
    if (permission?.granted) {
      setScanning(true);
      return;
    }
    const nextPermission = await requestPermission();
    if (nextPermission.granted) {
      setScanning(true);
      return;
    }
    setError("Camera access is needed to scan a class invitation. You can still enter the code manually.");
  };

  const handleBarcode = ({ data }: BarcodeScanningResult) => {
    const scannedCode = extractWorkshopClassCode(data);
    if (!scannedCode) {
      setScanPaused(true);
      setError("This QR code is not a NetBite class invitation.");
      return;
    }
    setCode(scannedCode);
    setScanning(false);
    setScanPaused(false);
    setError(undefined);
    if (status === "authenticated") void join(scannedCode);
  };

  return (
    <Screen header={<PageHeader leading={{ accessibilityLabel: "Back to My Classes", icon: "arrow-left", label: "BACK / CLASSES", onPress: () => router.replace(AppRoutes.workshops) }} />}>
      <Text variant="label" style={styles.eyebrow}>PRIVATE CLASS</Text>
      <Text variant="screenTitle">JOIN A CLASS</Text>
      <Text variant="body" style={styles.copy}>
        Enter the code shown by your instructor or scan the invitation QR code. NetBite will download the class’s published lessons for offline study.
      </Text>

      {scanning ? (
        <View style={styles.panel}>
          <View style={styles.scannerHeading}>
            <View style={styles.scannerTitle}>
              <Text variant="label" style={styles.eyebrow}>CAMERA</Text>
              <Text variant="sectionHeading">SCAN CLASS INVITATION</Text>
            </View>
            <IconButton accessibilityLabel="Close QR scanner" icon="close" onPress={() => { setScanning(false); setScanPaused(false); setError(undefined); }} />
          </View>
          <View style={styles.cameraFrame}>
            <CameraView barcodeScannerSettings={{ barcodeTypes: ["qr"] }} facing="back" onBarcodeScanned={scanPaused || busy ? undefined : handleBarcode} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.scanTarget} />
          </View>
          <Text variant="bodySmall" style={styles.hint}>
            Center the instructor’s QR code inside the frame. Joining begins automatically after a valid invitation is detected.
          </Text>
          {error ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.error}>{error}</Text> : null}
          {scanPaused ? <AppButton label="Scan again" onPress={() => { setError(undefined); setScanPaused(false); }} variant="secondary" /> : null}
        </View>
      ) : (
        <View style={styles.panel}>
          <View style={styles.methodHeading}>
            <Text variant="label" style={styles.eyebrow}>ENTER CODE</Text>
            <Text variant="bodySmall" style={styles.hint}>Use the 6–10 character code below, or scan the instructor’s QR invitation.</Text>
          </View>
          <TextInput
            accessibilityLabel="Class code"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            onChangeText={(value) => setCode(normalizeWorkshopClassCode(value))}
            onSubmitEditing={() => { if (status === "authenticated" && code.length >= 6) void join(); }}
            placeholder="ABC234XY"
            placeholderTextColor={Palette.textMuted}
            returnKeyType="join"
            style={styles.input}
            value={code}
          />
          {status === "authenticated" ? (
            <AppButton disabled={busy || code.length < 6} label={busy ? "Joining class" : "Join class"} loading={busy} onPress={() => void join()} />
          ) : (
            <>
              <Text variant="bodySmall" style={styles.hint}>Sign in first so NetBite can connect this class and graded work to the correct student.</Text>
              <AppButton label="Sign in to continue" onPress={() => router.push({ pathname: "/auth", params: { returnTo: "/workshops/join", code } })} />
            </>
          )}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text variant="technical" style={styles.dividerLabel}>OR</Text>
            <View style={styles.divider} />
          </View>
          <AppButton accessibilityHint="Opens the camera to scan an instructor invitation" label="Scan instructor QR code" onPress={() => void openScanner()} variant="secondary" />
          {permission && !permission.granted && !permission.canAskAgain ? <AppButton label="Open camera settings" onPress={() => void Linking.openSettings()} variant="utility" /> : null}
          {error ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.error}>{error}</Text> : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: Palette.orange },
  copy: { color: Palette.textMuted, marginVertical: Space.md },
  panel: { gap: Space.md, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg },
  methodHeading: { gap: Space.xs },
  input: { minHeight: 56, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background, paddingHorizontal: Space.md, color: Palette.white, fontFamily: Fonts.semibold, fontSize: 18, letterSpacing: 3 },
  hint: { color: Palette.textMuted },
  error: { color: Palette.danger },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: Space.sm },
  divider: { height: 1, flex: 1, backgroundColor: Palette.border },
  dividerLabel: { color: Palette.textMuted },
  scannerHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: Space.md },
  scannerTitle: { minWidth: 0, flex: 1, gap: Space.xs },
  cameraFrame: { height: 320, overflow: "hidden", borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background },
  scanTarget: { position: "absolute", width: 220, height: 220, alignSelf: "center", top: 50, borderWidth: 2, borderColor: Palette.orange, backgroundColor: "transparent" },
});
