import { supabase } from '../../config/supabase.js';

const pad = (n) => String(n).padStart(2, '0');

function monthBounds(year, month) {
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return {
        startISO: start.toISOString(),
        startDate: `${year}-${pad(month + 1)}-01`,
        endISO: end.toISOString(),
        endDate: `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`,
    };
}

class ReportsService {
    async getIndicators() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const cur = monthBounds(currentYear, currentMonth);
        const prev = monthBounds(lastMonthYear, lastMonth);

        const [
            patientsRes,
            patientsBaselineRes,
            apptsRes,
            apptsLastRes,
            apptsCompletedRes,
            evalsRes,
            evalsBaselineRes,
        ] = await Promise.all([
            supabase.from('patients').select('id', { count: 'exact', head: true }),
            supabase.from('patients').select('id', { count: 'exact', head: true }).lt('created_at', cur.startISO),
            supabase.from('appointments').select('id, status, appointment_date', { count: 'exact' })
                .gte('appointment_date', cur.startISO).lte('appointment_date', cur.endISO),
            supabase.from('appointments').select('id, status', { count: 'exact' })
                .gte('appointment_date', prev.startISO).lte('appointment_date', prev.endISO),
            supabase.from('appointments').select('id', { count: 'exact', head: true })
                .gte('appointment_date', cur.startISO).lte('appointment_date', cur.endISO)
                .eq('status', 'COMPLETADA'),
            supabase.from('assessments').select('id', { count: 'exact', head: true })
                .eq('status', 'COMPLETADA'),
            supabase.from('assessments').select('id', { count: 'exact', head: true })
                .eq('status', 'COMPLETADA').lt('updated_at', cur.startISO),
        ]);

        const totalPatients = patientsRes.count || 0;
        const patientsBaseline = patientsBaselineRes.count || 0;
        const patientsDelta = totalPatients - patientsBaseline;

        const sessionsThisMonth = apptsRes.count || 0;
        const sessionsLastMonth = apptsLastRes.count || 0;
        const sessionsDelta = sessionsThisMonth - sessionsLastMonth;

        const completed = apptsCompletedRes.count || 0;
        const totalAppts = apptsRes.count || 0;
        const attendanceRate = totalAppts > 0 ? Math.round((completed / totalAppts) * 100) : 0;

        const evalsCompleted = evalsRes.count || 0;
        const evalsBaseline = evalsBaselineRes.count || 0;
        const evalsDelta = evalsCompleted - evalsBaseline;

        const attendanceLastMonthAppts = apptsLastRes.data?.length || 0;
        const attendanceLastMonthCompleted = (apptsLastRes.data || []).filter(a => a.status === 'COMPLETADA').length;
        const attendanceLastRate = attendanceLastMonthAppts > 0 ? Math.round((attendanceLastMonthCompleted / attendanceLastMonthAppts) * 100) : 0;
        const attendanceDelta = attendanceRate - attendanceLastRate;

        return [
            { label: 'Pacientes activos', value: totalPatients, delta: `${patientsDelta >= 0 ? '+' : ''}${patientsDelta}` },
            { label: 'Sesiones este mes', value: sessionsThisMonth, delta: `${sessionsDelta >= 0 ? '+' : ''}${sessionsDelta}` },
            { label: 'Tasa de asistencia', value: `${attendanceRate}%`, delta: `${attendanceDelta >= 0 ? '+' : ''}${attendanceDelta}%` },
            { label: 'Evaluaciones completadas', value: evalsCompleted, delta: `${evalsDelta >= 0 ? '+' : ''}${evalsDelta}` },
        ];
    }

    async getMonthlySessions(months = 12) {
        const now = new Date();
        const windowStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
        const bounds = [];
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            bounds.push({ ...monthBounds(d.getFullYear(), d.getMonth()), month: d.toLocaleDateString('es-ES', { month: 'short' }) });
        }

        // 1 query en vez de 12 (una por mes) y el conteo se agrega en cliente.
        const { data, error } = await supabase
            .from('appointments')
            .select('appointment_date')
            .gte('appointment_date', windowStart.toISOString());

        if (error) throw error;

        const rows = data || [];
        return bounds.map(b => {
            const start = new Date(b.startISO);
            const end = new Date(b.endISO);
            const value = rows.filter(r => {
                const t = new Date(r.appointment_date);
                return t >= start && t <= end;
            }).length;
            return { month: b.month, value };
        });
    }

    async getSummary() {
        const [indicators, monthlySessions] = await Promise.all([
            this.getIndicators(),
            this.getMonthlySessions(),
        ]);
        return { indicators, monthlySessions };
    }
}

export const reportsService = new ReportsService();