import { randomInt } from 'node:crypto'

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function randomPart(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CHARSET[randomInt(0, CHARSET.length)]
  }
  return out
}

export function generateMealErpCode(): string {
  return `M${randomPart(5)}`
}

export function generateCustomerErpCode(): string {
  return `C${randomPart(5)}`
}
