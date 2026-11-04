import { createHash } from 'node:crypto';
import postcss, { type Container, type ChildNode } from 'postcss';
import ts from 'typescript';

export const POLICY_VERSION = 'atlas-feedback-v1';
export const CSS_PATHS = ['src/components/landing.css','src/components/draft-chart-panel.css','src/components/draft-chart-plot.css','src/components/google-trends.css','src/components/performance-curves.css'] as const;
export const TSX_PATHS = ['src/components/site-nav.tsx','src/components/sections/velocity-tabs.tsx'] as const;
export const SOURCE_PATHS: readonly string[] = [...CSS_PATHS,...TSX_PATHS];
export type PatchFile = {path:string; beforeSha256:string; content:string};
export type Patch = {baseSha:string; files:PatchFile[]};
export const sha256 = (s:string|Buffer) => createHash('sha256').update(s).digest('hex');
export function reject(): never { throw new Error('needs_human_review'); }
export function exactKeys(value:unknown, keys:string[]): value is Record<string,unknown> {
  return !!value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).sort().join('|')===keys.sort().join('|');
}
function safeCssValue(prop:string,value:string):boolean {
  if (/[\\{};@!"'()]|\/\*|url|var\b/i.test(value) || value.length>64) return false;
  if (/^(?:color|background-color|border(?:-(?:top|right|bottom|left))?-color)$/.test(prop)) return /^(?:#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|transparent|currentColor)$/.test(value);
  const enums:Record<string,readonly string[]> = {'text-align':['left','center','right','start','end'],'font-weight':['400','500','600','700'],'border-style':['solid','dashed','dotted','none'],'white-space':['normal','nowrap'],'align-items':['start','center','end','stretch'],'justify-content':['start','center','end','space-between']};
  if (enums[prop]) return enums[prop].includes(value);
  const m=/^(0|[1-9]\d*)(?:\.(\d{1,3}))?(px|rem)?$/.exec(value);
  if (!m) return false;
  const number=Number(value.slice(0,m[3] ? -m[3].length : undefined));
  if (prop==='line-height' && !m[3]) return number>=1 && number<=2;
  if (!m[3]) return number===0 && /^(?:gap|(?:row|column)-gap|padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|border-radius)$/.test(prop);
  if (prop==='font-size') return m[3]==='px' ? number>=12 && number<=48 : number>=0.75 && number<=3;
  if (!/^(?:gap|(?:row|column)-gap|padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|border-radius)$/.test(prop)) return false;
  return number<= (m[3]==='px'?96:6);
}
function cssCompare(before:string,after:string):void {
  const a=postcss.parse(before), b=postcss.parse(after);
  function visit(x:Container,y:Container,editable:boolean) {
    if (x.nodes?.length!==y.nodes?.length) reject();
    for (let i=0;i<(x.nodes?.length??0);i++) {
      const old=x.nodes![i] as ChildNode, next=y.nodes![i] as ChildNode;
      if (old.type!==next.type) reject();
      if (old.type==='decl' && next.type==='decl') {
        if (old.prop!==next.prop || old.important!==next.important) reject();
        if (old.value!==next.value) {
          if (!editable || !safeCssValue(old.prop,next.value)) reject();
          next.value=old.value;
        }
      } else if (old.type==='rule' && next.type==='rule') {
        if (old.selector!==next.selector) reject();
        visit(old,next,editable);
      } else if (old.type==='atrule' && next.type==='atrule') {
        if (old.name!==next.name || old.params!==next.params) reject();
        if (old.nodes || next.nodes) visit(old,next,editable && old.name==='media');
      }
    }
  }
  visit(a,b,true);
  // Every byte other than accepted declaration values must remain exact (including comments/raw syntax).
  if (a.toString()!==b.toString()) reject();
}
const LABEL=/^[A-Za-z][A-Za-z &↗–—-]{0,79}$/;
function safeClasses(value:string,old:string):boolean {
  if (value.length>600 || !/^[A-Za-z0-9 :./_-]+$/.test(value)) return false;
  const known=new Set(old.split(' '));
  return value.split(' ').every(token=>known.has(token) || /^(?:(?:sm|md|lg|xl|hover|focus-visible):)?(?:p[xytrbl]?|m[xytrbl]?|gap|rounded)-(?:0|0\.5|1|1\.5|2|2\.5|3|4|5|6|8|10|12)$/.test(token));
}
function literalSpans(text:string):{start:number;end:number;value:string;type:'label'|'class'}[] {
  const file=ts.createSourceFile('input.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  if ((file as ts.SourceFile & {parseDiagnostics:readonly ts.Diagnostic[]}).parseDiagnostics.length) reject();
  const spans:{start:number;end:number;value:string;type:'label'|'class'}[]=[];
  function visit(n:ts.Node) {
    if (ts.isStringLiteral(n)) {
      const p=n.parent;
      if (ts.isPropertyAssignment(p) && p.initializer===n && ts.isIdentifier(p.name) && p.name.text==='label') spans.push({start:n.getStart(file),end:n.end,value:n.text,type:'label'});
      if (ts.isJsxAttribute(p) && p.initializer===n && p.name.getText(file)==='className') spans.push({start:n.getStart(file),end:n.end,value:n.text,type:'class'});
    }
    ts.forEachChild(n,visit);
  }
  visit(file);
  return spans;
}
function tsxCompare(before:string,after:string):void {
  const a=literalSpans(before), b=literalSpans(after);
  if (a.length!==b.length) reject();
  let restored=after;
  for (let i=a.length-1;i>=0;i--) {
    const x=a[i], y=b[i];
    if (x.type!==y.type) reject();
    if (x.value!==y.value) {
      const raw=after.slice(y.start,y.end);
      if (/[\\\r\n]/.test(raw)) reject();
      if (x.type==='label' ? !LABEL.test(y.value) || !LABEL.test(x.value) : !safeClasses(y.value,x.value)) reject();
    }
    restored=restored.slice(0,y.start)+before.slice(x.start,x.end)+restored.slice(y.end);
  }
  // AST identifies the only eligible string literals; exact outside-span compare prevents new code/imports/URLs.
  if (restored!==before) reject();
}
export function validatePatch(input:unknown,sources:Readonly<Record<string,string>>,baseSha:string,scope:'legacy'|'css-only'='legacy'):Patch {
  try {
    if(!['legacy','css-only'].includes(scope))reject();
    if (!exactKeys(input,['baseSha','files']) || input.baseSha!==baseSha || !/^[0-9a-f]{40}$/.test(baseSha) || !Array.isArray(input.files) || input.files.length<1 || input.files.length>5 || Buffer.byteLength(JSON.stringify(input))>32768) reject();
    const paths=new Set<string>(); let changedLines=0;
    for (const file of input.files) {
      if (!exactKeys(file,['path','beforeSha256','content']) || typeof file.path!=='string' || typeof file.content!=='string' || typeof file.beforeSha256!=='string' || !SOURCE_PATHS.includes(file.path) || paths.has(file.path) || !Object.hasOwn(sources,file.path)) reject();
      if(scope==='css-only' && !(CSS_PATHS as readonly string[]).includes(file.path))reject();
      paths.add(file.path);
      const before=sources[file.path];
      if (sha256(before)!==file.beforeSha256 || file.content===before || file.content.includes('\0') || Buffer.byteLength(file.content)>131072) reject();
      const oldLines=before.split('\n'), newLines=file.content.split('\n');
      // Conservative line-bound: reject rather than underestimate oversized edits.
      let start=0,endOld=oldLines.length-1,endNew=newLines.length-1;
      while(start<=endOld && start<=endNew && oldLines[start]===newLines[start]) start++;
      while(endOld>=start && endNew>=start && oldLines[endOld]===newLines[endNew]) {endOld--;endNew--;}
      changedLines+=Math.max(0,endOld-start+1)+Math.max(0,endNew-start+1);
      if (changedLines>200) reject();
      if ((CSS_PATHS as readonly string[]).includes(file.path)) cssCompare(before,file.content); else tsxCompare(before,file.content);
    }
    return JSON.parse(JSON.stringify(input)) as Patch;
  } catch { return reject(); }
}
