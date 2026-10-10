import { parseFoodText, suggestFoods } from '../lib/foods';

describe('food parser', () => {
  it('parses "2 cups of full fat greek yogurt"', () => {
    const r = parseFoodText('2 cups of full fat greek yogurt');
    expect(r).not.toBeNull();
    expect(r!.food.id).toBe('greek-yogurt-full');
    expect(r!.qty).toBe(2);
    expect(r!.unit).toBe('cup');
    expect(r!.grams).toBe(490);
    expect(r!.calories).toBe(475); // 97 kcal/100g × 490 g
    expect(r!.protein).toBeCloseTo(44.1, 1);
    expect(r!.label).toBe('2 cups full-fat Greek yogurt');
  });

  it('handles bare counts with the food default unit', () => {
    const r = parseFoodText('3 eggs');
    expect(r!.food.id).toBe('egg');
    expect(r!.qty).toBe(3);
    expect(r!.calories).toBe(215);
    expect(r!.protein).toBeCloseTo(18.9, 1);
  });

  it('handles grams and ounces universally', () => {
    expect(parseFoodText('200g chicken breast')!.calories).toBe(330);
    expect(parseFoodText('8 oz chicken')!.grams).toBe(227);
    expect(parseFoodText('150 grams white rice')!.protein).toBeCloseTo(4.1, 1);
  });

  it('understands fractions and number words', () => {
    expect(parseFoodText('1/2 cup oats')!.grams).toBe(41);
    expect(parseFoodText('half a cup of oats')!.grams).toBe(41);
    expect(parseFoodText('1 1/2 scoops whey')!.grams).toBe(48);
    expect(parseFoodText('a banana')!.qty).toBe(1);
    expect(parseFoodText('two slices of bread')!.calories).toBe(159);
  });

  it('defaults to one serving when no quantity is given', () => {
    const r = parseFoodText('protein shake');
    expect(r!.food.id).toBe('protein-shake');
    expect(r!.qty).toBe(1);
    expect(r!.unit).toBe('serving');
  });

  it('uses custom foods when they match', () => {
    const custom = [{ id: 'c1', name: 'Mom lasagna', servingLabel: '1 slab', calories: 650, protein: 38 }];
    const r = parseFoodText('2 mom lasagna', custom);
    expect(r!.custom?.id).toBe('c1');
    expect(r!.calories).toBe(1300);
    expect(r!.protein).toBe(76);
  });

  it('returns null for nonsense', () => {
    expect(parseFoodText('')).toBeNull();
    expect(parseFoodText('xyzzy plugh')).toBeNull();
    expect(parseFoodText('2')).toBeNull();
  });

  it('suggests foods while typing', () => {
    const s = suggestFoods('2 cups gree');
    expect(s.length).toBeGreaterThan(0);
    expect(s.some((n) => n.toLowerCase().includes('greek'))).toBe(true);
  });
});
