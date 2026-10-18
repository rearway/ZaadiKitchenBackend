import { effectiveMealLateralJoin } from '../effectiveMealJoin'

describe('effectiveMealLateralJoin', () => {
  it('ranks a still-valid selected dish ahead of the default', () => {
    const sql = effectiveMealLateralJoin()
    expect(sql).toContain('LEFT JOIN LATERAL')
    expect(sql).toContain('dd.selected_meal_id')
    expect(sql).toContain('ms.is_default')
    expect(sql).toContain('ms.meal_type::text = dd.meal_type::text')
    expect(sql).not.toMatch(
      /WHERE ms\.delivery_date = dd\.date\s+AND ms\.meal_type::text = dd\.meal_type::text/
    )
    expect(sql).not.toContain("mw.status = 'published'")
  })

  it('can require a published week for ERP daily orders', () => {
    const sql = effectiveMealLateralJoin({
      join: 'inner',
      publishedOnly: true,
    })
    expect(sql).toContain('INNER JOIN LATERAL')
    expect(sql).toContain("mw.status = 'published'")
  })
})
