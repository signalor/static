/**
 * Validation utilities for file operations
 */

export function isValidBucketName(name: string): boolean {
  // S3 bucket naming rules
  if (!name || name.length < 3 || name.length > 63) return false;
  if (!/^[a-z0-9-]+$/.test(name)) return false;
  if (name.startsWith('-') || name.endsWith('-')) return false;
  if (name.includes('..')) return false;
  return true;
}

export function isValidKey(key: string): boolean {
  // S3 object key validation
  if (!key || key.length > 1024) return false;
  // Disallow absolute paths
  if (key.startsWith('/')) return false;
  return true;
}

export function isValidFileName(fileName: string): boolean {
  // File name validation
  if (!fileName || fileName.length === 0 || fileName.length > 255) return false;
  // Disallow directory traversal
  if (fileName.includes('..') || fileName.includes('/')) return false;
  return true;
}

export function sanitizeKey(key: string): string {
  // Remove leading/trailing slashes and whitespace
  return key.trim().replace(/^\/+|\/+$/g, '');
}

export function getFileExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function getFileIcon(fileName: string): string {
  const ext = getFileExtension(fileName);
  const icons: Record<string, string> = {
    // Documents
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    txt: '📋',
    rtf: '📝',

    // Spreadsheets
    xls: '📊',
    xlsx: '📊',
    csv: '📊',
    numbers: '📊',

    // Presentations
    ppt: '🎯',
    pptx: '🎯',
    key: '🎯',
    odp: '🎯',

    // Images
    jpg: '🖼',
    jpeg: '🖼',
    png: '🖼',
    gif: '🖼',
    svg: '🖼',
    webp: '🖼',
    bmp: '🖼',

    // Video
    mp4: '🎬',
    avi: '🎬',
    mkv: '🎬',
    mov: '🎬',
    wmv: '🎬',
    flv: '🎬',

    // Audio
    mp3: '🎵',
    wav: '🎵',
    flac: '🎵',
    aac: '🎵',
    ogg: '🎵',

    // Archives
    zip: '📦',
    rar: '📦',
    '7z': '📦',
    tar: '📦',
    gz: '📦',

    // Code
    js: '{}',
    ts: '{}',
    jsx: '{}',
    tsx: '{}',
    py: '{}',
    java: '{}',
    cpp: '{}',
    c: '{}',
    go: '{}',
    rs: '{}',
    rb: '{}',
    php: '{}',
    html: '🌐',
    css: '🎨',
    scss: '🎨',
    json: '{}',
    xml: '📌',
    yaml: '📌',
    yml: '📌',
    sql: '🗄',
  };

  return icons[ext] || '📄';
}

export function getContentType(fileName: string): string {
  const ext = getFileExtension(fileName);
  const contentTypes: Record<string, string> = {
    // Text
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/typescript',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',

    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    bmp: 'image/bmp',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    aac: 'audio/aac',
    ogg: 'audio/ogg',

    // Video
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',

    // Archives
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    gz: 'application/gzip',
  };

  return contentTypes[ext] || 'application/octet-stream';
}
