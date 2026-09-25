export function toggleProductSelection<Id>(
  selectedIds: ReadonlySet<Id>,
  id: Id,
): Set<Id> {
  const next = new Set(selectedIds);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  return next;
}

export function toggleVisibleSelection<Id>(
  selectedIds: ReadonlySet<Id>,
  visibleIds: Iterable<Id>,
): Set<Id> {
  const visible = [...visibleIds];
  const next = new Set(selectedIds);

  if (visible.every((id) => next.has(id))) {
    for (const id of visible) {
      next.delete(id);
    }
  } else {
    for (const id of visible) {
      next.add(id);
    }
  }

  return next;
}

export function getSelectedProducts<Id, Product extends { id: Id }>(
  products: readonly Product[],
  selectedIds: ReadonlySet<Id>,
): Product[] {
  return products.filter((product) => selectedIds.has(product.id));
}