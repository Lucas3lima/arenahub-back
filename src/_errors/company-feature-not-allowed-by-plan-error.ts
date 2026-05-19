export class CompanyFeatureNotAllowedByPlanError extends Error {
  constructor(message?: string) {
    super(
      message ??
        'O plano atual não permite ativar essa configuração para a empresa.',
    )
  }
}
