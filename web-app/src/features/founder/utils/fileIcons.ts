/**
 * Vision2Real – File MIME Icon Utility
 * Returns file type specific visual icons and color badges for attachment lists.
 */

export interface FileIconConfig {
  iconType: 'pdf' | 'word' | 'image' | 'archive' | 'code' | 'text' | 'generic';
  label: string;
  color: string;
  bgColor: string;
}

export function getFileIconConfig(mimeType: string, filename: string): FileIconConfig {
  const mime = (mimeType || '').toLowerCase();
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';

  if (mime.includes('pdf') || ext === 'pdf') {
    return {
      iconType: 'pdf',
      label: 'PDF Document',
      color: '#f87171',
      bgColor: 'rgba(248, 113, 113, 0.15)',
    };
  }

  if (
    mime.includes('word') ||
    mime.includes('officedocument.wordprocessingml') ||
    ext === 'doc' ||
    ext === 'docx'
  ) {
    return {
      iconType: 'word',
      label: 'Word Document',
      color: '#60a5fa',
      bgColor: 'rgba(96, 165, 250, 0.15)',
    };
  }

  if (
    mime.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)
  ) {
    return {
      iconType: 'image',
      label: 'Image Asset',
      color: '#34d399',
      bgColor: 'rgba(52, 211, 153, 0.15)',
    };
  }

  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed') ||
    ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)
  ) {
    return {
      iconType: 'archive',
      label: 'Archive Package',
      color: '#fbbf24',
      bgColor: 'rgba(251, 191, 36, 0.15)',
    };
  }

  if (
    ['json', 'js', 'ts', 'tsx', 'py', 'html', 'css', 'yaml', 'yml'].includes(ext) ||
    mime.includes('javascript') ||
    mime.includes('json')
  ) {
    return {
      iconType: 'code',
      label: 'Code / Config',
      color: '#c084fc',
      bgColor: 'rgba(192, 132, 252, 0.15)',
    };
  }

  if (mime.startsWith('text/') || ext === 'txt' || ext === 'md') {
    return {
      iconType: 'text',
      label: 'Text File',
      color: '#94a3b8',
      bgColor: 'rgba(148, 163, 184, 0.15)',
    };
  }

  return {
    iconType: 'generic',
    label: 'Attachment',
    color: '#818cf8',
    bgColor: 'rgba(129, 140, 248, 0.15)',
  };
}
