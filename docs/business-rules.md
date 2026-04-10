# Regras de Negócio

Este documento detalha o comportamento esperado do sistema ArenaHub para garantir consistência e evitar conflitos.

## 1. Controle de Acesso e Paywall
- **Páginas Públicas**: Sempre acessíveis.
- **App de Gestão**: Acesso permitido apenas para `Company` com `SaaSSubscription` ativa.
- **Redirecionamento**: Usuários autenticados de empresas inadimplentes ou sem plano devem ser enviados para a tela de planos.

## 2. Modelo de Disponibilidade e Conflitos
A agenda de uma quadra (`Court`) é a soma de todos os espaços não ocupados.

### Fontes de Ocupação
1. **Booking Confirmado**: Reservas avulsas.
2. **Membership**: Slots de mensalistas.
3. **Class**: Horários de aulas/turmas.
4. **ManualBlock**: Bloqueios manuais (manutenção, feriados, eventos).

### Regra de Ouro (Zero Sobreposição)
Nenhum evento pode ser criado se houver sobreposição de `[startAt, endAt)` na mesma quadra.

## 3. Reservas (Bookings)
- **Estados**:
  - `pending_payment`: Aguardando confirmação do gateway (para reservas online com pré-pagamento).
  - `confirmed`: Reserva válida e ocupando espaço na agenda.
  - `cancelled`: Espaço liberado.
- **Pagamento Online**: Se a empresa configurar como "Obrigatório", a reserva só vira `confirmed` após o sucesso do pagamento.

## 4. Mensalistas (Memberships)
- **Prioridade**: O mensalista tem um slot fixo recorrente.
- **Conflitos**: Ao cadastrar um mensalista, o sistema valida se há conflitos em toda a vigência (ou nos próximos meses).
- **Travamento**: O slot fica indisponível para reservas avulsas automaticamente.

## 5. Aulas (Classes)
- **Capacidade**: O sistema deve impedir matrículas (`Enrollment`) acima do limite definido na `Class`.
- **Frequência**: Aulas geram bloqueios recorrentes na agenda, similar aos mensalistas.

## 6. Pagamentos Operacionais
- **Competência**: Para mensalistas e aulas, o pagamento deve ser registrado vinculado ao mês de referência.
- **Métodos**: Suporte a PIX, Cartão e Dinheiro (registro manual pelo staff).

---
[Voltar ao README principal](../README.md)
