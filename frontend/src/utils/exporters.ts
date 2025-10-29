/**
 * Export utilities for diagrams.
 */

import { jsPDF } from 'jspdf';
import { toPng, toSvg } from 'html-to-image';

export async function exportAsPNG(element: HTMLElement, filename: string): Promise<void> {
  try {
    const dataUrl = await toPng(element);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to export PNG:', err);
    throw err;
  }
}

export async function exportAsSVG(element: HTMLElement, filename: string): Promise<void> {
  try {
    const dataUrl = await toSvg(element);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${filename}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Failed to export SVG:', err);
    throw err;
  }
}

export async function exportAsPDF(element: HTMLElement, filename: string): Promise<void> {
  try {
    const dataUrl = await toPng(element);
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [210, 297],
      });

      const imgWidth = 280;
      const imgHeight = (img.height * imgWidth) / img.width;

      pdf.addImage(dataUrl, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`${filename}.pdf`);
    };
  } catch (err) {
    console.error('Failed to export PDF:', err);
    throw err;
  }
}

export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function loadJSONFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
