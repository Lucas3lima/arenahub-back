export class TrialAlreadyUsedError extends Error {
  constructor() {
    super('O trial já foi utilizado anteriormente por este usuário.')
  }
}
