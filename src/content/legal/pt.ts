import { toSections, type LegalContent, type LegalRow } from './types'

const ptMeta = {
  version: 'Minuta editorial 0.1',
  effectiveDate: '23 de agosto de 2026',
  reviewNotice: 'Conteúdo editorial sujeito a revisão jurídica qualificada antes da publicação.',
}

const ptHeaders = {
  terms: { title: 'Termos do sandbox', description: 'Condições editoriais para avaliação técnica do ambiente de testes.' },
  privacy: { title: 'Privacidade', description: 'Informações factuais sobre dados no site institucional e no futuro sandbox.' },
  compliance: { title: 'Compliance', description: 'Limites atuais e critérios para futuras integrações operacionais.' },
  security: { title: 'Segurança', description: 'Orientações para domínio, carteira e credenciais no ambiente de testes.' },
}

const ptSections = {
  terms: [
    ['escopo', 'Escopo do sandbox', 'O sandbox Peragus demonstra um fluxo de pagamento Pix simulado e liquidação em MockUSDT na Polygon Amoy. Ele não processa fundos reais nem oferece liquidação em USDT.'],
    ['token', 'MockUSDT e rede de testes', 'MockUSDT é um token de teste sem valor financeiro. Polygon Amoy é uma rede de testes e suas transações não representam liquidação financeira.'],
    ['carteira', 'Carteira informada pelo cliente', 'O participante informa uma carteira própria e é responsável por conferir o endereço e a rede antes de executar o teste.'],
    ['uso', 'Uso aceitável', 'O sandbox deve ser usado somente para avaliação técnica, sem pagamentos comerciais, representação de saldo ou promessa a terceiros.'],
    ['disponibilidade', 'Disponibilidade e alterações', 'A Peragus pode alterar ou interromper o sandbox durante o desenvolvimento e não apresenta SLA de produção.'],
  ],
  privacy: [
    ['site', 'Dados do site institucional', 'O site institucional não solicita documentos pessoais nem dados financeiros. Dados técnicos essenciais de acesso podem ser registrados pelo provedor de hospedagem para segurança e operação.'],
    ['sandbox', 'Dados do sandbox', 'Os dados do cadastro empresarial, credenciais e operações de teste serão descritos de forma definitiva quando o sandbox self-service for implementado e submetido a revisão jurídica.'],
    ['wallet', 'Carteira e transações públicas', 'Endereços e transações na Polygon Amoy são públicos por natureza. Não envie chaves privadas ou frases-semente.'],
    ['contact', 'Solicitações', 'Solicitações sobre dados devem usar somente um canal verificado no domínio peragus.com.br.'],
  ],
  compliance: [
    ['environment', 'Ambiente sem fundos reais', 'O sandbox atual não movimenta fundos reais e não executa liquidação em USDT.'],
    ['claims', 'Sem afirmações regulatórias', 'A Peragus não apresenta licença, certificação ou cobertura regulatória que não tenha sido comprovada e revisada.'],
    ['future', 'Integrações futuras', 'Uma futura integração com gateway ou BaaS dependerá da seleção do fornecedor, de controles operacionais e de revisão jurídica aplicável.'],
  ],
  security: [
    ['domain', 'Domínio oficial', 'O domínio institucional definido para a Peragus é peragus.com.br. Confirme o endereço antes de inserir qualquer dado.'],
    ['secrets', 'Nunca compartilhe segredos', 'A Peragus não solicita chave privada, frase-semente ou senha completa da carteira.'],
    ['wallet', 'Confira carteira e rede', 'No sandbox, confira o endereço informado e confirme que a rede selecionada é Polygon Amoy.'],
    ['report', 'Comunicação de incidentes', 'Use somente um canal de segurança verificado no domínio peragus.com.br quando esse canal estiver publicado.'],
  ],
} satisfies Record<keyof LegalContent, readonly LegalRow[]>

export const ptLegal = {
  terms: { ...ptHeaders.terms, ...ptMeta, sections: toSections(ptSections.terms) },
  privacy: { ...ptHeaders.privacy, ...ptMeta, sections: toSections(ptSections.privacy) },
  compliance: { ...ptHeaders.compliance, ...ptMeta, sections: toSections(ptSections.compliance) },
  security: { ...ptHeaders.security, ...ptMeta, sections: toSections(ptSections.security) },
} satisfies LegalContent
