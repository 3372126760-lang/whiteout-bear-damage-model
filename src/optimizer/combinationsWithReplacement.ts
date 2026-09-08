/**
 * 生成允许重复、忽略顺序的固定长度组合。
 * items 应由调用方保证身份唯一；结果中的索引始终非递减，因此不会产生排列重复。
 */
export function combinationsWithReplacement<T>(
  items: readonly T[],
  count: number,
): T[][] {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError("组合长度必须是非负安全整数。");
  }

  if (count === 0) {
    return [[]];
  }

  if (items.length === 0) {
    return [];
  }

  const combinations: T[][] = [];
  const current: T[] = [];

  function visit(startIndex: number): void {
    if (current.length === count) {
      combinations.push([...current]);
      return;
    }

    for (let index = startIndex; index < items.length; index += 1) {
      current.push(items[index]!);
      visit(index);
      current.pop();
    }
  }

  visit(0);
  return combinations;
}
