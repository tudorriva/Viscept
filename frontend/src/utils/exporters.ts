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
  const padding = options?.padding ?? 24;
  const background = options?.background ?? 'transparent';
  const borderRadius = options?.borderRadius ?? 0;
  const shadow = options?.shadow ?? 'none';

  // Strategy: Place on screen but invisible to user. 
  // This ensures getBBox() and clientWidth/Height work correctly.
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.zIndex = '-9999';
  wrapper.style.visibility = 'hidden';
  wrapper.style.pointerEvents = 'none';
  
  wrapper.style.padding = `${padding}px`;
  wrapper.style.background = background;
  wrapper.style.borderRadius = `${borderRadius}px`;
  wrapper.style.boxShadow = shadow;
  wrapper.style.display = 'inline-block';
  wrapper.style.overflow = 'visible';

  // Inject theme variables so the clone can access them
  const rootStyle = getComputedStyle(document.documentElement);
  const vars = [
    '--bg-panel', '--text-primary', '--text-secondary', '--text-muted',
    '--accent-start', '--accent-end', '--success', '--error', '--warning'
  ];
  vars.forEach(v => {
    wrapper.style.setProperty(v, rootStyle.getPropertyValue(v));
  });

  const content = createExportContent(element);
  wrapper.appendChild(content);
  document.body.appendChild(wrapper);

  return wrapper;
}

function createExportContent(element: HTMLElement): HTMLElement {
  // If the element is already an SVG, clone it.
  // Otherwise, look for an SVG inside (common for our DiagramPreview).
  const svgEl = element.tagName.toLowerCase() === 'svg'
    ? (element as unknown as SVGSVGElement)
    : (element.querySelector('svg') as SVGSVGElement | null);

  if (svgEl) {
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    
    // Reset layout-breaking styles on the clone
    svgClone.style.transform = 'none';
    svgClone.style.position = 'relative';
    svgClone.style.left = 'auto';
    svgClone.style.top = 'auto';
    svgClone.style.display = 'block';
    svgClone.style.maxWidth = 'none';
    svgClone.style.maxHeight = 'none';
    
    // Ensure it's not hidden
    svgClone.style.visibility = 'visible';
    svgClone.style.opacity = '1';

    const svgWrapper = document.createElement('div');
    svgWrapper.style.display = 'inline-block';
    svgWrapper.style.overflow = 'visible';
    svgWrapper.appendChild(svgClone);
    return svgWrapper;
  }

  // Fallback for non-SVG content
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';
  return clone;
}

function normalizeSvgBounds(wrapper: HTMLElement, options?: ExportOptions): void {
  const svgEl = wrapper.querySelector('svg') as SVGSVGElement | null;
  if (!svgEl) return;

  const trimPadding = options?.trimPadding ?? 20;
  try {
    // We need to measure the actual content size
    let width = 0;
    let height = 0;
    let viewBoxX = 0;
    let viewBoxY = 0;

    // Use BBox if possible (most accurate for SVG content)
    const bbox = svgEl.getBBox();
    if (bbox && isFinite(bbox.width) && isFinite(bbox.height) && (bbox.width > 0 || bbox.height > 0)) {
      width = Math.ceil(bbox.width + trimPadding * 2);
      height = Math.ceil(bbox.height + trimPadding * 2);
      viewBoxX = bbox.x - trimPadding;
      viewBoxY = bbox.y - trimPadding;
    } else {
      // Fallback to attributes or defaults
      const attrW = parseFloat(svgEl.getAttribute('width') || '0');
      const attrH = parseFloat(svgEl.getAttribute('height') || '0');
      width = attrW || 1200;
      height = attrH || 800;
      viewBoxX = 0;
      viewBoxY = 0;
    }

    // Apply fixed dimensions and viewBox to the clone
    svgEl.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${width} ${height}`);
    svgEl.setAttribute('width', String(width));
    svgEl.setAttribute('height', String(height));
    
    // Ensure explicit px sizing for the render library
    svgEl.style.width = `${width}px`;
    svgEl.style.height = `${height}px`;
    svgEl.style.flex = 'none';
  } catch (error) {
    console.warn('[Exporter] Svg normalization failed:', error);
    svgEl.style.width = '1000px';
    svgEl.style.height = '800px';
  }
}

type ImageOptions = Parameters<typeof toPng>[1];

async function withExportContainer<T>(
  element: HTMLElement,
  options: ExportOptions | undefined,
  render: (node: HTMLElement, imageOptions: ImageOptions) => Promise<T>
): Promise<T> {
  let container: HTMLElement | null = null;
  try {
    container = createExportContainer(element, options);
    
    // Crucial: wait for DOM to settle and styles to apply
    await new Promise(resolve => setTimeout(resolve, 150));
    
    normalizeSvgBounds(container, options);
    
    // Wait for fonts/layout one last time
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    
    const pixelRatio = resolvePixelRatio(options);
    const imageOptions: ImageOptions = {
      pixelRatio,
      cacheBust: true,
      backgroundColor: options?.background ?? undefined,
      skipFonts: false,
    };

    return await render(container, imageOptions);
  } catch (err) {
    console.error('[Exporter] Capture failed:', err);
    throw err;
  } finally {
    if (container && container.parentElement) {
      document.body.removeChild(container);
    }
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
    if (!dataUrl || dataUrl === 'data:,') {
      throw new Error('Generated PNG is empty');
    }
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
    
    if (!dataUrl || dataUrl === 'data:,') {
      throw new Error('Generated image for PDF is empty');
    }

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const isLandscape = img.width >= img.height;
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
        let finalHeight = (img.height * finalWidth) / img.width;
        
        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = (img.width * finalHeight) / img.height;
        }

        const x = (pageWidth - finalWidth) / 2;
        const y = (pageHeight - finalHeight) / 2;

        pdf.addImage(dataUrl, 'PNG', x, y, finalWidth, finalHeight);
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
