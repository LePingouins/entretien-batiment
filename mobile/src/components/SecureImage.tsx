import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { downloadSecureFileToCache } from '../lib/secureFile';
import { colors } from '../theme';

interface Props {
  downloadUrl: string;
  filename: string;
  contentType?: string | null;
  onOpenFallback: () => void;
}

/**
 * Renders an authenticated image inline (work order photo, invoice, receipt...).
 * Falls back to a tappable "open file" row when the content isn't an image or
 * the device can't decode it (e.g. an unconverted .heic on Android).
 */
export default function SecureImage({ downloadUrl, filename, contentType, onOpenFallback }: Props) {
  const isImage = !!contentType?.startsWith('image/');
  const [uri, setUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(isImage);

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    downloadSecureFileToCache(downloadUrl, filename)
      .then((localUri) => { if (!cancelled) setUri(localUri); })
      .catch(() => { if (!cancelled) setFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downloadUrl, filename, isImage]);

  if (!isImage) return null;

  if (loading) {
    return (
      <View style={[styles.box, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (failed || !uri) {
    return (
      <Pressable style={[styles.box, styles.center]} onPress={onOpenFallback}>
        <Text style={styles.fallbackText}>Aperçu indisponible — appuyez pour ouvrir le fichier</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onOpenFallback}>
      <Image
        source={{ uri }}
        style={styles.box}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 10, borderWidth: 1, height: 220, marginBottom: 10, width: '100%' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 16 },
  fallbackText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
