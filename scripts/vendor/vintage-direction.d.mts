type Point = { x: number; y: number };
export function trailingSlope(points: Point[], window?: number): number | null;
export function windowMeans(points: Point[], window?: number): {early:number;late:number;earlyRange:number[];lateRange:number[]} | null;
export function ideaVintageChangepoint(points: Point[], options?: {minSeg?:number;improveRatio?:number}): {year:number;slopeBefore:number;slopeAfter:number;improved:boolean} | null;
export function ideaVintageDirection(points: Point[], options?: {minReliable?:number;minSeg?:number;z?:number;negligibleSlope?:number}): 'accelerating'|'flat'|'decelerating'|'unclear';
