/**
 * splitPlanIntoSlides — Splits a markdown plan into presentation slides
 *
 * @ai-context
 * - Regex-based parsing: h1/h2/h3 headings start new slides
 * - Content before first heading becomes an "Overview" slide
 * - Pure function, no React dependency
 *
 * @example
 * const slides = splitPlanIntoSlides('# Title\nContent\n## Section\nMore');
 */

export interface PlanSlide {
  /** Zero-based slide index */
  index: number;
  /** Heading text for this slide */
  heading: string;
  /** Heading level (1-3), or 0 for the overview slide */
  headingLevel: number;
  /** Raw markdown content for the slide (heading + body) */
  markdown: string;
}

/**
 * Split markdown plan content into slides based on headings.
 *
 * - h1/h2/h3 headings start a new slide
 * - Content before the first heading becomes an "Overview" slide
 * - If there are no headings, the entire plan becomes one "Overview" slide
 */
export function splitPlanIntoSlides(markdown: string): PlanSlide[] {
  if (!markdown.trim()) return [];

  const lines = markdown.split('\n');
  const slides: PlanSlide[] = [];
  let currentHeading = '';
  let currentLevel = 0;
  let currentLines: string[] = [];

  function flushSlide() {
    const md = currentLines.join('\n').trim();
    if (!md) return;

    slides.push({
      index: slides.length,
      heading: currentHeading || 'Overview',
      headingLevel: currentLevel,
      markdown: md,
    });
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushSlide();
      currentLevel = headingMatch[1].length;
      currentHeading = headingMatch[2];
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  flushSlide();

  return slides;
}
