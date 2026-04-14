1. Autenticação e Gestão de Contas (Auth)
    [ ] E-mail Único: Um e-mail só pode ser cadastrado uma vez na tabela principal de usuários (users).

    [ ] Múltiplos Papéis (Roles): Um usuário pode estar vinculado a várias empresas, mas com papéis diferentes (ex: owner na Empresa A e customer na Empresa B).

    [ ] Propriedade: Toda company (empresa) deve ter obrigatoriamente, no mínimo, 1 usuário com a role owner.

    [ ] Paywall / Bloqueio de Acesso: O sistema valida o status da assinatura em todas as rotas privadas. Se o plano não estiver ativo (após o trial ou por inadimplência), o usuário perde o acesso de edição/reserva.

2. Estrutura Física (Facilities & Courts)
    [ ] Múltiplas Unidades: Uma company pode ter uma ou mais facilities (unidades físicas), respeitando o limite do plano contratado.

    [ ] Múltiplas Quadras: Uma facility pode ter várias courts (quadras), também limitadas pela assinatura.

    [ ] Flexibilidade de Grade: Cada quadra possui sua própria grade de horários de funcionamento e tabela de preços (ex: mais caro à noite ou aos finais de semana).

    [ ] Bloqueios Administrativos: Permite bloquear horários rapidamente na agenda por motivos de "Chuva" ou "Manutenção", sem precisar criar um cliente falso.

    [ ] Buffer Time (Tempo de Transição): Configuração opcional para adicionar minutos de intervalo automático entre reservas (para limpeza ou troca de times).

3. Motor de Reservas (Agenda Principal)
    [ ] Anti-Conflito Absoluto: O banco de dados e o backend garantem que é impossível registrar duas reservas na mesma quadra, no mesmo dia e horário (evita duplicação).

    [ ] Notificações Automáticas: Disparo de avisos (e-mail ou webhook/WhatsApp) para o cliente final e para a equipe da arena assim que uma reserva é criada ou alterada.

    [ ] Lista de Restrição (Blacklist): O sistema sinaliza clientes com histórico recorrente de "No-Show" (não comparecimento), alertando a recepção ou exigindo pagamento antecipado desse CPF.

4. Site de Reservas Online (Público)
    [ ] URL Customizada: Cada empresa possui um link amigável e único (ex: arenahub.com/arena-do-joao).

    [ ] Seletor de Unidades: Se a empresa possuir mais de uma facility, o cliente pode selecionar a unidade desejada logo na entrada do link público.

    [ ] Flexibilidade de Pagamento: O dono da arena configura se a reserva online exige pagamento imediato, apenas um sinal (percentual), ou se permite "pagar no local".

5. PDV e Financeiro (O Caixa da Arena)
    [ ] Rateio de Pagamento: Ao finalizar a reserva no balcão, o sistema permite dividir o valor total em múltiplos pagamentos (ex: parte no PIX, parte no cartão) e registrar o nome de quem pagou cada parte.

    [ ] Sinal / Pagamento Parcial: Capacidade de cobrar uma porcentagem antecipada (ex: 30%) para garantir a reserva.

    [ ] Cancelamento por Inadimplência: Se a reserva exigir pré-pagamento (sinal) e não for paga em "X" minutos, o sistema libera o horário automaticamente na agenda.

6. Gestão de Mensalistas (Recorrência)
    [ ] Bloqueio Automático: A criação de um contrato de mensalista bloqueia a agenda daquele dia e horário de forma recorrente (projetando as reservas para os próximos meses).

    [ ] Painel de Inadimplência: Tela dedicada para gerenciar mensalistas, visualizar rapidamente quem está com o pagamento atrasado, pendente ou em dia.

    [ ] Gestão de Reposições: Permite "pausar" um jogo específico do mensalista (por chuva ou férias) sem cobrar aquele dia, gerando um crédito para ser reposto posteriormente.


[Voltar ao README principal](../README.md)