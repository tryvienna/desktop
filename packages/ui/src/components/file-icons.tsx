/**
 * FileIcons — Language-aware file type icons with extension mapping
 *
 * @ai-context
 * - 30+ file type SVG icons for code languages, data formats, documents
 * - Extension-to-icon mapping (100+ extensions)
 * - MIME type mapping (for Google Workspace files)
 * - getFileIconType() resolves filename/extension/mime → icon type
 * - FileTypeIcon renders the correct icon for a given FileIconType
 * - All icons accept size, className, style, color props
 * - Default size: 16px
 * - data-slot="file-icon"
 *
 * @example
 * import { FileTypeIcon, getFileIconType } from '@tryvienna/ui';
 * <FileTypeIcon type={getFileIconType('index.tsx')} size={16} />
 */
import * as React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export interface IconProps {
  /** Icon size in pixels */
  size?: number;
  /** Additional className */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Color override (for mono icons) */
  color?: string;
}

// Internal SVG wrapper
const SvgIcon = React.memo(function SvgIcon({
  size = 16,
  viewBox = '0 0 24 24',
  fill = 'none',
  stroke,
  strokeWidth,
  className,
  style,
  children,
}: IconProps & {
  viewBox?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      {children}
    </svg>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY ICONS - Generic file & folder
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic file icon
 */
export const GenericFileIcon = React.memo(function GenericFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </SvgIcon>
  );
});

/**
 * Folder icon
 */
export const FolderIcon = React.memo(function FolderIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </SvgIcon>
  );
});

/**
 * Folder open icon
 */
export const FolderOpenIcon = React.memo(function FolderOpenIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v0" />
      <path d="M2 10l2-2h16l2 2" />
    </SvgIcon>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE FORMAT ICONS - Code Languages
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TypeScript file icon
 */
export const TypeScriptFileIcon = React.memo(function TypeScriptFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="600"
        fontSize="10"
        fill={color || 'currentColor'}
      >
        TS
      </text>
    </svg>
  );
});

/**
 * JavaScript file icon
 */
export const JavaScriptFileIcon = React.memo(function JavaScriptFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="600"
        fontSize="10"
        fill={color || 'currentColor'}
      >
        JS
      </text>
    </svg>
  );
});

/**
 * React/JSX/TSX file icon
 */
export const ReactFileIcon = React.memo(function ReactFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <circle cx="12" cy="12" r="2" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        transform="rotate(60 12 12)"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        transform="rotate(120 12 12)"
      />
    </svg>
  );
});

/**
 * Vue file icon
 */
export const VueFileIcon = React.memo(function VueFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M2 3h4l6 10 6-10h4L12 21 2 3z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M6 3h4l2 3.5 2-3.5h4"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
});

/**
 * Svelte file icon
 */
export const SvelteFileIcon = React.memo(function SvelteFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M18.5 5.5c-2-3-6-3.5-8.5-1.5S6.5 9.5 8 12c-2 1.5-2.5 4-.5 6s5 2.5 7.5.5 3.5-5.5 2-8c2-1.5 2.5-4 1.5-5z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
});

/**
 * Python file icon
 */
export const PythonFileIcon = React.memo(function PythonFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M12 2C8.5 2 8 3.5 8 5v2h4v1H6c-2 0-3.5 1.5-3.5 4.5S4 17 6 17h2v-2c0-1.5 1-3 3-3h4c1.5 0 3-1.5 3-3V5c0-1.5-1.5-3-3-3h-3z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="10" cy="5" r="1" fill={color || 'currentColor'} />
      <path
        d="M12 22c3.5 0 4-1.5 4-3v-2h-4v-1h6c2 0 3.5-1.5 3.5-4.5S20 7 18 7h-2v2c0 1.5-1 3-3 3h-4c-1.5 0-3 1.5-3 3v4c0 1.5 1.5 3 3 3h3z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="14" cy="19" r="1" fill={color || 'currentColor'} />
    </svg>
  );
});

/**
 * Go file icon
 */
export const GoFileIcon = React.memo(function GoFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="600"
        fontSize="10"
        fill={color || 'currentColor'}
      >
        Go
      </text>
    </svg>
  );
});

/**
 * Rust file icon
 */
export const RustFileIcon = React.memo(function RustFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <circle cx="12" cy="12" r="9" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="5" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
});

/**
 * Java file icon
 */
export const JavaFileIcon = React.memo(function JavaFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M8 17s-1 .5 1 1c2.5.5 8 0 10-1"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M7 20s-1 .5 2 1c3 .5 9-.5 11-2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M15 8c0 0 2-1.5 0-4-2-3-6-1-6 2 0 4 6 5 6 9s-3 3-3 3"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
});

/**
 * Kotlin file icon
 */
export const KotlinFileIcon = React.memo(function KotlinFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M2 2h20L12 12l10 10H2V2z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
});

/**
 * Swift file icon
 */
export const SwiftFileIcon = React.memo(function SwiftFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M20 5c-4 6-8 8-12 8 6-3 10-8 12-12-1 4-3 7-6 9 4-2 6-5 6-5z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M4 15c2 4 8 6 14 2-4 1-9 0-12-3"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
});

/**
 * C# file icon
 */
export const CSharpFileIcon = React.memo(function CSharpFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="600"
        fontSize="9"
        fill={color || 'currentColor'}
      >
        C#
      </text>
    </svg>
  );
});

/**
 * C++ file icon
 */
export const CppFileIcon = React.memo(function CppFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="600"
        fontSize="9"
        fill={color || 'currentColor'}
      >
        C++
      </text>
    </svg>
  );
});

/**
 * C file icon
 */
export const CFileIcon = React.memo(function CFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        fill="none"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="600"
        fontSize="11"
        fill={color || 'currentColor'}
      >
        C
      </text>
    </svg>
  );
});

/**
 * Ruby file icon
 */
export const RubyFileIcon = React.memo(function RubyFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M12 2L2 8l3 12h14l3-12-10-6z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M2 8h20M5 20l7-12 7 12"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/**
 * PHP file icon
 */
export const PhpFileIcon = React.memo(function PhpFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <ellipse cx="12" cy="12" rx="10" ry="6" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <text
        x="12"
        y="14"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="500"
        fontSize="7"
        fill={color || 'currentColor'}
      >
        php
      </text>
    </svg>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE FORMAT ICONS - Data & Config
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * JSON file icon
 */
export const JsonFileIcon = React.memo(function JsonFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/**
 * YAML file icon
 */
export const YamlFileIcon = React.memo(function YamlFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="8" y1="13" x2="12" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </SvgIcon>
  );
});

/**
 * TOML file icon
 */
export const TomlFileIcon = React.memo(function TomlFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
      />
      <line
        x1="6"
        y1="8"
        x2="18"
        y2="8"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="6"
        y1="12"
        x2="14"
        y2="12"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="6"
        y1="16"
        x2="16"
        y2="16"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
});

/**
 * XML file icon
 */
export const XmlFileIcon = React.memo(function XmlFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 14l-2 2 2 2" />
      <path d="M15 14l2 2-2 2" />
    </SvgIcon>
  );
});

/**
 * SQL/Database file icon
 */
export const SqlFileIcon = React.memo(function SqlFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <ellipse cx="12" cy="6" rx="8" ry="3" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <path
        d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
      />
      <path
        d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
      />
    </svg>
  );
});

/**
 * GraphQL file icon
 */
export const GraphqlFileIcon = React.memo(function GraphqlFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <polygon
        points="12,2 22,7 22,17 12,22 2,17 2,7"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        fill="none"
      />
      <circle cx="12" cy="12" r="3" stroke={color || 'currentColor'} strokeWidth="1.5" />
    </svg>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE FORMAT ICONS - Web
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HTML file icon
 */
export const HtmlFileIcon = React.memo(function HtmlFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M4 3l1.5 17L12 22l6.5-2L20 3H4z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M7 7h10l-.5 6H9.5"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/**
 * CSS file icon
 */
export const CssFileIcon = React.memo(function CssFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <path
        d="M4 3l1.5 17L12 22l6.5-2L20 3H4z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M16 7H8l.5 6h6.5"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/**
 * SCSS/Sass file icon
 */
export const ScssFileIcon = React.memo(function ScssFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <circle cx="12" cy="12" r="10" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <path
        d="M16 9c-1-1-3-1-4 0s-1 3 1 3 3 1 2 3-3 1-4 0"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
});

/**
 * LESS file icon
 */
export const LessFileIcon = React.memo(function LessFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <circle cx="12" cy="12" r="10" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <text
        x="12"
        y="15"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="500"
        fontSize="7"
        fill={color || 'currentColor'}
      >
        less
      </text>
    </svg>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE FORMAT ICONS - Shell & Scripts
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Shell/Bash script icon
 */
export const ShellFileIcon = React.memo(function ShellFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="3"
        width="20"
        height="18"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
      />
      <polyline
        points="6 12 10 16 6 20"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="14"
        y1="18"
        x2="18"
        y2="18"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
});

/**
 * PowerShell script icon
 */
export const PowershellFileIcon = React.memo(function PowershellFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="3"
        width="20"
        height="18"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
      />
      <path
        d="M6 9l5 3-5 3"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="13"
        y1="15"
        x2="18"
        y2="15"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE FORMAT ICONS - Documents
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Markdown file icon
 */
export const MarkdownFileIcon = React.memo(function MarkdownFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
      />
      <path
        d="M6 8v8l3-4 3 4V8"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 12l-3 4v-8l3 4z"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

/**
 * PDF file icon
 */
export const PdfFileIcon = React.memo(function PdfFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 15v-2h2a1 1 0 0 1 0 2H9z" />
    </SvgIcon>
  );
});

/**
 * Word document icon
 */
export const WordFileIcon = React.memo(function WordFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontFamily="sans-serif"
        fontWeight="600"
        fontSize="7"
        fill={color || 'currentColor'}
        stroke="none"
      >
        W
      </text>
    </SvgIcon>
  );
});

/**
 * Excel/Spreadsheet file icon
 */
export const ExcelFileIcon = React.memo(function ExcelFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <rect x="7" y="12" width="10" height="6" fill="none" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="7" y1="15" x2="17" y2="15" />
    </SvgIcon>
  );
});

/**
 * PowerPoint/Presentation file icon
 */
export const PowerPointFileIcon = React.memo(function PowerPointFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <rect x="7" y="12" width="10" height="6" rx="1" fill="none" />
    </SvgIcon>
  );
});

/**
 * Plain text file icon
 */
export const TextFileIcon = React.memo(function TextFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </SvgIcon>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE FORMAT ICONS - Media
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Image/Photo file icon
 */
export const ImageFileIcon = React.memo(function ImageFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill={color || 'currentColor'} stroke="none" />
      <path d="M21 15l-5-5L5 21" />
    </SvgIcon>
  );
});

/**
 * Video file icon
 */
export const VideoFileIcon = React.memo(function VideoFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polygon points="10,8 16,12 10,16" fill={color || 'currentColor'} stroke="none" />
    </SvgIcon>
  );
});

/**
 * Audio/Music file icon
 */
export const AudioFileIcon = React.memo(function AudioFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </SvgIcon>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE FORMAT ICONS - Archives
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Archive/Zip file icon
 */
export const ArchiveFileIcon = React.memo(function ArchiveFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <rect x="9" y="12" width="6" height="4" fill="none" />
      <line x1="12" y1="12" x2="12" y2="14" />
    </SvgIcon>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE FORMAT ICONS - System & Config
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Git file icon (.gitignore, .gitattributes, etc.)
 */
export const GitFileIcon = React.memo(function GitFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <circle cx="12" cy="18" r="2" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <circle cx="6" cy="6" r="2" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <circle cx="18" cy="6" r="2" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <path d="M12 16V8" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <path
        d="M12 8c0-2 2-4 6-4"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 8c0-2-2-4-6-4"
        stroke={color || 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
});

/**
 * Environment file icon (.env)
 */
export const EnvFileIcon = React.memo(function EnvFileIcon({
  size = 16,
  className,
  style,
  color,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      data-slot="file-icon"
    >
      <circle cx="12" cy="12" r="10" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <line x1="12" y1="2" x2="12" y2="8" stroke={color || 'currentColor'} strokeWidth="1.5" />
      <line x1="12" y1="16" x2="12" y2="22" stroke={color || 'currentColor'} strokeWidth="1.5" />
    </svg>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// FILE ICON TYPE & EXTENSION MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * File icon type union - all supported file types
 */
export type FileIconType =
  // Google Workspace
  | 'google-doc'
  | 'google-sheet'
  | 'google-slide'
  | 'google-form'
  | 'google-drawing'
  // Code - JavaScript/TypeScript
  | 'typescript'
  | 'javascript'
  | 'react'
  | 'vue'
  | 'svelte'
  // Code - Backend
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'kotlin'
  | 'swift'
  | 'csharp'
  | 'cpp'
  | 'c'
  | 'ruby'
  | 'php'
  // Code - Data/Config
  | 'json'
  | 'yaml'
  | 'toml'
  | 'xml'
  | 'sql'
  | 'graphql'
  // Code - Web
  | 'html'
  | 'css'
  | 'scss'
  | 'less'
  // Code - Shell/Scripts
  | 'shell'
  | 'powershell'
  // Docs
  | 'markdown'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'text'
  // Media
  | 'image'
  | 'video'
  | 'audio'
  // Archive
  | 'archive'
  // System
  | 'folder'
  | 'folder-open'
  | 'git'
  | 'lock'
  | 'env'
  // Default
  | 'file';

/**
 * Extension to icon type mapping
 */
export const EXTENSION_TO_ICON_TYPE: Record<string, FileIconType> = {
  // TypeScript/JavaScript
  ts: 'typescript',
  tsx: 'react',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'react',
  mjs: 'javascript',
  cjs: 'javascript',
  // Vue/Svelte
  vue: 'vue',
  svelte: 'svelte',
  // Python
  py: 'python',
  pyw: 'python',
  pyx: 'python',
  pyi: 'python',
  ipynb: 'python',
  // Go
  go: 'go',
  mod: 'go',
  sum: 'go',
  // Rust
  rs: 'rust',
  // Java/Kotlin
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  gradle: 'java',
  // Swift
  swift: 'swift',
  // C#
  cs: 'csharp',
  csx: 'csharp',
  // C/C++
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  // Ruby
  rb: 'ruby',
  rake: 'ruby',
  gemspec: 'ruby',
  // PHP
  php: 'php',
  phtml: 'php',
  // Data/Config
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  xsl: 'xml',
  xslt: 'xml',
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql',
  prisma: 'sql',
  // Web
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  styl: 'css',
  // Shell
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  fish: 'shell',
  ps1: 'powershell',
  psm1: 'powershell',
  // Docs
  md: 'markdown',
  mdx: 'markdown',
  markdown: 'markdown',
  txt: 'text',
  rtf: 'text',
  log: 'text',
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
  csv: 'excel',
  ppt: 'powerpoint',
  pptx: 'powerpoint',
  // Images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  svg: 'image',
  webp: 'image',
  ico: 'image',
  bmp: 'image',
  tiff: 'image',
  avif: 'image',
  // Video
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video',
  webm: 'video',
  // Audio
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  flac: 'audio',
  aac: 'audio',
  m4a: 'audio',
  // Archives
  zip: 'archive',
  tar: 'archive',
  gz: 'archive',
  rar: 'archive',
  '7z': 'archive',
  bz2: 'archive',
  xz: 'archive',
  // System/Config
  gitignore: 'git',
  gitattributes: 'git',
  gitmodules: 'git',
  env: 'env',
  lock: 'lock',
};

/**
 * MIME type to icon type mapping (for Google Workspace files)
 */
export const MIME_TYPE_TO_ICON_TYPE: Record<string, FileIconType> = {
  'application/vnd.google-apps.document': 'google-doc',
  'application/vnd.google-apps.spreadsheet': 'google-sheet',
  'application/vnd.google-apps.presentation': 'google-slide',
  'application/vnd.google-apps.form': 'google-form',
  'application/vnd.google-apps.drawing': 'google-drawing',
  'application/vnd.google-apps.folder': 'folder',
  'application/pdf': 'pdf',
  'application/json': 'json',
  'text/plain': 'text',
  'text/html': 'html',
  'text/css': 'css',
  'text/javascript': 'javascript',
  'application/javascript': 'javascript',
  'text/markdown': 'markdown',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/svg+xml': 'image',
  'video/mp4': 'video',
  'audio/mpeg': 'audio',
};

/**
 * Get icon type from filename, extension, or MIME type
 */
export function getFileIconType(
  fileName?: string,
  extension?: string,
  mimeType?: string
): FileIconType {
  // MIME type takes highest priority (for Google Workspace files)
  if (mimeType && MIME_TYPE_TO_ICON_TYPE[mimeType]) {
    return MIME_TYPE_TO_ICON_TYPE[mimeType];
  }

  // Determine extension
  let ext = extension?.toLowerCase().replace(/^\./, '');
  if (!ext && fileName) {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot !== -1 && lastDot < fileName.length - 1) {
      ext = fileName.slice(lastDot + 1).toLowerCase();
    }
  }

  if (ext && EXTENSION_TO_ICON_TYPE[ext]) {
    return EXTENSION_TO_ICON_TYPE[ext];
  }

  return 'file';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILE TYPE ICON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const FILE_ICON_MAP: Record<FileIconType, React.ComponentType<IconProps>> = {
  typescript: TypeScriptFileIcon,
  javascript: JavaScriptFileIcon,
  react: ReactFileIcon,
  vue: VueFileIcon,
  svelte: SvelteFileIcon,
  python: PythonFileIcon,
  go: GoFileIcon,
  rust: RustFileIcon,
  java: JavaFileIcon,
  kotlin: KotlinFileIcon,
  swift: SwiftFileIcon,
  csharp: CSharpFileIcon,
  cpp: CppFileIcon,
  c: CFileIcon,
  ruby: RubyFileIcon,
  php: PhpFileIcon,
  json: JsonFileIcon,
  yaml: YamlFileIcon,
  toml: TomlFileIcon,
  xml: XmlFileIcon,
  sql: SqlFileIcon,
  graphql: GraphqlFileIcon,
  html: HtmlFileIcon,
  css: CssFileIcon,
  scss: ScssFileIcon,
  less: LessFileIcon,
  shell: ShellFileIcon,
  powershell: PowershellFileIcon,
  markdown: MarkdownFileIcon,
  pdf: PdfFileIcon,
  word: WordFileIcon,
  excel: ExcelFileIcon,
  powerpoint: PowerPointFileIcon,
  text: TextFileIcon,
  image: ImageFileIcon,
  video: VideoFileIcon,
  audio: AudioFileIcon,
  archive: ArchiveFileIcon,
  folder: FolderIcon,
  'folder-open': FolderOpenIcon,
  git: GitFileIcon,
  lock: GenericFileIcon, // use generic for lock
  env: EnvFileIcon,
  'google-doc': TextFileIcon,
  'google-sheet': ExcelFileIcon,
  'google-slide': PowerPointFileIcon,
  'google-form': TextFileIcon,
  'google-drawing': ImageFileIcon,
  file: GenericFileIcon,
};

interface FileTypeIconProps extends IconProps {
  type: FileIconType;
}

export const FileTypeIcon = React.memo(function FileTypeIcon({
  type,
  ...props
}: FileTypeIconProps) {
  const Icon = FILE_ICON_MAP[type] || GenericFileIcon;
  return <Icon {...props} />;
});
