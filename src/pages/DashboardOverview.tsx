import { useEffect, useState } from 'react';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Kurse, Anmeldungen } from '@/types/app';
import { BookOpen, Users, GraduationCap, DoorOpen, ClipboardList, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Stats {
  dozenten: number;
  teilnehmer: number;
  raeume: number;
  kurse: number;
  anmeldungen: number;
  bezahlt: number;
  unbezahlt: number;
  umsatz: number;
  aktiveKurse: Kurse[];
  naechsteKurse: Kurse[];
  anmeldungenListe: Anmeldungen[];
  kurseListe: Kurse[];
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card border border-border flex items-start gap-4 transition-smooth hover:shadow-md hover:-translate-y-0.5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground font-display mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function HeroKpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold font-display">{value}</p>
      <p className="text-sm font-medium opacity-80 mt-1">{label}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dozData, teilData, raeumeData, kurseData, anmData] = await Promise.all([
          LivingAppsService.getDozenten(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getRaeume(),
          LivingAppsService.getKurse(),
          LivingAppsService.getAnmeldungen(),
        ]);
        const today = new Date();
        const aktiv = kurseData.filter(k => {
          const start = k.fields.startdatum ? parseISO(k.fields.startdatum) : null;
          const end = k.fields.enddatum ? parseISO(k.fields.enddatum) : null;
          return start && end && !isAfter(start, today) && !isBefore(end, today);
        });
        const naechste = kurseData
          .filter(k => k.fields.startdatum && isAfter(parseISO(k.fields.startdatum), today))
          .sort((a, b) => (a.fields.startdatum || '').localeCompare(b.fields.startdatum || ''))
          .slice(0, 4);
        const bezahlt = anmData.filter(a => a.fields.bezahlt === true).length;
        const umsatz = anmData.reduce((sum, a) => {
          const kurs = kurseData.find(k => k.record_id && a.fields.kurs?.includes(k.record_id));
          return sum + (kurs?.fields.preis || 0);
        }, 0);
        setStats({
          dozenten: dozData.length, teilnehmer: teilData.length, raeume: raeumeData.length,
          kurse: kurseData.length, anmeldungen: anmData.length, bezahlt, unbezahlt: anmData.length - bezahlt,
          umsatz, aktiveKurse: aktiv, naechsteKurse: naechste,
          anmeldungenListe: anmData, kurseListe: kurseData,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const monthlyData = (() => {
    if (!stats) return [];
    const months: Record<string, number> = {};
    stats.anmeldungenListe.forEach(a => {
      if (a.fields.anmeldedatum) {
        const m = format(parseISO(a.fields.anmeldedatum), 'MMM', { locale: de });
        months[m] = (months[m] || 0) + 1;
      }
    });
    return Object.entries(months).map(([name, count]) => ({ name, count }));
  })();

  const COLORS = ['oklch(0.52 0.19 258)', 'oklch(0.62 0.15 180)', 'oklch(0.72 0.18 55)', 'oklch(0.58 0.19 310)', 'oklch(0.65 0.17 145)', 'oklch(0.55 0.20 30)'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Daten werden geladen…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Hero Banner */}
      <div className="gradient-hero rounded-3xl px-8 py-10 shadow-hero text-primary-foreground relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-3xl" style={{ background: 'oklch(0.98 0 0)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full opacity-10 blur-2xl" style={{ background: 'oklch(0.72 0.18 55)', transform: 'translate(-50%, 40%)' }} />
        <div className="relative">
          <p className="text-sm font-semibold uppercase tracking-widest opacity-70 mb-1">Willkommen im</p>
          <h1 className="text-4xl font-bold font-display mb-2">KursPortal</h1>
          <p className="text-base opacity-70 mb-8">Alle Kurse, Dozenten und Anmeldungen auf einen Blick.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <HeroKpi label="Kurse gesamt" value={stats?.kurse ?? 0} />
            <HeroKpi label="Aktive Kurse" value={stats?.aktiveKurse.length ?? 0} sub="laufend" />
            <HeroKpi label="Anmeldungen" value={stats?.anmeldungen ?? 0} />
            <HeroKpi label="Umsatz" value={`${(stats?.umsatz ?? 0).toLocaleString('de-DE')} €`} sub="aus Anmeldungen" />
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard icon={GraduationCap} label="Dozenten" value={stats?.dozenten ?? 0} sub="Lehrende" color="bg-primary/10 text-primary" />
        <KpiCard icon={Users} label="Teilnehmer" value={stats?.teilnehmer ?? 0} sub="Registriert" color="bg-chart-2/20 text-chart-2" />
        <KpiCard icon={DoorOpen} label="Räume" value={stats?.raeume ?? 0} sub="Verfügbar" color="bg-chart-3/20 text-chart-3" />
        <KpiCard icon={CheckCircle2} label="Bezahlt" value={stats?.bezahlt ?? 0} sub="Anmeldungen" color="bg-chart-5/20 text-chart-5" />
        <KpiCard icon={Clock} label="Ausstehend" value={stats?.unbezahlt ?? 0} sub="Noch offen" color="bg-destructive/10 text-destructive" />
      </div>

      {/* Two-column: Chart + Upcoming courses */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Anmeldungen per month chart */}
        <div className="lg:col-span-3 bg-card rounded-2xl p-6 shadow-card border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg gradient-hero flex items-center justify-center">
              <TrendingUp size={14} className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-foreground font-display">Anmeldungen nach Monat</h2>
              <p className="text-xs text-muted-foreground">Verteilung der Anmeldedaten</p>
            </div>
          </div>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} barSize={28}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'oklch(0.52 0.02 255)' }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'oklch(1 0 0)', border: '1px solid oklch(0.9 0.008 255)', borderRadius: '12px', fontSize: '12px' }}
                  cursor={{ fill: 'oklch(0.94 0.005 255)' }}
                />
                <Bar dataKey="count" name="Anmeldungen" radius={[6, 6, 0, 0]}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Noch keine Anmeldungsdaten vorhanden
            </div>
          )}
        </div>

        {/* Next courses */}
        <div className="lg:col-span-2 bg-card rounded-2xl p-6 shadow-card border border-border">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg gradient-amber flex items-center justify-center">
              <BookOpen size={14} className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-foreground font-display">Nächste Kurse</h2>
              <p className="text-xs text-muted-foreground">Bald startend</p>
            </div>
          </div>
          {(stats?.naechsteKurse.length ?? 0) === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Keine bevorstehenden Kurse
            </div>
          ) : (
            <div className="space-y-3">
              {stats?.naechsteKurse.map((k) => (
                <div key={k.record_id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-smooth">
                  <div className="w-2 h-2 rounded-full gradient-hero mt-2 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{k.fields.titel}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {k.fields.startdatum ? format(parseISO(k.fields.startdatum), 'dd. MMMM yyyy', { locale: de }) : '–'}
                    </p>
                    {k.fields.preis != null && (
                      <p className="text-xs font-medium text-primary mt-0.5">{k.fields.preis.toLocaleString('de-DE')} €</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active courses */}
      {(stats?.aktiveKurse.length ?? 0) > 0 && (
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-chart-5/20 flex items-center justify-center">
              <ClipboardList size={14} className="text-chart-5" />
            </div>
            <div>
              <h2 className="font-bold text-foreground font-display">Aktuell laufende Kurse</h2>
              <p className="text-xs text-muted-foreground">{stats?.aktiveKurse.length} Kurs{(stats?.aktiveKurse.length ?? 0) !== 1 ? 'e' : ''} aktiv heute</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats?.aktiveKurse.map((k) => (
              <div key={k.record_id} className="p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-smooth">
                <p className="font-semibold text-sm text-foreground">{k.fields.titel}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-chart-5/15 text-chart-5">
                    Aktiv
                  </span>
                  {k.fields.enddatum && (
                    <span className="text-xs text-muted-foreground">
                      bis {format(parseISO(k.fields.enddatum), 'dd.MM.yyyy')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
