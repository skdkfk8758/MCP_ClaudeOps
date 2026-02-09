import { CHARACTER_LIMIT } from '../constants.js';

export function formatMarkdownResponse(data: unknown, title: string): string {
  let md = `## ${title}\n\n`;

  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      md += `**Total items:** ${data.length}\n\n`;
      if (data.length > 0) {
        md += formatTable(data as Record<string, unknown>[]);
      }
    } else {
      md += formatObject(data as Record<string, unknown>);
    }
  } else {
    md += String(data);
  }

  if (md.length > CHARACTER_LIMIT) {
    md = md.slice(0, CHARACTER_LIMIT - 50) + '\n\n...(truncated, use json format for full data)';
  }

  return md;
}

function formatTable(items: Record<string, unknown>[]): string {
  if (items.length === 0) return '';
  const keys = Object.keys(items[0]);
  let table = '| ' + keys.join(' | ') + ' |\n';
  table += '| ' + keys.map(() => '---').join(' | ') + ' |\n';
  for (const item of items.slice(0, 50)) {
    table += '| ' + keys.map(k => formatValue(item[k])).join(' | ') + ' |\n';
  }
  if (items.length > 50) table += `\n*...and ${items.length - 50} more items*\n`;
  return table;
}

function formatObject(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .map(([key, value]) => `- **${key}:** ${formatValue(value)}`)
    .join('\n') + '\n';
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function formatToolResponse(data: unknown, title: string, format: string = 'markdown') {
  if (format === 'json') {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  }
  return {
    content: [{ type: 'text' as const, text: formatMarkdownResponse(data, title) }],
  };
}
