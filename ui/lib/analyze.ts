import Sentiment from 'sentiment';  // Ensure sentiment package is installed with types

const sentimentAnalyzer = new Sentiment();  // Initialize sentiment analyzer

// Custom type for the analysis result
type AnalysisResult = {
  score: number;              // Overall retention score (0–10)
  strengths: string[];        // List of strengths found in the script
  weaknesses: string[];       // List of weaknesses found in the script
  suggestions: string[];      // Suggested improvements (actionable)
  hookHighlight: string;      // Highlighted portion of the hook
  estimatedDuration: string;  // Estimated duration of the script (e.g., "1m 14s")
  callToAction: boolean;      // Whether a call to action was detected
};

/**
 * Analyzes a video script for retention-related factors and returns a human-readable report.
 * If `options.full` is true, returns a full detailed analysis; otherwise, returns a free preview.
 * 
 * @param script - The video script to analyze (text input)
 * @param options - Optional analysis options (e.g., full: boolean for full vs. preview analysis)
 * @returns A Promise resolving to a formatted string (free preview or full report)
 */
export async function analyzeRetention(
  script: string,
  options?: { full?: boolean }
): Promise<string> {
  // Normalize the script input and split into non-empty lines
  const lines = script.split("\n").map(line => line.trim()).filter(line => line);
  const wordCount = script.split(/\s+/).filter(w => w).length;  // Total word count
  const estimatedSeconds = Math.round((wordCount / 150) * 60);  // ~150 words per minute
  const estimatedDuration = `${Math.floor(estimatedSeconds / 60)}m ${estimatedSeconds % 60}s`;

  // Initialize the analysis result object
  const result: AnalysisResult = {
    score: 0,
    strengths: [],
    weaknesses: [],
    suggestions: [],
    hookHighlight: "",
    estimatedDuration,
    callToAction: false,
  };

  // --- 1. HOOK ANALYSIS ---

  // Extract the first 1–2 lines as the hook (if available)
  const hook = lines.slice(0, 2).join(" ").trim();
  const hookWordCount = hook.split(/\s+/).filter(w => w).length;

  // Flag: Does the hook contain curiosity elements? (questions, surprises, bold statements)
  const hookHasCuriosityGap = /(\?|why|what|how|discover|secret|mistake|you’ll never|imagine|surprising)/i.test(hook);

  // Flag: Does the hook start with an imperative/power phrase? (e.g., "Imagine," "Here’s why")
  const hookHasImperative = /^(imagine|what if|here’s why|let’s|picture this|watch this|did you know|stop|don’t)/i.test(hook);

  // Hook length scoring
  let hookLengthScore = 0;
  if (hookWordCount <= 15) {
    hookLengthScore = 1;  // Short, punchy hook (bonus)
  } else if (hookWordCount > 20) {
    hookLengthScore = -1;  // Too long (penalty)
    result.weaknesses.push("Hook may be too long (over 20 words)");
    result.suggestions.push("Consider shortening the hook to under 15 words for a tighter introduction.");
  }

  // Combine hook factors into a hook strength score
  let hookStrengthScore = 0;
  if (hookHasCuriosityGap) hookStrengthScore += 2;  // Strong curiosity gap
  if (hookHasImperative) hookStrengthScore += 1;    // Bonus for imperative phrase
  hookStrengthScore += hookLengthScore;             // Add length contribution

  // Reflect hook analysis in the result
  if (hookStrengthScore >= 3) {
    result.strengths.push("Excellent, curiosity-driven hook");
  } else if (hookStrengthScore >= 1) {
    result.strengths.push("Good hook with some improvements possible");
  } else {
    result.weaknesses.push("Hook could be more curiosity-driven or tighter");
  }
  result.score += hookStrengthScore;
  result.hookHighlight = hook;

  // --- 2. PACING AND BLOCK LENGTH ANALYSIS ---

  // Analyze the length of each script line (block) in words
  const blockLengths = lines.map(line => line.split(/\s+/).filter(w => w).length);
  
  const maxBlockLength = Math.max(...blockLengths);         // Longest individual block
  const avgBlockLength = Math.round(wordCount / lines.length);   // Average block length
  const longBlockCount = blockLengths.filter(len => len > 30).length;  // Count of blocks over 30 words

  let pacingPenalty = 0;

  // Check for very long blocks (over 40 words)
  if (maxBlockLength > 40) {
    result.weaknesses.push("Some sections are very long without a break (over 40 words)");
    result.suggestions.push("Consider breaking up longer sections of over 40 words with a visual change or pattern interrupt.");
    pacingPenalty -= 2;  // Heavier penalty for very long blocks
  } else if (maxBlockLength > 30) {
    result.weaknesses.push("Some sections are too long without a break (over 30 words)");
    result.suggestions.push("Consider breaking up longer sections of over 30 words.");
    pacingPenalty -= 1;  // Smaller penalty for moderately long blocks
  }

  // Penalize high average block length (dense pacing)
  if (avgBlockLength > 20) {
    result.weaknesses.push("Overall script density is high (average block length over 20 words)");
    result.suggestions.push("Consider adding more line breaks or visual changes to reduce overall script density.");
    pacingPenalty -= 1;
  }

  // Penalize if multiple long blocks (over 30 words)
  if (longBlockCount >= 3) {
    result.weaknesses.push(`Several sections (${longBlockCount}) are too long without a break`);
    pacingPenalty -= 1;
  }

  // Reflect pacing analysis in the result
  result.score += pacingPenalty;
  if (pacingPenalty < 0) {
    result.weaknesses.push("Pacing could be improved with more breaks or pattern interrupts.");
  } else {
    result.strengths.push("Good pacing with natural breaks and flow.");
    result.score += 1;  // Reward if pacing is good overall
  }

  // --- 3. PAYOFF TIMING ANALYSIS ---

  // Determine the threshold for early payoff (first 30% of the script) and late payoff (after 70%)
  const payoffThreshold = Math.floor(lines.length * 0.3);   // Early payoff limit: 30% of script length
  const latePayoffThreshold = Math.floor(lines.length * 0.7);  // Late payoff limit: 70% of script length

  let payoffTimingScore = 0;
  let payoffFoundEarly = false;
  let payoffFoundLate = false;

  // Check for early payoff indicators in the first 30% of lines
  for (let i = 2; i < payoffThreshold; i++) {
    if (lines[i] && /(here’s|here is|the secret|the reason|the key|the answer|let me show|the fix)/i.test(lines[i])) {
      payoffFoundEarly = true;
      break;
    }
  }

  if (payoffFoundEarly) {
    result.strengths.push("Key payoff or reveal appears early in the script");
    payoffTimingScore += 2;  // Bonus for early payoff
  } else {
    result.weaknesses.push("Key payoff or reveal may be delayed");
    result.suggestions.push("Consider bringing the key reveal or answer earlier, ideally within the first 30% of the script.");
    payoffTimingScore -= 1;  // Penalty for delayed payoff
  }

  // Check for late payoff indicators in the last 30% of lines
  for (let i = latePayoffThreshold; i < lines.length; i++) {
    if (lines[i] && /(here’s|here is|the secret|the reason|the key|the answer|let me show|the fix)/i.test(lines[i])) {
      payoffFoundLate = true;
      break;
    }
  }

  if (payoffFoundLate && !payoffFoundEarly) {
    result.weaknesses.push("Key payoff or reveal happens too late in the script");
    payoffTimingScore -= 1;  // Additional penalty for very late payoff
  }

  // Reflect payoff timing analysis in the result
  result.score += payoffTimingScore;

  // --- 4. AUDIENCE ENGAGEMENT ANALYSIS ---

  // Check for direct engagement (presence of questions, 'you', 'your', or 'we' language)
  const engagementLines = lines.filter(line =>
    /(\?|you|your|let’s|we)/i.test(line)
  );

  if (engagementLines.length > 0) {
    result.strengths.push("Direct engagement with the audience (e.g., questions or 'you' language)");
    result.score += 2;  // Reward direct engagement
  } else {
    result.weaknesses.push("Script could be more engaging with direct audience questions or statements");
    result.suggestions.push("Add rhetorical questions or use 'you' more to speak directly to the viewer.");
  }

  // --- 5. CALL TO ACTION (CTA) ANALYSIS ---

  // Check for the presence of a call to action (e.g., subscribe, comment, click, visit, follow)
  const callToAction = lines.some(line =>
    /(subscribe|comment|click|check|visit|follow|try)/i.test(line)
  );
  result.callToAction = callToAction;  // Store whether a CTA exists

  // Check if CTA appears near the end of the script (last 10% of lines)
  const ctaThresholdStart = Math.floor(lines.length * 0.9);  
  const ctaFoundNearEnd = lines.slice(ctaThresholdStart).some(line =>
    /(subscribe|comment|click|check|visit|follow|try)/i.test(line)
  );

  // Check if CTA has urgency words (e.g., "now," "today," "don’t miss")
  const ctaStrong = /(now|today|don’t miss|don’t wait|immediately)/i.test(script);

  if (ctaFoundNearEnd) {
    if (ctaStrong) {
      result.strengths.push("Very strong and urgent call to action detected");
      result.score += 2;  // Strong CTA with urgency
    } else {
      result.strengths.push("Strong call to action detected near the end of the script");
      result.score += 1;  // Regular CTA bonus
    }
  } else if (callToAction) {
    result.weaknesses.push("Call to action detected but not in the ideal position (end of the script)");
    result.suggestions.push("Consider moving the call to action closer to the end of the script for maximum impact.");
  } else {
    result.weaknesses.push("No clear call to action detected");
    result.suggestions.push("End with a strong call to action, like subscribing or taking action based on your content.");
    result.score -= 1;  // Penalize missing CTA
  }

  // --- 6. SENTIMENT ANALYSIS ---

  // Custom sentiment dictionary for video-related terms (optional)
  const customOptions = {
    extras: {
      "amazing": 3,
      "incredible": 3,
      "awesome": 3,
      "boring": -2,
      "dull": -2,
      "frustrating": -3,
      "exciting": 3,
      "game-changing": 3,
      "life-changing": 3,
      "fail": -2,
      "mistake": -1,
      "problem": -1
    }
  };

  // Perform sentiment analysis on the entire script
  const sentimentResult = sentimentAnalyzer.analyze(script, customOptions);
  const sentimentScore = sentimentResult.score;  // Raw sentiment score

  // Adjust overall score based on sentiment intensity
  if (sentimentScore > 3) {
    result.strengths.push("Very positive emotional tone detected");
    result.score += 2;  // Strong positive sentiment bonus
  } else if (sentimentScore > 0) {
    result.strengths.push("Positive emotional tone detected");
    result.score += 1;  // Slight positive sentiment bonus
  } else if (sentimentScore < -3) {
    result.weaknesses.push("Very negative emotional tone detected");
    result.suggestions.push("Consider softening the tone or adding more positive language to enhance engagement.");
    result.score -= 2;  // Strong negative sentiment penalty
  } else if (sentimentScore < 0) {
    result.weaknesses.push("Slight negative tone detected");
    result.suggestions.push("Consider adding more positive or uplifting language.");
    result.score -= 1;  // Mild negative sentiment penalty
  } else {
    result.strengths.push("Neutral emotional tone detected");
  }

  // --- 7. FINAL SCORE CALIBRATION ---

  // Normalize the final score into a 0–10 range (clamp to boundaries)
  if (result.score < 0) result.score = 0;
  if (result.score > 10) result.score = 10;

  // Round the score to one decimal place for clarity
  result.score = Math.round(result.score * 10) / 10;

  // --- 8. OUTPUT CONSTRUCTION ---

  // FREE ANALYSIS (Preview) OUTPUT
  if (!options?.full) {
    return `
FREE ANALYSIS (Preview)

Estimated Duration: ${result.estimatedDuration}

• Likely drop-off time: around second ${Math.round((estimatedSeconds * 0.3))} (estimate)
• One key issue: ${result.weaknesses[0] || "N/A"}

Upgrade to unlock:
– Exact fixes
– Optimized hooks
– Line-by-line rewrite
– Full retention score breakdown
`;
  }

  // FULL ANALYSIS (Detailed Report) OUTPUT
  const strengthsText = result.strengths.length > 0 ? `• ${result.strengths.join("\n• ")}` : "N/A";
  const weaknessesText = result.weaknesses.length > 0 ? `• ${result.weaknesses.join("\n• ")}` : "N/A";
  const suggestionsText = result.suggestions.length > 0 ? `1. ${result.suggestions.join("\n2. ")}` : "N/A";
  const callToActionText = result.callToAction ? "Yes" : "No";

  return `
FULL ANALYSIS

ESTIMATED DURATION: ${result.estimatedDuration}
RETENTION SCORE: ${result.score}/10

WHAT’S WORKING:
${strengthsText}

WHAT’S HURTING:
${weaknessesText}

EXACT FIXES:
${suggestionsText}

HOOK HIGHLIGHT:
“${result.hookHighlight}”

CALL TO ACTION DETECTED: ${callToActionText}
`;
}