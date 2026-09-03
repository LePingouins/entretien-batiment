import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CircleAlert, Inbox } from 'lucide-react-native';
import { colors } from '../theme';

export function LoadingState({ label = 'Chargement...' }: { label?: string }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.container}>
      <CircleAlert size={34} color={colors.red} />
      <Text style={styles.title}>Impossible de charger</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} onPress={onRetry}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.container}>
      <Inbox size={34} color={colors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    textAlign: 'center',
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 7,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});