# Vistoria Escolar SEE/PE

Web app mobile-first para visualizar o mapa situacional das escolas de Pernambuco com base georreferenciada.

## Decisao inicial

O projeto foi iniciado como PWA para abrir por link, funcionar bem no celular e manter a base local do mapa disponivel depois do primeiro acesso. O fundo cartografico do OpenStreetMap depende de internet ou cache previo dos tiles.

## Funcionalidades do MVP

- Lista de 1.082 escolas carregada a partir do mapa situacional, com INEP,
  municipio, GRE e endereco.
- Mapa situacional das escolas com latitude/longitude da base, alternando entre Pernambuco inteiro e municipio atual.
- Limites municipais de Pernambuco carregados em GeoJSON para conferencia territorial.
- Marcador com borda vermelha para escolas criticas e miolo dividido em duas metades: projeto na esquerda e vistoria na direita.
- Filtros combinados por multiplas GREs, criticidade, escolas com ou sem projeto e escolas vistoriadas ou nao vistoriadas.
- KPIs acima do mapa contam a base completa filtrada e exibem aviso de escolas sem coordenadas validas.
- Tabela detalhada por escola baseada na base completa, com filtros textuais por municipio e nome da escola.
- Clique na escola da tabela para aproximar o mapa quando houver coordenada valida.
- Exportacao em XLS da lista de escolas contidas nos filtros atuais.
- Configuracao PWA com manifest e service worker.

## Stack

- React
- TypeScript
- Vite
- vite-plugin-pwa
- lucide-react
- Leaflet

## Como rodar

```bash
npm install
npm run dev
```

## Proximas etapas recomendadas

1. Revisar `src/schoolData.ts` sempre que o mapa situacional oficial for atualizado.
2. Atualizar as bases de criticidade, projetos e vistorias sempre que as planilhas oficiais forem revisadas.
3. Adicionar clique no municipio da tabela para aproximar o mapa automaticamente.
4. Criar backend para atualizar status das escolas por usuario/equipe.
