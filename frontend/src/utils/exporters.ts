/**
 * Export utilities for diagrams.
 */

import { jsPDF } from 'jspdf';

export type ExportQuality = 'low' | 'medium' | 'high';

export interface ExportOptions {
  background?: string;
  padding?: number;
  borderRadius?: number;
  shadow?: string;
  quality?: ExportQuality;
  scale?: number;
  trim?: boolean;
  trimPadding?: number;
}

const QUALITY_SCALE: Record<ExportQuality, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function resolvePixelRatio(options?: ExportOptions): number {
  if (options?.scale && options.scale > 0) return options.scale;
  return QUALITY_SCALE[options?.quality ?? 'high'];
}

function findLargestSvg(element: HTMLElement): SVGSVGElement | null {
  const svgEls = element.tagName.toLowerCase() === 'svg'
    ? [(element as unknown as SVGSVGElement)]
    : Array.from(element.querySelectorAll('svg')) as SVGSVGElement[];

  if (svgEls.length === 0) return null;

  let bestSvg = svgEls[0];
  let bestArea = 0;

  for (const svg of svgEls) {
    let width = parseFloat(svg.getAttribute('width') || '0');
    let height = parseFloat(svg.getAttribute('height') || '0');

    if ((!width || !height) && typeof svg.getBBox === 'function') {
      try {
        const bbox = svg.getBBox();
        width = bbox.width;
        height = bbox.height;
      } catch {
        // ignore invalid bbox
      }
    }

    const area = Math.max(0, width) * Math.max(0, height);
    if (area > bestArea) {
      bestArea = area;
      bestSvg = svg;
    }
  }

  return bestSvg;
}

function isPlantUMLExport(element: HTMLElement): boolean {
  return !!element.querySelector('[data-diagram-language="plantuml"]');
}

function normalizePlantUMLPaperColors(svg: SVGSVGElement): void {
  const lightText = new Set(['#f8fafc', '#e2e8f0', '#cbd5e1']);

  svg.querySelectorAll<SVGElement>('*').forEach((el) => {
    const fill = (el.getAttribute('fill') || '').toLowerCase();
    const stroke = (el.getAttribute('stroke') || '').toLowerCase();

    if (lightText.has(fill)) {
      el.setAttribute('fill', '#0F172A');
    }

    if (stroke === '#cbd5e1' || stroke === '#94a3b8') {
      el.setAttribute('stroke', '#334155');
    }

    if (el.style.fill && lightText.has(el.style.fill.toLowerCase())) {
      el.style.fill = '#0F172A';
    }

    if (el.style.stroke && ['#cbd5e1', '#94a3b8'].includes(el.style.stroke.toLowerCase())) {
      el.style.stroke = '#334155';
    }
  });
}

interface SvgExportResult {
  svgString: string;
  width: number;
  height: number;
  background: string;
}

function buildExportSvg(element: HTMLElement, options?: ExportOptions): SvgExportResult {
  const svgEl = findLargestSvg(element);
  if (!svgEl) {
    throw new Error('No SVG element found for export');
  }

  // Clone the SVG so we can modify it safely
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.style.transform = 'none';
  clone.style.position = 'relative';
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';

  // Inject theme variables
  const rootStyle = getComputedStyle(document.documentElement);
  const vars = [
    '--bg-panel', '--text-primary', '--text-secondary', '--text-muted',
    '--accent-start', '--accent-end', '--success', '--error', '--warning'
  ];
  let styleText = ':root {\n';
  vars.forEach(v => {
    styleText += `  ${v}: ${rootStyle.getPropertyValue(v)};\n`;
  });
  styleText += '}';
  const styleEl = document.createElement('style');
  styleEl.textContent = styleText;
  clone.insertBefore(styleEl, clone.firstChild);

  // Normalize bounds using BBox
  const trimPadding = options?.trimPadding ?? 20;
  let viewBoxX = 0; let viewBoxY = 0; let contentW = 1200; let contentH = 800;

  // Use BBox from the original element (clone is not in DOM so getBBox won't work)
  try {
    const bbox = svgEl.getBBox();
    if (bbox && isFinite(bbox.width) && isFinite(bbox.height) && (bbox.width > 0 || bbox.height > 0)) {
      contentW = Math.ceil(bbox.width + trimPadding * 2);
      contentH = Math.ceil(bbox.height + trimPadding * 2);
      viewBoxX = bbox.x - trimPadding;
      viewBoxY = bbox.y - trimPadding;
    } else {
      const attrW = parseFloat(svgEl.getAttribute('width') || '0');
      const attrH = parseFloat(svgEl.getAttribute('height') || '0');
      contentW = attrW || 1200;
      contentH = attrH || 800;
    }
  } catch {
    const attrW = parseFloat(svgEl.getAttribute('width') || '0');
    const attrH = parseFloat(svgEl.getAttribute('height') || '0');
    contentW = attrW || 1200;
    contentH = attrH || 800;
  }

  // Calculate final size with padding
  const padding = options?.padding ?? 24;
  const finalW = contentW + padding * 2;
  const finalH = contentH + padding * 2;
  const finalViewBoxX = viewBoxX - padding;
  const finalViewBoxY = viewBoxY - padding;

  clone.setAttribute('viewBox', `${finalViewBoxX} ${finalViewBoxY} ${finalW} ${finalH}`);
  clone.setAttribute('width', String(finalW));
  clone.setAttribute('height', String(finalH));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.style.width = `${finalW}px`;
  clone.style.height = `${finalH}px`;
  
  const background = options?.background ?? 'transparent';
  clone.style.backgroundColor = background;

  if (isPlantUMLExport(element) && /^#fff(?:fff)?$/i.test(background)) {
    normalizePlantUMLPaperColors(clone);
  }

  // Add explicit background rect if not transparent
  if (background && background !== 'transparent') {
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(finalViewBoxX));
    bgRect.setAttribute('y', String(finalViewBoxY));
    bgRect.setAttribute('width', String(finalW));
    bgRect.setAttribute('height', String(finalH));
    bgRect.setAttribute('fill', background);
    // Insert after style tag if present, or at the beginning
    if (clone.firstChild && clone.firstChild.nodeName === 'style') {
      clone.insertBefore(bgRect, clone.firstChild.nextSibling);
    } else {
      clone.insertBefore(bgRect, clone.firstChild);
    }
  }

  // Inline current CSS variables and explicit text colors for SVG text nodes
  const svgColor = getComputedStyle(svgEl).color;
  clone.querySelectorAll('text').forEach(textNode => {
    if (!textNode.getAttribute('fill') && !textNode.style.fill) {
      textNode.style.fill = svgColor || '#e2e8f0'; // Fallback to theme text color
    }
  });

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);
  
  // To avoid issues with rendering SVG inside an Image via data URI,
  // we must ensure that any nested quotes, unescaped characters, or external references are handled.
  // XMLSerializer handles standard entity escaping.

  return {
    svgString,
    width: finalW,
    height: finalH,
    background
  };
}

async function svgStringToPngDataUrl(
  svgResult: SvgExportResult,
  options?: ExportOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    // We encode the SVG string as a Blob rather than raw string for better robust handling
    const blob = new Blob([svgResult.svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const img = new Image();
    
    img.onload = () => {
      try {
        const pixelRatio = resolvePixelRatio(options);
        const canvas = document.createElement('canvas');
        canvas.width = svgResult.width * pixelRatio;
        canvas.height = svgResult.height * pixelRatio;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get 2D canvas context');
        }

        // Scale context
        ctx.scale(pixelRatio, pixelRatio);
        
        // Background is already part of the SVG rect if not transparent,
        // so we don't need to manually fill the canvas background.
        ctx.drawImage(img, 0, 0, svgResult.width, svgResult.height);
        
        const dataUrl = canvas.toDataURL('image/png');
        if (!dataUrl || dataUrl === 'data:,') {
          throw new Error('Generated PNG is empty');
        }
        
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG into Image element'));
    };
    
    img.src = url;
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportAsPNG(
  element: HTMLElement,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  try {
    // If not specified, default to transparent so it falls back to whatever was provided
    const svgResult = buildExportSvg(element, options);
    const dataUrl = await svgStringToPngDataUrl(svgResult, options);
    downloadDataUrl(dataUrl, `${filename}.png`);
  } catch (err) {
    console.error('Failed to export PNG:', err);
    throw err;
  }
}

export async function exportAsSVG(
  element: HTMLElement,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  try {
    const svgResult = buildExportSvg(element, options);
    const blob = new Blob([svgResult.svgString], { type: 'image/svg+xml;charset=utf-8' });
    const dataUrl = URL.createObjectURL(blob);
    downloadDataUrl(dataUrl, `${filename}.svg`);
    URL.revokeObjectURL(dataUrl);
  } catch (err) {
    console.error('Failed to export SVG:', err);
    throw err;
  }
}

export async function exportAsPDF(
  element: HTMLElement,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  try {
    // PDF page is white by default. If transparent is requested, we will enforce white behind it to ensure diagram is visible.
    const pdfOptions = {
      ...options,
      background: options?.background === 'transparent' ? '#ffffff' : options?.background,
    };
    
    const svgResult = buildExportSvg(element, pdfOptions);
    const dataUrl = await svgStringToPngDataUrl(svgResult, pdfOptions);

    const imgWidth = svgResult.width;
    const imgHeight = svgResult.height;
    
    const isLandscape = imgWidth >= imgHeight;
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    
    let finalWidth = maxWidth;
    let finalHeight = (imgHeight * finalWidth) / imgWidth;
    
    if (finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = (imgWidth * finalHeight) / imgHeight;
    }

    const x = (pageWidth - finalWidth) / 2;
    const y = (pageHeight - finalHeight) / 2;

    // Apply the background color to the PDF page 
    if (pdfOptions.background && pdfOptions.background !== 'transparent') {
      pdf.setFillColor(pdfOptions.background);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    }

    pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
    pdf.save(`${filename}.pdf`);
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
