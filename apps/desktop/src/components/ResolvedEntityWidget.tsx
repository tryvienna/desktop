/**
 * ResolvedEntityWidget — Custom entity widget renderer that resolves entity
 * titles via GraphQL when the URI has no label.
 *
 * @ai-context
 * - Plugs into EntityWidgetProvider so all chat entity chips/cards show
 *   the canonical entity.title from GraphQL instead of raw UUIDs
 * - If the URI already has a ?label= param, returns null to let the
 *   default chip/card render (no extra fetch needed)
 * - If no label, fetches via GET_ENTITY and renders the resolved title
 * - Uses Apollo cache-first policy so repeated renders are instant
 * - Renders the same visual as DefaultEntityChip/DefaultEntityCard
 */

import { memo } from 'react';
import type { EntityWidgetRendererProps } from '@vienna/chat-ui';
import { getEntityColors, getEntityIcon, ViennaChipIcon } from '@vienna/chat-ui';
import { useQuery, GET_ENTITY } from '@vienna/graphql/client';

/**
 * Custom entity widget renderer function.
 * Pass this to EntityWidgetProvider.
 */
export function resolvedEntityWidgetRenderer(props: EntityWidgetRendererProps) {
  // If the URI already has a label, fall back to default rendering
  if (props.label) return null;
  return <ResolvedWidget {...props} />;
}

const ResolvedWidget = memo(function ResolvedWidget(props: EntityWidgetRendererProps) {
  if (props.compact) {
    return <ResolvedChip {...props} />;
  }
  return <ResolvedCard {...props} />;
});

// ─── Resolved Chip (inline) ─────────────────────────────────────────────────

const ResolvedChip = memo(function ResolvedChip({
  uri,
  entityType,
  pathSegments,
}: EntityWidgetRendererProps) {
  const { data, loading } = useQuery(GET_ENTITY, {
    variables: { uri },
    fetchPolicy: 'cache-first',
  });

  if (loading && !data) {
    return (
      <span className="entity-chip inline-flex items-center gap-[3px] align-baseline">
        <span className="inline-block w-20 h-[1em] rounded-sm bg-muted animate-pulse" />
        <ViennaChipIcon />
      </span>
    );
  }

  const label = data?.entity?.title ?? pathSegments[pathSegments.length - 1] ?? entityType;

  return (
    <span
      className="entity-chip"
      style={{
        color: 'inherit',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        textDecoration: 'underline',
        textDecorationColor: 'currentColor',
        textUnderlineOffset: '2px',
        textDecorationThickness: '1px',
        textDecorationStyle: 'dotted' as const,
      }}
      title={uri}
    >
      {label}<ViennaChipIcon />
    </span>
  );
});

// ─── Resolved Card (block) ──────────────────────────────────────────────────

const ResolvedCard = memo(function ResolvedCard({
  uri,
  entityType,
  pathSegments,
}: EntityWidgetRendererProps) {
  const { data, loading } = useQuery(GET_ENTITY, {
    variables: { uri },
    fetchPolicy: 'cache-first',
  });
  const colors = getEntityColors(entityType);
  const icon = getEntityIcon(entityType);
  const label = data?.entity?.title ?? pathSegments[pathSegments.length - 1] ?? entityType;
  const typeName = entityType.replace(/_/g, ' ');

  if (loading && !data) {
    return (
      <div
        className="entity-card"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: '10px',
          border: `1px solid ${colors.border}`,
          backgroundColor: 'var(--surface-page, #fff)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: '3px', backgroundColor: colors.text, flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', flex: 1, minWidth: 0 }}>
          <span
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              backgroundColor: colors.bg,
              flexShrink: 0,
            }}
          >
            <span className="inline-block w-4 h-4 rounded-sm bg-muted animate-pulse" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="inline-block w-32 h-[0.875em] rounded-sm bg-muted animate-pulse" />
            <div style={{ marginTop: '4px' }}>
              <span className="inline-block w-16 h-[0.75em] rounded-sm bg-muted animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="entity-card group"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: '10px',
        border: `1px solid ${colors.border}`,
        backgroundColor: 'var(--surface-page, #fff)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        overflow: 'hidden',
      }}
      title={uri}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.text;
        e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px ${colors.border}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
      }}
    >
      {/* Color accent stripe */}
      <div style={{ width: '3px', backgroundColor: colors.text, flexShrink: 0 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: '1.5em',
            lineHeight: 1,
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            backgroundColor: colors.bg,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.875em',
              color: 'var(--text-primary, inherit)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: '0.75em',
              color: 'var(--text-muted, #888)',
              marginTop: '2px',
              textTransform: 'capitalize',
            }}
          >
            {typeName}
          </div>
        </div>
      </div>
    </div>
  );
});
