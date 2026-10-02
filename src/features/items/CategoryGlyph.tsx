import type { Category } from '../../data/itemLookup/model.ts'

// Original, generic category marks. No upstream artwork or item silhouettes.
const marks: Partial<Record<Category, string>> = {
  cape: 'M20 18 13 40Q24 46 32 39Q40 46 51 40L44 18Q32 26 20 18ZM25 17Q32 13 39 17',
  hair: 'M15 37Q12 17 31 15Q51 15 49 36M16 29Q25 30 30 20Q36 32 49 29M21 42Q31 49 43 40',
  mask: 'M15 25Q32 17 49 25L46 38Q32 51 18 38ZM23 31H27M37 31H41',
  outfit: 'M24 16 14 23 19 31 24 28 23 48H41L40 28 45 31 50 23 40 16Q32 23 24 16Z',
  shoes: 'M15 24V38Q12 43 17 45H29V38L24 33V24ZM37 24V37L46 39Q51 45 45 45H35V24',
  prop: 'M26 16H38V37Q48 47 32 49Q16 47 26 37ZM26 24H38M32 16V38',
  'music-sheet': 'M24 18V39Q14 35 14 43Q15 49 24 44V24L43 20V35Q33 31 33 39Q34 45 43 40V14Z',
  expression: 'M22 23Q32 14 42 23M19 33Q32 50 45 33M24 28H25M39 28H40',
  'head-accessory': 'M16 38Q32 24 48 38M24 32 22 21 31 25 39 19 40 33',
  'face-accessory': 'M12 29Q18 24 25 29Q29 37 20 38Q12 36 12 29ZM39 29Q46 24 52 29Q55 37 45 38Q37 36 39 29ZM26 30H38',
  'neck-accessory': 'M18 20Q16 41 32 43Q48 41 46 20M28 41 32 50 36 41',
}
export function CategoryGlyph({ category }: { category: Category }) {
  return <svg className={`category-glyph category-glyph--${category}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={marks[category] ?? 'M32 14 50 32 32 50 14 32ZM26 32H38M32 26V38'} /></svg>
}
