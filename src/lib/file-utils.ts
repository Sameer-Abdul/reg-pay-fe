/**
 * Validate a file against size and type constraints
 * @param file The file to validate
 * @param options Validation options
 * @returns An error message if validation fails, or null if valid
 */
export function validateFile(
  file: File, 
  options: { 
    maxSize?: number; 
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): string | null {
  const { 
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    return `File is too large. Maximum size is ${formatFileSize(maxSize)}.`;
  }

  // Check MIME type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`;
  }

  // Check file extension
  const extension = getFileExtension(file.name);
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
    return `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`;
  }

  return null; // File is valid
}

/**
 * Format file size in bytes to a human-readable string
 * @param bytes File size in bytes
 * @param decimals Number of decimal places to show (default: 2)
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get file extension from filename
 * @param filename The filename to get the extension from
 * @returns The file extension in lowercase (without the dot)
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if a file has an allowed extension
 * @param file The file to check
 * @param allowedExtensions Array of allowed extensions (without leading dot)
 * @returns boolean indicating if the file has an allowed extension
 */
export function hasAllowedExtension(file: File, allowedExtensions: string[]): boolean {
  const extension = getFileExtension(file.name);
  return allowedExtensions.includes(extension);
}

/**
 * Convert a file to a base64 string
 * @param file The file to convert
 * @returns A promise that resolves to the base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Create a download link for a file
 * @param data The file data (can be a string, Blob, or File)
 * @param filename The name to give the downloaded file
 * @param type The MIME type of the file
 */
export function downloadFile(data: string | Blob | File, filename: string, type: string = 'application/octet-stream'): void {
  let blob: Blob;
  
  if (data instanceof File) {
    blob = data;
  } else if (data instanceof Blob) {
    blob = data;
  } else {
    // If it's a string, create a blob from it
    blob = new Blob([data], { type });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
