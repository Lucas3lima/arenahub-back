# Fluxos do Sistema

Processos passo-a-passo das principais funcionalidades.

## 1. Onboarding da Empresa
1. Dono acessa a **Landing Page**.
2. Realiza o **Cadastro/Login**.
3. Sistema detecta ausência de plano e exibe **Tela de Planos**.
4. Dono escolhe um plano e realiza o **Pagamento**.
5. Assinatura vira `active` e libera acesso à **Homepage de Gestão**.

## 2. Reserva Online (Cliente Final)
1. Cliente acessa a **Página Pública** da Arena.
2. Filtra por data e tipo de quadra.
3. Escolhe um horário disponível.
4. Se a arena exigir pré-pagamento:
   - Realiza o pagamento via Gateway.
   - Sistema recebe webhook e marca como `confirmed`.
5. Se não exigir:
   - Reserva nasce como `confirmed`.

## 3. Gestão de Mensalistas
1. Staff cadastra o cliente como `Customer`.
2. Cria uma `Membership` definindo quadra, dia da semana e horário.
3. Sistema valida se o horário está livre em todas as ocorrências futuras.
4. Agenda passa a exibir o bloqueio recorrente.
5. Todo mês, o staff marca o recebimento da mensalidade no módulo financeiro.

## 4. Gestão de Aulas
1. Admin cria uma `Class` (ex: "Escolinha de Vôlei Terças 19h").
2. Sistema bloqueia o horário na agenda permanentemente.
3. Alunos são matriculados (`Enrollment`) até atingir a `capacity`.
4. Staff gerencia a lista de alunos e pagamentos mensais.

---
[Voltar ao README principal](../README.md)
