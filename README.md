# Vistoria Escolar SEE/PE

Web app mobile-first para substituir as planilhas de diagnóstico de infraestrutura escolar por uma experiencia de vistoria guiada.

## Decisao inicial

O projeto foi iniciado como PWA, porque os fiscais precisam acessar por link, usar no celular e continuar preenchendo mesmo quando a internet da escola estiver instavel. As vistorias sao salvas localmente no aparelho via `IndexedDB`, permitindo manter multiplos preenchimentos offline e deixar registros pendentes para envio quando houver internet.

## Funcionalidades do MVP

- Identificacao da visita: escola, municipio, GRE, empresa, analista e data.
- Lista de 1.082 escolas carregada a partir do mapa situacional, com INEP,
  municipio, GRE e endereco.
- Lista suspensa com os 185 municipios de Pernambuco presentes na base.
- Preenchimento automatico de municipio, GRE, INEP e endereco ao selecionar a escola.
- Checklist organizado por 12 ambientes do arquivo consolidado:
  auditorio, biblioteca, cozinha, entrada da escola, parte externa, patio,
  quadra de esportes, sala de aula, sala de informatica, sala dos professores,
  secretaria e banheiro.
- Campos de escolha unica, multipla escolha, quantidade, texto longo e fotos.
- Captura de imagens pelo celular usando `input` com `capture="environment"`.
- Indicador de progresso, quantidade de fotos e status online/offline.
- Salvamento automatico offline no aparelho com `IndexedDB`.
- Multiplas vistorias locais, com abertura, exclusao e status de pendencia de envio.
- Configuracao PWA com manifest e service worker.
- Geracao de Nota Tecnica em DOCX e PDF, incluindo achados da vistoria e relatorio fotografico quando houver fotos anexadas.

## Stack

- React
- TypeScript
- Vite
- vite-plugin-pwa
- lucide-react
- docx
- jsPDF
- idb

## Como rodar

```bash
npm install
npm run dev
```

## Proximas etapas recomendadas

1. Revisar o schema em `src/formSchema.ts` com fiscais para confirmar termos, obrigatoriedade, opcoes de resposta e ordem dos itens.
2. Revisar `src/schoolData.ts` sempre que o mapa situacional oficial for atualizado.
3. Criar API e banco PostgreSQL para sincronizar vistorias pendentes.
4. Gerar PDF oficial da vistoria com fotos e observacoes.
5. Ajustar o texto padrao da Nota Tecnica com a equipe tecnica e incluir campos de assinatura/CREA quando houver responsavel fixo.
6. Criar painel administrativo para escolas, usuarios, historico e exportacoes.
