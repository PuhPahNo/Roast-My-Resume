const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pageFiles = [
  'src/pages/index.html',
  'src/pages/resume-roast-examples.html',
  'src/pages/methodology.html',
  'src/pages/about.html',
  'src/pages/contact.html',
  'src/pages/privacy.html',
  'src/pages/terms.html',
  'src/pages/blog/index.html',
  ...fs.readdirSync(path.join(root, 'src/pages/blog'))
    .filter((file) => file.endsWith('.html') && file !== 'index.html')
    .map((file) => `src/pages/blog/${file}`)
];

test('indexable pages have essential metadata and compiled Tailwind', () => {
  for (const file of pageFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(html, /<title>[^<]+<\/title>/i, `${file} needs a title`);
    assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i, `${file} needs a description`);
    assert.match(html, /<link\s+rel="canonical"\s+href="https:\/\/www\.roast-my-resume\.com\/[^"]*"/i, `${file} needs a canonical URL`);
    assert.match(html, /\/public\/css\/tailwind\.css/, `${file} needs compiled Tailwind`);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com|tailwind\.config/, `${file} must not use the Tailwind CDN`);
  }
});

test('JSON-LD blocks are valid JSON', () => {
  for (const file of pageFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const blocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
    for (const [, json] of blocks) {
      assert.doesNotThrow(() => JSON.parse(json), `${file} contains invalid JSON-LD`);
    }
  }
});

test('legacy unsupported product claims do not return', () => {
  const html = [...pageFiles, 'src/pages/roast-result.html']
    .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
    .join('\n');
  for (const phrase of [
    'Google AI APIs',
    'trained on thousands of resumes',
    'simulates exactly how an ATS',
    'every major ATS handles',
    '75% of large employers',
    'Recruiters spend 6 seconds',
    'Proven to increase response rates',
    'Pass automated screening systems'
  ]) {
    assert.equal(html.includes(phrase), false, `unsupported claim found: ${phrase}`);
  }
});

test('sitemap contains each canonical indexable URL once', () => {
  const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(urls.length, pageFiles.length);
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.includes('https://www.roast-my-resume.com/resume-roast-examples'));
  assert.ok(urls.includes('https://www.roast-my-resume.com/methodology'));
  assert.doesNotMatch(sitemap, /<changefreq>|<priority>|\.html<\/loc>/);
});
