// Journey: maps scroll progress P to chapter and frame
// B3.10: Exposes total weight, chapter ranges, and binary search for segments

import type { Chapter } from '../../content';
import { chapters, getFeaturedPhotos } from '../../content';

export interface Segment {
  type: 'title' | 'frame';
  chapter: Chapter;
  frameIndex?: number;
  startP: number;
  endP: number;
}

export interface ChapterRange {
  chapter: Chapter;
  startP: number;
  endP: number;
}

export interface JourneyState {
  segments: Segment[];
  chapterRanges: ChapterRange[];
  totalWeight: number;
  totalP: number;
}

// B3.10: Weights are now constants used in one place
const TITLE_WEIGHT = 80;
const FRAME_WEIGHT = 90;

// Build the journey from content
export function buildJourney(): JourneyState {
  const segments: Segment[] = [];
  const chapterRanges: ChapterRange[] = [];
  let currentP = 0;
  
  // Calculate total weight
  let totalWeight = 0;
  for (const chapter of chapters) {
    totalWeight += TITLE_WEIGHT;
    const featured = getFeaturedPhotos(chapter);
    totalWeight += featured.length * FRAME_WEIGHT;
  }

  // Build segments and chapter ranges
  for (const chapter of chapters) {
    const featured = getFeaturedPhotos(chapter);
    const chapterStart = currentP;
    
    // Title card segment
    const titleEnd = currentP + TITLE_WEIGHT / totalWeight;
    segments.push({
      type: 'title',
      chapter,
      startP: currentP,
      endP: titleEnd,
    });
    currentP = titleEnd;

    // Frame segments
    for (let i = 0; i < featured.length; i++) {
      const frameEnd = currentP + FRAME_WEIGHT / totalWeight;
      segments.push({
        type: 'frame',
        chapter,
        frameIndex: i,
        startP: currentP,
        endP: frameEnd,
      });
      currentP = frameEnd;
    }
    
    chapterRanges.push({
      chapter,
      startP: chapterStart,
      endP: currentP,
    });
  }

  return { segments, chapterRanges, totalWeight, totalP: currentP };
}

// B3.10: Binary search for segment at progress P
export function getSegmentAt(journey: JourneyState, p: number): Segment {
  const clampedP = Math.max(0, Math.min(0.9999, p));
  
  let low = 0;
  let high = journey.segments.length - 1;
  
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const seg = journey.segments[mid];
    
    if (clampedP >= seg.startP && clampedP < seg.endP) {
      return seg;
    } else if (clampedP < seg.startP) {
      high = mid - 1;
    } else {
      low = mid + 1;
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

// B3.2: Get chapter range
export function getChapterRange(journey: JourneyState, chapter: Chapter): ChapterRange | undefined {
  return journey.chapterRanges.find(r => r.chapter === chapter);
}

// B3.2: Get progress within a chapter (0-1)
export function getChapterProgress(journey: JourneyState, chapter: Chapter, globalP: number): number {
  const range = getChapterRange(journey, chapter);
  if (!range) return 0;
  const chapterRange = range.endP - range.startP;
  if (chapterRange <= 0) return 0;
  return Math.max(0, Math.min(1, (globalP - range.startP) / chapterRange));
}




