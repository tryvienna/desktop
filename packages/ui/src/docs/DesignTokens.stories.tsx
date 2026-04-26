/**
 * Design token visualization for @tryvienna/ui.
 * Renders all color palettes, semantic tokens, spacing, typography, radius, and shadows.
 * Switch themes in the toolbar to see how tokens adapt.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Design Tokens',
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function Swatch({ token, label }: { token: string; label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 6,
          backgroundColor: `var(${token})`,
          border: '1px solid var(--border-default)',
        }}
      />
      <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 56 }}>
        {label ?? token.replace('--color-', '').replace('--', '')}
      </span>
    </div>
  );
}

function SemanticSwatch({ token, label }: { token: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 0',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          backgroundColor: `var(${token})`,
          border: '1px solid var(--border-default)',
          flexShrink: 0,
        }}
      />
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {token}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBottom: 12,
          paddingBottom: 6,
          borderBottom: '1px solid var(--border-default)',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

function PaletteRow({ name, stops }: { name: string; stops: string[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: 6,
          textTransform: 'capitalize',
        }}
      >
        {name}
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {stops.map((stop) => (
          <Swatch key={stop} token={`--color-${name}-${stop}`} label={stop} />
        ))}
      </div>
    </div>
  );
}

// ── Color Palettes ───────────────────────────────────────────────────────────

export const ColorPalettes: Story = {
  render: () => {
    const fullStops = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
    const grayStops = [
      '50',
      '100',
      '200',
      '300',
      '400',
      '500',
      '600',
      '700',
      '800',
      '850',
      '900',
      '950',
      '1000',
      '1050',
    ];

    return (
      <div>
        <h2
          style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}
        >
          Color Palettes
        </h2>
        <p
          style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24, maxWidth: 600 }}
        >
          OKLCH color space palettes. These are raw palette tokens — prefer semantic tokens
          (surfaces, text, borders) for component styling.
        </p>
        <PaletteRow name="gray" stops={grayStops} />
        <PaletteRow name="brand" stops={fullStops} />
        <PaletteRow name="violet" stops={fullStops} />
        <PaletteRow name="emerald" stops={fullStops} />
        <PaletteRow name="red" stops={fullStops} />
        <PaletteRow name="amber" stops={fullStops} />
        <PaletteRow name="blue" stops={fullStops} />
        <PaletteRow name="cyan" stops={fullStops} />
      </div>
    );
  },
};

// ── Semantic Colors ──────────────────────────────────────────────────────────

export const SemanticColors: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
      <Section title="Surfaces">
        <SemanticSwatch token="--surface-page" label="Page" />
        <SemanticSwatch token="--surface-elevated" label="Elevated" />
        <SemanticSwatch token="--surface-sunken" label="Sunken" />
        <SemanticSwatch token="--surface-overlay" label="Overlay" />
        <SemanticSwatch token="--surface-interactive" label="Interactive" />
        <SemanticSwatch token="--surface-interactive-hover" label="Interactive Hover" />
        <SemanticSwatch token="--surface-interactive-active" label="Interactive Active" />
      </Section>

      <Section title="Status Surfaces">
        <SemanticSwatch token="--surface-success" label="Success" />
        <SemanticSwatch token="--surface-warning" label="Warning" />
        <SemanticSwatch token="--surface-error" label="Error" />
        <SemanticSwatch token="--surface-info" label="Info" />
        <SemanticSwatch token="--surface-ai" label="AI" />
        <SemanticSwatch token="--surface-brand" label="Brand" />
      </Section>

      <Section title="Text">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            ['--text-primary', 'Primary'],
            ['--text-secondary', 'Secondary'],
            ['--text-muted', 'Muted'],
            ['--text-disabled', 'Disabled'],
            ['--text-brand', 'Brand'],
            ['--text-link', 'Link'],
            ['--text-success', 'Success'],
            ['--text-warning', 'Warning'],
            ['--text-error', 'Error'],
            ['--text-info', 'Info'],
            ['--text-ai', 'AI'],
          ].map(([token, label]) => (
            <div key={token} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: `var(${token})`,
                  minWidth: 80,
                }}
              >
                {label}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {token}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Borders">
        {[
          ['--border-default', 'Default'],
          ['--border-muted', 'Muted'],
          ['--border-focus', 'Focus'],
          ['--border-subtle', 'Subtle'],
          ['--border-success', 'Success'],
          ['--border-warning', 'Warning'],
          ['--border-error', 'Error'],
          ['--border-info', 'Info'],
          ['--border-ai', 'AI'],
        ].map(([token, label]) => (
          <div key={token} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <div
              style={{
                width: 48,
                height: 24,
                borderRadius: 4,
                border: `2px solid var(${token})`,
                backgroundColor: 'var(--surface-page)',
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {token}
            </span>
          </div>
        ))}
      </Section>
    </div>
  ),
};

// ── Typography ───────────────────────────────────────────────────────────────

export const Typography: Story = {
  render: () => {
    const sizes = [
      { name: 'xs', size: '10px', lineHeight: '15px' },
      { name: 'sm', size: '11px', lineHeight: '17px' },
      { name: 'base', size: '12px', lineHeight: '18px' },
      { name: 'md', size: '13px', lineHeight: '20px' },
      { name: 'lg', size: '14px', lineHeight: '21px' },
      { name: 'xl', size: '16px', lineHeight: '24px' },
      { name: '2xl', size: '18px', lineHeight: '28px' },
      { name: '3xl', size: '20px', lineHeight: '32px' },
      { name: '4xl', size: '24px', lineHeight: '36px' },
    ];

    const weights = [
      { name: 'normal', value: 400 },
      { name: 'medium', value: 500 },
      { name: 'semibold', value: 600 },
      { name: 'bold', value: 700 },
    ];

    return (
      <div>
        <Section title="Type Scale">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sizes.map(({ name, size, lineHeight }) => (
              <div key={name} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                <span
                  style={{
                    width: 40,
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {name}
                </span>
                <span
                  style={{
                    fontSize: size,
                    lineHeight: lineHeight,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  The quick brown fox jumps over the lazy dog
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}
                >
                  {size}/{lineHeight}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Font Weights">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weights.map(({ name, value }) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span
                  style={{
                    width: 80,
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                  }}
                >
                  {name} ({value})
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: value,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  The quick brown fox
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Font Families">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                --font-sans
              </div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
                Inter — ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                --font-mono
              </div>
              <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                JetBrains Mono — const fn = (x: number) =&gt; x * 2;
              </div>
            </div>
          </div>
        </Section>
      </div>
    );
  },
};

// ── Spacing ──────────────────────────────────────────────────────────────────

export const Spacing: Story = {
  render: () => {
    const steps = [
      { label: 'p-1', px: 4, note: 'Sub-step' },
      { label: 'p-2', px: 8, note: '8pt grid' },
      { label: 'p-3', px: 12, note: 'Sub-step' },
      { label: 'p-4', px: 16, note: '8pt grid' },
      { label: 'p-5', px: 20, note: 'Sub-step' },
      { label: 'p-6', px: 24, note: '8pt grid' },
      { label: 'p-8', px: 32, note: '8pt grid' },
      { label: 'p-10', px: 40, note: '8pt grid' },
      { label: 'p-12', px: 48, note: '8pt grid' },
      { label: 'p-16', px: 64, note: '8pt grid' },
    ];

    return (
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
          Spacing Scale
        </h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 24 }}>
          Base: <code style={{ fontFamily: 'var(--font-mono)' }}>--spacing: 4px</code>. Prefer 8pt
          grid values (highlighted) for primary spacing.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map(({ label, px, note }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 36,
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
                }}
              >
                {label}
              </span>
              <div
                style={{
                  width: px,
                  height: 16,
                  borderRadius: 2,
                  backgroundColor:
                    note === '8pt grid' ? 'var(--color-brand-500)' : 'var(--color-gray-500)',
                  opacity: note === '8pt grid' ? 1 : 0.4,
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {px}px
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: note === '8pt grid' ? 'var(--text-brand)' : 'var(--text-muted)',
                  fontStyle: note !== '8pt grid' ? 'italic' : 'normal',
                }}
              >
                {note}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// ── Border Radius ────────────────────────────────────────────────────────────

export const BorderRadius: Story = {
  render: () => {
    const radii = [
      { name: 'none', value: '0px' },
      { name: 'sm', value: '2px' },
      { name: 'default', value: '4px' },
      { name: 'md', value: '6px' },
      { name: 'lg', value: '8px' },
      { name: 'xl', value: '12px' },
      { name: '2xl', value: '16px' },
      { name: '3xl', value: '24px' },
      { name: 'full', value: '9999px' },
    ];

    return (
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>
          Border Radius
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {radii.map(({ name, value }) => (
            <div
              key={name}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: value,
                  backgroundColor: 'var(--surface-interactive)',
                  border: '2px solid var(--border-default)',
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-primary)' }}>
                {name}
              </span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// ── Shadows ──────────────────────────────────────────────────────────────────

export const Shadows: Story = {
  render: () => {
    const shadows = ['sm', 'default', 'md', 'lg', 'xl', '2xl', 'inner'];

    return (
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>
          Shadows
        </h2>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {shadows.map((name) => {
            const token = name === 'default' ? '--shadow' : `--shadow-${name}`;
            return (
              <div
                key={name}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    backgroundColor: 'var(--surface-elevated)',
                    boxShadow: `var(${token})`,
                  }}
                />
                <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {name}
                </span>
                <span
                  style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
                >
                  {token}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
};
