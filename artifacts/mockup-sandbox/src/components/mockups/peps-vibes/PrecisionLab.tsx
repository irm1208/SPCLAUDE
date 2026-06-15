import React from 'react';
import {
  FlaskConical, TestTube, ShieldCheck,
  Calculator, ShieldAlert, ShoppingCart,
  ArrowRight, CheckCircle2, Circle,
} from 'lucide-react';

const PRODUCTS = [
  { name: 'Retatrutide', dose: '10mg', price: '$20.00', inStock: true },
  { name: 'BPC-157', dose: '5mg', price: '$35.00', inStock: true },
  { name: 'TB-500', dose: '5mg', price: '$28.00', inStock: false },
  { name: 'GHK-Cu', dose: '50mg', price: '$45.00', inStock: true },
];

const LAB_ROWS = [
  { name: 'BPC-157', tests: 89, purity: 99.2 },
  { name: 'TB-500', tests: 67, purity: 98.8 },
  { name: 'Semaglutide', tests: 45, purity: 99.4 },
  { name: 'Tirzepatide', tests: 38, purity: 99.1 },
  { name: 'CJC-1295', tests: 31, purity: 98.9 },
  { name: 'Ipamorelin', tests: 22, purity: 99.3 },
];

const TOOLS = [
  { Icon: Calculator, label: 'Dose Calculator', sub: 'Reconstitution guide', color: '#00A896' },
  { Icon: ShieldAlert, label: 'Endotoxin Calculator', sub: 'Safety & BAC limits', color: '#0077CC' },
  { Icon: ShoppingCart, label: 'Order Lookup', sub: 'Track by order code', color: '#00A896' },
];

const CHECKLIST = [
  { label: 'Browse the shop', done: false },
  { label: 'Check lab reports', done: true },
  { label: 'Order via Telegram', done: false },
  { label: 'Track your order', done: false },
];

const TEAL = '#00A896';
const BLUE = '#0077CC';
const BG = '#F7F8FA';
const SURFACE = '#FFFFFF';
const BORDER = '#E2E5EA';
const TEXT = '#0F1923';
const MUTED = '#4B5563';
const SUBTLE = '#9CA3AF';
const MONO = "'JetBrains Mono', 'Courier New', monospace";

export function PrecisionLab() {
  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Nav */}
      <div style={{ background: SURFACE, borderBottom: '1px solid ' + BORDER, padding: '0 28px', display: 'flex', alignItems: 'center', height: 52 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 40 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: TEAL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlaskConical style={{ width: 14, height: 14, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, letterSpacing: '-0.01em' }}>SALT &amp; PEPS</span>
        </div>
        {['Dashboard', 'Catalog', 'Lab Analytics', 'Protocols'].map(label => (
          <button key={label} style={{ fontSize: 13, color: label === 'Dashboard' ? TEAL : MUTED, fontWeight: label === 'Dashboard' ? 600 : 400, marginRight: 28, paddingBottom: 2, borderBottom: label === 'Dashboard' ? '2px solid ' + TEAL : '2px solid transparent' }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: BG, border: '1px solid ' + BORDER, borderRadius: 6, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: SUBTLE }}>Search compounds…</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Hero */}
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: TEXT, margin: 0, letterSpacing: '-0.02em' }}>Systems Overview</h1>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 4, marginBottom: 0 }}>Real-time inventory and analytical testing data for research compounds.</p>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 20 }}>
            {[
              { label: 'PURITY STANDARD', value: '≥99', unit: '%', sub: 'Guaranteed minimum across all batches', color: TEAL },
              { label: 'VERIFIED ANALYTICS', value: '352', unit: 'tests', sub: 'Independent third-party laboratory reports', color: BLUE },
              { label: 'ACTIVE INVENTORY', value: '1', unit: 'vial', sub: 'Currently in-stock and ready to ship', color: TEXT },
            ].map(s => (
              <div key={s.label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, padding: '20px 20px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: SUBTLE, letterSpacing: '0.1em', marginBottom: 12 }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 40, fontWeight: 400, color: s.color, lineHeight: 1 }}>{s.value}</span>
                  <span style={{ fontFamily: MONO, fontSize: 14, color: SUBTLE }}>{s.unit}</span>
                </div>
                <div style={{ fontSize: 11, color: SUBTLE, marginTop: 8 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Row 1: Lab first (foregrounded), then Products */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

          {/* Lab data table */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid ' + BORDER }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TestTube style={{ width: 14, height: 14, color: TEAL }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Analytical Testing Data</span>
              </div>
              <button style={{ fontSize: 11, color: TEAL, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                View Full Reports <ArrowRight style={{ width: 11, height: 11 }} />
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid ' + BORDER }}>
                  {['Compound', 'Samples', 'Avg Purity', 'Metric'].map(h => (
                    <th key={h} style={{ padding: '8px 20px', fontSize: 10, fontWeight: 600, color: SUBTLE, textAlign: 'left', letterSpacing: '0.08em' }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {LAB_ROWS.map((row, i) => (
                  <tr key={row.name} style={{ borderBottom: i < LAB_ROWS.length - 1 ? '1px solid ' + BORDER : 'none', background: i % 2 === 0 ? BG : SURFACE }}>
                    <td style={{ padding: '10px 20px', fontSize: 12, fontWeight: 600, color: TEXT }}>{row.name}</td>
                    <td style={{ padding: '10px 20px', fontFamily: MONO, fontSize: 12, color: BLUE }}>{row.tests}</td>
                    <td style={{ padding: '10px 20px', fontFamily: MONO, fontSize: 12, color: TEAL, fontWeight: 600 }}>{row.purity.toFixed(1)}%</td>
                    <td style={{ padding: '10px 20px' }}>
                      <div style={{ height: 4, width: 80, background: BORDER, borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: (row.purity - 98) / 2 * 100 + '%', background: row.purity >= 99.2 ? TEAL : BLUE, borderRadius: 999 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Products */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid ' + BORDER }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FlaskConical style={{ width: 14, height: 14, color: TEAL }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Available Inventory</span>
              </div>
              <button style={{ fontSize: 11, color: TEAL, fontWeight: 600 }}>View All</button>
            </div>
            <div>
              {PRODUCTS.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: i < PRODUCTS.length - 1 ? '1px solid ' + BORDER : 'none' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{p.name}</span>
                      <span style={{ fontSize: 10, color: SUBTLE, background: BG, border: '1px solid ' + BORDER, borderRadius: 4, padding: '1px 6px' }}>{p.dose}</span>
                    </div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{p.price}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: p.inStock ? TEAL : SUBTLE, fontWeight: 600 }}>{p.inStock ? '● In Stock' : '○ Depleted'}</span>
                    {p.inStock && (
                      <button style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid ' + BORDER, background: SURFACE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT, cursor: 'pointer' }}>
                        <ShoppingCart style={{ width: 12, height: 12 }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid Row 2: Tools + Checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

          {/* Quick Tools */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + BORDER }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Analytical Tools</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
              {TOOLS.map((t, i) => (
                <button key={t.label} style={{ padding: '20px 16px', textAlign: 'left', borderRight: i < 2 ? '1px solid ' + BORDER : 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: BG, border: '1px solid ' + BORDER, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <t.Icon style={{ width: 16, height: 16, color: t.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: SUBTLE, marginTop: 2 }}>{t.sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: t.color, fontWeight: 600, marginTop: 2 }}>
                    Open <ArrowRight style={{ width: 11, height: 11 }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + BORDER }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Onboarding Checklist</span>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {CHECKLIST.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 6 }}>
                  {item.done
                    ? <CheckCircle2 style={{ width: 16, height: 16, color: TEAL, flexShrink: 0 }} />
                    : <Circle style={{ width: 16, height: 16, color: BORDER, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, color: item.done ? TEXT : MUTED, fontWeight: item.done ? 500 : 400, textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
