export class InvalidCompanySettingsError extends Error {
  constructor(message?: string) {
    super(message ?? 'Configurações da empresa inválidas.')
  }
}
