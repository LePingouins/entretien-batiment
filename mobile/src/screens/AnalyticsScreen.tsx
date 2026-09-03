import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ChartNoAxesCombined, Clock3, Route, TriangleAlert } from 'lucide-react-native';
import { getAnalyticsStats } from '../lib/api';
import type { AnalyticsStats } from '../types/api';
import { colors } from '../theme';
import { ErrorState, LoadingState } from '../components/ScreenState';

export default function AnalyticsScreen() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setStats(await getAnalyticsStats()); }
    catch { setError('Les statistiques ne sont pas disponibles.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <LoadingState label="Calcul des statistiques..." />;
  if (!stats || error) return <ErrorState message={error || 'Statistiques indisponibles.'} onRetry={() => void load()} />;

  const maxStatus = Math.max(1, ...Object.values(stats.activeTasksByStatus));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={colors.primary} />}>
      <View style={styles.hero}>
        <ChartNoAxesCombined size={25} color="#9FD3BC" />
        <View><Text style={styles.heroValue}>{stats.completionRate.toFixed(1)}%</Text><Text style={styles.heroLabel}>taux de complétion</Text></View>
      </View>
      <View style={styles.metrics}>
        <Metric icon={ChartNoAxesCombined} label="Terminées cette semaine" value={stats.tasksCompletedThisWeek.toString()} color={colors.green} />
        <Metric icon={Clock3} label="Temps moyen" value={`${stats.averageCompletionTimeHours.toFixed(1)} h`} color={colors.blue} />
        <Metric icon={Route} label="Km ce mois" value={stats.totalMileageThisMonth.toFixed(1)} color={colors.teal} />
        <Metric icon={TriangleAlert} label="Tâches en retard" value={stats.overdueActiveTasks.toString()} color={colors.red} />
      </View>

      <Section title="Tâches actives par statut">
        {Object.entries(stats.activeTasksByStatus).map(([status, count]) => (
          <View key={status} style={styles.barRow}>
            <View style={styles.barHeading}><Text style={styles.barLabel}>{status.replaceAll('_', ' ')}</Text><Text style={styles.barCount}>{count}</Text></View>
            <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(3, count / maxStatus * 100)}%` }]} /></View>
          </View>
        ))}
      </Section>

      <Section title="Techniciens les plus actifs">
        {stats.topTechnicians.length ? stats.topTechnicians.map((technician, index) => (
          <View key={technician.userId} style={styles.techRow}><Text style={styles.rank}>{index + 1}</Text><Text style={styles.techName}>{technician.name}</Text><Text style={styles.techValue}>{technician.completedTasks}</Text></View>
        )) : <Text style={styles.muted}>Aucune donnée pour cette période.</Text>}
      </Section>
    </ScrollView>
  );
}

function Metric({ icon: Icon, label, value, color }: { icon: typeof Clock3; label: string; value: string; color: string }) {
  return <View style={styles.metric}><Icon size={21} color={color} /><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 30 },
  hero: { alignItems: 'center', backgroundColor: colors.charcoal, flexDirection: 'row', gap: 13, padding: 20 },
  heroValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  heroLabel: { color: '#CBD8D1', fontSize: 12 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 },
  metric: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, minHeight: 122, padding: 14, width: '48%' },
  metricValue: { color: colors.text, fontSize: 23, fontWeight: '800', marginTop: 9 },
  metricLabel: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 3 },
  section: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderTopColor: colors.border, borderWidth: 1, marginTop: 7, padding: 18 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 15 },
  barRow: { marginBottom: 13 },
  barHeading: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  barCount: { color: colors.text, fontSize: 12, fontWeight: '800' },
  track: { backgroundColor: colors.surfaceMuted, borderRadius: 3, height: 7, overflow: 'hidden' },
  fill: { backgroundColor: colors.blue, borderRadius: 3, height: 7 },
  techRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 11, paddingVertical: 11 },
  rank: { color: colors.primary, fontSize: 13, fontWeight: '800', width: 20 },
  techName: { color: colors.text, flex: 1, fontSize: 14, fontWeight: '600' },
  techValue: { color: colors.green, fontSize: 15, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 13 },
});