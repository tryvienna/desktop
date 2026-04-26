/**
 * generate-ui-reference.ts
 *
 * Reads @tryvienna/ui component source files and Storybook stories with ts-morph,
 * then generates VitePress markdown pages for each component.
 *
 * Run:  pnpm --filter @vienna/docs generate:ui-reference
 */

import { Project, SyntaxKind, type SourceFile, type Node } from 'ts-morph';
import { resolve, dirname, basename } from 'node:path';
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(__dirname, '..');
const UI_ROOT = resolve(DOCS_ROOT, '../../packages/ui');
const COMPONENTS_DIR = resolve(UI_ROOT, 'src/components');
const OUTPUT_DIR = resolve(DOCS_ROOT, 'reference/components');

// ─── Types ──────────────────────────────────────────────────────────────────

interface ComponentDoc {
  name: string;
  slug: string;
  fileName: string;
  category: string;
  categorySlug: string;
  description: string;
  aiContext: string;
  examples: string[];
  props: PropInfo[];
  variants: VariantInfo[];
  defaultVariants: Record<string, string>;
  stories: StoryInfo[];
  subComponents: SubComponentDoc[];
  exports: string[];
  dataSlot: string;
  extendsElement: string;
}

interface SubComponentDoc {
  name: string;
  description: string;
  props: PropInfo[];
  dataSlot: string;
  extendsElement: string;
}

interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue: string | undefined;
  description: string;
}

interface VariantInfo {
  name: string;
  options: string[];
}

interface StoryInfo {
  name: string;
  displayName: string;
  storyId: string;
  sourceCode: string;
  hasRender: boolean;
}

interface CategoryMap {
  [exportName: string]: { category: string; categorySlug: string; sourceFile: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_/]+/g, '-')
    .toLowerCase();
}

function escapeType(t: string): string {
  return t.replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeMarkdown(t: string): string {
  return t.replace(/\|/g, '\\|');
}

const JSDOC_TAGS = new Set([
  '@param', '@returns', '@return', '@example', '@throws', '@see',
  '@since', '@deprecated', '@module', '@type', '@typedef', '@template',
  '@default', '@readonly', '@override', '@implements', '@extends',
  '@augments', '@callback', '@property', '@memberof', '@enum', '@ai-context',
]);

function isJsDocTag(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('@')) return false;
  const tag = trimmed.split(/[\s({]/)[0]!;
  return JSDOC_TAGS.has(tag);
}

function getJsDoc(node: Node): string {
  const jsDocs = (node as any).getJsDocs?.();
  if (!jsDocs?.length) return '';
  return jsDocs
    .map((d: any) => {
      const raw: string = d.getText?.() ?? '';
      return raw
        .replace(/^\/\*\*\s*/, '')
        .replace(/\s*\*\/$/, '')
        .replace(/^\s*\*\s?/gm, '')
        .split('\n')
        .filter((line: string) => !isJsDocTag(line))
        .join('\n')
        .trim();
    })
    .join('\n')
    .trim();
}

function getAiContext(node: Node): string {
  const jsDocs = (node as any).getJsDocs?.();
  if (!jsDocs?.length) return '';
  for (const doc of jsDocs) {
    const raw: string = doc.getText?.() ?? '';
    const match = raw.match(/@ai-context\s*\n?([\s\S]*?)(?=@\w|$)/);
    if (match) {
      return match[1]!
        .replace(/^\s*\*\s?/gm, '')
        .trim();
    }
  }
  return '';
}

function getExamples(node: Node): string[] {
  const jsDocs = (node as any).getJsDocs?.();
  if (!jsDocs?.length) return [];
  const examples: string[] = [];
  for (const doc of jsDocs) {
    for (const tag of doc.getTags?.() ?? []) {
      if (tag.getTagName() === 'example') {
        const text = tag.getComment?.() ?? tag.getText?.()?.replace(/@example\s*/, '') ?? '';
        if (text.trim()) examples.push(text.trim());
      }
    }
  }
  return examples;
}

function shortenType(type: string): string {
  return type
    .replace(/import\([^)]+\)\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Parse category map from index.ts ───────────────────────────────────────

function parseCategoryMap(): CategoryMap {
  const indexPath = resolve(COMPONENTS_DIR, 'index.ts');
  const source = readFileSync(indexPath, 'utf-8');
  const map: CategoryMap = {};
  let currentCategory = 'Uncategorized';
  let currentCategorySlug = 'uncategorized';

  // First pass: find phase comments and their line positions
  const lines = source.split('\n');
  const phaseRanges: Array<{ category: string; categorySlug: string; startLine: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const phaseMatch = lines[i]!.match(/\/\/\s*Phase\s+\d+:\s*(.+)/);
    if (phaseMatch) {
      phaseRanges.push({
        category: phaseMatch[1]!.trim(),
        categorySlug: kebabCase(phaseMatch[1]!.trim()),
        startLine: i,
      });
    }
  }

  function getCategoryForLine(lineNum: number): { category: string; categorySlug: string } {
    let result = { category: 'Uncategorized', categorySlug: 'uncategorized' };
    for (const range of phaseRanges) {
      if (range.startLine <= lineNum) {
        result = { category: range.category, categorySlug: range.categorySlug };
      }
    }
    return result;
  }

  // Second pass: match all export statements (including multi-line)
  // Match: export { ... } from './file';  and  export type { ... } from './file';
  const exportRegex = /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]\.\/([\w-]+)['"]/g;
  let match;

  while ((match = exportRegex.exec(source)) !== null) {
    const isTypeOnly = source.slice(match.index, match.index + 15).includes('export type');
    const namesStr = match[1]!;
    const sourceFile = match[2]! + '.tsx';

    // Determine which phase this export belongs to
    const lineNum = source.slice(0, match.index).split('\n').length - 1;
    const { category, categorySlug } = getCategoryForLine(lineNum);

    const names = namesStr.split(',').map((n) => n.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean);
    for (const name of names) {
      if (name && !isTypeOnly) {
        map[name] = { category, categorySlug, sourceFile };
      }
    }
  }

  return map;
}

// ─── Extract component info from source file ────────────────────────────────

function extractDataSlot(sourceFile: SourceFile, componentName: string): string {
  const text = sourceFile.getFullText();
  // Look for data-slot="xxx" in JSX
  const slotMatch = text.match(/data-slot="([^"]+)"/);
  return slotMatch?.[1] ?? kebabCase(componentName);
}

function extractCvaVariants(sourceFile: SourceFile): { variants: VariantInfo[]; defaultVariants: Record<string, string> } {
  const variants: VariantInfo[] = [];
  const defaultVariants: Record<string, string> = {};

  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const call of callExpressions) {
    const expr = call.getExpression();
    if (expr.getText() !== 'cva') continue;

    const args = call.getArguments();
    if (args.length < 2) continue;

    const configArg = args[1]!;
    if (configArg.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;

    const configObj = configArg.asKind(SyntaxKind.ObjectLiteralExpression)!;

    // Extract variants
    const variantsProp = configObj.getProperty('variants');
    if (variantsProp?.getKind() === SyntaxKind.PropertyAssignment) {
      const variantsInit = (variantsProp as any).getInitializer?.();
      if (variantsInit?.getKind() === SyntaxKind.ObjectLiteralExpression) {
        for (const prop of variantsInit.getProperties()) {
          if (prop.getKind() === SyntaxKind.PropertyAssignment) {
            const variantName = (prop as any).getName?.();
            const init = (prop as any).getInitializer?.();
            if (init?.getKind() === SyntaxKind.ObjectLiteralExpression) {
              const options = init.getProperties().map((p: any) => p.getName?.()).filter(Boolean);
              if (variantName && options.length > 0) {
                variants.push({ name: variantName, options });
              }
            }
          }
        }
      }
    }

    // Extract defaultVariants
    const defaultsProp = configObj.getProperty('defaultVariants');
    if (defaultsProp?.getKind() === SyntaxKind.PropertyAssignment) {
      const defaultsInit = (defaultsProp as any).getInitializer?.();
      if (defaultsInit?.getKind() === SyntaxKind.ObjectLiteralExpression) {
        for (const prop of defaultsInit.getProperties()) {
          if (prop.getKind() === SyntaxKind.PropertyAssignment) {
            const name = (prop as any).getName?.();
            const value = (prop as any).getInitializer?.()?.getText?.()?.replace(/['"]/g, '');
            if (name && value) defaultVariants[name] = value;
          }
        }
      }
    }

    break; // Only process the first cva() call
  }

  return { variants, defaultVariants };
}

function extractPropsFromFunction(sourceFile: SourceFile, funcName: string): { props: PropInfo[]; extendsElement: string } {
  const props: PropInfo[] = [];
  let extendsElement = '';

  // Find the function declaration
  const functions = sourceFile.getFunctions().filter((f) => f.getName() === funcName);
  if (functions.length === 0) {
    // Try variable declaration with arrow function
    const varDecl = sourceFile.getVariableDeclaration(funcName);
    if (varDecl) {
      const init = varDecl.getInitializer();
      if (init) {
        // For forwardRef patterns, try to extract from type annotation
        const typeText = varDecl.getType().getText();
        if (typeText.includes('ForwardRef')) {
          return { props, extendsElement: 'React.ForwardRefExoticComponent' };
        }
      }
    }
    return { props, extendsElement };
  }

  const func = functions[0]!;
  const params = func.getParameters();
  if (params.length === 0) return { props, extendsElement };

  const firstParam = params[0]!;
  const typeNode = firstParam.getTypeNode();
  if (!typeNode) return { props, extendsElement };

  const typeText = typeNode.getText();

  // Check for React.ComponentProps<'element'> pattern
  const elementMatch = typeText.match(/React\.ComponentProps<['"](\w+)['"]>/);
  if (elementMatch) {
    extendsElement = elementMatch[1]!;
  }

  // Check for React.ComponentProps<typeof Primitive> pattern
  const primitiveMatch = typeText.match(/React\.ComponentProps<typeof\s+(\w+)(?:\.(\w+))?>/);
  if (primitiveMatch) {
    extendsElement = primitiveMatch[2] ? `${primitiveMatch[1]}.${primitiveMatch[2]}` : primitiveMatch[1]!;
  }

  // If using destructured object pattern, extract from binding elements
  if (firstParam.getKind() === SyntaxKind.Parameter) {
    const nameNode = firstParam.getNameNode();
    if (nameNode?.getKind() === SyntaxKind.ObjectBindingPattern) {
      const bindingPattern = nameNode.asKind(SyntaxKind.ObjectBindingPattern)!;
      for (const element of bindingPattern.getElements()) {
        const propName = element.getName();
        if (propName === 'className' || propName === 'children') continue;
        // Skip rest parameters (the ...props spread)
        if (element.getDotDotDotToken()) continue;

        // Try to get default value
        const initializer = element.getInitializer();
        const defaultValue = initializer?.getText()?.replace(/['"]/g, '');

        // Get type from the parameter type intersection
        let propType = 'unknown';
        try {
          const symbol = element.getNameNode().getSymbol();
          if (symbol) {
            propType = shortenType(symbol.getTypeAtLocation(element).getText());
          }
        } catch {
          // Fallback
        }

        if (propName !== 'ref') {
          props.push({
            name: propName,
            type: propType,
            required: !initializer && !typeText.includes(`${propName}?`),
            defaultValue,
            description: '',
          });
        }
      }
    }
  }

  return { props, extendsElement };
}

function extractPropsFromInterface(sourceFile: SourceFile, interfaceName: string): PropInfo[] {
  const props: PropInfo[] = [];
  const iface = sourceFile.getInterface(interfaceName);
  if (!iface) {
    // Try type alias
    const typeAlias = sourceFile.getTypeAlias(interfaceName);
    if (!typeAlias) return props;
    // Can't easily extract properties from type aliases without resolving
    return props;
  }

  for (const prop of iface.getProperties()) {
    const name = prop.getName();
    if (name === 'className' || name === 'children') continue;

    const typeNode = prop.getTypeNode();
    const propType = typeNode ? shortenType(typeNode.getText()) : 'unknown';
    const description = getJsDoc(prop);

    props.push({
      name,
      type: propType,
      required: !prop.hasQuestionToken(),
      defaultValue: undefined,
      description,
    });
  }

  return props;
}

function extractComponentDoc(
  sourceFile: SourceFile,
  componentName: string,
  category: string,
  categorySlug: string,
): ComponentDoc | null {
  const fileName = basename(sourceFile.getFilePath());
  const slug = kebabCase(componentName);

  // Get JSDoc from multiple sources
  let description = '';
  let aiContext = '';
  let examples: string[] = [];

  // Strategy 1: Try all statements for JSDoc (file-level, functions, const declarations)
  const statements = sourceFile.getStatements();
  for (const stmt of statements) {
    const doc = getJsDoc(stmt);
    if (doc && doc.length > 10) {
      description = doc.split('\n')[0]?.replace(/^[\w\s]+ —\s*/, '') ?? '';
      aiContext = getAiContext(stmt);
      examples = getExamples(stmt);
      break;
    }
  }

  // Strategy 2: Try the named function directly
  if (!description) {
    const func = sourceFile.getFunction(componentName);
    if (func) {
      const doc = getJsDoc(func);
      if (doc) {
        description = doc.split('\n')[0]?.replace(/^[\w\s]+ —\s*/, '') ?? '';
        aiContext = getAiContext(func);
        examples = getExamples(func);
      }
    }
  }

  // Strategy 3: Parse raw file text for the first block comment
  if (!description) {
    const fullText = sourceFile.getFullText();
    const blockCommentMatch = fullText.match(/\/\*\*\s*\n?\s*\*?\s*(\w[\s\S]*?)(?:\n\s*\*\s*@|\n\s*\*\/)/);
    if (blockCommentMatch) {
      const firstLine = blockCommentMatch[1]!.split('\n')[0]!.trim();
      description = firstLine.replace(/^[\w\s]+ —\s*/, '').replace(/^\*\s*/, '');
    }
  }

  // Extract CVA variants
  const { variants, defaultVariants } = extractCvaVariants(sourceFile);

  // Extract props
  let props: PropInfo[] = [];
  let extendsElement = '';

  // Try explicit Props interface first
  const propsInterfaceName = `${componentName}Props`;
  const ifaceProps = extractPropsFromInterface(sourceFile, propsInterfaceName);
  if (ifaceProps.length > 0) {
    props = ifaceProps;
  }

  // Try function parameter extraction
  const funcResult = extractPropsFromFunction(sourceFile, componentName);
  if (funcResult.props.length > 0 && props.length === 0) {
    props = funcResult.props;
  }
  if (funcResult.extendsElement) {
    extendsElement = funcResult.extendsElement;
  }

  // Find data-slot
  const dataSlot = extractDataSlot(sourceFile, componentName);

  // Find all exported functions/components in this file (for sub-components)
  const subComponents: SubComponentDoc[] = [];
  const allExportedFunctions = sourceFile.getFunctions().filter((f) => f.isExported());
  for (const func of allExportedFunctions) {
    const name = func.getName();
    if (!name || name === componentName) continue;

    const subDoc = getJsDoc(func);
    const subPropsResult = extractPropsFromFunction(sourceFile, name);

    // Find data-slot for sub-component
    const funcText = func.getText();
    const subSlotMatch = funcText.match(/data-slot="([^"]+)"/);

    subComponents.push({
      name,
      description: subDoc.split('\n')[0] ?? '',
      props: subPropsResult.props,
      dataSlot: subSlotMatch?.[1] ?? kebabCase(name),
      extendsElement: subPropsResult.extendsElement,
    });
  }

  // Collect all exports
  const exports = sourceFile.getExportedDeclarations();
  const exportNames: string[] = [];
  for (const [name] of exports) {
    exportNames.push(name);
  }

  return {
    name: componentName,
    slug,
    fileName,
    category,
    categorySlug,
    description,
    aiContext,
    examples,
    props,
    variants,
    defaultVariants,
    stories: [], // Filled in later
    subComponents,
    exports: exportNames,
    dataSlot,
    extendsElement,
  };
}

// ─── Parse story files ──────────────────────────────────────────────────────

/**
 * Compute a Storybook story ID matching the CSF3 sanitize algorithm.
 *
 * Storybook's `sanitize()`:
 * - Replaces spaces with hyphens
 * - Lowercases everything
 * - Does NOT split PascalCase (FileTree → filetree, not file-tree)
 *
 * For story names (exported const names), Storybook applies the same sanitize
 * but PascalCase IS split because export names use PascalCase while title
 * segments may use either spaces or PascalCase.
 */
function storybookSanitize(str: string): string {
  return str
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toLowerCase();
}

function computeStoryId(title: string, storyName: string): string {
  // Title: each segment sanitized (spaces→hyphens, lowercase), joined by '-'
  const titlePart = title
    .split('/')
    .map((s) => storybookSanitize(s))
    .join('-');
  // Story name: PascalCase → kebab-case, then sanitize
  const storyPart = storybookSanitize(
    storyName.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  );
  return `${titlePart}--${storyPart}`;
}

/** Load the actual story ID index from storybook-static if available */
function loadStorybookIndex(): Set<string> | null {
  const indexPath = resolve(UI_ROOT, 'storybook-static/index.json');
  if (!existsSync(indexPath)) return null;
  try {
    const data = JSON.parse(readFileSync(indexPath, 'utf-8'));
    const entries = data.entries ?? data.stories ?? {};
    return new Set(Object.keys(entries));
  } catch {
    return null;
  }
}

function extractStoriesFromFile(filePath: string): { title: string; stories: StoryInfo[] } {
  const source = readFileSync(filePath, 'utf-8');
  const stories: StoryInfo[] = [];

  // Extract title from meta
  const titleMatch = source.match(/title:\s*['"]([^'"]+)['"]/);
  const title = titleMatch?.[1] ?? 'Unknown';

  // Find all named exports (stories)
  const storyPattern = /export\s+const\s+(\w+):\s*Story\s*=\s*(\{[\s\S]*?\n\})/g;
  let match;

  while ((match = storyPattern.exec(source)) !== null) {
    const storyName = match[1]!;
    const storyBody = match[2]!;

    // Check for render function
    const hasRender = storyBody.includes('render:');
    let sourceCode = '';

    if (hasRender) {
      // Extract render function body (JSX)
      // Match render: () => ( ... ) or render: () => <JSX>
      const renderMatch = storyBody.match(/render:\s*\([^)]*\)\s*=>\s*\(?\s*\n?([\s\S]*?)(?:\n\s*\)\s*,?\s*$|\n\s*\},|\n\})/);
      if (renderMatch) {
        const rawLines = renderMatch[1]!
          .replace(/^\s*\n/, '')
          .replace(/\n\s*\)?\s*,?\s*$/, '')
          .split('\n');
        // Dedent by the minimum indentation across non-empty lines.
        // Skip lines with 0 indent (regex artifact from first captured line).
        const indentedLines = rawLines.filter((l) => l.trim().length > 0 && l.match(/^\s*/)![0].length > 0);
        const minIndent = indentedLines.length > 0
          ? indentedLines.reduce((min, l) => Math.min(min, l.match(/^\s*/)![0].length), Infinity)
          : 0;
        sourceCode = rawLines
          .map((l) => {
            const leadingSpaces = l.match(/^\s*/)![0].length;
            return leadingSpaces >= minIndent ? l.slice(minIndent) : l;
          })
          .join('\n')
          .trim();
        // Remove trailing ), from JSX blocks
        sourceCode = sourceCode.replace(/\s*\),?\s*$/, '');

        // If the render is just a single local demo component (e.g. <DrawerLayoutDemo />),
        // resolve it to the function's JSX body from the same file.
        const singleCompMatch = sourceCode.match(/^<(\w+)\s*\/>,?$/);
        if (singleCompMatch) {
          const demoName = singleCompMatch[1]!;
          const demoPattern = new RegExp(
            `function\\s+${demoName}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?return\\s*\\(\\n?([\\s\\S]*?)\\n\\s*\\);?\\n\\s*\\}`,
          );
          const demoMatch = source.match(demoPattern);
          if (demoMatch) {
            // Dedent the extracted JSX
            const demoLines = demoMatch[1]!.split('\n');
            const minIndent = demoLines
              .filter((l) => l.trim().length > 0)
              .reduce((min, l) => Math.min(min, l.match(/^\s*/)![0].length), Infinity);
            sourceCode = demoLines
              .map((l) => l.slice(minIndent))
              .join('\n')
              .trim();
          }
        }
      }
    } else {
      // Extract args and reconstruct JSX
      const argsMatch = storyBody.match(/args:\s*\{([^}]+)\}/);
      if (argsMatch) {
        const argsText = argsMatch[1]!.trim();
        // Parse key: value pairs
        const argPairs: string[] = [];
        let children = '';
        for (const part of argsText.split(',')) {
          const kv = part.trim().match(/(\w+):\s*(.+)/);
          if (!kv) continue;
          const [, key, value] = kv;
          if (key === 'children') {
            children = value!.replace(/^['"]|['"]$/g, '');
          } else {
            const val = value!.trim().replace(/^['"]|['"]$/g, '');
            argPairs.push(`${key}="${val}"`);
          }
        }

        // Get component name from meta's component field or first import
        const compFieldMatch = source.match(/component:\s*(\w+)/);
        const compName = compFieldMatch?.[1] ?? 'Component';

        if (children) {
          sourceCode = argPairs.length > 0
            ? `<${compName} ${argPairs.join(' ')}>${children}</${compName}>`
            : `<${compName}>${children}</${compName}>`;
        } else {
          sourceCode = `<${compName} ${argPairs.join(' ')} />`;
        }
      }
    }

    // Convert storyName from PascalCase to display name
    const displayName = storyName.replace(/([a-z])([A-Z])/g, '$1 $2');

    stories.push({
      name: storyName,
      displayName,
      storyId: computeStoryId(title, storyName),
      sourceCode,
      hasRender,
    });
  }

  return { title, stories };
}

// ─── Markdown generation ────────────────────────────────────────────────────

function generateComponentMarkdown(doc: ComponentDoc): string {
  const lines: string[] = [];

  // Frontmatter
  lines.push('---');
  lines.push(`outline: [2, 3]`);
  lines.push('---');
  lines.push('');

  // Title
  lines.push(`# ${doc.name}`);
  lines.push('');
  if (doc.description) {
    lines.push(doc.description);
    lines.push('');
  }

  // Preview — show the first multi-variant story or the default story
  const previewStory = doc.stories.find((s) => s.hasRender) ?? doc.stories[0];
  if (previewStory) {
    lines.push(`<ComponentPreview storyId="${previewStory.storyId}" title="${previewStory.displayName}" height="200" />`);
    lines.push('');
  }

  // Usage — import + example in a single code block
  lines.push('## Usage');
  lines.push('');
  lines.push('```tsx');
  const importNames = [doc.name, ...doc.subComponents.map((s) => s.name)].join(', ');
  lines.push(`import { ${importNames} } from '@tryvienna/ui'`);
  lines.push('');
  if (doc.examples.length > 0) {
    for (const example of doc.examples) {
      lines.push(example);
    }
  } else {
    // Use the default/first story's source code as the usage example,
    // but only if it actually references the documented component (not a Demo wrapper).
    const defaultStory = doc.stories.find((s) => s.name.toLowerCase() === 'default') ?? doc.stories[0];
    const allComponentNames = [doc.name, ...doc.subComponents.map((s) => s.name)];
    const codeRefsComponent = defaultStory?.sourceCode &&
      allComponentNames.some((n) => defaultStory.sourceCode.includes(`<${n}`));
    if (codeRefsComponent) {
      lines.push(defaultStory!.sourceCode);
    } else {
      // Fallback: simple JSX tag
      lines.push(`<${doc.name}>...</${doc.name}>`);
    }
  }
  lines.push('```');
  lines.push('');

  // Examples from stories
  if (doc.stories.length > 0) {
    lines.push('## Examples');
    lines.push('');

    for (const story of doc.stories) {
      lines.push(`### ${story.displayName}`);
      lines.push('');
      lines.push(`<ComponentPreview storyId="${story.storyId}" title="${story.displayName}" height="200" />`);
      lines.push('');
      if (story.sourceCode) {
        lines.push('```tsx');
        lines.push(story.sourceCode);
        lines.push('```');
        lines.push('');
      }
    }
  }

  // Variants
  if (doc.variants.length > 0) {
    lines.push('## Variants');
    lines.push('');
    lines.push('| Name | Options | Default |');
    lines.push('|------|---------|---------|');
    for (const v of doc.variants) {
      const options = v.options.map((o) => `\`${o}\``).join(' \\| ');
      const defaultVal = doc.defaultVariants[v.name] ? `\`${doc.defaultVariants[v.name]}\`` : '-';
      lines.push(`| \`${v.name}\` | ${options} | ${defaultVal} |`);
    }
    lines.push('');
  }

  // API Reference
  lines.push('## API Reference');
  lines.push('');

  // Main component props
  if (doc.props.length > 0 || doc.extendsElement) {
    lines.push(`### ${doc.name}`);
    lines.push('');

    if (doc.props.length > 0) {
      lines.push('| Prop | Type | Default | Description |');
      lines.push('|------|------|---------|-------------|');
      for (const prop of doc.props) {
        const type = escapeType(shortenType(prop.type));
        const def = prop.defaultValue ? `\`${prop.defaultValue}\`` : '-';
        const desc = escapeMarkdown(prop.description);
        lines.push(`| \`${prop.name}\` | \`${type}\` | ${def} | ${desc} |`);
      }
      lines.push('');
    }

    if (doc.extendsElement) {
      lines.push(`Also accepts all props from \`${escapeType(doc.extendsElement)}\`.`);
      lines.push('');
    }
  }

  // Sub-component props
  for (const sub of doc.subComponents) {
    lines.push(`### ${sub.name}`);
    lines.push('');
    if (sub.description) {
      lines.push(sub.description);
      lines.push('');
    }

    if (sub.props.length > 0) {
      lines.push('| Prop | Type | Default | Description |');
      lines.push('|------|------|---------|-------------|');
      for (const prop of sub.props) {
        const type = escapeType(shortenType(prop.type));
        const def = prop.defaultValue ? `\`${prop.defaultValue}\`` : '-';
        const desc = escapeMarkdown(prop.description);
        lines.push(`| \`${prop.name}\` | \`${type}\` | ${def} | ${desc} |`);
      }
      lines.push('');
    }

    if (sub.extendsElement) {
      lines.push(`Also accepts all props from \`${escapeType(sub.extendsElement)}\`.`);
      lines.push('');
    }
  }

  // Data Attributes
  const allSlots = [
    { name: doc.name, slot: doc.dataSlot },
    ...doc.subComponents.map((s) => ({ name: s.name, slot: s.dataSlot })),
  ].filter((s) => s.slot);

  if (allSlots.length > 0) {
    lines.push('## Data Attributes');
    lines.push('');
    lines.push('| Component | `data-slot` |');
    lines.push('|-----------|-------------|');
    for (const s of allSlots) {
      lines.push(`| \`${s.name}\` | \`"${s.slot}"\` |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateIndexPage(docs: ComponentDoc[]): string {
  const lines: string[] = [];

  lines.push('---');
  lines.push('outline: [2, 3]');
  lines.push('---');
  lines.push('');
  lines.push('# UI Components');
  lines.push('');
  lines.push('The complete component library for Vienna plugins. Built on Radix UI + Tailwind CSS v4 + CVA.');
  lines.push('');
  lines.push('::: tip Auto-generated');
  lines.push('This reference is generated from the @tryvienna/ui source code and Storybook stories.');
  lines.push('Regenerate with `pnpm --filter @vienna/docs generate:ui-reference`.');
  lines.push(':::');
  lines.push('');

  // Group by category
  const categories = new Map<string, ComponentDoc[]>();
  for (const doc of docs) {
    const existing = categories.get(doc.category) ?? [];
    existing.push(doc);
    categories.set(doc.category, existing);
  }

  for (const [category, components] of categories) {
    lines.push(`## ${category}`);
    lines.push('');
    for (const comp of components) {
      const desc = comp.description ? ` — ${comp.description}` : '';
      lines.push(`- [${comp.name}](/reference/components/${comp.slug})${desc}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateSidebarJson(docs: ComponentDoc[]): string {
  const categories = new Map<string, ComponentDoc[]>();
  for (const doc of docs) {
    const existing = categories.get(doc.category) ?? [];
    existing.push(doc);
    categories.set(doc.category, existing);
  }

  const sidebar: Array<{ text: string; collapsed: boolean; items: Array<{ text: string; link: string }> }> = [];

  for (const [category, components] of categories) {
    sidebar.push({
      text: category,
      collapsed: false,
      items: components
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({
          text: c.name,
          link: `/reference/components/${c.slug}`,
        })),
    });
  }

  return JSON.stringify(sidebar, null, 2);
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log('Generating UI component reference...');

  // 1. Parse category map from index.ts
  const categoryMap = parseCategoryMap();
  console.log(`Found ${Object.keys(categoryMap).length} exports in index.ts`);

  // 2. Create ts-morph project for component source files
  const project = new Project({
    tsConfigFilePath: resolve(UI_ROOT, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: false,
  });

  // 3. Group exports by source file to create one page per file
  const fileToExports = new Map<string, { names: string[]; category: string; categorySlug: string }>();
  for (const [name, info] of Object.entries(categoryMap)) {
    const existing = fileToExports.get(info.sourceFile);
    if (existing) {
      existing.names.push(name);
    } else {
      fileToExports.set(info.sourceFile, {
        names: [name],
        category: info.category,
        categorySlug: info.categorySlug,
      });
    }
  }

  // 4. Extract component docs
  const docs: ComponentDoc[] = [];

  for (const [fileName, { names, category, categorySlug }] of fileToExports) {
    const filePath = resolve(COMPONENTS_DIR, fileName);
    let sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) {
      // Try adding the file directly
      try {
        sourceFile = project.addSourceFileAtPath(filePath);
      } catch {
        console.warn(`  Skipping ${fileName}: source file not found`);
        continue;
      }
    }

    // Determine the "primary" component (first exported, or name matching file)
    const baseName = fileName.replace('.tsx', '');
    const primaryName = names.find((n) => n.toLowerCase() === baseName.replace(/-/g, '').toLowerCase())
      ?? names.find((n) => !n.includes('Variants') && !n.startsWith('use') && /^[A-Z]/.test(n))
      ?? names[0]!;

    // Skip utility-only exports (functions, hooks, constants that aren't components)
    if (!/^[A-Z]/.test(primaryName)) continue;

    const doc = extractComponentDoc(sourceFile, primaryName, category, categorySlug);
    if (!doc) continue;

    docs.push(doc);
  }

  console.log(`Extracted ${docs.length} component docs`);

  // 5. Parse story files and match to component docs
  const storyFiles = readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith('.stories.tsx'));
  const storyMap = new Map<string, { title: string; stories: StoryInfo[] }>();

  for (const storyFile of storyFiles) {
    const storyPath = resolve(COMPONENTS_DIR, storyFile);
    try {
      const result = extractStoriesFromFile(storyPath);
      // Map story file name to component file name
      const componentFileName = storyFile.replace('.stories.tsx', '.tsx');
      storyMap.set(componentFileName, result);
    } catch (err) {
      console.warn(`  Warning: Failed to parse ${storyFile}: ${(err as Error).message}`);
    }
  }

  // Load real Storybook index for ID validation
  const storybookIndex = loadStorybookIndex();
  if (storybookIndex) {
    console.log(`Loaded ${storybookIndex.size} entries from storybook-static/index.json`);
  }

  // Match stories to component docs
  let mismatches = 0;
  for (const doc of docs) {
    const storyData = storyMap.get(doc.fileName);
    if (storyData) {
      // Validate/fix story IDs against the real Storybook index
      if (storybookIndex) {
        for (const story of storyData.stories) {
          if (!storybookIndex.has(story.storyId)) {
            // Try to find the real ID by fuzzy matching
            const titleBase = storyData.title.split('/').map(s => s.replace(/\s+/g, '').toLowerCase()).join('-');
            const realId = [...storybookIndex].find((id) => {
              if (!id.startsWith(titleBase + '--')) return false;
              // Match story name part case-insensitively
              const realStoryPart = id.split('--')[1]!;
              const computedStoryPart = story.storyId.split('--')[1]!;
              return realStoryPart === computedStoryPart ||
                realStoryPart.replace(/-/g, '') === computedStoryPart.replace(/-/g, '');
            });
            if (realId) {
              story.storyId = realId;
            } else {
              mismatches++;
              console.warn(`  ID mismatch: computed "${story.storyId}" not found in Storybook index`);
            }
          }
        }
      }
      // Filter out 'docs' stories (auto-generated by Storybook, not real examples)
      doc.stories = storyData.stories.filter((s) => s.name !== 'Docs' && s.name !== 'docs');
    }
  }
  if (mismatches > 0) {
    console.warn(`  ${mismatches} story ID mismatches — rebuild Storybook to sync`);
  }

  // 6. Generate output — clean stale files first
  if (existsSync(OUTPUT_DIR)) {
    for (const f of readdirSync(OUTPUT_DIR)) {
      if (f.endsWith('.md') || f.endsWith('.json')) {
        rmSync(resolve(OUTPUT_DIR, f));
      }
    }
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });

  let generated = 0;
  for (const doc of docs) {
    const markdown = generateComponentMarkdown(doc);
    const outputPath = resolve(OUTPUT_DIR, `${doc.slug}.md`);
    writeFileSync(outputPath, markdown, 'utf-8');
    generated++;
  }

  // Generate index page
  const indexMarkdown = generateIndexPage(docs);
  writeFileSync(resolve(OUTPUT_DIR, 'index.md'), indexMarkdown, 'utf-8');

  // Generate sidebar JSON
  const sidebarJson = generateSidebarJson(docs);
  writeFileSync(resolve(OUTPUT_DIR, '_sidebar.json'), sidebarJson, 'utf-8');

  console.log(`Generated ${generated} component pages + index + sidebar`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main();
