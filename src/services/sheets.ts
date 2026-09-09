import { ScheduleItem } from '../types';
import { getAccessToken } from './auth';

export interface CreateSheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export const buildRowsData = (items: ScheduleItem[]): (string | number)[][] => {
  const header = [
    'Day',
    'Responsible',
    'Key Activities',
    'Subtasks Status',
    'Evaluation',
    'Category',
    'Safety Notes',
    'Last Updated',
  ];

  const dataRows = items.map((item) => {
    const completedSubs = item.subtasks.filter((s) => s.completed).length;
    const totalSubs = item.subtasks.length;
    const subtaskSummary = `${completedSubs}/${totalSubs} done`;

    return [
      item.day,
      item.responsible,
      item.keyActivities,
      subtaskSummary,
      `${item.evaluation}%`,
      item.category,
      item.safetyNotes || '',
      new Date(item.updatedAt).toLocaleString(),
    ];
  });

  return [header, ...dataRows];
};

export const createScheduleSpreadsheet = async (
  title: string,
  items: ScheduleItem[]
): Promise<CreateSheetResult> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in with Google to create a spreadsheet.');
  }

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'Weekly Activity & Action Plan Schedule',
      },
      sheets: [
        {
          properties: {
            title: 'Schedule Matrix',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create spreadsheet: ${createRes.statusText}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl =
    sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate Rows
  const rows = buildRowsData(items);
  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Schedule Matrix'!A1:H${rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'Schedule Matrix'!A1:H${rows.length}`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!writeRes.ok) {
    console.warn('Could not populate rows immediately:', await writeRes.text());
  }

  // 3. Apply professional visual styling (Navy header, bold text, borders)
  try {
    const sheetId = sheetData.sheets?.[0]?.properties?.sheetId ?? 0;
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 8,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.09, green: 0.15, blue: 0.28 },
                  textFormat: {
                    bold: true,
                    foregroundColor: { red: 1, green: 1, blue: 1 },
                    fontSize: 11,
                  },
                  horizontalAlignment: 'CENTER',
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId,
                dimension: 'COLUMNS',
                startIndex: 0,
                endIndex: 8,
              },
            },
          },
        ],
      }),
    });
  } catch (styleErr) {
    console.warn('Batch styling non-fatal error:', styleErr);
  }

  return { spreadsheetId, spreadsheetUrl };
};

export const updateScheduleSpreadsheet = async (
  spreadsheetId: string,
  items: ScheduleItem[]
): Promise<void> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in with Google to update the spreadsheet.');
  }

  // Get sheet title first
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to retrieve spreadsheet metadata.');
  }

  const metaData = await metaRes.json();
  const firstSheetTitle = metaData.sheets?.[0]?.properties?.title || 'Schedule Matrix';

  const rows = buildRowsData(items);

  // Clear existing range first to avoid leftover rows
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${firstSheetTitle}'!A1:H50:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  ).catch(() => {});

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${firstSheetTitle}'!A1:H${rows.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'${firstSheetTitle}'!A1:H${rows.length}`,
        majorDimension: 'ROWS',
        values: rows,
      }),
    }
  );

  if (!writeRes.ok) {
    const err = await writeRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update spreadsheet: ${writeRes.statusText}`);
  }
};

export const fetchScheduleFromSpreadsheet = async (
  spreadsheetId: string
): Promise<ScheduleItem[]> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in with Google to read the spreadsheet.');
  }

  // First fetch metadata to get the active sheet name
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Spreadsheet not found or inaccessible.');
  }

  const metaData = await metaRes.json();
  const sheetTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${sheetTitle}'!A1:H100`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!valuesRes.ok) {
    const err = await valuesRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Could not fetch spreadsheet values.');
  }

  const valuesData = await valuesRes.json();
  const rows: string[][] = valuesData.values || [];

  if (rows.length < 2) {
    throw new Error('Spreadsheet has no data rows.');
  }

  // Header is row 0
  const items: ScheduleItem[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && !row[2]) continue;

    const day = row[0] || `Day ${i}`;
    const responsible = row[1] || 'Kibrom';
    const keyActivities = row[2] || '';
    const evalRaw = row[4] || '0%';
    const evalNum = parseInt(evalRaw.replace('%', '').trim(), 10) || 0;
    const category = (row[5] as any) || 'General';
    const safetyNotes = row[6] || '';

    // Split activities into subtasks
    const activityLines = keyActivities
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const subtasks = activityLines.map((line, idx) => ({
      id: `imported-${i}-${idx}`,
      text: line,
      completed: evalNum === 100,
    }));

    items.push({
      id: `sheet-item-${i}-${Date.now()}`,
      day,
      responsible,
      keyActivities,
      subtasks: subtasks.length > 0 ? subtasks : [{ id: `imp-${i}`, text: keyActivities, completed: false }],
      evaluation: evalNum,
      category: ['Maintenance', 'Cleaning', 'Plumbing', 'Family', 'General'].includes(category)
        ? category
        : 'General',
      safetyNotes,
      updatedAt: new Date().toISOString(),
    });
  }

  return items;
};

export const exportToCsv = (items: ScheduleItem[]): void => {
  const rows = buildRowsData(items);
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    )
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Activity_Schedule_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
