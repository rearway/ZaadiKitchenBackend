/**
 * Resolves the live dish for a `delivery_days` row aliased as `dd`:
 * selected meal if it is still on that day's stream, else the default,
 * else the first filled slot. Pending meal edits are not applied.
 */
export function effectiveMealLateralJoin(opts?: {
  join?: 'left' | 'inner'
  publishedOnly?: boolean
}): string {
  const join = opts?.join === 'inner' ? 'INNER JOIN LATERAL' : 'LEFT JOIN LATERAL'
  const published = opts?.publishedOnly
    ? `\n     AND mw.status = 'published'`
    : ''

  return `${join} (
  SELECT m.id AS meal_id,
         m.name_en,
         m.meal_type,
         m.kcal,
         m.emoji,
         m.photo_url,
         m.erp_code
  FROM menu_slots ms
  INNER JOIN meals m ON m.id = ms.meal_id
  INNER JOIN menu_weeks mw
    ON mw.id = ms.week_id
   AND mw.date_from <= dd.date
   AND mw.date_to >= dd.date${published}
  WHERE ms.delivery_date = dd.date
    AND ms.meal_type::text = dd.meal_type::text
    AND ms.meal_id IS NOT NULL
  ORDER BY
    CASE
      WHEN dd.selected_meal_id IS NOT NULL
       AND ms.meal_id = dd.selected_meal_id THEN 0
      ELSE 1
    END,
    CASE WHEN ms.is_default THEN 0 ELSE 1 END,
    ms.id ASC
  LIMIT 1
) em ON true`
}
