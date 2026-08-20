const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const { PDFParse } = require('pdf-parse');

const MAX_RESUME_CHARS = 12000;

const SUPPORTED_RESUME_FORMATS = Object.freeze({
    '.pdf': 'PDF',
    '.docx': 'DOCX',
    '.txt': 'TXT'
});

function getResumeFormat(filename = '') {
    const extension = path.extname(filename).toLowerCase();
    return SUPPORTED_RESUME_FORMATS[extension] ? extension : null;
}

function isSupportedResumeFile(file) {
    return Boolean(file && getResumeFormat(file.originalname));
}

function normalizeResumeText(text) {
    return String(text || '')
        .normalize('NFC')
        .replace(/\r\n?/g, '\n')
        .replace(/\u00a0/g, ' ')
        .split('\n')
        .map(line => line.replace(/[\t ]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function limitResumeText(text) {
    if (text.length <= MAX_RESUME_CHARS) return text;
    return `${text.slice(0, MAX_RESUME_CHARS)}\n[Resume truncated for analysis]`;
}

async function extractPdfText(fileBuffer) {
    if (!fileBuffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
        throw new Error('parse: The uploaded file is not a valid PDF');
    }

    const parser = new PDFParse(new Uint8Array(fileBuffer));
    try {
        const parsed = await parser.getText();
        return parsed?.text || '';
    } finally {
        await parser.destroy();
    }
}

async function extractDocxText(fileBuffer) {
    if (fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4b) {
        throw new Error('parse: The uploaded file is not a valid DOCX document');
    }

    const parsed = await mammoth.extractRawText({ buffer: fileBuffer });
    return parsed?.value || '';
}

function extractTxtText(fileBuffer) {
    if (fileBuffer.includes(0)) {
        throw new Error('parse: The uploaded TXT file appears to contain binary data');
    }

    try {
        return new TextDecoder('utf-8', { fatal: true }).decode(fileBuffer);
    } catch {
        throw new Error('parse: The uploaded TXT file must use UTF-8 encoding');
    }
}

async function extractResumeText(filePath, originalName) {
    const format = getResumeFormat(originalName);
    if (!format) {
        throw new Error('parse: Unsupported resume format');
    }

    try {
        const fileBuffer = fs.readFileSync(filePath);
        let extractedText;

        if (format === '.pdf') {
            extractedText = await extractPdfText(fileBuffer);
        } else if (format === '.docx') {
            extractedText = await extractDocxText(fileBuffer);
        } else {
            extractedText = extractTxtText(fileBuffer);
        }

        const normalized = normalizeResumeText(extractedText);
        if (!normalized) {
            throw new Error(`parse: No readable text found in ${SUPPORTED_RESUME_FORMATS[format]} file`);
        }

        return limitResumeText(normalized);
    } catch (error) {
        if (error.message?.startsWith('parse:')) throw error;
        throw new Error(`parse: We could not read this ${SUPPORTED_RESUME_FORMATS[format]} file`);
    }
}

module.exports = {
    MAX_RESUME_CHARS,
    SUPPORTED_RESUME_FORMATS,
    extractResumeText,
    getResumeFormat,
    isSupportedResumeFile,
    normalizeResumeText
};
