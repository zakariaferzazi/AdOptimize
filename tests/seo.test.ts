import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { BLOG_POSTS } from '@/lib/blog-data';
import { PSEO_COMPARISONS } from '@/lib/comparison-data';
import { buildLlmsTxt } from '@/lib/llms';
import { buildGlobalSchema, buildPageMetadata, PRIVATE_ROUTES } from '@/lib/seo';

describe('search indexing', () => {
  it('lists only public, absolute URLs in the sitemap, including the blog and comparisons', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const route of PRIVATE_ROUTES) {
      expect(urls.some((url) => url === `https://adoptimize.app${route}` || url.startsWith(`https://adoptimize.app${route}/`))).toBe(false);
    }
    expect(urls).toContain('https://adoptimize.app/blog/wordstream-vs-adoptimize');
    expect(urls).toContain('https://adoptimize.app/compare/wordstream-alternative');
    expect(urls.every((url) => url.startsWith('https://adoptimize.app'))).toBe(true);
  });

  it('keeps private routes and API paths out of crawling and points to the sitemap', () => {
    const rules = robots();
    const disallow = rules.rules && 'disallow' in rules.rules ? rules.rules.disallow : [];
    expect(disallow).toEqual(expect.arrayContaining(['/api/', ...PRIVATE_ROUTES]));
    expect(rules.sitemap).toBe('https://adoptimize.app/sitemap.xml');
  });

  it('marks private pages noindex and gives public pages an absolute canonical URL', () => {
    const publicMeta = buildPageMetadata({ title: 'Pricing', description: 'Plans', path: '/pricing' });
    expect(publicMeta.alternates?.canonical).toBe('https://adoptimize.app/pricing');
    expect(publicMeta.robots).toBeUndefined();
  });
});

describe('answer engine (GEO) content', () => {
  it('describes the product, pricing and approval model accurately in llms.txt', () => {
    const text = buildLlmsTxt();
    expect(text).toContain('$29 per month');
    expect(text).toContain('$99 per year');
    expect(text).toContain('approved');
    expect(text).toContain('support@adoptimize.app');
    expect(text).toContain('https://adoptimize.app/blog/wordstream-vs-adoptimize');
    expect(text).toContain('https://adoptimize.app/compare/adspirer-alternative');
    expect(text).not.toMatch(/aggregateRating|all sales are final|Review current provider|free plan/i);
  });

  it('gives every blog post and comparison standalone key facts with no unsupported claims', () => {
    const facts = [
      ...BLOG_POSTS.map((post) => post.keyFacts),
      ...PSEO_COMPARISONS.map((comparison) => comparison.keyFacts),
    ];
    for (const list of facts) {
      expect(list.length).toBeGreaterThanOrEqual(2);
      for (const fact of list) expect(fact).not.toMatch(/guarantee[ds]? (results|savings|roas|cpa)|always|#1/i);
    }
  });
});

describe('structured data and content', () => {
  it('publishes no aggregate rating or unverifiable social profile', () => {
    const schema = JSON.stringify(buildGlobalSchema());
    expect(schema).not.toMatch(/aggregateRating|ratingValue|sameAs/);
  });

  it('does not ship any aggregate rating markup from app routes', () => {
    const files = readdirSync(join(process.cwd(), 'app'), { recursive: true }) as string[];
    const sources = files.filter((file) => /\.(tsx?|ts)$/.test(file));
    for (const file of sources) {
      const contents = readFileSync(join(process.cwd(), 'app', file), 'utf8');
      expect(contents, file).not.toMatch(/aggregateRating|ratingValue/);
    }
  });

  it('cites a public source for every comparison article', () => {
    for (const post of BLOG_POSTS.filter((item) => item.slug.endsWith('-vs-adoptimize'))) {
      expect(post.sources.length, post.slug).toBeGreaterThan(0);
    }
  });

  it('replaces placeholder competitor cells and removes all-sales-final sales copy from comparisons', () => {
    const copy = JSON.stringify(PSEO_COMPARISONS);
    expect(copy).not.toMatch(/Review current provider|all sales are final/i);
    for (const comparison of PSEO_COMPARISONS) {
      expect(comparison.relatedBlogSlug ? BLOG_POSTS.some((post) => post.slug === comparison.relatedBlogSlug) : true).toBe(true);
    }
  });
});
