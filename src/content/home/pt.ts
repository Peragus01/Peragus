import type { HomeContent } from './types'

export const ptHome = {
  languageName: 'Português',
  nav: {
    product: 'Produto', howItWorks: 'Como funciona', infrastructure: 'Infraestrutura',
    security: 'Segurança', signIn: 'Entrar', sandbox: 'Criar conta sandbox',
    menuOpen: 'Abrir menu', menuClose: 'Fechar menu',
  },
  hero: {
    label: 'Sandbox B2B - Polygon Amoy',
    title: 'Pix no Brasil. Liquidação na sua carteira.',
    description: 'Valide, em um ambiente de testes, o fluxo entre uma cobrança Pix simulada e o envio de MockUSDT para sua carteira na Polygon Amoy.',
    primaryCta: 'Criar conta sandbox', secondaryCta: 'Entender o fluxo',
  },
  eventPanel: { operation: 'OPERAÇÃO #PGS-2048', environment: 'TESTNET', simulated: 'simulado' },
  transparency: [
    { title: 'Ambiente sandbox', body: 'Sem movimentação de fundos reais.' },
    { title: 'MockUSDT', body: 'Token de teste sem valor financeiro.' },
    { title: 'Carteira própria', body: 'A Peragus não mantém o saldo do cliente.' },
    { title: 'Polygon Amoy', body: 'Transações verificáveis em uma rede de testes.' },
  ],
  howItWorks: {
    eyebrow: 'Fluxo operacional', title: 'Três estados. Uma trilha verificável.',
    description: 'Acompanhe o caminho do pagamento de teste até a transação na rede.',
    steps: [
      { title: 'Crie uma cobrança', body: 'Inicie um pagamento de teste em BRL e receba instruções Pix simuladas.' },
      { title: 'Confirme o evento', body: 'Simule a confirmação e acompanhe a mudança de estado da operação.' },
      { title: 'Verifique a liquidação', body: 'Confira o envio de MockUSDT para a carteira informada na Polygon Amoy.' },
    ],
  },
  operations: {
    eyebrow: 'Para financeiro e operações', title: 'Menos abstração. Mais visibilidade sobre cada etapa.',
    description: 'Capacidades demonstráveis no sandbox, sem promessas de produção.',
    items: [
      { title: 'Estados claros', body: 'Acompanhe criação, confirmação e liquidação.' },
      { title: 'Referência entre sistemas', body: 'Relacione o pagamento de teste à transação on-chain.' },
      { title: 'Carteira sob seu controle', body: 'Defina o endereço de recebimento no ambiente de testes.' },
      { title: 'Fluxo preparado para integração', body: 'Valide o modelo antes da escolha de um gateway ou BaaS.' },
    ],
  },
  useCases: {
    eyebrow: 'Quem pode testar', title: 'Infraestrutura para quem vende ao Brasil.',
    merchant: { title: 'Comerciantes internacionais', body: 'Teste uma experiência Pix para compradores brasileiros e o recebimento do ativo de teste em carteira própria.' },
    acquirer: { title: 'Adquirentes e plataformas', body: 'Valide como o fluxo pode ser incorporado a uma operação de pagamentos existente.' },
  },
  infrastructure: {
    eyebrow: 'Tecnologia demonstrável', title: 'Do evento de pagamento à transação na rede.',
    description: 'Uma sequência explícita conecta cada estado do pagamento à liquidação de teste.',
    nodes: ['Cliente B2B', 'Pix simulado', 'Orquestração Peragus', 'MockUSDT na Amoy'],
  },
  disclosure: {
    eyebrow: 'Limites do ambiente', title: 'Um sandbox para validação técnica.',
    body: 'MockUSDT não é USDT, não possui valor financeiro e opera somente na Polygon Amoy. O Pix permanece simulado até a futura integração com um gateway ou BaaS.',
  },
  finalCta: {
    eyebrow: 'Primeiro teste', title: 'Execute sua primeira liquidação de teste.',
    body: 'Crie sua conta, gere uma API key e acompanhe o fluxo até a transação na Polygon Amoy.',
    primary: 'Criar conta sandbox', secondary: 'Explorar documentação',
  },
  footer: {
    description: 'Sandbox B2B para validar fluxos Pix e liquidação on-chain.', product: 'Produto',
    resources: 'Recursos', legal: 'Legal', documentation: 'Documentação', terms: 'Termos',
    privacy: 'Privacidade', compliance: 'Compliance',
  },
  seo: {
    title: 'Peragus | Sandbox B2B para Pix e liquidação on-chain',
    description: 'Valide um fluxo de pagamento Pix simulado e liquidação em MockUSDT na Polygon Amoy.',
  },
} satisfies HomeContent
