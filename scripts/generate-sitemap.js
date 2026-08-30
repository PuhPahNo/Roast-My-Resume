const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const today = new Date().toISOString().slice(0, 10);
const origin = 'https://www.roast-my-resume.com';

const pages = [
  ['/', 'src/pages/index.html'],
  ['/resume-roast-examples', 'src/pages/resume-roast-examples.html'],
  ['/methodology', 'src/pages/methodology.html'],
  ['/about', 'src/pages/about.html'],
  ['/contact', 'src/pages/contact.html'],
  ['/privacy', 'src/pages/privacy.html'],
  ['/terms', 'src/pages/terms.html'],
  ['/blog', 'src/pages/blog/index.html'],
  ['/blog/why-no-interviews', 'src/pages/blog/why-no-interviews.html'],
  ['/blog/beat-the-ats', 'src/pages/blog/beat-the-ats.html'],
  ['/blog/how-long-should-resume-be', 'src/pages/blog/how-long-should-resume-be.html'],
  ['/blog/resume-summary-examples', 'src/pages/blog/resume-summary-examples.html'],
  ['/blog/career-gap-resume', 'src/pages/blog/career-gap-resume.html'],
  ['/blog/is-my-resume-cooked', 'src/pages/blog/is-my-resume-cooked.html'],
  ['/blog/what-is-a-resume-roast', 'src/pages/blog/what-is-a-resume-roast.html'],
  ['/blog/ai-resume-roaster', 'src/pages/blog/ai-resume-roaster.html'],
  ['/blog/roast-my-cv', 'src/pages/blog/roast-my-cv.html'],
  ['/blog/resume-red-flags', 'src/pages/blog/resume-red-flags.html']
];

function gitOutput(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function lastModified(file) {
  if (gitOutput(['status', '--porcelain', '--', file])) return today;
  return gitOutput(['log', '-1', '--format=%cs', '--', file]) || today;
}

const entries = pages.map(([urlPath, file]) => {
  const loc = urlPath === '/' ? `${origin}/` : `${origin}${urlPath}`;
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastModified(file)}</lastmod>\n  </url>`;
});

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
