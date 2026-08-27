import { supabase } from '../../config/supabase.js';

class ReportsService {
    async getIndicators() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const monthStart = new Date(currentYear, currentMonth, 1).toISOString().slice(0, 10);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0).toISOString().slice(0, 10);
        const lastMonthStart = new Date(lastMonthYear, lastMonth, 1).toISOString().slice(0, 10);
        const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0).toISOString().slice(0, 10);

        const [
            patientsRes,
            patientsLastRes,
            apptsRes,
            apptsLastRes,
            apptsCompletedRes,
            evalsRes,
            evalsLastRes,
        ] = await Promise.all([
            supabase.from('patients').select('id', { count: 'exact', head: true }),
            supabase.from('patients').select('id', { count: 'exact', head: true }).lte('created_at', lastMonthEnd),
            supabase.from('appointments').select('id, status, appointment_date', { count: 'exact' })
                .gte('appointment_date', monthStart).lte('appointment_date', monthEnd + 'T23:59:59Z'),
            supabase.from('appointments').select('id, status', { count: 'exact' })
                .gte('appointment_date', lastMonthStart).lte('appointment_date', lastMonthEnd + 'T23:59:59Z'),
            supabase.from('appointments').select('id', { count: 'exact', head: true })
                .gte('appointment_date', monthStart).lte('appointment_date', monthEnd + 'T23:59:59Z')
                .eq('status', 'COMPLETADA'),
            supabase.from('assessments').select('id', { count: 'exact', head: true })
                .eq('status', 'COMPLETADA'),
            supabase.from('assessments').select('id', { count: 'exact', head: true })
                .eq('status', 'COMPLETADA').lte('updated_at', lastMonthEnd + 'T23:59:59Z'),
        ]);

        const totalPatients = patientsRes.count || 0;
        const patientsLastMonth = patientsLastRes.count || 0;
        const patientsDelta = totalPatients - patientsLastMonth;

        const sessionsThisMonth = apptsRes.count || 0;
        const sessionsLastMonth = apptsLastRes.count || 0;
        const sessionsDelta = sessionsThisMonth - sessionsLastMonth;

        const completed = apptsCompletedRes.count || 0;
        const totalAppts = apptsRes.count || 0;
        const attendanceRate = totalAppts > 0 ? Math.round((completed / totalAppts) * 100) : 0;

        const evalsCompleted = evalsRes.count || 0;
        const evalsLastMonth = evalsLastRes.count || 0;
        const evalsDelta = evalsCompleted - evalsLastMonth;

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
        const results = [];
        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const start = d.toISOString().slice(0, 10);
            const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
            const { count } = await supabase.from('appointments').select('id', { count: 'exact', head: true })
                .gte('appointment_date', start).lte('appointment_date', end + 'T23:59:59Z');
            results.push({ month: d.toLocaleDateString('es-ES', { month: 'short' }), value: count || 0 });
        }
        return results;
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
