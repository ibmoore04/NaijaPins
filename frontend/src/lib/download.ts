/**
 * Direct in-page media download utility without navigating away or opening new tabs.
 * Fetches the resource as a blob and uses an in-memory object URL to trigger immediate download.
 */
export async function downloadMediaFile(url: string, filename?: string): Promise<void> {
  try {
    const derivedFilename =
      filename ||
      url.split('/').pop()?.split('?')[0] ||
      `naijapins-${Date.now()}.jpg`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    anchor.href = blobUrl;
    anchor.download = derivedFilename;
    document.body.appendChild(anchor);
    anchor.click();

    setTimeout(() => {
      if (document.body.contains(anchor)) {
        document.body.removeChild(anchor);
      }
      window.URL.revokeObjectURL(blobUrl);
    }, 300);
  } catch (error) {
    console.warn('In-page blob download failed, falling back to direct download:', error);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || 'download';
    anchor.target = '_self';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}
