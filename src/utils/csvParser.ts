import { ScheduleItem, Subtask } from '../types';

export interface CsvParseResult {
  success: boolean;
  items: ScheduleItem[];
  headers: string[];
  rowCount: number;
  errors: string[];
  warnings: string[];
}

const VALID_CATEGORIES: Array<ScheduleItem['category']> = [
  'Maintenance',
  'Cleaning',
  'Plumbing',
  'Family',
  'General',
];

/**
 * Parses RFC 4180 compliant CSV text, handling quotes, embedded commas,
 * escaped quotes (""), and multiline fields.
 */
export function parseCsvText(text: string): string[][] {
  // Strip UTF-8 Byte Order Mark (BOM) if present
  const cleanText = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];
    const nextChar = i + 1 < len ? cleanText[i + 1] : '';

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          insideQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i += 2;
        continue;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push remainder if any
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  // Filter out completely empty rows
  return rows.filter((r) => r.length > 0 && r.some((c) => c.trim().length > 0));
}

/**
 * Normalizes category string to one of the 5 allowed ScheduleItem categories.
 */
export function normalizeCategory(raw: string): ScheduleItem['category'] {
  if (!raw) return 'General';
  const trimmed = raw.trim().toLowerCase();

  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === trimmed) {
      return cat;
    }
  }

  // Heuristic fuzzy match
  if (trimmed.includes('plumb') || trimmed.includes('pipe') || trimmed.includes('drain')) {
    return 'Plumbing';
  }
  if (trimmed.includes('clean') || trimmed.includes('wash') || trimmed.includes('sanit')) {
    return 'Cleaning';
  }
  if (trimmed.includes('maint') || trimmed.includes('repair') || trimmed.includes('fix')) {
    return 'Maintenance';
  }
  if (trimmed.includes('fam') || trimmed.includes('kid') || trimmed.includes('home') || trimmed.includes('personal')) {
    return 'Family';
  }

  return 'General';
}

/**
 * Normalizes evaluation percentage to an integer 0..100
 */
export function normalizeEvaluation(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace('%', '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  // If decimal e.g. 0.75, treat as 75%
  if (num > 0 && num <= 1 && cleaned.includes('.')) {
    return Math.round(num * 100);
  }
  return Math.min(100, Math.max(0, Math.round(num)));
}

/**
 * Helper to identify column indices based on header names
 */
function mapHeaderColumns(headerRow: string[]) {
  const norm = headerRow.map((h) => h.toLowerCase().trim());

  const findCol = (candidates: string[]): number => {
    for (const c of candidates) {
      const idx = norm.findIndex((h) => h === c || h.includes(c));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  return {
    dayIdx: findCol(['day', 'date', 'timeline', 'weekday']),
    responsibleIdx: findCol(['responsible', 'assignee', 'owner', 'assigned', 'person']),
    keyActivitiesIdx: findCol(['key activities', 'activities', 'activity', 'task', 'description', 'objective']),
    subtasksIdx: findCol(['subtasks status', 'subtasks', 'subtask', 'checklist', 'items']),
    evaluationIdx: findCol(['evaluation', 'progress', 'completion', 'status', 'percent', '%']),
    categoryIdx: findCol(['category', 'type', 'tag', 'department']),
    safetyNotesIdx: findCol(['safety notes', 'safety', 'hazards', 'notes', 'precautions']),
  };
}

/**
 * Extracts subtasks from subtask text or multiline activity description.
 */
function extractSubtasks(
  keyActivities: string,
  subtaskCell: string,
  evaluation: number,
  rowIdx: number
): Subtask[] {
  const subtasks: Subtask[] = [];

  // Case 1: subtaskCell contains explicit checklist items (e.g. separated by semicolon, pipe, or newlines)
  if (subtaskCell && !subtaskCell.toLowerCase().includes('done')) {
    const rawTokens = subtaskCell
      .split(/[\n;|\r]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (rawTokens.length > 0) {
      rawTokens.forEach((token, sIdx) => {
        let text = token;
        let completed = evaluation === 100;

        if (token.startsWith('[x]') || token.startsWith('[X]')) {
          completed = true;
          text = token.slice(3).trim();
        } else if (token.startsWith('[ ]')) {
          completed = false;
          text = token.slice(3).trim();
        }

        subtasks.push({
          id: `sub-csv-${rowIdx}-${sIdx}`,
          text: text || `Subtask ${sIdx + 1}`,
          completed,
        });
      });

      return subtasks;
    }
  }

  // Case 2: keyActivities contains multiple lines (e.g. lines starting with bullet points or dashes)
  const lines = keyActivities
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    lines.forEach((line, sIdx) => {
      let text = line.replace(/^[-*•]\s*/, '').trim();
      let completed = evaluation === 100;

      if (text.startsWith('[x]') || text.startsWith('[X]')) {
        completed = true;
        text = text.slice(3).trim();
      } else if (text.startsWith('[ ]')) {
        completed = false;
        text = text.slice(3).trim();
      }

      subtasks.push({
        id: `sub-csv-${rowIdx}-${sIdx}`,
        text: text || line,
        completed,
      });
    });

    return subtasks;
  }

  // Case 3: Single line activity fallback
  return [
    {
      id: `sub-csv-${rowIdx}-0`,
      text: keyActivities || 'Complete milestone activities',
      completed: evaluation === 100,
    },
  ];
}

/**
 * Validates and converts raw parsed CSV matrix into strongly typed ScheduleItem array.
 */
export function parseScheduleCsv(csvContent: string): CsvParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!csvContent || csvContent.trim().length === 0) {
    return {
      success: false,
      items: [],
      headers: [],
      rowCount: 0,
      errors: ['The uploaded CSV file is empty.'],
      warnings: [],
    };
  }

  const rows = parseCsvText(csvContent);

  if (rows.length === 0) {
    return {
      success: false,
      items: [],
      headers: [],
      rowCount: 0,
      errors: ['No data rows found in CSV file.'],
      warnings: [],
    };
  }

  // Check if first row looks like a header
  const firstRow = rows[0];
  const colMap = mapHeaderColumns(firstRow);

  // If at least one recognizable header is present, treat row 0 as header
  const hasRecognizableHeader =
    colMap.dayIdx !== -1 ||
    colMap.keyActivitiesIdx !== -1 ||
    colMap.responsibleIdx !== -1 ||
    colMap.categoryIdx !== -1;

  let headers: string[] = [];
  let dataRows: string[][] = [];

  if (hasRecognizableHeader) {
    headers = firstRow;
    dataRows = rows.slice(1);
  } else {
    // Treat row 0 as data with default column order
    warnings.push('No recognized header row detected; using standard column positions (Day, Responsible, Activities, etc.).');
    headers = ['Day', 'Responsible', 'Key Activities', 'Subtasks Status', 'Evaluation', 'Category', 'Safety Notes'];
    dataRows = rows;
  }

  if (dataRows.length === 0) {
    return {
      success: false,
      items: [],
      headers,
      rowCount: 0,
      errors: ['CSV file contains headers but no milestone data rows.'],
      warnings,
    };
  }

  const items: ScheduleItem[] = [];
  const now = new Date().toISOString();

  // Resolved column indexes (fallback to default positions if -1)
  const dayIdx = colMap.dayIdx !== -1 ? colMap.dayIdx : 0;
  const respIdx = colMap.responsibleIdx !== -1 ? colMap.responsibleIdx : 1;
  const actIdx = colMap.keyActivitiesIdx !== -1 ? colMap.keyActivitiesIdx : 2;
  const subIdx = colMap.subtasksIdx !== -1 ? colMap.subtasksIdx : 3;
  const evalIdx = colMap.evaluationIdx !== -1 ? colMap.evaluationIdx : 4;
  const catIdx = colMap.categoryIdx !== -1 ? colMap.categoryIdx : 5;
  const safeIdx = colMap.safetyNotesIdx !== -1 ? colMap.safetyNotesIdx : 6;

  dataRows.forEach((row, idx) => {
    const rowNum = hasRecognizableHeader ? idx + 2 : idx + 1;

    const rawDay = (row[dayIdx] || '').trim();
    const rawResp = (row[respIdx] || '').trim();
    const rawAct = (row[actIdx] || '').trim();
    const rawSub = (row[subIdx] || '').trim();
    const rawEval = (row[evalIdx] || '').trim();
    const rawCat = (row[catIdx] || '').trim();
    const rawSafe = (row[safeIdx] || '').trim();

    // Skip empty lines
    if (!rawDay && !rawAct && !rawResp) {
      return;
    }

    if (!rawDay && !rawAct) {
      warnings.push(`Row ${rowNum}: Skipped because Day and Key Activities are both missing.`);
      return;
    }

    const day = rawDay || `Milestone ${idx + 1}`;
    const responsible = rawResp || 'Kibrom';
    const keyActivities = rawAct || 'Scheduled maintenance activity';
    const evaluation = normalizeEvaluation(rawEval);
    const category = normalizeCategory(rawCat);

    if (rawCat && !VALID_CATEGORIES.includes(rawCat as any)) {
      warnings.push(`Row ${rowNum}: Unknown category "${rawCat}" defaulted to "${category}".`);
    }

    const subtasks = extractSubtasks(keyActivities, rawSub, evaluation, idx + 1);

    const item: ScheduleItem = {
      id: `csv-import-${Date.now()}-${idx + 1}`,
      day,
      responsible,
      keyActivities,
      subtasks,
      evaluation,
      category,
      safetyNotes: rawSafe || undefined,
      updatedAt: now,
    };

    items.push(item);
  });

  if (items.length === 0) {
    return {
      success: false,
      items: [],
      headers,
      rowCount: 0,
      errors: ['No valid schedule items could be extracted from the CSV file.'],
      warnings,
    };
  }

  return {
    success: true,
    items,
    headers,
    rowCount: items.length,
    errors,
    warnings,
  };
}

/**
 * Generates a clean sample CSV template matching ScheduleItem structure.
 */
export function generateSampleCsv(): string {
  const header = 'Day,Responsible,Key Activities,Subtasks Status,Evaluation,Category,Safety Notes';
  const sampleRows = [
    'Monday,Kibrom,"Perform pressure gauge calibration\nCheck pump filter elements",1/2 done,50%,Plumbing,Ensure main circuit breaker is OFF before opening casing',
    'Tuesday,Assaye,"Clean chemical storage room\nOrganize mop heads and sanitizers",2/2 done,100%,Cleaning,Wear chemical-resistant gloves and goggles',
    'Wednesday,Assaye & Kibrom,"Inspect emergency generator\nTest transfer switch",0/2 done,25%,Maintenance,Follow lockout/tagout procedure',
    'Thursday,Kibrom,"Family dinner groceries & weekly home supplies",1/1 done,100%,Family,Check dietary restrictions',
    'Friday,Assaye,"Inspect HVAC rooftop ventilation filters",0/1 done,0%,General,Fall-protection harness required on roof',
  ];

  return [header, ...sampleRows].join('\r\n');
}
