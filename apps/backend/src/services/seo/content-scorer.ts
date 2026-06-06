import { z } from 'zod';

export const ContentSubmissionSchema = z.object({
  title: z.string(),
  body: z.string(),
  headers: z.array(z.string()),
  targetKeywords: z.array(z.string()),
});

export type ContentSubmission = z.infer<typeof ContentSubmissionSchema>;

/**
 * Calculates a quality score from 1.0 to 10.0 based on structural quality and relevance
 */
export function scoreContentQuality(submission: ContentSubmission): number {
  let score = 5.0; // base score

  // 1. Length Assessment
  const words = submission.body.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  
  if (wordCount > 1200) score += 2.0;
  else if (wordCount > 600) score += 1.5;
  else if (wordCount > 300) score += 0.8;
  else if (wordCount < 100) score -= 1.5; // too short to rank well

  // 2. Keyword density & alignment
  if (submission.targetKeywords.length > 0) {
    let keywordHits = 0;
    let totalKeywordOccurrences = 0;
    const bodyLower = submission.body.toLowerCase();
    const titleLower = submission.title.toLowerCase();

    submission.targetKeywords.forEach(kw => {
      const kwLower = kw.toLowerCase();
      const occurrences = (bodyLower.split(kwLower).length - 1);
      
      if (occurrences > 0) {
        keywordHits++;
        totalKeywordOccurrences += occurrences;
      }
      
      // Bonus if keyword is in title
      if (titleLower.includes(kwLower)) {
        score += 0.5;
      }
    });

    const inclusionRate = keywordHits / submission.targetKeywords.length;
    score += inclusionRate * 1.5;

    // Density checks: standard keyword stuffing penalty (e.g. > 6% density)
    if (wordCount > 0) {
      const keywordDensity = totalKeywordOccurrences / wordCount;
      if (keywordDensity > 0.06) {
        score -= 2.5; // Keyword stuffing penalty
      } else if (keywordDensity >= 0.01 && keywordDensity <= 0.04) {
        score += 0.5; // Optimized density bonus
      }
    }
  }

  // 3. Header check (H1/H2 tags representation)
  if (submission.headers.length >= 3) {
    score += 1.0;
  } else if (submission.headers.length >= 1) {
    score += 0.5;
  }

  // Bounded check [1, 10]
  return parseFloat(Math.min(10.0, Math.max(1.0, score)).toFixed(2));
}
