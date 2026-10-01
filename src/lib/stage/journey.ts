// Journey: maps scroll progress P to chapter and frame
// Monotonic and reversible

import type { Chapter } from '../../content';
import { chapters, getFeaturedPhotos } from '../../content';

export interface Segment {
  type: 'title' | 'frame';
  chapter: Chapter;
  frameIndex?: number;
  startP: number;
  endP: number;
}

export interface JourneyState {
  segments: Segment[];
  totalP: number;
}

// Build the journey from content
export function buildJourney(): JourneyState {
  const segments: Segment[] = [];
  let currentP = 0;

  // Proportions: title cards ~80svh, frames ~90svh each
  const titleWeight = 80;
  const frameWeight = 90;
  
  // Calculate total weight first
  let totalWeight = 0;
  for (const chapter of chapters) {
    totalWeight += titleWeight;
    const featured = getFeaturedPhotos(chapter);
    totalWeight += featured.length * frameWeight;
  }

  // Build segments
  for (const chapter of chapters) {
    const featured = getFeaturedPhotos(chapter);
    
    // Title card segment
    const titleEnd = currentP + titleWeight / totalWeight;
    segments.push({
      type: 'title',
      chapter,
      startP: currentP,
      endP: titleEnd,
    });
    currentP = titleEnd;

    // Frame segments
    for (let i = 0; i < featured.length; i++) {
      const frameEnd = currentP + frameWeight / totalWeight;
      segments.push({
        type: 'frame',
        chapter,
        frameIndex: i,
        startP: currentP,
        endP: frameEnd,
      });
      currentP = frameEnd;
    }
  }

  return { segments, totalP: currentP };
}

// Get current segment from progress P (0-1)
export function getSegmentAt(journey: JourneyState, p: number): Segment {
  const clampedP = Math.max(0, Math.min(1, p));
  for (const seg of journey.segments) {
    if (clampedP >= seg.startP && clampedP < seg.endP) {
      return seg;
    }
  }
  return journey.segments[journey.segments.length - 1];
}

// Get local progress within a segment (0-1)
export function getLocalProgress(segment: Segment, p: number): number {
  const range = segment.endP - segment.startP;
  if (range <= 0) return 0;
  return Math.max(0, Math.min(1, (p - segment.startP) / range));
}

// Get chapter index from segment
export function getChapterIndex(chapter: Chapter): number {
  return chapters.indexOf(chapter);
}
