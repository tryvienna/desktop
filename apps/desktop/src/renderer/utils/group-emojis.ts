/**
 * Curated emoji list for workstream group icons.
 *
 * @ai-context
 * - Used by both the group creation form (combobox step) and settings drawer (EmojiPicker)
 * - Organized by category for the picker grid; flattened for the combobox
 * - Each entry has the emoji character and a searchable label
 */

export interface EmojiEntry {
  emoji: string;
  label: string;
}

export interface EmojiCategory {
  name: string;
  emojis: EmojiEntry[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Work',
    emojis: [
      { emoji: '🚀', label: 'Rocket' },
      { emoji: '⚡', label: 'Lightning' },
      { emoji: '🔥', label: 'Fire' },
      { emoji: '💡', label: 'Light bulb' },
      { emoji: '🎯', label: 'Target' },
      { emoji: '🔧', label: 'Wrench' },
      { emoji: '🛠️', label: 'Tools' },
      { emoji: '⚙️', label: 'Gear' },
      { emoji: '🏗️', label: 'Construction' },
      { emoji: '📦', label: 'Package' },
      { emoji: '🧪', label: 'Test tube' },
      { emoji: '🔬', label: 'Microscope' },
      { emoji: '🧩', label: 'Puzzle' },
      { emoji: '🎨', label: 'Art' },
      { emoji: '✏️', label: 'Pencil' },
    ],
  },
  {
    name: 'Status',
    emojis: [
      { emoji: '✅', label: 'Check mark' },
      { emoji: '⭐', label: 'Star' },
      { emoji: '💎', label: 'Gem' },
      { emoji: '🏆', label: 'Trophy' },
      { emoji: '🎉', label: 'Party' },
      { emoji: '❤️', label: 'Heart' },
      { emoji: '🔒', label: 'Lock' },
      { emoji: '🔑', label: 'Key' },
      { emoji: '🚧', label: 'Construction sign' },
      { emoji: '🚨', label: 'Alert' },
      { emoji: '📌', label: 'Pin' },
      { emoji: '🏷️', label: 'Label' },
    ],
  },
  {
    name: 'Objects',
    emojis: [
      { emoji: '📊', label: 'Chart' },
      { emoji: '📈', label: 'Trending up' },
      { emoji: '📋', label: 'Clipboard' },
      { emoji: '📝', label: 'Memo' },
      { emoji: '📁', label: 'Folder' },
      { emoji: '📚', label: 'Books' },
      { emoji: '💻', label: 'Laptop' },
      { emoji: '🖥️', label: 'Desktop' },
      { emoji: '📱', label: 'Phone' },
      { emoji: '🌐', label: 'Globe' },
      { emoji: '☁️', label: 'Cloud' },
      { emoji: '🗄️', label: 'File cabinet' },
    ],
  },
  {
    name: 'Nature',
    emojis: [
      { emoji: '🌱', label: 'Seedling' },
      { emoji: '🌿', label: 'Herb' },
      { emoji: '🌸', label: 'Blossom' },
      { emoji: '🌊', label: 'Wave' },
      { emoji: '🌙', label: 'Moon' },
      { emoji: '☀️', label: 'Sun' },
      { emoji: '🐝', label: 'Bee' },
      { emoji: '🦋', label: 'Butterfly' },
      { emoji: '🐙', label: 'Octopus' },
      { emoji: '🦊', label: 'Fox' },
    ],
  },
  {
    name: 'Symbols',
    emojis: [
      { emoji: '♻️', label: 'Recycle' },
      { emoji: '🔄', label: 'Refresh' },
      { emoji: '➡️', label: 'Arrow right' },
      { emoji: '🔗', label: 'Link' },
      { emoji: '💬', label: 'Speech bubble' },
      { emoji: '🏠', label: 'House' },
      { emoji: '🎵', label: 'Music' },
      { emoji: '🎮', label: 'Game' },
      { emoji: '🧲', label: 'Magnet' },
      { emoji: '🔮', label: 'Crystal ball' },
    ],
  },
];

/** Flat list of all emojis (for combobox options). */
export const ALL_EMOJIS: EmojiEntry[] = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
