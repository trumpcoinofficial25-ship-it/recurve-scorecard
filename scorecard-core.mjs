export const RULESET = Object.freeze({
  id: "world-archery-recurve-70m-ranking-round-2026-03-13",
  name: "World Archery Recurve 70 m Ranking Round",
  version: "2026-03-13",
  ends: 12,
  arrowsPerEnd: 6,
  arrowCount: 72,
  maxScore: 720,
  maxInputCharacters: 2048,
  allowedTokens: Object.freeze(["X", "10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "M"]),
});

const TOKEN_SCORE = Object.freeze({
  X: 10,
  10: 10,
  9: 9,
  8: 8,
  7: 7,
  6: 6,
  5: 5,
  4: 4,
  3: 3,
  2: 2,
  1: 1,
  M: 0,
});

const TOKEN_ORDER = Object.freeze({
  X: 11,
  10: 10,
  9: 9,
  8: 8,
  7: 7,
  6: 6,
  5: 5,
  4: 4,
  3: 3,
  2: 2,
  1: 1,
  M: 0,
});

export function normalizeToken(raw) {
  return String(raw).trim().toUpperCase();
}

function parseDeclaredValue(raw, label, maximum) {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return { value: null, error: null };
  }

  const normalized = String(raw).trim();
  if (!/^\d+$/.test(normalized)) {
    return { value: null, error: `${label} must be a whole non-negative number.` };
  }

  const value = Number(normalized);
  if (!Number.isSafeInteger(value) || value > maximum) {
    return { value: null, error: `${label} must be between 0 and ${maximum}.` };
  }

  return { value, error: null };
}

export function parseScorecard(text) {
  const source = String(text ?? "");
  if (source.length > RULESET.maxInputCharacters) {
    return {
      valid: false,
      errors: [`Scorecard input exceeds the ${RULESET.maxInputCharacters}-character limit.`],
      ends: [],
      arrowCount: 0,
      total: 0,
      tensIncludingXs: 0,
      xs: 0,
      misses: 0,
    };
  }
  const lines = source.split(/\r?\n/);
  const nonEmptyLines = lines
    .map((line, index) => ({ lineNumber: index + 1, text: line.trim() }))
    .filter(({ text: line }) => line.length > 0);

  const errors = [];
  if (nonEmptyLines.length !== RULESET.ends) {
    errors.push(`Expected ${RULESET.ends} non-empty ends; found ${nonEmptyLines.length}.`);
  }

  const ends = nonEmptyLines.map(({ lineNumber, text: line }, endIndex) => {
    const rawTokens = line.split(/[\s,]+/).filter(Boolean);
    const tokens = rawTokens.map(normalizeToken);
    const endErrors = [];

    if (tokens.length !== RULESET.arrowsPerEnd) {
      endErrors.push(
        `End ${endIndex + 1} (line ${lineNumber}) must contain ${RULESET.arrowsPerEnd} arrows; found ${tokens.length}.`,
      );
    }

    tokens.forEach((token, tokenIndex) => {
      if (!Object.hasOwn(TOKEN_SCORE, token)) {
        endErrors.push(
          `End ${endIndex + 1}, arrow ${tokenIndex + 1}: “${rawTokens[tokenIndex]}” is invalid. Use X, 10–1, or M.`,
        );
      }
    });

    if (endErrors.length === 0) {
      for (let index = 1; index < tokens.length; index += 1) {
        if (TOKEN_ORDER[tokens[index]] > TOKEN_ORDER[tokens[index - 1]]) {
          endErrors.push(`End ${endIndex + 1} is not written in descending arrow-value order.`);
          break;
        }
      }
    }

    errors.push(...endErrors);
    const validTokens = tokens.filter((token) => Object.hasOwn(TOKEN_SCORE, token));

    return {
      end: endIndex + 1,
      sourceLine: lineNumber,
      tokens,
      score: validTokens.reduce((sum, token) => sum + TOKEN_SCORE[token], 0),
      tensIncludingXs: validTokens.filter((token) => token === "10" || token === "X").length,
      xs: validTokens.filter((token) => token === "X").length,
      misses: validTokens.filter((token) => token === "M").length,
      errors: endErrors,
    };
  });

  let runningTotal = 0;
  const endResults = ends.map((end) => {
    runningTotal += end.score;
    return { ...end, runningTotal };
  });

  const arrowCount = ends.reduce((sum, end) => sum + end.tokens.length, 0);
  return {
    valid: errors.length === 0 && arrowCount === RULESET.arrowCount,
    errors,
    ends: endResults,
    arrowCount,
    total: runningTotal,
    tensIncludingXs: ends.reduce((sum, end) => sum + end.tensIncludingXs, 0),
    xs: ends.reduce((sum, end) => sum + end.xs, 0),
    misses: ends.reduce((sum, end) => sum + end.misses, 0),
  };
}

export function validateScorecard({ text, declaredTotal, declaredTens, declaredXs }) {
  const parsed = parseScorecard(text);
  const errors = [...parsed.errors];
  const declared = {
    total: parseDeclaredValue(declaredTotal, "Declared total", RULESET.maxScore),
    tens: parseDeclaredValue(declaredTens, "Declared 10s count", RULESET.arrowCount),
    xs: parseDeclaredValue(declaredXs, "Declared X count", RULESET.arrowCount),
  };

  Object.values(declared).forEach(({ error }) => {
    if (error) errors.push(error);
  });

  if (declared.total.value !== null && declared.total.value !== parsed.total) {
    errors.push(`Declared total ${declared.total.value} does not match computed total ${parsed.total}.`);
  }
  if (declared.tens.value !== null && declared.tens.value !== parsed.tensIncludingXs) {
    errors.push(
      `Declared 10s count ${declared.tens.value} does not match computed 10s count ${parsed.tensIncludingXs} (Xs included).`,
    );
  }
  if (declared.xs.value !== null && declared.xs.value !== parsed.xs) {
    errors.push(`Declared X count ${declared.xs.value} does not match computed X count ${parsed.xs}.`);
  }

  const missingDeclarations = [];
  if (declared.total.value === null) missingDeclarations.push("total");
  if (declared.tens.value === null) missingDeclarations.push("10s");
  if (declared.xs.value === null) missingDeclarations.push("Xs");

  return {
    ...parsed,
    valid: errors.length === 0 && parsed.valid,
    errors,
    declarationsComplete: missingDeclarations.length === 0,
    missingDeclarations,
    declared: {
      total: declared.total.value,
      tensIncludingXs: declared.tens.value,
      xs: declared.xs.value,
    },
  };
}

export function compareQualificationScorecards(left, right, context) {
  if (!left?.valid || !right?.valid) {
    return {
      status: "UNAVAILABLE",
      winner: null,
      reason: "Both scorecards must pass arrow and declared-value validation before comparison.",
    };
  }

  if (left.total !== right.total) {
    return {
      status: "DECIDED",
      winner: left.total > right.total ? "A" : "B",
      reason: "Higher cumulative score.",
    };
  }

  if (context === "cutoff") {
    return {
      status: "SHOOT_OFF_REQUIRED",
      winner: null,
      reason:
        "This tie decides entrance to an Elimination Round or the specified top-8 position. X/10 counts must not decide it; an official shoot-off is required.",
    };
  }

  if (context !== "ordinary") {
    return {
      status: "CONTEXT_REQUIRED",
      winner: null,
      reason: "Choose the tie context before applying a tie-break rule.",
    };
  }

  if (left.xs !== right.xs) {
    return {
      status: "DECIDED",
      winner: left.xs > right.xs ? "A" : "B",
      reason: "Equal total; greater X count (inner 10s) for long-distance qualification ranking.",
    };
  }

  if (left.tensIncludingXs !== right.tensIncludingXs) {
    return {
      status: "DECIDED",
      winner: left.tensIncludingXs > right.tensIncludingXs ? "A" : "B",
      reason: "Equal total and X count; greater 10s count (Xs included).",
    };
  }

  return {
    status: "EQUAL",
    winner: null,
    reason:
      "Total, X count, and 10s count are equal. The athletes remain equal; this tool cannot perform any organizer procedure for chart position.",
  };
}
