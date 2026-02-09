export interface PaginatedResult<T> {
  total: number;
  count: number;
  offset: number;
  items: T[];
  has_more: boolean;
  next_offset: number | null;
}

export function paginate<T>(items: T[], limit: number = 20, offset: number = 0): PaginatedResult<T> {
  const total = items.length;
  const sliced = items.slice(offset, offset + limit);
  return {
    total,
    count: sliced.length,
    offset,
    items: sliced,
    has_more: offset + limit < total,
    next_offset: offset + limit < total ? offset + limit : null,
  };
}
