/** 按中文标点和换行拆分诗句，每小句作为独立元素 */
export function splitPoemLines(content: string): string[] {
  return content
    .split(/[，。；？！\n]+/)
    .map(s => s.replace(/[，。、；：？！""''（）《》\s]/g, '').trim())
    .filter(s => s.length >= 3)
}
