import React from 'react';
import {
  FlaskConical, TestTube, ShieldCheck,
  Calculator, ShieldAlert, ShoppingCart,
  ArrowRight, CheckCircle2, Circle, Leaf,
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
  { Icon: Calculator, label: 'Dose Calculator', sub: 'Reconstitution guide', color: '#6B8F71' },
  { Icon: ShieldAlert, label: 'Endotoxin Calculator', sub: 'Safety & BAC limits', color: '#C4863A' },
  { Icon: ShoppingCart, label: 'Order Lookup', sub: 'Track by order code', color: '#6B8F71' },
];

const CHECKLIST = [
  { label: 'Browse the shop', done: false },
  { label: 'Check lab reports', done: true },
  { label: 'Order via Telegram', done: false },
  { label: 'Track your order', done: false },
];

const BG = '#E8DDD0';
const SURFACE = '#FBF8F5';
const BORDER = 'rgba(139,90,43,0.12)';
const SAGE = '#6B8F71';
const AMBER = '#C4863A';
const BROWN = '#4A3B2C';
const MUTED = '#8B6A4F';
const SUBTLE = '#A8917B';

export function NaturalApothecary() {
  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <div style={{ background: '#F5EDE2', borderBottom: '1px solid ' + BORDER, padding: '12px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: SAGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf style={{ width: 16, height: 16, color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: BROWN, letterSpacing: '-0.01em' }}>Salt &amp; Peps</div>
            <div style={{ fontSize: 10, color: SUBTLE, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Peps Anonymous</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Vials', 'Lab', 'Pepedia', 'Tools'].map(label => (
            <button key={label} style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Hero */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: SAGE, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Welcome Back</div>
          <h1 style={{ fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: 44, fontWeight: 700, color: BROWN, lineHeight: 1.1, margin: 0 }}>
            Salt &amp; Peps
          </h1>
          <p style={{ fontSize: 15, color: MUTED, marginTop: 10, maxWidth: 440, lineHeight: 1.6 }}>
            Peptide shop, independent lab reports &amp; dosing tools — all tested, all discreet.
          </p>

          {/* Metric pills */}
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'Products in Stock', val: '1 / 4', pct: 25, color: BROWN },
              { label: 'Lab Tests', val: '352+', pct: 98, color: SAGE },
              { label: 'Avg Purity', val: '>=99%', pct: 99, color: AMBER },
            ].map(m => (
              <div key={m.label} style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: SUBTLE, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</div>
                <div style={{ position: 'relative', height: 36, borderRadius: 999, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: m.pct + '%', background: m.color, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', whiteSpace: 'nowrap' }}>{m.val}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Big stats */}
          <div style={{ display: 'flex', gap: 0, marginTop: 16, background: SURFACE, borderRadius: 16, border: '1px solid ' + BORDER, overflow: 'hidden' }}>
            {[
              { Icon: FlaskConical, val: '1', label: 'Vials', color: BROWN },
              { Icon: TestTube, val: '352', label: 'Lab Tests', color: SAGE },
              { Icon: ShieldCheck, val: '>=99%', label: 'Purity', color: AMBER },
            ].map((s, i) => (
              <div key={s.label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderLeft: i > 0 ? '1px solid ' + BORDER : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <s.Icon style={{ width: 20, height: 20, color: s.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: BROWN, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: SUBTLE, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcement */}
        <div style={{ background: SAGE + '0F', border: '1px solid ' + SAGE + '30', borderRadius: 16, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: SAGE, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Group Buy Closes</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: BROWN }}>28 Oct 2026</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: SUBTLE, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>Remaining</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: SAGE }}>6 months</div>
          </div>
        </div>

        {/* Grid Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
          {/* Products */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid ' + BORDER }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Leaf style={{ width: 14, height: 14, color: SAGE }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: BROWN }}>Available Now</span>
              </div>
              <button style={{ fontSize: 11, fontWeight: 600, color: SAGE, display: 'flex', alignItems: 'center', gap: 3 }}>
                Full shop <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {PRODUCTS.map((p, i) => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, marginBottom: 2, background: i % 2 === 0 ? 'rgba(232,221,208,0.4)' : 'transparent' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: SAGE + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FlaskConical style={{ width: 14, height: 14, color: SAGE }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: BROWN }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: SUBTLE }}>{p.dose}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: AMBER }}>{p.price}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: p.inStock ? SAGE : '#C0856A' }}>{p.inStock ? 'In stock' : 'Out of stock'}</span>
                    </div>
                  </div>
                  {p.inStock && (
                    <button style={{ width: 28, height: 28, borderRadius: 8, background: SAGE + '18', border: '1px solid ' + SAGE + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SAGE, fontSize: 18, fontWeight: 300 }}>+</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tools */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid ' + BORDER }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: BROWN }}>Quick Tools</span>
            </div>
            <div style={{ padding: '6px 8px' }}>
              {TOOLS.map(t => (
                <button key={t.label} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 12px', borderRadius: 12, textAlign: 'left', marginBottom: 2 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: t.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <t.Icon style={{ width: 16, height: 16, color: t.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: BROWN }}>{t.label}</div>
                    <div style={{ fontSize: 10, color: SUBTLE, marginTop: 2 }}>{t.sub}</div>
                  </div>
                  <ArrowRight style={{ width: 13, height: 13, color: SUBTLE }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
          {/* Lab */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid ' + BORDER }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TestTube style={{ width: 14, height: 14, color: SAGE }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: BROWN }}>Lab Snapshot</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: SAGE + '12', color: SAGE }}>352+ tests</span>
              </div>
              <button style={{ fontSize: 11, fontWeight: 600, color: SAGE, display: 'flex', alignItems: 'center', gap: 3 }}>
                All reports <ArrowRight style={{ width: 12, height: 12 }} />
              </button>
            </div>
            <div style={{ padding: '8px 12px' }}>
              {LAB_ROWS.map((row, i) => (
                <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', borderRadius: 10, marginBottom: 2, background: i % 2 === 0 ? 'rgba(232,221,208,0.4)' : 'transparent' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: SAGE + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: SAGE }}>{i + 1}</div>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: BROWN }}>{row.name}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: SAGE }}>{row.purity.toFixed(1)}%</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: SAGE + '10', color: SAGE }}>{row.tests} tests</span>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid ' + BORDER }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: BROWN }}>Get Started</span>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {CHECKLIST.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, background: item.done ? SAGE + '0C' : 'transparent', border: '1px solid ' + (item.done ? SAGE + '25' : BORDER) }}>
                  {item.done
                    ? <CheckCircle2 style={{ width: 18, height: 18, color: SAGE, flexShrink: 0 }} />
                    : <Circle style={{ width: 18, height: 18, color: SUBTLE, flexShrink: 0 }} />}
                  <span style={{ fontSize: 13, fontWeight: item.done ? 600 : 400, color: item.done ? SAGE : MUTED }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Explore */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: SUBTLE, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Explore</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'The Lonely Vial', eyebrow: 'Single Vials', Icon: FlaskConical, color: SAGE },
              { label: 'Accessories', eyebrow: 'Essential Kit', Icon: ShoppingCart, color: AMBER },
              { label: 'Lab Reports', eyebrow: 'Quality Assurance', Icon: TestTube, color: SAGE },
              { label: 'Protocols', eyebrow: 'Pepedia', Icon: ShieldCheck, color: AMBER },
            ].map(card => (
              <div key={card.label} style={{ background: SURFACE, border: '1px solid ' + BORDER, borderRadius: 16, padding: '18px 16px', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: card.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <card.Icon style={{ width: 20, height: 20, color: card.color }} />
                </div>
                <div style={{ fontSize: 10, color: SUBTLE, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{card.eyebrow}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: BROWN, fontFamily: "'Georgia', serif" }}>{card.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 11, color: card.color, fontWeight: 600 }}>
                  Explore <ArrowRight style={{ width: 11, height: 11 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
