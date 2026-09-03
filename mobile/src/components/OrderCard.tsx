import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, MapPin } from 'lucide-react-native';
import type { UrgentWorkOrder, WorkOrder, WorkOrderPriority, WorkOrderStatus } from '../types/api';
import { colors } from '../theme';

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: 'Ouvert',
  ASSIGNED: 'Assigné',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  OPEN: colors.blue,
  ASSIGNED: colors.teal,
  IN_PROGRESS: colors.amber,
  COMPLETED: colors.green,
  CANCELLED: colors.textMuted,
};

const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

const PRIORITY_COLORS: Record<WorkOrderPriority, string> = {
  LOW: colors.textMuted,
  MEDIUM: colors.blue,
  HIGH: colors.amber,
  URGENT: colors.red,
};

export function StatusPill({ status }: { status: WorkOrderStatus }) {
  return (
    <View style={[styles.pill, { borderColor: STATUS_COLORS[status] }]}>
      <Text style={[styles.pillText, { color: STATUS_COLORS[status] }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

export function PriorityPill({ priority }: { priority: WorkOrderPriority }) {
  return (
    <View style={[styles.pill, { borderColor: PRIORITY_COLORS[priority] }]}>
      <Text style={[styles.pillText, { color: PRIORITY_COLORS[priority] }]}>{PRIORITY_LABELS[priority]}</Text>
    </View>
  );
}

export function formatAppDate(value?: string | null): string {
  if (!value) return 'Aucune date';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function OrderCard({ order, onPress }: { order: WorkOrder | UrgentWorkOrder; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${order.title}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{order.title}</Text>
        <ChevronRight size={20} color={colors.textMuted} />
      </View>
      <View style={styles.metaRow}>
        <MapPin size={15} color={colors.textMuted} />
        <Text style={styles.metaText} numberOfLines={1}>{order.location || 'Emplacement non précisé'}</Text>
      </View>
      <View style={styles.footer}>
        <View style={styles.pills}>
          <StatusPill status={order.status} />
          <PriorityPill priority={order.priority} />
        </View>
        <Text style={styles.date}>{formatAppDate(order.dueDate)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 15,
  },
  cardPressed: { backgroundColor: '#EFF5F1' },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  cardTitle: { color: colors.text, flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 21 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 10 },
  metaText: { color: colors.textMuted, flex: 1, fontSize: 13 },
  footer: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 13 },
  pills: { flexDirection: 'row', flexShrink: 1, gap: 6 },
  pill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: '700' },
  date: { color: colors.textMuted, fontSize: 11, textAlign: 'right' },
});