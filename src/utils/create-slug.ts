export function createSlug(text: string): string {
  return text
    .normalize('NFD') // quebra acentos ex: ã -> a + ~
    .replace(/[\u0300-\u036f]/g, '') // remove os diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // tudo que não é número ou letra vira -
    .replace(/^-+|-+$/g, '') // remove hífens no começo ou fim
}
