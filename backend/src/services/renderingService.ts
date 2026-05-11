/**
 * Headless Rendering Service — renders diagram code to PNG images.
 *
 * Provides server-side rendering capabilities for diagrams so the Visual
 * Validation Service can inspect the output without requiring a browser window.
 *
 * Rendering strategies:
 *   - Mermaid: Uses @mermaid-js/mermaid-cli (mmdc) or inline SVG → PNG via sharp
 *   - PlantUML: Uses the plantuml-encoder to generate PlantUML server URLs
 *   - Graphviz: Uses @hpcc-js/wasm for DOT → SVG and then sharp for PNG
 *   - DBML: Converts to Mermaid ER and renders via Mermaid pipeline
 *
 * The service writes temporary PNG files and returns base64 strings for the VLM.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import axios from 'axios';
import plantumlEncoder from 'plantuml-encoder';

const execAsync = promisify(exec);
const PLANTUML_SERVER = (process.env.PLANTUML_SERVER || 'https://www.plantuml.com/plantuml')
  .replace(/\/+$/, '')
  .replace(/\/(?:svg|png|txt|uml)$/i, '');

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RenderResult {
  imageBase64: string;  // base64-encoded PNG data (no data: prefix)
  width: number;
  height: number;
  format: 'png';
  tempPath?: string;    // path to temp file (cleaned up automatically)
}

export interface SvgRenderResult {
  svg: string;
  format: 'svg';
}

export type PlantUMLThemeMode = 'dark' | 'paper' | 'transparent';

const PLANTUML_DARK_THEME_MARKER = "' viscept-theme:dark";
const PLANTUML_PAPER_THEME_MARKER = "' viscept-theme:paper";

const PLANTUML_DARK_THEME = `${PLANTUML_DARK_THEME_MARKER}
skinparam backgroundColor transparent
skinparam defaultTextAlignment center
skinparam shadowing false
skinparam dpi 160
skinparam DefaultFontColor #F8FAFC
skinparam NoteBackgroundColor #1E293B
skinparam NoteBorderColor #94A3B8
skinparam NoteFontColor #F8FAFC
skinparam sequence {
  ArrowColor #CBD5E1
  ArrowFontColor #F8FAFC
  ArrowThickness 2
  LifeLineBorderColor #64748B
  LifeLineBackgroundColor transparent
  ParticipantBorderColor #94A3B8
  ParticipantBackgroundColor #E2E8F0
  ParticipantFontColor #0F172A
  ActorBorderColor #94A3B8
  ActorBackgroundColor #E2E8F0
  ActorFontColor #0F172A
  GroupBorderColor #94A3B8
  GroupBackgroundColor #1E293B
  GroupHeaderFontColor #0F172A
  GroupFontColor #F8FAFC
  BoxBorderColor #94A3B8
  BoxBackgroundColor transparent
}`;

const PLANTUML_PAPER_THEME = `${PLANTUML_PAPER_THEME_MARKER}
skinparam backgroundColor #FFFFFF
skinparam defaultTextAlignment center
skinparam shadowing false
skinparam dpi 160
skinparam DefaultFontColor #0F172A
skinparam NoteBackgroundColor #F8FAFC
skinparam NoteBorderColor #64748B
skinparam NoteFontColor #0F172A
skinparam sequence {
  ArrowColor #334155
  ArrowFontColor #0F172A
  ArrowThickness 2
  LifeLineBorderColor #94A3B8
  LifeLineBackgroundColor transparent
  ParticipantBorderColor #64748B
  ParticipantBackgroundColor #E2E8F0
  ParticipantFontColor #0F172A
  ActorBorderColor #64748B
  ActorBackgroundColor #E2E8F0
  ActorFontColor #0F172A
  GroupBorderColor #64748B
  GroupBackgroundColor #F8FAFC
  GroupHeaderFontColor #0F172A
  GroupFontColor #0F172A
  BoxBorderColor #64748B
  BoxBackgroundColor transparent
}`;

function normalizePlantUMLBoundaries(code: string): string {
  let normalized = code.trim();

  if (!/@startuml\b/i.test(normalized)) {
    normalized = `@startuml\n${normalized}`;
  }

  if (!/@enduml\b/i.test(normalized)) {
    normalized = `${normalized}\n@enduml`;
  }

  return normalized;
}

export function ensurePlantUMLTheme(
  code: string,
  themeMode: PlantUMLThemeMode = 'dark'
): string {
  const normalized = normalizePlantUMLBoundaries(code);

  if (
    normalized.includes(PLANTUML_DARK_THEME_MARKER) ||
    normalized.includes(PLANTUML_PAPER_THEME_MARKER)
  ) {
    return normalized;
  }

  const theme = themeMode === 'paper' ? PLANTUML_PAPER_THEME : PLANTUML_DARK_THEME;
  return normalized.replace(/(@startuml[^\r\n]*)(\r?\n)?/i, `$1\n${theme}\n`);
}

// ── Temp Directory Management ──────────────────────────────────────────────────

const TEMP_DIR = path.join(os.tmpdir(), 'viscept-renders');

function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function tempFilePath(ext: string): string {
  ensureTempDir();
  const id = crypto.randomBytes(8).toString('hex');
  return path.join(TEMP_DIR, `viscept-${id}.${ext}`);
}

function cleanupTemp(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

// ── Mermaid Rendering ──────────────────────────────────────────────────────────

/**
 * Render Mermaid code to PNG using mmdc (mermaid-cli).
 * Falls back to a simple SVG-based approach if mmdc is unavailable.
 */
async function renderMermaid(code: string): Promise<RenderResult> {
  const inputPath = tempFilePath('mmd');
  const outputPath = tempFilePath('png');

  try {
    fs.writeFileSync(inputPath, code, 'utf-8');

    // Try using mmdc (mermaid-cli) for headless rendering
    await execAsync(
      `npx mmdc -i "${inputPath}" -o "${outputPath}" -b transparent --width 1200 --height 800`,
      { timeout: 30000 }
    );

    if (fs.existsSync(outputPath)) {
      const buffer = fs.readFileSync(outputPath);
      const base64 = buffer.toString('base64');

      return {
        imageBase64: base64,
        width: 1200,
        height: 800,
        format: 'png',
        tempPath: outputPath,
      };
    }

    throw new Error('mmdc did not produce output file');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Renderer] Mermaid rendering failed:', msg);
    throw new Error(msg);
  } finally {
    cleanupTemp(inputPath);
  }
}

// ── PlantUML Rendering ─────────────────────────────────────────────────────────

/**
 * Render PlantUML code to PNG using a local PlantUML JAR or the encoder.
 */
async function renderPlantUML(code: string): Promise<RenderResult> {
  const inputPath = tempFilePath('puml');
  const outputPath = tempFilePath('png');
  const themedCode = ensurePlantUMLTheme(code, 'dark');

  try {
    fs.writeFileSync(inputPath, themedCode, 'utf-8');

    // Try using plantuml.jar if available
    await execAsync(
      `java -jar plantuml.jar -tpng -o "${path.dirname(outputPath)}" "${inputPath}"`,
      { timeout: 30000 }
    );

    const expectedOutput = inputPath.replace('.puml', '.png');
    if (fs.existsSync(expectedOutput)) {
      const buffer = fs.readFileSync(expectedOutput);
      const base64 = buffer.toString('base64');
      cleanupTemp(expectedOutput);

      return {
        imageBase64: base64,
        width: 1200,
        height: 800,
        format: 'png',
      };
    }

    throw new Error('plantuml.jar did not produce output');
  } catch (error) {
    const jarMsg = error instanceof Error ? error.message : String(error);
    console.warn('[Renderer] plantuml.jar PNG rendering failed, trying PlantUML server:', jarMsg);

    try {
      const encoded = plantumlEncoder.encode(themedCode);
      const response = await axios.get(`${PLANTUML_SERVER}/png/${encoded}`, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      const buffer = Buffer.from(response.data);
      return {
        imageBase64: buffer.toString('base64'),
        width: 1200,
        height: 800,
        format: 'png',
      };
    } catch (serverError) {
      const msg = serverError instanceof Error ? serverError.message : String(serverError);
      console.error('[Renderer] PlantUML rendering failed:', msg);
      throw new Error(msg);
    }
  } finally {
    cleanupTemp(inputPath);
    cleanupTemp(outputPath);
  }
}

async function renderPlantUMLSvg(
  code: string,
  themeMode: PlantUMLThemeMode = 'dark'
): Promise<SvgRenderResult> {
  const inputPath = tempFilePath('puml');
  const themedCode = ensurePlantUMLTheme(code, themeMode);

  try {
    fs.writeFileSync(inputPath, themedCode, 'utf-8');

    await execAsync(
      `java -jar plantuml.jar -tsvg -o "${path.dirname(inputPath)}" "${inputPath}"`,
      { timeout: 30000 }
    );

    const expectedOutput = inputPath.replace('.puml', '.svg');
    if (fs.existsSync(expectedOutput)) {
      const svg = fs.readFileSync(expectedOutput, 'utf-8');
      cleanupTemp(expectedOutput);
      return { svg, format: 'svg' };
    }

    throw new Error('plantuml.jar did not produce SVG output');
  } catch (error) {
    const jarMsg = error instanceof Error ? error.message : String(error);
    console.warn('[Renderer] plantuml.jar SVG rendering failed, trying PlantUML server:', jarMsg);

    const encoded = plantumlEncoder.encode(themedCode);
    const response = await axios.get(`${PLANTUML_SERVER}/svg/${encoded}`, {
      responseType: 'text',
      timeout: 30000,
    });
    return { svg: response.data, format: 'svg' };
  } finally {
    cleanupTemp(inputPath);
  }
}

// ── Graphviz Rendering ─────────────────────────────────────────────────────────

/**
 * Render Graphviz DOT code to PNG using the dot command.
 */
async function renderGraphviz(code: string): Promise<RenderResult> {
  const inputPath = tempFilePath('dot');
  const outputPath = tempFilePath('png');

  try {
    fs.writeFileSync(inputPath, code, 'utf-8');

    await execAsync(`dot -Tpng -o "${outputPath}" "${inputPath}"`, {
      timeout: 15000,
    });

    if (fs.existsSync(outputPath)) {
      const buffer = fs.readFileSync(outputPath);
      const base64 = buffer.toString('base64');

      return {
        imageBase64: base64,
        width: 1200,
        height: 800,
        format: 'png',
      };
    }

    throw new Error('dot did not produce output');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Renderer] Graphviz rendering failed:', msg);
    throw new Error(msg);
  } finally {
    cleanupTemp(inputPath);
    cleanupTemp(outputPath);
  }
}

// ── DBML Rendering ─────────────────────────────────────────────────────────────

/**
 * Render DBML by converting to Mermaid ER and rendering via Mermaid pipeline.
 */
async function renderDBML(code: string): Promise<RenderResult> {
  // Convert DBML to a simple Mermaid ER diagram
  const mermaidCode = convertDBMLToMermaidER(code);
  return renderMermaid(mermaidCode);
}

/**
 * Sanitise a DBML type (e.g. `decimal(10,2)`, `varchar(255)`) into a token
 * that Mermaid's erDiagram parser will accept (letters, digits, underscores).
 */
function sanitiseType(raw: string): string {
  // "decimal(10,2)" → "decimal_10_2", "varchar(255)" → "varchar_255"
  return raw
    .replace(/[(),]/g, '_') // replace parens/commas with underscores
    .replace(/_+/g, '_')    // collapse runs
    .replace(/_$/g, '')     // trim trailing underscore
    .replace(/[^a-zA-Z0-9_]/g, ''); // strip anything else non-alphanumeric
}

/**
 * Convert DBML code to Mermaid erDiagram syntax for rendering.
 * Now infers FK relationships from `_id` field naming convention.
 */
function convertDBMLToMermaidER(dbml: string): string {
  const lines = ['erDiagram'];
  const tables = dbml.match(/Table\s+(\w+)\s*\{([^}]*)\}/gi) || [];
  const tableNames: string[] = [];
  const tableFieldLines = new Map<string, string[]>();
  const refs: string[] = [];

  for (const table of tables) {
    const nameMatch = table.match(/Table\s+(\w+)/i);
    if (!nameMatch) continue;

    const tableName = nameMatch[1];
    tableNames.push(tableName);

    // Extract fields
    const bodyMatch = table.match(/\{([^}]*)\}/);
    if (bodyMatch) {
      const body = bodyMatch[1];
      const fields = body
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f && !f.startsWith('//') && !f.startsWith('indexes') && !f.startsWith('Note'));

      const fieldTexts: string[] = [];
      lines.push(`  ${tableName} {`);
      for (const field of fields) {
        // Skip lines that are purely index/constraint blocks
        if (/^\(/.test(field) || /^primary\b/i.test(field) || /^unique\b/i.test(field)) continue;

        // Detect PK / FK markers
        const isPK = /\[.*pk.*\]/i.test(field) || /\[.*primary\s*key.*\]/i.test(field);
        const isFK = /\[.*ref.*\]/i.test(field);

        // Strip inline annotations like [pk], [not null], [ref: ...] before splitting
        const clean = field.replace(/\[.*?\]/g, '').trim();
        if (!clean) continue;

        const parts = clean.split(/\s+/);
        if (parts.length >= 2) {
          const fieldName = parts[0].replace(/[^a-zA-Z0-9_]/g, '');
          const fieldType = sanitiseType(parts[1]);
          if (fieldName && fieldType) {
            const marker = isPK ? ' PK' : isFK ? ' FK' : '';
            lines.push(`    ${fieldType} ${fieldName}${marker}`);
          }
        }

        fieldTexts.push(field);

        // Extract references from the original (unsanitised) line
        const refMatch = field.match(/\[ref:\s*([><-])\s*(\w+)\.(\w+)\]/i);
        if (refMatch) {
          const [, dir, refTable] = refMatch;
          if (dir === '>') {
            refs.push(`  ${tableName} }o--|| ${refTable} : "references"`);
          } else if (dir === '<') {
            refs.push(`  ${refTable} }o--|| ${tableName} : "references"`);
          } else {
            refs.push(`  ${tableName} ||--|| ${refTable} : "references"`);
          }
        }
      }
      lines.push('  }');
      tableFieldLines.set(tableName.toLowerCase(), fieldTexts);
    }
  }

  // Also parse standalone Ref declarations: Ref: table1.col > table2.col
  const standaloneRefs = dbml.match(/Ref[^{]*:\s*(\w+)\.(\w+)\s*[<>-]+\s*(\w+)\.(\w+)/gi) || [];
  for (const ref of standaloneRefs) {
    const m = ref.match(/(\w+)\.\w+\s*([<>-]+)\s*(\w+)\.\w+/i);
    if (m) {
      const [, left, dir, right] = m;
      if (dir.includes('>')) {
        refs.push(`  ${left} }o--|| ${right} : "references"`);
      } else if (dir.includes('<')) {
        refs.push(`  ${right} }o--|| ${left} : "references"`);
      } else {
        refs.push(`  ${left} ||--|| ${right} : "references"`);
      }
    }
  }

  // Multi-line Ref blocks: Ref { posts.user_id > users.id }
  const refBlocks = dbml.match(/Ref\s*(?:\w+\s*)?\{([^}]*)\}/gi) || [];
  for (const block of refBlocks) {
    // Skip Table blocks (they also have braces)
    if (/^Table\s/i.test(block.trim())) continue;
    const bodyMatch = block.match(/\{([^}]*)\}/);
    if (!bodyMatch) continue;
    const refBodyLines = bodyMatch[1].split('\n').map((l) => l.trim()).filter(Boolean);
    for (const rl of refBodyLines) {
      const m = rl.match(/(\w+)\.(\w+)\s*([<>-]+)\s*(\w+)\.(\w+)/);
      if (m) {
        const [, left, , dir, right] = m;
        if (dir.includes('>')) refs.push(`  ${left} }o--|| ${right} : "references"`);
        else if (dir.includes('<')) refs.push(`  ${right} }o--|| ${left} : "references"`);
        else refs.push(`  ${left} ||--|| ${right} : "references"`);
      }
    }
  }

  // Infer FK relationships from _id / _fk field naming convention
  const lowerTableNames = tableNames.map((t) => t.toLowerCase());
  for (const tableName of tableNames) {
    const fields = tableFieldLines.get(tableName.toLowerCase()) || [];
    for (const field of fields) {
      if (/\[ref:/i.test(field)) continue; // already has explicit ref
      const clean = field.replace(/\[.*?\]/g, '').trim();
      const parts = clean.split(/\s+/);
      if (parts.length < 2) continue;
      const fName = parts[0].toLowerCase();
      const fkMatch = fName.match(/^(\w+?)_(?:id|fk)$/);
      if (fkMatch) {
        const baseName = fkMatch[1];
        const targetIdx = lowerTableNames.findIndex(
          (t) => t === baseName || t === baseName + 's' || t + 's' === baseName
        );
        if (targetIdx !== -1) {
          const targetTable = tableNames[targetIdx];
          const alreadyExists = refs.some(
            (r) => r.includes(tableName) && r.includes(targetTable)
          );
          if (!alreadyExists) {
            refs.push(`  ${tableName} }o--|| ${targetTable} : "${fName}"`);
          }
        }
      }
    }
  }

  // Deduplicate refs
  const uniqueRefs = [...new Set(refs)];
  for (const ref of uniqueRefs) {
    lines.push(ref);
  }

  return lines.join('\n');
}

// ── Placeholder Image ──────────────────────────────────────────────────────────

/**
 * Create a simple placeholder image when rendering tools are unavailable.
 * Returns a minimal 1x1 transparent PNG as base64.
 */
function createPlaceholderImage(code: string, diagramType: string): RenderResult {
  console.warn(`[Renderer] Using placeholder for ${diagramType} — install rendering tools for full support`);

  // Minimal 1x1 transparent PNG (base64)
  const minimalPNG =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  return {
    imageBase64: minimalPNG,
    width: 1,
    height: 1,
    format: 'png',
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Render diagram code to a base64 PNG image.
 */
export async function renderDiagramToImage(
  code: string,
  diagramType: string
): Promise<RenderResult> {
  console.log(`[Renderer] Rendering ${diagramType} diagram to PNG (${code.length} chars)...`);

  switch (diagramType) {
    case 'mermaid':
      return renderMermaid(code);
    case 'plantuml':
      return renderPlantUML(code);
    case 'graphviz':
      return renderGraphviz(code);
    case 'dbml':
      return renderDBML(code);
    default:
      throw new Error(`Unsupported diagram type for rendering: ${diagramType}`);
  }
}

export async function renderDiagramToSvg(
  code: string,
  diagramType: string,
  options: { themeMode?: PlantUMLThemeMode } = {}
): Promise<SvgRenderResult> {
  console.log(`[Renderer] Rendering ${diagramType} diagram to SVG (${code.length} chars)...`);

  switch (diagramType) {
    case 'plantuml':
      return renderPlantUMLSvg(code, options.themeMode ?? 'dark');
    default:
      throw new Error(`SVG rendering is not supported for diagram type: ${diagramType}`);
  }
}

/**
 * Check which rendering tools are available on the system.
 */
export async function checkRenderingCapabilities(): Promise<Record<string, boolean>> {
  const capabilities: Record<string, boolean> = {
    mermaid: false,
    plantuml: false,
    graphviz: false,
    dbml: false, // same as mermaid
  };

  // Check mmdc (mermaid-cli)
  try {
    await execAsync('npx mmdc --version', { timeout: 15000 });
    capabilities.mermaid = true;
    capabilities.dbml = true;
  } catch {
    // not available
  }

  // Check plantuml
  try {
    await execAsync('java -jar plantuml.jar -version', { timeout: 10000 });
    capabilities.plantuml = true;
  } catch {
    // not available
  }

  // Check graphviz dot
  try {
    await execAsync('dot -V', { timeout: 5000 });
    capabilities.graphviz = true;
  } catch {
    // not available
  }

  return capabilities;
}

/**
 * Clean up old temporary render files (older than 1 hour).
 */
export function cleanupOldRenders(): void {
  try {
    if (!fs.existsSync(TEMP_DIR)) return;

    const files = fs.readdirSync(TEMP_DIR);
    const oneHourAgo = Date.now() - 3600000;

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < oneHourAgo) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}
