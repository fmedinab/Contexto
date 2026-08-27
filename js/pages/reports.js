import { reportsService } from '../services/reportsService.js';

function $(sel, ctx) { return (ctx || document).querySelector(sel); }

export class ReportsPage {
    constructor() {
        this._data = null;
    }

    async render() {
        const pageBody = document.getElementById('pageBody');
        if (!pageBody) return;
        pageBody.innerHTML = `
            <div class="ambient-bg" aria-hidden="true"></div>
            <div class="patients-page">
                <div class="patients-header">
                    <div class="patients-header-left">
                        <h1 class="patients-title">Reportes</h1>
                        <p class="patients-subtitle">Indicadores generales del consultorio.</p>
                    </div>
                </div>
                <div class="patients-stats" id="reportIndicators">
                    <div class="stat-card"><span class="stat-value">…</span><span class="stat-label">Cargando</span></div>
                </div>
                <div style="margin-top:24px;">
                    <div class="table-responsive-wrap" style="padding:20px;">
                        <div style="font-size:12px;color:var(--dash-text-secondary);text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px;font-weight:600;">Sesiones por mes</div>
                        <div id="reportChart" style="width:100%;height:200px;"></div>
                    </div>
                </div>
            </div>`;

        await this._load();
    }

    async _load() {
        try {
            this._data = await reportsService.getSummary();
            this._renderIndicators(this._data.indicators);
            this._renderChart(this._data.monthlySessions);
        } catch (e) {
            console.error('ReportsPage load error:', e);
            $('#reportIndicators').innerHTML = '<div class="patients-empty">Error al cargar reportes.</div>';
        }
    }

    _renderIndicators(indicators) {
        const el = $('#reportIndicators');
        if (!el) return;
        el.innerHTML = indicators.map(i => {
            const isPositive = i.delta.startsWith('+') && i.delta !== '+0';
            const isNegative = i.delta.startsWith('-');
            const colorClass = isPositive ? 'stat-value--ok' : isNegative ? 'stat-value--danger' : '';
            return `
            <div class="stat-card">
                <span class="stat-value ${colorClass}">${i.value}</span>
                <span class="stat-label">${i.label}</span>
                <span style="font-size:12px;margin-top:4px;color:${isPositive ? '#22c55e' : isNegative ? '#ef4444' : 'var(--dash-text-tertiary)'};">${i.delta} vs. mes anterior</span>
            </div>`;
        }).join('');
    }

    _renderChart(monthlySessions) {
        const el = $('#reportChart');
        if (!el || !monthlySessions.length) return;
        const values = monthlySessions.map(m => m.value);
        const labels = monthlySessions.map(m => m.month);
        const w = Math.max(400, el.offsetWidth || 800);
        const h = 180, padLeft = 30, padBottom = 24, padTop = 10;
        const chartW = w - padLeft;
        const chartH = h - padTop - padBottom;
        const barGap = 8;
        const barW = (chartW - barGap * (values.length - 1)) / values.length;
        const max = Math.max(...values, 1);

        const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = padTop + chartH * (1 - pct);
            const val = Math.round(max * pct);
            return `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${w}" y2="${y.toFixed(1)}" stroke="var(--dash-border)" stroke-width="0.5"/>
                     <text x="${padLeft - 6}" y="${(y + 3).toFixed(1)}" text-anchor="end" fill="var(--dash-text-tertiary)" font-size="10">${val}</text>`;
        }).join('');

        const bars = values.map((v, i) => {
            const x = padLeft + i * (barW + barGap);
            const bh = (v / max) * chartH;
            const y = padTop + chartH - bh;
            return `
                <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="url(#reportBarGrad)" opacity="0.9"/>
                <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" fill="var(--dash-text-secondary)" font-size="10" font-weight="600">${v}</text>
                <text x="${(x + barW / 2).toFixed(1)}" y="${(h - 4).toFixed(1)}" text-anchor="middle" fill="var(--dash-text-tertiary)" font-size="9">${labels[i]}</text>`;
        }).join('');

        el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;">
            <defs>
                <linearGradient id="reportBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#8b5cf6"/>
                    <stop offset="100%" stop-color="#38bdf8"/>
                </linearGradient>
            </defs>
            ${gridLines}
            ${bars}
        </svg>`;
    }
}
