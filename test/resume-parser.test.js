const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const JSZip = require('jszip');
const {
    MAX_RESUME_CHARS,
    extractResumeText,
    getResumeFormat,
    isSupportedResumeFile,
    normalizeResumeText
} = require('../src/resume-parser');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'roast-resume-tests-'));
test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

function escapeXml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function createDocx(filePath, paragraphs) {
    const zip = new JSZip();
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`);
    zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>`);
    const body = paragraphs
        .map(paragraph => `<w:p><w:r><w:t>${escapeXml(paragraph)}</w:t></w:r></w:p>`)
        .join('');
    zip.folder('word').file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(filePath, buffer);
}

test('recognizes only the advertised resume extensions', () => {
    assert.equal(getResumeFormat('resume.PDF'), '.pdf');
    assert.equal(getResumeFormat('resume.docx'), '.docx');
    assert.equal(getResumeFormat('resume.txt'), '.txt');
    assert.equal(getResumeFormat('resume.doc'), null);
    assert.equal(isSupportedResumeFile({ originalname: 'resume.docx' }), true);
    assert.equal(isSupportedResumeFile({ originalname: 'resume.rtf' }), false);
});

test('normalizes whitespace while preserving section and bullet line breaks', () => {
    const text = normalizeResumeText('SUMMARY\r\n\tSenior   Engineer\r\n\r\n\r\nEXPERIENCE');
    assert.equal(text, 'SUMMARY\nSenior Engineer\n\nEXPERIENCE');
});

test('extracts the bundled PDF resume', async () => {
    const filePath = path.join(__dirname, '../static/Sample Resume/resume.pdf');
    const text = await extractResumeText(filePath, 'resume.pdf');
    assert.match(text, /SUMMARY OF QUALIFICATIONS/);
    assert.match(text, /Visual Basic/);
});

test('extracts a DOCX resume', async () => {
    const filePath = path.join(tempDir, 'resume.docx');
    await createDocx(filePath, [
        'Jordan Rivera',
        'EXPERIENCE',
        'Raised renewal revenue 18% by rebuilding the onboarding sequence.'
    ]);

    const text = await extractResumeText(filePath, 'resume.docx');
    assert.match(text, /Jordan Rivera/);
    assert.match(text, /renewal revenue 18%/);
});

test('extracts a UTF-8 TXT resume and applies the analysis limit', async () => {
    const filePath = path.join(tempDir, 'resume.txt');
    fs.writeFileSync(filePath, `Taylor Chen\nEXPERIENCE\n${'Delivered measurable results. '.repeat(800)}`);

    const text = await extractResumeText(filePath, 'resume.txt');
    assert.match(text, /^Taylor Chen\nEXPERIENCE/);
    assert.match(text, /\[Resume truncated for analysis\]$/);
    assert.ok(text.length <= MAX_RESUME_CHARS + 32);
});

test('rejects binary data disguised as TXT', async () => {
    const filePath = path.join(tempDir, 'binary.txt');
    fs.writeFileSync(filePath, Buffer.from([0x41, 0x00, 0x42]));
    await assert.rejects(
        extractResumeText(filePath, 'binary.txt'),
        /appears to contain binary data/
    );
});
