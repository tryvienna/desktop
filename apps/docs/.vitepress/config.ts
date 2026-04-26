import { defineConfig } from 'vitepress'
import { resolve, relative } from 'node:path'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import componentSidebar from '../reference/components/_sidebar.json'

const featuresSidebar = [
  {
    text: 'Features',
    items: [
      { text: 'Workstreams', link: '/features/workstreams' },
      { text: 'Scopes', link: '/features/scopes' },
      { text: 'Inbox', link: '/features/inbox' },
      { text: 'The Feed', link: '/features/feed' },
    ],
  },
]

const guideSidebar = [
  {
    text: 'Plugin Development',
    items: [
      { text: 'Full Guide', link: '/guide/plugin-development' },
      { text: 'Event System', link: '/guide/events' },
      { text: 'Weather Plugin Tutorial', link: '/guide/weather-plugin-tutorial' },
      { text: 'Logging', link: '/guide/logging' },
    ],
  },
]

const referenceSidebar = [
  {
    text: 'Reference',
    items: [
      { text: 'CLI', link: '/reference/cli' },
      { text: 'Plugin SDK', link: '/reference/sdk' },
      { text: 'UI Components', link: '/reference/components/' },
    ],
  },
]

export default defineConfig({
  title: 'Vienna',
  description: 'Documentation for the Vienna development platform',
  lang: 'en-US',
  base: '/docs/',
  cleanUrls: true,
  lastUpdated: true,

  sitemap: {
    hostname: 'https://tryvienna.dev',
  },

  head: [
    ['link', { rel: 'icon', type: 'image/png', href: '/docs/v-icon.png' }],
    ['meta', { name: 'theme-color', content: '#b8a44e' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Vienna Docs' }],
    ['meta', { property: 'og:title', content: 'Vienna Documentation' }],
    ['meta', { property: 'og:description', content: 'Documentation for the Vienna development platform' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'Vienna Documentation' }],
  ],

  themeConfig: {
    siteTitle: 'Vienna',

    nav: [
      {
        text: 'Getting started',
        link: '/getting-started',
      },
      {
        text: 'Concepts',
        link: '/concepts',
      },
      {
        text: 'Features',
        link: '/features/workstreams',
      },
      {
        text: 'Plugin Development',
        link: '/guide/plugin-development',
      },
      {
        text: 'Reference',
        items: [
          { text: 'CLI', link: '/reference/cli' },
          { text: 'Plugin SDK', link: '/reference/sdk' },
          { text: 'UI Components', link: '/reference/components/' },
        ],
      },
      {
        text: 'FAQ',
        link: '/faq',
      },
    ],

    sidebar: {
      '/features/': featuresSidebar,
      '/guide/': guideSidebar,
      '/reference/cli': referenceSidebar,
      '/reference/sdk': referenceSidebar,
      '/reference/components/': componentSidebar,
    },

    outline: {
      level: [2, 3],
      label: 'On this page',
    },

    editLink: {
      pattern: 'https://github.com/tryvienna/desktop/edit/main/apps/docs/:path',
      text: 'Edit this page on GitHub',
    },

    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'medium',
      },
    },

    footer: {
      message: 'Released under the <a href="https://github.com/tryvienna/desktop/blob/main/LICENSE">Apache 2.0 License</a>.',
      copyright: `© ${new Date().getFullYear()} Vienna Contributors.`,
    },


    search: {
      provider: 'local',
      options: {
        detailedView: true,
      },
    },

    returnToTopLabel: 'Back to top',
    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },
  },

  markdown: {
    lineNumbers: true,
    image: {
      lazyLoading: true,
    },
  },

  async buildEnd({ outDir, srcDir }) {
    await generateHelpManifest(srcDir, outDir)
  },

  vite: {
    plugins: [{
      name: 'help-manifest-dev',
      configureServer(server) {
        server.middlewares.use('/docs/help-manifest.json', async (_req, res) => {
          const srcDir = resolve(__dirname, '..')
          const manifest = await buildHelpManifest(srcDir)
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify(manifest, null, 2))
        })
      },
    }],
  },
})

// ─── Help Manifest Generation ─────────────────────────────────────────────────
// Scans all .md files for command-palette-label frontmatter and writes a JSON
// manifest that the desktop app fetches to populate help commands.

interface HelpManifestEntry {
  label: string
  description: string
  path: string
  content: string
  prev: { text: string; link: string } | null
  next: { text: string; link: string } | null
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }

  const meta: Record<string, string> = {}
  for (const line of match[1]!.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    meta[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim()
  }
  return { meta, body: match[2]! }
}

/** Recursively find all .md files under a directory. */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = resolve(dir, entry.name)
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      results.push(...await findMarkdownFiles(full))
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') {
      results.push(full)
    }
  }
  return results
}

/** Build prev/next from the sidebar config for a given path, scoped to the
 *  matching sidebar section so navigation doesn't cross between e.g. features
 *  and plugin development guides. */
function resolvePrevNext(docPath: string, sidebar: Record<string, unknown>): {
  prev: { text: string; link: string } | null
  next: { text: string; link: string } | null
} {
  function flatten(obj: unknown): { text: string; link: string }[] {
    const items: { text: string; link: string }[] = []
    if (Array.isArray(obj)) {
      for (const item of obj) items.push(...flatten(item))
    } else if (obj && typeof obj === 'object') {
      const rec = obj as Record<string, unknown>
      if (typeof rec.link === 'string' && typeof rec.text === 'string') {
        items.push({ text: rec.text as string, link: rec.link as string })
      }
      if (rec.items) items.push(...flatten(rec.items))
    }
    return items
  }

  // Find which sidebar section the doc belongs to and resolve within it
  for (const key of Object.keys(sidebar)) {
    const flat = flatten(sidebar[key])
    const idx = flat.findIndex((item) => item.link === docPath)
    if (idx === -1) continue
    return {
      prev: idx > 0 ? flat[idx - 1]! : null,
      next: idx < flat.length - 1 ? flat[idx + 1]! : null,
    }
  }

  return { prev: null, next: null }
}

async function buildHelpManifest(srcDir: string): Promise<{ commands: HelpManifestEntry[] }> {
  const mdFiles = await findMarkdownFiles(srcDir)
  const entries: HelpManifestEntry[] = []

  // Reuse the same sidebar config used by VitePress for consistent prev/next
  const sidebar = {
    '/features/': featuresSidebar,
    '/guide/': guideSidebar,
    '/reference/cli': referenceSidebar,
    '/reference/sdk': referenceSidebar,
  }

  for (const file of mdFiles) {
    const raw = await readFile(file, 'utf-8')
    const { meta, body } = parseFrontmatter(raw)

    // Only include pages that opt in via command-palette-label
    if (!meta['command-palette-label']) continue

    const relPath = relative(srcDir, file)
    const docPath = '/' + relPath.replace(/\.md$/, '')

    const { prev, next } = resolvePrevNext(docPath, sidebar)

    entries.push({
      label: meta['command-palette-label'],
      description: meta['command-palette-description'] || '',
      path: docPath,
      content: body.trim(),
      prev,
      next,
    })
  }

  return { commands: entries }
}

async function generateHelpManifest(srcDir: string, outDir: string) {
  const manifest = await buildHelpManifest(srcDir)
  await writeFile(
    resolve(outDir, 'help-manifest.json'),
    JSON.stringify(manifest, null, 2),
  )
}
