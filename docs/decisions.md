# Decisões de Projeto e Em Aberto

Registro de definições atuais e pontos que precisam de decisão futura.

## Decisões Atuais (MVP)
- **Multi-tenancy**: Isolamento total por `companyId`.
- **Agenda**: Ocupação baseada em sobreposição de horários `[start, end)`.
- **Acesso**: Bloqueio total do app de gestão para inadimplentes.

## Pontos em Aberto (Para Decidir)
1. **Identidade do Cliente**: O cliente final precisa criar uma conta com senha para reservar online ou apenas informar Nome/WhatsApp?
2. **Gateway de Pagamento**: Qual provedor usar (Stripe, Mercado Pago, Asaas)?
3. **Bloqueio Temporário**: Reservas online `pending_payment` devem segurar o horário na agenda por quanto tempo (ex: 15 min)?
4. **Cancelamento**: Qual a regra de reembolso automático em caso de desistência?
5. **Mensalistas**: Como lidar com feriados? O mensalista ganha crédito ou o bloqueio é mantido?
6. **Aulas**: A cobrança será por "pacote de aulas" ou mensalidade fixa independente de quantas aulas o mês teve?

---
[Voltar ao README principal](../README.md)
