import { promises as fs } from 'fs';
import path from 'path';
import { XMLBuilder } from 'fast-xml-parser';
import { getArticles } from '@/lib/sanity/queries';

const baseUrl = 'https://www.djaoulient.com';

interface Article {
  section: {
    slug: {
      current: string;
    };
  };
  slug: {
    current: string;
  };
  publishedAt: string;
}

export async function generateSitemap() {
  const appDir = path.join(process.cwd(), 'app');
  const staticPages = await getPages(appDir);
  const articles = await getArticles();

  const xmlObj = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    urlset: {
      '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      url: [
        ...staticPages.map(page => ({
          loc: `${baseUrl}${page.route}`,
          lastmod: new Date().toISOString().split('T')[0],
          changefreq: page.changefreq,
          priority: page.priority,
        })),
        ...articles.map((article: Article) => ({
          loc: `${baseUrl}/${article.section.slug.current}/${article.slug.current}`,
          lastmod: new Date(article.publishedAt).toISOString().split('T')[0],
          changefreq: 'weekly',
          priority: '0.7',
        })),
      ],
    },
  };

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
  });

  const sitemap = builder.build(xmlObj);
  await fs.writeFile(path.join(process.cwd(), 'public', 'sitemap.xml'), sitemap);
}

async function getPages(dir: string, basePath = ''): Promise<Array<{ route: string, changefreq: string, priority: string }>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const pages: Array<{ route: string, changefreq: string, priority: string }> = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
        // Skip dynamic route folders
        continue;
      }
      if (entry.name === 'api' || entry.name === 'studio') {
        // Skip API and studio routes
        continue;
      }
      pages.push(...await getPages(fullPath, relativePath));
    } else if (entry.isFile() && entry.name === 'page.tsx') {
      let route = basePath.replace(/\/page$/, '');
      if (route === '') {
        route = '/';
      } else if (!route.startsWith('/')) {
        route = '/' + route;
      }
      pages.push({
        route,
        changefreq: route === '/' ? 'daily' : 'weekly',
        priority: route === '/' ? '1.0' : '0.8',
      });
    }
  }

  return pages;
}