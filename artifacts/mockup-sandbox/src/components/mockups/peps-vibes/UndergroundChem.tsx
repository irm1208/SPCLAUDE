import React from 'react';
import {
  FlaskConical, TestTube, ShieldCheck,
  Calculator, ShieldAlert, ShoppingCart,
  ArrowRight, CheckCircle2, Circle, Activity,
} from 'lucide-react';

const PRODUCTS = [
  { name: 'Retatrutide 10mg', price: '$20.00', inStock: true },
  { name: 'BPC-157 5mg', price: '$35.00', inStock: true },
  { name: 'TB-500 5mg', price: '$28.00', inStock: false },
  { name: 'GHK-Cu 50mg', price: '$45.00', inStock: true },
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
  { Icon: Calculator, label: 'Dose Calculator', sub: 'Reconstitution guide', color: '#8B5CF6' },
  { Icon: ShieldAlert, label: 'Endotoxin Calculator', sub: 'Safety & BAC limits', color: '#06B6D4' },
  { Icon: ShoppingCart, label: 'Order Lookup', sub: 'Track by order code', color: '#8B5CF6' },
];

const CHECKLIST = [
  { label: 'Browse the shop', done: false },
  { label: 'Check lab reports', done: true },
  { label: 'Order via Telegram', done: false },
  { label: 'Track your order', done: false },
];

const BG = '#0D1117';
const SURFACE = '#161B22';
const SURFACE2 = '#1C2333';
const BORDER = 'rgba(255,255,255,0.06)';
const VIOLET = '#8B5CF6';
const CYAN = '#06B6D4';
const TEXT = '#F0F6FC';
const MUTED = '#8B949E';
const SUBTLE = '#484F58';

export function UndergroundChem() {
  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      {/* Nav */}
      <div style={{ background: BG, borderBottom: '1px solid ' + BORDER, padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: SURFACE2, border: '1px solid ' + VIOLET + '50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FlaskConical style={{ width: 16, height: 16, color: VIOLET }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, letterSpacing: '0.08em' }}>PEPS<span style={{ color: CYAN }}>_ANON</span></span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {['Catalog', 'Protocols', 'Verifications'].map((label, i) => (
            <button key={label} style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 6 }}>
              {i === 2 && <ShieldCheck style={{ width: 13, height: 13, color: CYAN }} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Hero */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
          <div style={{ background: SURFACE, border: '1px solid ' + VIOLET + '30', borderRadius: 16, padding: '32px 28px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, ' + VIOLET + ', ' + CYAN + ')' }} />
            <div style={{ fontSize: 11, fontWeight: 700, color: VIOLET, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 16 }}>Salt &amp; Peps // Peps Anonymous</div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 800, color: TEXT, lineHeight: 1.1, margin: 0, textTransform: 'uppercase', letterSpacing: '-0.01em' }}>
              Research Grade.<br />No Compromise.
            </h1>
            <p style={{ fontSize: 13, color: MUTED, marginTop: 14, lineHeight: 1.6, maxWidth: 340 }}>
              High-performance peptide compounds verified by independent third-party analytical laboratories.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'IN-STOCK VIALS', value: '1', Icon: Activity, color: VIOLET },
              { label: 'LAB TESTS', value: '352', Icon: TestTube, color: CYAN },
              { label: 'AVG PURITY', value: '≥99%', Icon: ShieldCheck, color: CYAN },
            ].map(s => (
              <div key={s.label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + s.color, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: SUBTLE, letterSpacing: '0.15em', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: TEXT, lineHeight: 1 }}>{s.value}</div>
                </div>
                <s.Icon style={{ width: 20, height: 20, color: s.color, opacity: 0.6 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Grid Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

          {/* Products */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: CYAN }}>{'> _'}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Inventory_Live</span>
              </div>
              <button style={{ fontSize: 11, color: VIOLET, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                View All <ArrowRight style={{ width: 11, height: 11 }} />
              </button>
            </div>
            <div>
              {PRODUCTS.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: i < PRODUCTS.length - 1 ? '1px solid ' + BORDER : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.inStock ? CYAN : SUBTLE, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: p.inStock ? TEXT : SUBTLE }}>{p.name}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: MUTED }}>{p.price}</span>
                  {p.inStock && (
                    <button style={{ width: 28, height: 28, borderRadius: 6, background: SURFACE2, border: '1px solid ' + VIOLET + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', color: VIOLET, cursor: 'pointer' }}>
                      <ShoppingCart style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + BORDER }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Initialization Sequence</span>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {CHECKLIST.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 8, background: item.done ? VIOLET + '0A' : SURFACE2, marginBottom: 6, border: '1px solid ' + (item.done ? VIOLET + '25' : BORDER) }}>
                  {item.done
                    ? <CheckCircle2 style={{ width: 16, height: 16, color: CYAN, flexShrink: 0 }} />
                    : <Circle style={{ width: 16, height: 16, color: SUBTLE, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, color: item.done ? TEXT : MUTED }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid Row 2: Lab + Tools */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>

          {/* Lab */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + BORDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TestTube style={{ width: 14, height: 14, color: CYAN }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Lab_Verify</span>
                <span style={{ fontSize: 10, color: CYAN, background: CYAN + '12', border: '1px solid ' + CYAN + '30', borderRadius: 4, padding: '1px 7px' }}>352+</span>
              </div>
              <button style={{ fontSize: 11, color: CYAN, fontWeight: 600 }}>All Reports</button>
            </div>
            <div>
              {LAB_ROWS.map((row, i) => (
                <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < LAB_ROWS.length - 1 ? '1px solid ' + BORDER : 'none', background: i % 2 === 0 ? SURFACE2 : 'transparent' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: VIOLET, width: 16, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: TEXT }}>{row.name}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: CYAN }}>{row.purity.toFixed(1)}%</span>
                  <span style={{ fontSize: 10, color: VIOLET, background: VIOLET + '10', borderRadius: 4, padding: '2px 8px' }}>{row.tests}x</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid ' + BORDER }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEXT, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Tools</span>
            </div>
            <div style={{ padding: '6px 8px' }}>
              {TOOLS.map(t => (
                <button key={t.label} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', borderRadius: 10, textAlign: 'left', marginBottom: 4, background: SURFACE2, border: '1px solid ' + BORDER }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: t.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <t.Icon style={{ width: 15, height: 15, color: t.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>{t.sub}</div>
                  </div>
                  <ArrowRight style={{ width: 13, height: 13, color: SUBTLE }} />
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
