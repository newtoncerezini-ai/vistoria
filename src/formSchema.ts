import type { Field, Section } from './types'

export const identificationFields = [
  { id: 'school', label: 'Escola', type: 'text', required: true, placeholder: 'Nome da escola' },
  { id: 'city', label: 'Município', type: 'text', required: true, placeholder: 'Município/PE' },
  { id: 'gre', label: 'GRE', type: 'text', placeholder: 'Gerência regional' },
  { id: 'company', label: 'Empresa', type: 'text', placeholder: 'Empresa responsável' },
  { id: 'analyst', label: 'Analista', type: 'text', required: true, placeholder: 'Nome do fiscal' },
  { id: 'date', label: 'Data da visita', type: 'date', required: true },
] satisfies Field[]

const yesNo = [
  { label: 'Sim', value: 'sim' },
  { label: 'Não', value: 'nao' },
  { label: 'Não se aplica', value: 'nao_se_aplica' },
]

const condition = [
  { label: 'Ótima', value: 'otima' },
  { label: 'Boa', value: 'boa' },
  { label: 'Regular', value: 'regular' },
  { label: 'Ruim', value: 'ruim' },
  { label: 'Não se aplica', value: 'nao_se_aplica' },
]

const bathroomOptions = [
  { label: 'Feminino', value: 'feminino' },
  { label: 'Masculino', value: 'masculino' },
  { label: 'PcD', value: 'pcd' },
  { label: 'Professores', value: 'professores' },
  { label: 'Outro', value: 'outro' },
]

const openClosed = [
  { label: 'Aberto', value: 'aberto' },
  { label: 'Fechado', value: 'fechado' },
  { label: 'Misto', value: 'misto' },
]

function normalizeId(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function fieldFor(sectionId: string, index: number, label: string): Field {
  const normalized = normalizeId(label)
  const id = `${sectionId}_${String(index).padStart(2, '0')}_${normalized.slice(0, 42)}`
  const lower = label.toLowerCase()

  if (lower.includes('de zero a dez')) {
    return {
      id,
      label,
      type: 'number',
      required: true,
      helper: 'Informe uma nota de 0 a 10.',
      placeholder: '0 a 10',
    }
  }

  if (
    lower.includes('existe algum problema') ||
    lower.startsWith('sobre ') ||
    lower.includes('gostaria de nos contar')
  ) {
    return {
      id,
      label,
      type: 'textarea',
      placeholder: 'Registre detalhes, problemas, prioridades ou observações da equipe.',
    }
  }

  if (lower.includes('qual banheiro está sendo auditado')) {
    return { id, label, type: 'choice', options: bathroomOptions, required: true }
  }

  if (lower.includes('aberto ou fechado')) {
    return { id, label, type: 'choice', options: openClosed }
  }

  if (
    lower.startsWith('qual a condição') ||
    lower.startsWith('qual o estado') ||
    lower.startsWith('como é') ||
    lower.includes('qual a qualidade') ||
    lower.includes('condição/regularidade')
  ) {
    return { id, label, type: 'condition', options: condition }
  }

  return { id, label, type: 'choice', options: yesNo }
}

function makeSection(title: string, questions: string[]): Section {
  const sectionId = normalizeId(title)
  const fields = questions.map((question, index) => fieldFor(sectionId, index + 1, question))

  fields.push({
    id: `${sectionId}_fotos`,
    label: `Fotos - ${title}`,
    type: 'photos',
    helper: 'Adicione fotos dos pontos vistoriados neste ambiente.',
  })

  return {
    id: sectionId,
    title,
    description: `${questions.length} itens de avaliação baseados no formulário consolidado.`,
    fields,
  }
}

export const sections: Section[] = [
  makeSection('Auditório', [
    'A escola possui auditório ou local para apresentações e eventos?',
    'O tamanho do auditório ou local para apresentações e eventos é adequado para a quantidade de estudantes?',
    'O auditório ou local usado para apresentações ou eventos é aberto ou fechado?',
    'Qual a condição de uso, conservação e funcionamento do data show para ser utilizado em apresentações ou eventos?',
    'Qual a condição de uso, conservação e funcionamento da tela de projeção a ser utilizada em apresentações ou eventos?',
    'Há cadeiras suficientes para todos os estudantes que utilizam o auditório ou local usado para apresentações e eventos?',
    'Qual a condição de uso e conservação das cadeiras existentes do auditório ou local usado para apresentações e eventos?',
    'Qual a condição de conservação do teto/cobertura do auditório ou local usado para apresentações e eventos?',
    'Qual a condição de uso e conservação das janelas do auditório ou local usado para apresentações e eventos?',
    'Qual a condição de conservação das paredes do auditório ou local usado para apresentações e eventos?',
    'Qual a condição de conservação da lixeira do auditório ou espaço usado para apresentações e eventos?',
    'Qual é a condição de inclusão/acessibilidade para pessoas com deficiência (PcD) do auditório ou local para apresentações e eventos?',
    'O(s) extintor(es) de incêndio do auditório ou perto do local usado para apresentações e eventos se encontram na validade?',
    'Qual a condição de uso, conservação da(s) saída(s) de emergência?',
    'Como é a iluminação do auditório ou local usado para apresentações ou eventos?',
    'Como é a ventilação do auditório ou local usado para apresentações e eventos?',
    'Como é a organização do auditório ou local usado para apresentações e eventos?',
    'Como é a limpeza do auditório ou local usado para apresentações e eventos?',
    'De zero a dez, qual nota o grupo atribui ao auditório/local usado para apresentações ou eventos? Sendo 10 - ótima e 0 - péssima.',
    'Existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que a equipe gostaria de nos contar sobre o auditório ou local usado para apresentações e eventos?',
  ]),
  makeSection('Biblioteca', [
    'A escola possui biblioteca ou sala de leitura?',
    'O tamanho da biblioteca/sala de leitura é adequado para quantidade de estudantes?',
    'Existem cadeiras e mesas suficientes para todos os estudantes que utilizam a biblioteca/sala de leitura?',
    'Qual a condição de uso e conservação das cadeiras e mesas da biblioteca/sala de leitura?',
    'Qual a condição de uso e conservação dos armários da biblioteca/sala de leitura?',
    'Qual a condição de uso e conservação das estantes da biblioteca/sala de leitura?',
    'Qual a condição de uso e conservação da(s) lixeira(s) da biblioteca/sala de leitura?',
    'Qual a condição de uso, conservação e funcionamento da porta da biblioteca/sala de leitura?',
    'Qual a condição de uso, conservação e funcionamento da(s) janela(s) da biblioteca/sala de leitura?',
    'Qual a condição de conservação do piso da biblioteca/sala de leitura?',
    'Qual a condição de conservação das paredes da biblioteca/sala de leitura?',
    'Qual a condição de conservação do teto da biblioteca/sala de leitura?',
    'O(s) extintor(es) de incêndio perto ou na biblioteca/sala de leitura se encontra(m) na validade?',
    'A biblioteca possui livros que atendem todas as idades?',
    'Os livros estão organizados por ano/matéria?',
    'Os livros estão cadastrados no computador?',
    'Como é a iluminação da biblioteca/sala de leitura?',
    'Como é a ventilação da biblioteca/sala de leitura?',
    'Como é a organização da biblioteca/sala de leitura?',
    'Como é a limpeza da biblioteca/sala de leitura?',
    'Qual é a condição de inclusão/acessibilidade para pessoas com deficiência (PcD) na biblioteca/sala de leitura?',
    'De zero a dez, qual nota a equipe atribui para a biblioteca/sala de leitura? Sendo 10 - ótima e 0 - péssima.',
    'Existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar sobre a biblioteca/sala de leitura?',
  ]),
  makeSection('Cozinha', [
    'Qual a condição de uso, conservação e funcionamento da instalação elétrica da cozinha?',
    'A fiação elétrica da cozinha está dentro de tubulações?',
    'Qual a condição de uso, conservação e funcionamento das tomadas da cozinha?',
    'Os equipamentos ficam ligados ao mesmo tempo, sem queda de energia?',
    'Qual a condição de uso e conservação da mesa/bancada da cozinha?',
    'A mesa/bancada da cozinha é impermeável, com superfície lisa, resistente a corrosão e de material não contaminante?',
    'Qual a condição de uso e conservação do(s) armário(s)/prateleira(s) da cozinha?',
    'Qual a condição de uso e conservação da(s) pia(s) e torneira(s)?',
    'Qual o estado de uso e conservação da porta da cozinha?',
    'O(s) extintor(es) de incêndio perto ou na cozinha se encontra(m) na validade?',
    'Qual a condição de conservação da proteção contra insetos e roedores da porta da cozinha?',
    'Qual a condição de conservação da(s) janela(s) da cozinha?',
    'Qual a condição de conservação da(s) tela(s) de proteção contra insetos e roedores da janela da cozinha?',
    'Qual a condição de uso e conservação da(s) lixeira(s) da cozinha?',
    'Qual a condição de conservação das paredes da cozinha?',
    'Todas as paredes da cozinha são laváveis (tinta específica ou azulejo)?',
    'Qual a condição de conservação do piso da cozinha?',
    'Qual a condição de conservação do teto da cozinha?',
    'As panelas existentes são suficientes para o uso da escola?',
    'Qual a condição de uso e conservação das panelas existentes da cozinha?',
    'Qual a condição de uso e conservação dos copos, canecas, pratos e talheres da cozinha?',
    'A cozinha possui copos, canecas, pratos e talheres suficientes para o uso da escola?',
    'Qual a condição de uso, conservação e funcionamento do forno da cozinha?',
    'Qual a condição de uso, conservação e funcionamento do fogão da cozinha?',
    'O botijão de gás está localizado fora da cozinha?',
    'A cozinha está livre de cheiro de gás?',
    'Qual a condição de uso, conservação e funcionamento da geladeira da cozinha?',
    'A capacidade/tamanho da geladeira é suficiente para atender as necessidades da escola?',
    'Qual a condição de uso, conservação e funcionamento do freezer da cozinha?',
    'A capacidade/tamanho do freezer é suficiente para atender as necessidades da escola?',
    'Como é a iluminação da cozinha?',
    'Como é a ventilação da cozinha?',
    'Como é a limpeza da cozinha?',
    'Como é a organização da cozinha?',
    'De zero a dez, qual nota os funcionários da merenda atribuem à cozinha? Sendo 10 - ótima e 0 - péssima.',
    'Existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar sobre a cozinha?',
  ]),
  makeSection('Entrada da Escola', [
    'O tamanho da entrada da escola é adequado à quantidade de alunos?',
    'Qual a condição de conservação e funcionamento do portão da entrada da escola?',
    'Qual a condição de conservação do piso da entrada da escola?',
    'Qual a condição de conservação do muro ou grade da entrada da escola?',
    'Como é a segurança da entrada da escola?',
    'O(s) extintor(es) de incêndio da entrada da escola se encontra(m) dentro da validade?',
    'A entrada da escola possui árvores?',
    'Qual a condição de uso e conservação da(s) lixeira(s) da entrada da escola?',
    'Como é a iluminação da entrada da escola?',
    'Como é a organização da entrada da escola?',
    'Como é a limpeza da entrada da escola?',
    'De zero a dez, qual nota a equipe atribui para a entrada da escola? Sendo 10 - ótima e 0 - péssima.',
    'Sobre a entrada da escola, existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar?',
  ]),
  makeSection('Parte Externa', [
    'Como é a iluminação no entorno da escola?',
    'Qual a condição de conservação do(s) poste(s) de lâmpada no entorno da escola?',
    'Como é a segurança no entorno da escola?',
    'Qual a condição da sinalização de trânsito (placa de trânsito, faixa de pedestre, indicações no chão) no entorno da escola?',
    'Existe calçada na escola?',
    'Qual a condição de conservação da calçada em torno da escola?',
    'Qual a condição de conservação das ruas no entorno da escola?',
    'Qual a condição de controle do mato e vegetação invasiva perto da escola?',
    'O escoamento de esgoto no entorno da escola é adequado?',
    'Qual a condição de conservação do(s) bueiro(s) no entorno da escola?',
    'Qual a condição/regularidade da coleta de lixo e entulho no entorno da escola?',
    'Como é a limpeza no entorno da escola?',
    'Qual a condição de acessibilidade para pessoas com deficiência (PcD) no entorno da escola?',
    'Qual a condição de uso e conservação da ciclovia no entorno da escola?',
    'Qual a condição de conservação da pintura do muro da escola?',
    'Qual a condição do ruído externo dentro da escola?',
    'De zero a dez, qual nota a equipe atribui para a área externa da escola? Sendo 10 - ótima e 0 - péssima.',
    'Sobre o entorno da escola, existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar?',
  ]),
  makeSection('Pátio', [
    'O tamanho do pátio é adequado para a quantidade de estudantes?',
    'O pátio é utilizado com frequência para atividades recreativas ou de lazer (por exemplo corda, amarelinha, elástico, bola, pique-pega, ping-pong)?',
    'Qual a condição de uso e conservação da área coberta do pátio?',
    'Qual a condição de uso e conservação do piso do pátio?',
    'Qual a condição de acessibilidade para pessoas com deficiência (PcD) no pátio?',
    'O(s) extintor(es) de incêndio do pátio se encontra(m) na validade?',
    'Qual a condição de uso e conservação da(s) lixeira(s) do pátio?',
    'Qual a condição de uso, conservação e funcionamento do(s) bebedouro(s) do pátio?',
    'O filtro de água encontra-se dentro da validade?',
    'Como é a iluminação do pátio?',
    'Como é a organização do pátio?',
    'Como é a limpeza do pátio?',
    'De zero a dez, qual nota o grupo atribui para o pátio? Sendo 10 - ótima e 0 - péssima.',
    'Sobre o pátio, existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar?',
  ]),
  makeSection('Quadra de Esportes', [
    'A escola possui quadra de esportes?',
    'A quadra atende a quantidade de alunos por aula?',
    'Qual a condição de uso e conservação do piso da quadra de esportes?',
    'Qual a condição de conservação da pintura da quadra de esportes?',
    'Qual a condição de uso e conservação da arquibancada da quadra de esportes?',
    'Qual a condição de conservação do alambrado da quadra de esporte?',
    'Qual a condição de conservação da cobertura da quadra de esportes?',
    'A quadra de esportes possui escoamento para água?',
    'Qual a condição de uso e conservação da(s) haste(s) de vôlei?',
    'A escola possui rede(s) de vôlei disponível(is)?',
    'A escola possui bola(s) de vôlei disponível(is)?',
    'Qual a condição de uso e conservação da(s) tabela(s) e cesta(s) de basquete?',
    'A escola possui bola(s) de basquete, disponíveis?',
    'Qual a condição de uso e conservação da(s) trave(s) de futebol/handebol?',
    'A escola possui rede(s) de futebol/handebol disponível(is)?',
    'Qual a condição de uso e conservação da(s) trave(s) de golzinho (mini trave de futebol)?',
    'A escola possui bola(s) de futebol disponível(is)?',
    'A escola possui bola(s) de handebol disponível(is)?',
    'Os estudantes com deficiência são incluídos na prática de esportes?',
    'Qual a condição de acessibilidade para pessoas com deficiência (PcD) na quadra de esportes?',
    'Como é a iluminação da quadra de esportes?',
    'Como é a limpeza da quadra de esportes?',
    'De zero a dez, qual nota o grupo atribui para a quadra de esportes? Sendo 10 - ótima e 0 - péssima.',
    'Sobre a quadra de esportes, existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar?',
  ]),
  makeSection('Sala de Aula', [
    'O tamanho da sala de aula é adequado à quantidade de estudantes?',
    'A sala de aula possui mesas e cadeiras ou carteiras suficientes para todos os estudantes?',
    'Qual a condição de uso e conservação das mesas e cadeiras ou carteiras existentes na sala de aula?',
    'Qual a condição de uso e conservação do(s) armário(s)/estante(s) da sala de aula?',
    'Qual a condição de uso e conservação do quadro da sala de aula?',
    'Qual a condição de uso e conservação da(s) lixeira(s) da sala de aula?',
    'O(s) extintor(es) de incêndio perto ou na sala de aula se encontra(m) na validade?',
    'Qual a condição de acessibilidade para pessoas com deficiência (PcD) na sala de aula?',
    'Qual a condição de uso, conservação e funcionamento da(s) janela(s) da sala de aula?',
    'Qual a condição de uso e conservação da porta da sala de aula?',
    'Qual a condição de conservação do teto da sala de aula?',
    'Qual a condição de conservação das paredes da sala de aula?',
    'Qual a condição de conservação do piso da sala de aula?',
    'Qual a condição de uso, conservação e funcionamento da(s) tomada(s) da sala de aula?',
    'Qual a condição de conservação da pintura das paredes externas da(s) sala(s) da escola?',
    'Como é a iluminação da sala de aula?',
    'Como é a ventilação da sala de aula?',
    'Como é a organização da sala de aula?',
    'Como é a limpeza da sala de aula?',
    'De zero a dez, qual nota a equipe atribui a sala de aula? Sendo 10 - ótima e 0 - péssima.',
    'Sobre a sala de aula, existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar?',
  ]),
  makeSection('Sala de Informática', [
    'A escola tem sala de informática?',
    'Todos os computadores da sala de informática estão em pleno funcionamento?',
    'Todos os computadores da sala de informática oferecem editor de texto, de planilhas e de apresentação?',
    'Qual a condição de uso, conservação e funcionamento das CPUs da sala de informática?',
    'Qual a condição de uso, conservação e funcionamento dos monitores existentes na sala de informática?',
    'Qual a condição de uso, conservação e funcionamento dos teclados existentes na sala de informática?',
    'Qual a condição de uso, conservação e funcionamento dos mouses existentes na sala de informática?',
    'Qual a condição de uso, conservação e funcionamento da impressora?',
    'Qual a condição de uso, conservação e funcionamento dos estabilizadores da sala de informática?',
    'Os computadores da sala de informática passam regularmente por manutenção?',
    'Qual a condição de uso e conservação das mesas e cadeiras existentes na sala de informática?',
    'Qual a condição de uso e conservação da(s) lixeira(s) da sala de informática?',
    'Qual a condição de conservação das paredes da sala de informática?',
    'Qual a condição de conservação do piso da sala de informática?',
    'Qual a condição de conservação do teto da sala de informática?',
    'Qual a condição de uso e conservação do(s) armário(s)/estantes(s)da sala de informática?',
    'Qual a condição de uso, conservação e funcionamento da(s) janela(s) da sala de informática?',
    'Qual a condição de uso, conservação e funcionamento da(s) tomada(s) existentes na sala de informática?',
    'Os fios e cabos elétricos visíveis estão encapados e funcionando?',
    'O(s) extintor(es) de incêndio perto da sala de informática se encontra(m) na validade?',
    'Qual a condição de acessibilidade para pessoas com deficiência (PcD) na sala de informática?',
    'Qual a condição dos professores ministrarem aulas na sala de informática?',
    'Como é a iluminação da sala de informática?',
    'Como é a ventilação da sala de informática?',
    'Como é a limpeza da sala de informática?',
    'Como é a organização da sala de informática?',
    'De zero a dez, qual nota o grupo atribui para a sala de informática? Sendo 10 - ótima e 0 - péssima.',
    'Sobre a sala de informática, existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar?',
  ]),
  makeSection('Sala dos Professores', [
    'A escola possui sala de professores?',
    'O tamanho da sala é adequado para quantidade de professores?',
    'Qual a condição de uso e conservação da(s) cadeira(s) da sala de professores?',
    'Qual a condição de uso e conservação da(s) mesa(s) da sala de professores?',
    'Qual a condição de uso e conservação do(s) armário(s)/estante(s) da sala de professores?',
    'Qual a condição de conservação do(s) sofá(s) da sala de professores?',
    'Qual a condição de uso e conservação da(s) lixeira(s) da sala de professores?',
    'Qual a condição de uso e conservação da(s) janela(s) da sala de professor(es)?',
    'Qual a condição de uso e conservação da porta da sala de professores?',
    'Qual a condição de conservação das paredes da sala de professores?',
    'Qual a condição de uso e conservação do piso da sala de professores?',
    'Qual a condição de conservação do teto da sala de professores?',
    'Qual a condição de uso, conservação e funcionamento da(s) tomada(s) da sala de professores?',
    'Qual a condição de uso, conservação e funcionamento da televisão da sala de professores?',
    'O(s) extintor(es) de incêndio perto ou na sala de professores se encontram na validade?',
    'Como é a ventilação da sala dos professores?',
    'Como é a iluminação da sala dos professores?',
    'Qual a condição da organização da sala de professores?',
    'Qual a condição de limpeza da sala de professores?',
    'Qual a condição de uso, conservação e funcionamento do(s) banheiro(s) exclusivo(s) para professores?',
    'Qual a condição de uso e conservação da copa dos professores?',
    'De zero a dez, qual nota os professores atribuem a sala de professores deles? Sendo 10 - ótima e 0 - péssima.',
    'Sobre a sala de professores, banheiro exclusivo para professores e copa dos professores, existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar?',
  ]),
  makeSection('Secretaria', [
    'A escola possui secretaria?',
    'O tamanho da secretaria é adequado para as atividades exercidas?',
    'Qual a condição de uso e conservação da(s) mesa(s) da secretaria?',
    'Qual a condição de uso e conservação da(s) cadeira(s) da secretaria?',
    'Qual a condição de uso e conservação do(s) armário(s)/estante(s) da secretaria?',
    'Qual a condição de conservação e organização do(s) arquivo(s) da secretaria?',
    'Qual a condição de uso e conservação do balcão de atendimento da secretaria?',
    'Qual a condição de uso, conservação e funcionamento do(s) computador(es) da secretaria?',
    'Qual a condição de uso, conservação e funcionamento do telefone da secretaria?',
    'Qual a condição de uso e conservação da(s) lixeira(s) da secretaria?',
    'Qual a condição de uso e conservação da porta da secretaria?',
    'Qual a condição de conservação das paredes da secretaria?',
    'Qual a condição de uso e conservação da(s) janela(s) da secretaria?',
    'O sistema de cadastro de estudantes é informatizado?',
    'Qual a qualidade do acesso à Internet da secretaria?',
    'O(s) extintor(es) de incêndio perto ou na secretaria se encontra(m) na validade?',
    'De zero a dez, qual nota é atribuída a secretaria? Sendo 10 - ótima e 0 - péssima.',
    'Sobre a secretaria, existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que você gostaria de nos contar?',
  ]),
  makeSection('Banheiro', [
    'Qual banheiro está sendo auditado?',
    'O banheiro possui box para pessoas com deficiência (PcD)?',
    'A quantidade de banheiros da escola, quando em completo funcionamento, atende a quantidade de estudantes?',
    'A(s) porta(s) do banheiro PcD possui(em) dimensão suficiente para passagem e movimentação de cadeirantes?',
    'O piso entre o box e o restante do banheiro PcD é nivelado ou existe rampa para acesso ao box?',
    'O espaço para estacionar a cadeira de rodas para fazer a transição segura entre a cadeira e o vaso sanitário do banheiro PcD é suficiente e adequado com barras de apoio?',
    'Existem barras de apoio instaladas do lado da pia do banheiro PcD?',
    'A altura da pia e do vaso do banheiro PcD é adequada para uso de cadeirantes?',
    'O banheiro PcD possui piso antiderrapante?',
    'O banheiro possui papel higiênico o suficiente?',
    'O banheiro possui saboneteira(s) e sabonete o suficiente?',
    'O banheiro feminino possui absorvente íntimo o suficiente?',
    'O banheiro possui paredes laváveis (tinta própria ou azulejo)?',
    'Qual a condição de conservação das paredes do banheiro?',
    'Qual a condição de conservação do espelho do banheiro?',
    'Qual a condição de conservação do piso do banheiro?',
    'Qual a condição de uso, conservação e funcionamento da(s) janela(s) do banheiro?',
    'Qual a condição de uso, conservação e funcionamento do(s) vaso(s)/mictório(s)do banheiro?',
    'Qual a condição de conservação da(s) lixeira(s) existente(s) ao lado do(s) vaso(s)?',
    'Qual a condição de uso, conservação e funcionamento da(s) pia(s)/torneira(s)?',
    'Qual a condição de uso, conservação e funcionamento da(s) descarga(s)?',
    'Qual a condição de uso, conservação e funcionamento da(s) porta(s) de box do banheiro?',
    'Qual a condição de funcionamento do(s) ralo(s) do banheiro?',
    'Como é a iluminação do banheiro?',
    'Como é a ventilação do banheiro?',
    'Como é a organização do banheiro?',
    'Como é a limpeza do banheiro?',
    'De zero a dez, qual nota o grupo atribui para o banheiro? Sendo 10 - ótima e 0 - péssima',
    'Existe algum problema que não foi perguntado ou existe algum detalhe referente a um problema que a equipe gostaria de nos contar sobre o banheiro?',
  ]),
]
