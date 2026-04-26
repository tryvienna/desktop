---
layout: home

hero:
  name: Vienna
  text: Documentation
  tagline: A local-first, provider-agnostic desktop IDE for orchestrating AI coding agents.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Build a plugin
      link: /guide/plugin-development
    - theme: alt
      text: GitHub
      link: https://github.com/tryvienna/desktop

features:
  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
    title: Entity System
    details: Define custom entity types with URI addressing, display metadata, and caching — automatically exposed via GraphQL and MCP through integration schema callbacks.
    link: /guide/plugin-development#_3-2-define-the-entity
  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
    title: Integrations
    details: Connect to external APIs with typed clients, OAuth, and GraphQL schema extensions. Define queries, mutations, and entity handlers in one place.
    link: /guide/plugin-development#_3-3-define-the-integration
  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m10 8 4 4-4 4"/></svg>
    title: Plugin Canvases
    details: Extend the app UI with nav-sidebar, drawer, and menu-bar canvases. Plugin components render in named slots with typed props and host API access.
    link: /guide/plugin-development#_3-5-build-ui-canvases
  - icon: |-
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>
    title: API Reference
    details: Auto-generated reference for the Plugin SDK — definition factories, URI utilities, React hooks, types, registries, and testing.
    link: /reference/sdk
---
