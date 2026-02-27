import * as cheerio from 'cheerio';
import { RiskLevel, truncate, type ToolResult } from '@forgeclaw/shared';
import type { ToolDefinition } from './index.js';

async function searchWeb(query: string): Promise<ToolResult> {
  const encodedQuery = encodeURIComponent(query);
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodedQuery}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    return {
      success: false,
      output: '',
      error: `Search provider returned HTTP ${response.status}`,
      duration_ms: 0,
      truncated: false,
    };
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results: string[] = [];

  $('a.result__a').each((i, el) => {
    if (i >= 10) return;
    const title = $(el).text().trim();
    const link = $(el).attr('href') || '';
    const snippet = $(el).closest('.result').find('.result__snippet').text().trim();
    if (!title || !link) return;
    results.push(`${i + 1}. ${title}\n   ${link}\n   ${snippet}\n`);
  });

  if (results.length === 0) {
    // Fallback selector in case provider markup changes.
    $('a[href]').each((i, el) => {
      if (i >= 20 || results.length >= 10) return;
      const title = $(el).text().trim();
      const link = $(el).attr('href') || '';
      if (!title || title.length < 8 || !/^https?:\/\//i.test(link)) return;
      results.push(`${results.length + 1}. ${title}\n   ${link}\n`);
    });
  }

  const combined = results.join('\n').trim();
  return {
    success: true,
    output: combined || 'No results found',
    truncated: false,
    duration_ms: 0,
  };
}

export function createBrowserTool(): ToolDefinition {
  return {
    name: 'browser',
    description: 'Browse the web: fetch pages, extract text, search Google, scrape content.',
    parameters: {
      action: { type: 'string', description: 'Action: fetch, search, extract_text, extract_links', required: true },
      url: { type: 'string', description: 'URL to fetch (for fetch/extract actions)' },
      query: { type: 'string', description: 'Search query (for search action)' },
      selector: { type: 'string', description: 'CSS selector to extract specific content' },
    },
    riskLevel: RiskLevel.LOW,
    handler: async (args): Promise<ToolResult> => {
      const action = args.action as string;

      switch (action) {
        case 'fetch': {
          const url = args.url as string;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'ForgeClaw/2.0 (Research Bot)' },
            signal: AbortSignal.timeout(15000),
          });
          const html = await response.text();
          const $ = cheerio.load(html);

          $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();

          const text = $('body').text().replace(/\s+/g, ' ').trim();
          const { text: output, truncated } = truncate(text, 6000);

          return { success: true, output, truncated, duration_ms: 0 };
        }
        case 'search': {
          const query = String(args.query || '').trim();
          if (!query) {
            return { success: false, output: '', error: 'query is required for search', duration_ms: 0, truncated: false };
          }
          return await searchWeb(query);
        }
        case 'extract_links': {
          const url = args.url as string;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'ForgeClaw/2.0' },
            signal: AbortSignal.timeout(10000),
          });
          const html = await response.text();
          const $ = cheerio.load(html);

          const links: string[] = [];
          $('a[href]').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !href.startsWith('#')) {
              links.push(`[${text}](${href})`);
            }
          });

          const { text: output, truncated } = truncate(links.join('\n'), 5000);
          return { success: true, output, truncated, duration_ms: 0 };
        }
        default:
          return { success: false, output: '', error: `Unknown browser action: ${action}`, duration_ms: 0, truncated: false };
      }
    },
  };
}
