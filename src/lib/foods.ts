/**
 * Offline food database + natural-language parser.
 * "2 cups of full fat greek yogurt" → 2 × 245 g → calories + protein.
 * Macros are per 100 g (USDA-style averages). Units map to grams per unit for that food.
 */
import type { CustomFood } from './types';

export interface Food {
  id: string;
  name: string;
  aliases: string[];
  /** kcal per 100 g */
  kcal: number;
  /** grams protein per 100 g */
  protein: number;
  /** grams per unit; always include the food's natural serving as `serving`. */
  units: Record<string, number>;
  /** Unit to assume when the user gives a bare number ("2 eggs"). */
  defaultUnit: string;
}

const CUP = 'cup';
const G = 'g';
const OZ = 'oz';
const TBSP = 'tbsp';
const SCOOP = 'scoop';
const PIECE = 'piece';
const SLICE = 'slice';
const SERVING = 'serving';
const ML = 'ml';

const f = (
  id: string,
  name: string,
  aliases: string[],
  kcal: number,
  protein: number,
  units: Record<string, number>,
  defaultUnit: string,
): Food => ({ id, name, aliases, kcal, protein, units: { [G]: 1, [OZ]: 28.35, ...units }, defaultUnit });

export const FOODS: Food[] = [
  // Dairy
  f('greek-yogurt-full', 'full-fat Greek yogurt', ['greek yogurt', 'full fat greek yogurt', 'whole milk greek yogurt', 'fage 5%', 'yogurt'], 97, 9, { [CUP]: 245, [TBSP]: 15, [SERVING]: 170 }, CUP),
  f('greek-yogurt-nonfat', 'non-fat Greek yogurt', ['0% greek yogurt', 'nonfat greek yogurt', 'fat free greek yogurt', 'fage 0%'], 59, 10.3, { [CUP]: 245, [TBSP]: 15, [SERVING]: 170 }, CUP),
  f('cottage-cheese', 'cottage cheese', ['cottage cheese 4%', 'cottage cheese full fat'], 98, 11.1, { [CUP]: 226, [TBSP]: 14, [SERVING]: 113 }, CUP),
  f('whole-milk', 'whole milk', ['milk', 'full fat milk', '3% milk'], 61, 3.2, { [CUP]: 244, [ML]: 1.03, [SERVING]: 244 }, CUP),
  f('skim-milk', 'skim milk', ['fat free milk', 'nonfat milk', '1% milk', '2% milk'], 42, 3.4, { [CUP]: 245, [ML]: 1.03, [SERVING]: 245 }, CUP),
  f('cheddar', 'cheddar cheese', ['cheese', 'cheddar'], 403, 23, { [SLICE]: 28, [CUP]: 113, [SERVING]: 28 }, SLICE),
  f('mozzarella', 'mozzarella', ['mozzarella cheese', 'string cheese'], 280, 28, { [PIECE]: 28, [SLICE]: 28, [CUP]: 112, [SERVING]: 28 }, PIECE),
  f('butter', 'butter', [], 717, 0.9, { [TBSP]: 14, [SERVING]: 14 }, TBSP),
  // Eggs
  f('egg', 'egg', ['eggs', 'whole egg', 'whole eggs', 'large egg', 'fried egg', 'scrambled eggs', 'boiled egg'], 143, 12.6, { [PIECE]: 50, [SERVING]: 50 }, PIECE),
  f('egg-white', 'egg white', ['egg whites', 'liquid egg whites'], 52, 10.9, { [PIECE]: 33, [CUP]: 243, [TBSP]: 15, [SERVING]: 33 }, PIECE),
  // Meat / fish
  f('chicken-breast', 'chicken breast (cooked)', ['chicken', 'chicken breast', 'grilled chicken', 'cooked chicken breast'], 165, 31, { [PIECE]: 170, [CUP]: 140, [SERVING]: 170 }, OZ),
  f('chicken-thigh', 'chicken thigh (cooked)', ['chicken thighs', 'thighs'], 209, 26, { [PIECE]: 85, [SERVING]: 85 }, OZ),
  f('ground-beef-85', 'ground beef 85% (cooked)', ['ground beef', 'beef', 'hamburger meat', 'minced beef', 'burger'], 250, 26, { [PIECE]: 113, [SERVING]: 113, [CUP]: 140 }, OZ),
  f('steak', 'steak (cooked)', ['sirloin', 'ribeye', 'beef steak', 'strip steak'], 271, 26, { [PIECE]: 227, [SERVING]: 170 }, OZ),
  f('ground-turkey', 'ground turkey (cooked)', ['turkey', 'turkey mince'], 203, 27, { [SERVING]: 113, [CUP]: 140 }, OZ),
  f('turkey-breast', 'turkey breast (deli)', ['deli turkey', 'sliced turkey', 'turkey slices'], 104, 17, { [SLICE]: 28, [SERVING]: 56 }, SLICE),
  f('salmon', 'salmon (cooked)', ['salmon fillet', 'grilled salmon', 'baked salmon'], 206, 22, { [PIECE]: 170, [SERVING]: 170 }, OZ),
  f('tuna-can', 'canned tuna', ['tuna', 'tuna can', 'can of tuna', 'tin of tuna'], 116, 26, { [PIECE]: 140, ['can']: 140, [SERVING]: 140, [CUP]: 154 }, 'can'),
  f('shrimp', 'shrimp (cooked)', ['prawns'], 99, 24, { [PIECE]: 7, [SERVING]: 85, [CUP]: 145 }, OZ),
  f('pork-chop', 'pork chop (cooked)', ['pork', 'pork loin'], 231, 25, { [PIECE]: 150, [SERVING]: 150 }, OZ),
  f('bacon', 'bacon', ['bacon strips', 'rashers'], 541, 37, { [SLICE]: 12, [PIECE]: 12, [SERVING]: 24 }, SLICE),
  f('sausage', 'sausage', ['breakfast sausage', 'sausage links', 'bratwurst'], 301, 12, { [PIECE]: 45, ['link']: 45, [SERVING]: 90 }, PIECE),
  // Protein supplements
  f('whey', 'whey protein powder', ['protein powder', 'whey protein', 'protein scoop', 'whey', 'isolate'], 375, 75, { [SCOOP]: 32, [TBSP]: 8, [SERVING]: 32 }, SCOOP),
  f('protein-shake', 'protein shake (whey + whole milk)', ['shake', 'daily shake', 'protein shake', 'post workout shake', 'workout shake'], 85, 7.5, { [SERVING]: 400, [CUP]: 245, [ML]: 1 }, SERVING),
  f('protein-bar', 'protein bar', ['quest bar', 'bar'], 380, 33, { [PIECE]: 60, [SERVING]: 60 }, PIECE),
  f('creatine', 'creatine', [], 0, 0, { [SCOOP]: 5, [SERVING]: 5 }, SCOOP),
  // Carbs
  f('rice-white', 'white rice (cooked)', ['rice', 'jasmine rice', 'basmati rice', 'cooked rice'], 130, 2.7, { [CUP]: 158, [SERVING]: 158 }, CUP),
  f('rice-brown', 'brown rice (cooked)', [], 112, 2.3, { [CUP]: 195, [SERVING]: 195 }, CUP),
  f('oats', 'oats (dry)', ['oatmeal', 'rolled oats', 'porridge oats', 'dry oats'], 389, 16.9, { [CUP]: 81, [TBSP]: 5, [SERVING]: 40 }, CUP),
  f('oatmeal-cooked', 'oatmeal (cooked)', ['cooked oatmeal', 'porridge'], 71, 2.5, { [CUP]: 234, [SERVING]: 234 }, CUP),
  f('pasta', 'pasta (cooked)', ['spaghetti', 'penne', 'noodles', 'macaroni'], 158, 5.8, { [CUP]: 140, [SERVING]: 140 }, CUP),
  f('potato', 'potato (baked)', ['baked potato', 'potatoes'], 93, 2.5, { [PIECE]: 173, [CUP]: 150, [SERVING]: 173 }, PIECE),
  f('sweet-potato', 'sweet potato (baked)', ['sweet potatoes', 'yam'], 90, 2, { [PIECE]: 150, [CUP]: 200, [SERVING]: 150 }, PIECE),
  f('bread', 'bread', ['white bread', 'toast', 'slice of bread', 'wheat bread', 'whole wheat bread'], 265, 9, { [SLICE]: 30, [PIECE]: 30, [SERVING]: 30 }, SLICE),
  f('bagel', 'bagel', ['bagels'], 250, 10, { [PIECE]: 105, [SERVING]: 105 }, PIECE),
  f('tortilla', 'flour tortilla', ['tortillas', 'wrap', 'wraps'], 312, 8.2, { [PIECE]: 45, [SERVING]: 45 }, PIECE),
  f('cereal', 'cereal', ['granola', 'cheerios', 'breakfast cereal'], 380, 8, { [CUP]: 40, [SERVING]: 40 }, CUP),
  f('quinoa', 'quinoa (cooked)', [], 120, 4.4, { [CUP]: 185, [SERVING]: 185 }, CUP),
  // Fats / nuts
  f('peanut-butter', 'peanut butter', ['pb', 'pbfit', 'almond butter', 'nut butter'], 588, 25, { [TBSP]: 16, [SERVING]: 32 }, TBSP),
  f('almonds', 'almonds', ['almond', 'nuts', 'mixed nuts', 'cashews', 'walnuts'], 579, 21, { [CUP]: 143, ['handful']: 28, [SERVING]: 28, [PIECE]: 1.2 }, 'handful'),
  f('avocado', 'avocado', ['avocados', 'guacamole'], 160, 2, { [PIECE]: 150, [CUP]: 150, [TBSP]: 15, [SERVING]: 75 }, PIECE),
  f('olive-oil', 'olive oil', ['oil', 'cooking oil', 'evoo'], 884, 0, { [TBSP]: 13.5, ['tsp']: 4.5, [SERVING]: 13.5 }, TBSP),
  // Fruit / veg
  f('banana', 'banana', ['bananas'], 89, 1.1, { [PIECE]: 118, [SERVING]: 118, [CUP]: 150 }, PIECE),
  f('apple', 'apple', ['apples'], 52, 0.3, { [PIECE]: 182, [SERVING]: 182, [CUP]: 125 }, PIECE),
  f('berries', 'mixed berries', ['blueberries', 'strawberries', 'raspberries', 'frozen berries'], 57, 0.7, { [CUP]: 148, [SERVING]: 148 }, CUP),
  f('orange', 'orange', ['oranges', 'clementine'], 47, 0.9, { [PIECE]: 131, [SERVING]: 131 }, PIECE),
  f('grapes', 'grapes', [], 69, 0.7, { [CUP]: 151, [SERVING]: 151 }, CUP),
  f('broccoli', 'broccoli (cooked)', ['veg', 'vegetables', 'mixed vegetables', 'green beans', 'asparagus'], 35, 2.4, { [CUP]: 156, [SERVING]: 156 }, CUP),
  f('spinach', 'spinach', ['salad', 'leafy greens', 'lettuce', 'kale'], 23, 2.9, { [CUP]: 30, [SERVING]: 85 }, CUP),
  f('beans', 'black beans (cooked)', ['black beans', 'kidney beans', 'chickpeas', 'lentils', 'pinto beans'], 132, 8.9, { [CUP]: 172, ['can']: 240, [SERVING]: 130 }, CUP),
  f('edamame', 'edamame', ['soybeans'], 121, 11.9, { [CUP]: 155, [SERVING]: 155 }, CUP),
  f('hummus', 'hummus', [], 166, 7.9, { [TBSP]: 15, [CUP]: 246, [SERVING]: 60 }, TBSP),
  f('tofu', 'tofu (firm)', ['firm tofu', 'tempeh'], 144, 17.3, { [CUP]: 252, ['block']: 350, [SERVING]: 126 }, SERVING),
  // Drinks / misc
  f('orange-juice', 'orange juice', ['oj', 'juice', 'apple juice'], 45, 0.7, { [CUP]: 248, [ML]: 1.04, [SERVING]: 248 }, CUP),
  f('smoothie', 'fruit smoothie', ['smoothie'], 60, 1.5, { [CUP]: 245, [ML]: 1, [SERVING]: 400 }, CUP),
  f('coffee-latte', 'latte', ['coffee with milk', 'cappuccino', 'flat white'], 42, 2.3, { [CUP]: 240, [ML]: 1, [SERVING]: 350 }, SERVING),
  f('pizza', 'pizza', ['pizza slice', 'slice of pizza', 'pepperoni pizza'], 266, 11, { [SLICE]: 107, [PIECE]: 107, [SERVING]: 107 }, SLICE),
  f('burrito', 'chicken burrito', ['burrito', 'chipotle bowl', 'burrito bowl'], 175, 10, { [PIECE]: 450, [SERVING]: 450 }, PIECE),
  f('sushi', 'sushi roll', ['sushi', 'california roll', 'maki'], 150, 5.5, { ['roll']: 180, [PIECE]: 30, [SERVING]: 180 }, 'roll'),
  f('chocolate', 'chocolate', ['dark chocolate', 'milk chocolate', 'candy bar'], 546, 4.9, { ['square']: 10, [PIECE]: 10, ['bar']: 45, [SERVING]: 40 }, 'square'),
  f('ice-cream', 'ice cream', ['gelato'], 207, 3.5, { [CUP]: 132, [SCOOP]: 66, [SERVING]: 66 }, SCOOP),
  f('honey', 'honey', ['maple syrup', 'syrup', 'jam'], 304, 0.3, { [TBSP]: 21, ['tsp']: 7, [SERVING]: 21 }, TBSP),
  f('sugar', 'sugar', [], 387, 0, { [TBSP]: 12.5, ['tsp']: 4.2, [SERVING]: 4.2 }, 'tsp'),
];

const UNIT_ALIASES: Record<string, string> = {
  cup: CUP, cups: CUP, c: CUP,
  g: G, gram: G, grams: G, gr: G,
  kg: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  oz: OZ, ounce: OZ, ounces: OZ,
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  tbsp: TBSP, tablespoon: TBSP, tablespoons: TBSP, tbs: TBSP,
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  scoop: SCOOP, scoops: SCOOP,
  slice: SLICE, slices: SLICE,
  piece: PIECE, pieces: PIECE, pc: PIECE, pcs: PIECE, whole: PIECE, large: PIECE, medium: PIECE, small: PIECE,
  serving: SERVING, servings: SERVING, portion: SERVING, portions: SERVING,
  ml: ML, milliliter: ML, milliliters: ML, millilitre: ML, millilitres: ML,
  l: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  can: 'can', cans: 'can', tin: 'can', tins: 'can',
  handful: 'handful', handfuls: 'handful',
  link: 'link', links: 'link',
  bar: 'bar', bars: 'bar',
  roll: 'roll', rolls: 'roll',
  square: 'square', squares: 'square',
  block: 'block', blocks: 'block',
  egg: PIECE, eggs: PIECE,
};

/** Units that convert to grams independent of the food (mass / volume of water-like liquids). */
const UNIVERSAL_GRAMS: Record<string, number> = { [G]: 1, kg: 1000, [OZ]: 28.35, lb: 453.6, [ML]: 1, l: 1000, tsp: 5, [TBSP]: 15 };

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  half: 0.5, quarter: 0.25, dozen: 12, couple: 2,
};

const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

const STOP = new Set(['of', 'the', 'some', 'my', 'with', 'and', 'cooked', 'raw', 'plain', 'fresh', 'x']);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[½¼¾⅓⅔]/g, (m) => ` ${UNICODE_FRACTIONS[m]} `)
    .replace(/[-_,.()]/g, ' ')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/%/g, '% ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseQuantity(tokens: string[]): { qty: number; rest: string[] } {
  let qty: number | null = null;
  let i = 0;
  // "1 1/2" or "1.5" or "2" or "two" or "a"
  while (i < tokens.length) {
    const t = tokens[i];
    const frac = t.match(/^(\d+)\/(\d+)$/);
    if (frac) {
      const v = Number(frac[1]) / Number(frac[2]);
      qty = (qty ?? 0) + v;
      i++;
      continue;
    }
    if (/^\d+(\.\d+)?$/.test(t)) {
      qty = (qty ?? 0) + Number(t);
      i++;
      continue;
    }
    if (qty === null && NUMBER_WORDS[t] !== undefined) {
      qty = NUMBER_WORDS[t];
      i++;
      continue;
    }
    if (qty !== null && (t === 'and' || t === 'a') && i + 1 < tokens.length && NUMBER_WORDS[tokens[i + 1]] !== undefined && tokens[i + 1] !== 'a') {
      qty += NUMBER_WORDS[tokens[i + 1]];
      i += 2;
      continue;
    }
    break;
  }
  let rest = tokens.slice(i);
  while (rest.length > 0 && (rest[0] === 'a' || rest[0] === 'an' || rest[0] === 'of')) rest = rest.slice(1);
  return { qty: qty ?? 1, rest };
}

function scoreMatch(queryTokens: string[], candidate: string): number {
  const cand = normalize(candidate).split(' ').filter((t) => !STOP.has(t));
  if (cand.length === 0) return 0;
  const q = queryTokens.filter((t) => !STOP.has(t));
  if (q.length === 0) return 0;
  let hit = 0;
  for (const t of q) {
    if (cand.some((c) => c === t || (t.length > 3 && (c.startsWith(t) || t.startsWith(c))))) hit++;
  }
  if (hit === 0) return 0;
  const precision = hit / q.length;
  const recall = hit / cand.length;
  const exact = normalize(candidate) === q.join(' ') ? 0.5 : 0;
  return precision * 0.6 + recall * 0.4 + exact;
}

export interface ParsedFood {
  food: Food;
  qty: number;
  unit: string;
  grams: number;
  calories: number;
  protein: number;
  /** 0..1 */
  confidence: number;
  label: string;
  custom?: CustomFood;
}

function fmtQty(q: number): string {
  if (Number.isInteger(q)) return String(q);
  if (Math.abs(q - 0.5) < 0.01) return '½';
  if (Math.abs(q - 0.25) < 0.01) return '¼';
  if (Math.abs(q - 0.75) < 0.01) return '¾';
  return String(Math.round(q * 100) / 100);
}

function pluralUnit(unit: string, qty: number): string {
  if (unit === G || unit === OZ || unit === ML || unit === 'kg' || unit === 'lb' || unit === 'l' || unit === TBSP || unit === 'tsp') return unit;
  if (unit === PIECE) return '';
  return qty === 1 ? unit : `${unit}s`;
}

/** Parse free text like "2 cups full fat greek yogurt" into macros. Returns null when nothing matches. */
export function parseFoodText(text: string, customFoods: CustomFood[] = []): ParsedFood | null {
  const norm = normalize(text);
  if (!norm) return null;
  const tokens = norm.split(' ');
  const { qty, rest } = parseQuantity(tokens);
  let unit: string | null = null;
  let nameTokens = rest;
  if (rest.length > 0 && UNIT_ALIASES[rest[0]] !== undefined) {
    unit = UNIT_ALIASES[rest[0]];
    nameTokens = rest.slice(1);
    // "2 eggs" → unit token was the food itself
    if (rest[0] === 'egg' || rest[0] === 'eggs') nameTokens = rest;
  }
  if (nameTokens.length > 0 && nameTokens[0] === 'of') nameTokens = nameTokens.slice(1);
  if (nameTokens.length === 0) return null;

  // Custom foods win on a good match.
  let bestCustom: { food: CustomFood; score: number } | null = null;
  for (const c of customFoods) {
    const s = scoreMatch(nameTokens, c.name);
    if (s > 0.55 && (!bestCustom || s > bestCustom.score)) bestCustom = { food: c, score: s };
  }
  if (bestCustom) {
    const n = unit === null || unit === SERVING || unit === PIECE ? qty : qty; // custom foods are per serving only
    const food: Food = {
      id: `custom-${bestCustom.food.id}`,
      name: bestCustom.food.name,
      aliases: [],
      kcal: 0,
      protein: 0,
      units: { [SERVING]: 1 },
      defaultUnit: SERVING,
    };
    return {
      food,
      qty: n,
      unit: SERVING,
      grams: 0,
      calories: Math.round(bestCustom.food.calories * n),
      protein: Math.round(bestCustom.food.protein * n * 10) / 10,
      confidence: Math.min(1, bestCustom.score),
      label: `${fmtQty(n)} × ${bestCustom.food.name}`,
      custom: bestCustom.food,
    };
  }

  let best: { food: Food; score: number } | null = null;
  for (const food of FOODS) {
    let s = scoreMatch(nameTokens, food.name);
    for (const a of food.aliases) s = Math.max(s, scoreMatch(nameTokens, a));
    if (!best || s > best.score) best = { food, score: s };
  }
  if (!best || best.score < 0.3) return null;

  const food = best.food;
  let useUnit = unit ?? food.defaultUnit;
  let gramsPerUnit = food.units[useUnit] ?? UNIVERSAL_GRAMS[useUnit];
  if (gramsPerUnit === undefined) {
    // Unknown unit for this food → fall back to its serving.
    useUnit = SERVING;
    gramsPerUnit = food.units[SERVING] ?? 100;
  }
  const grams = qty * gramsPerUnit;
  const calories = Math.round((food.kcal * grams) / 100);
  const protein = Math.round((food.protein * grams) / 10) / 10;
  const unitLabel = pluralUnit(useUnit, qty);
  const label = `${fmtQty(qty)}${unitLabel ? ` ${unitLabel}` : ''} ${food.name}`.replace(/\s+/g, ' ').trim();
  return { food, qty, unit: useUnit, grams: Math.round(grams), calories, protein, confidence: Math.min(1, best.score), label };
}

/** Top suggestions for an autocomplete list. */
export function suggestFoods(text: string, customFoods: CustomFood[] = [], limit = 5): string[] {
  const norm = normalize(text);
  const { rest } = parseQuantity(norm.split(' '));
  const q = rest.filter((t) => UNIT_ALIASES[t] === undefined && t !== 'of');
  if (q.length === 0) return [];
  const scored: { name: string; s: number }[] = [];
  for (const c of customFoods) scored.push({ name: c.name, s: scoreMatch(q, c.name) + 0.1 });
  for (const food of FOODS) {
    let s = scoreMatch(q, food.name);
    for (const a of food.aliases) s = Math.max(s, scoreMatch(q, a));
    scored.push({ name: food.name, s });
  }
  return scored
    .filter((x) => x.s > 0.25)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.name);
}
