import { isMissingAppSettingsTable } from '../app-settings-persistence.service'

describe('isMissingAppSettingsTable', () => {
  it('recognises a missing Postgres relation and ignores other errors', () => {
    expect(isMissingAppSettingsTable({ parent: { code: '42P01' } })).toBe(true)
    expect(isMissingAppSettingsTable({ original: { code: '42P01' } })).toBe(true)
    expect(isMissingAppSettingsTable({ parent: { code: '28P01' } })).toBe(false)
    expect(isMissingAppSettingsTable(new Error('nope'))).toBe(false)
  })
})
