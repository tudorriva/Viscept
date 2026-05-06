/**
 * Export utilities for diagrams.
 */

import { jsPDF } from 'jspdf';
import { toPng, toSvg } from 'html-to-image';

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

function createExportContainer(element: HTMLElement, options?: ExportOptions): HTMLElement {
  const wrapper = document.createElement('div');
  const padding = options?.padding ?? 12;
  const background = options?.background ?? 'transparent';
  const borderRadius = options?.borderRadius ?? 0;
  const shadow = options?.shadow ?? 'none';

  wrapper.style.position = 'fixed';
  wrapper.style.left = '-10000px';
  wrapper.style.top = '0';
  wrapper.style.padding = `${padding}px`;
  wrapper.style.background = background;
  wrapper.style.borderRadius = `${borderRadius}px`;
  wrapper.style.boxShadow = shadow;
  wrapper.style.display = 'inline-block';
  wrapper.style.zIndex = '-1';
  wrapper.style.whiteSpace = 'nowrap';

  const content = createExportContent(element);
  content.style.margin = '0';
  content.style.padding = '0';
  content.style.display = 'inline-block';
  wrapper.appendChild(content);
  document.body.appendChild(wrapper);

  return wrapper;
}

function createExportContent(element: HTMLElement): HTMLElement {
  const svgEl = element.tagName.toLowerCase() === 'svg'
    ? (element as unknown as SVGSVGElement)
    : (element.querySelector('svg') as SVGSVGElement | null);

  if (svgEl) {
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    svgClone.style.transform = 'none';
    svgClone.style.display = 'block';
    svgClone.style.maxWidth = 'none';
    svgClone.style.maxHeight = 'none';
    const svgWrapper = document.createElement('div');
    svgWrapper.style.display = 'inline-block';
    svgWrapper.appendChild(svgClone);
    return svgWrapper;
  }

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  return clone;
}

function normalizeSvgBounds(wrapper: HTMLElement, options?: ExportOptions): void {
  const svgEl = wrapper.querySelector('svg') as SVGSVGElement | null;
  if (!svgEl) return;

  const trimPadding = options?.trimPadding ?? 8;
  try {
    const bbox = svgEl.getBBox();
    if (!bbox || !isFinite(bbox.width) || !isFinite(bbox.height)) {
      // Fallback: size to content
      svgEl.setAttribute('width', '100%');
      svgEl.setAttribute('height', '100%');
      return;
    }

    // Calculate dimensions with padding
    const width = Math.max(1, Math.ceil(bbox.width + trimPadding * 2));
    const height = Math.max(1, Math.ceil(bbox.height + trimPadding * 2));
    const viewBoxX = bbox.x - trimPadding;
    const viewBoxY = bbox.y - trimPadding;

    // Set viewBox for proper scaling
    svgEl.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${width} ${height}`);
    
    // Set explicit width/height in px
    svgEl.setAttribute('width', String(width));
    svgEl.setAttribute('height', String(height));
    svgEl.style.width = `${width}px`;
    svgEl.style.height = `${height}px`;
    svgEl.style.display = 'block';
  } catch (error) {
    // If bbox fails, reset to auto sizing
    svgEl.style.width = 'auto';
    svgEl.style.height = 'auto';
  }
}

type ImageOptions = Parameters<typeof toPng>[1];

async function withExportContainer<T>(
  element: HTMLElement,
  options: ExportOptions | undefined,
  render: (node: HTMLElement, imageOptions: ImageOptions) => Promise<T>
): Promise<T> {
  const container = createExportContainer(element, options);
  
  // Normalize SVG bounds after container is in the DOM
  normalizeSvgBounds(container, options);
  
  // Allow browser to compute layout
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  const pixelRatio = resolvePixelRatio(options);
  const imageOptions: ImageOptions = {
    pixelRatio,
    cacheBust: true,
    backgroundColor: options?.background ?? undefined,
  };

  try {
    return await render(container, imageOptions);
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportAsPNG(
  element: HTMLElement,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  try {
    const dataUrl = await withExportContainer(element, options, (node, imageOptions) =>
      toPng(node, imageOptions)
    );
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

export async function exportAsSVG(
  element: HTMLElement,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  try {
    const dataUrl = await withExportContainer(element, options, (node, imageOptions) =>
      toSvg(node, imageOptions)
    );
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

export async function exportAsPDF(
  element: HTMLElement,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  try {
    const dataUrl = await withExportContainer(element, options, (node, imageOptions) =>
      toPng(node, imageOptions)
    );
    await new Promise<void>((resolve, reject) => {
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
        resolve();
      };
      img.onerror = () => reject(new Error('Failed to load export image'));
    });
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
