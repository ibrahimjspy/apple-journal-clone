import { planImageGrid } from '../utils/imageGrid';

describe('planImageGrid', () => {
  it('returns empty single spec when no images', () => {
    const spec = planImageGrid([]);
    expect(spec.pattern).toBe('single');
    expect(spec.displayImages).toEqual([]);
    expect(spec.showBadge).toBe(false);
    expect(spec.badgeCount).toBe(0);
  });

  it('returns single pattern for one image', () => {
    const spec = planImageGrid(['a.jpg']);
    expect(spec.pattern).toBe('single');
    expect(spec.displayImages).toEqual(['a.jpg']);
    expect(spec.showBadge).toBe(false);
  });

  it('returns pair pattern for two images', () => {
    const spec = planImageGrid(['a.jpg', 'b.jpg']);
    expect(spec.pattern).toBe('pair');
    expect(spec.displayImages).toEqual(['a.jpg', 'b.jpg']);
    expect(spec.showBadge).toBe(false);
  });

  it('returns one-plus-two pattern for three images', () => {
    const spec = planImageGrid(['a.jpg', 'b.jpg', 'c.jpg']);
    expect(spec.pattern).toBe('one-plus-two');
    expect(spec.displayImages).toHaveLength(3);
    expect(spec.showBadge).toBe(false);
  });

  it('returns two-by-two pattern for four images', () => {
    const spec = planImageGrid(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg']);
    expect(spec.pattern).toBe('two-by-two');
    expect(spec.displayImages).toHaveLength(4);
    expect(spec.showBadge).toBe(false);
  });

  it('returns mosaic-with-badge for exactly five images (no overflow)', () => {
    const spec = planImageGrid(['a', 'b', 'c', 'd', 'e']);
    expect(spec.pattern).toBe('mosaic-with-badge');
    expect(spec.displayImages).toHaveLength(5);
    expect(spec.showBadge).toBe(false);
    expect(spec.badgeCount).toBe(0);
  });

  it('shows badge with correct overflow count for 6 images', () => {
    const spec = planImageGrid(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(spec.pattern).toBe('mosaic-with-badge');
    expect(spec.displayImages).toHaveLength(5);
    expect(spec.showBadge).toBe(true);
    expect(spec.badgeCount).toBe(1);
  });

  it('caps display to 5 images regardless of total count', () => {
    const spec = planImageGrid(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']);
    expect(spec.displayImages).toHaveLength(5);
    expect(spec.badgeCount).toBe(5);
    expect(spec.showBadge).toBe(true);
  });

  it('does not mutate input array', () => {
    const input = ['a', 'b'];
    planImageGrid(input);
    expect(input).toEqual(['a', 'b']);
  });
});
