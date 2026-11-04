# One Way — Tema Shopify

Tema Online Store 2.0 da **One Way** ([lojaoneway.com](https://lojaoneway.com)), desenvolvido por [Mewtda](https://www.mewtda.com.br) a partir do briefing de layout de 03/11/2026.

Navegação visual, minimalista e pensada primeiro para o celular. Tipografia sem serifa (configurável em **Configurações do tema → Tipografia**).

## Home

| Seção | Uso |
| --- | --- |
| Slideshow | Banner principal de campanha, imagem desktop e recorte mobile |
| Banners de seleção | Entradas para Party Collection, Beachwear, Conjuntos e Acessórios. Cada banner tem imagem desktop, imagem mobile, título curto, link, largura no desktop (inteira, metade, um terço) e formato próprio por dispositivo. Reordenar = arrastar os blocos |
| Coleção em destaque | Vitrine de produtos (ex.: New in) |

O cabeçalho fica fixo no topo, com menu e busca sempre acessíveis.

## Coleção (grade editorial modular)

A seção **Coleção** monta a grade a partir de blocos, que podem ser combinados e reordenados no editor:

| Bloco | Celular | Desktop (4 colunas) |
| --- | --- | --- |
| Dois produtos lado a lado | 2 colunas | 1 coluna cada |
| Produto em destaque | largura inteira | 2 × 2 colunas (esquerda ou direita) |
| Quatro produtos (2 × 2) | 2 linhas de 2 | 1 coluna cada |
| Bloco de produtos | N produtos em 2 colunas | 1 coluna cada |
| Banner editorial | largura inteira | inteira ou 2 × 2, com imagem/vídeo, título e link |

Sequência padrão: 2 lado a lado → destaque → 2 × 2 → banner editorial → bloco de 4 → destaque → 2 × 2. A sequência se repete até o fim da coleção e continua corretamente entre carregamentos. Os cards vêm do catálogo (nome, preço, disponibilidade e link).

- **Filtrar e ordenar**: barra fixa abaixo do cabeçalho, abrindo uma gaveta (de baixo para cima no celular). Filtros ativos aparecem como etiquetas removíveis.
- **Ao filtrar/reordenar**: escolha entre grade simples, manter a escala sem banners (padrão) ou manter tudo.
- **Carregamento infinito**: novos produtos entram automaticamente conforme a cliente rola (sem botão).
- **Voltar do produto**: os produtos já carregados e a posição de rolagem são restaurados.

## Produto

- Galeria em tela cheia com indicador no celular; grade de 2 colunas no desktop com informações fixas ao lado.
- Bloco **Medidas da modelo**: metafields `custom.tamanho_modelo` (texto) e `custom.medidas_modelo` (texto de várias linhas).
- Bloco **Guia de tamanhos**: link ao lado da opção Tamanho abrindo uma gaveta. Usa o metafield `custom.tabela_de_medidas` (referência de página) ou a página padrão do bloco.
- Bloco **Compre o look**: metafield `custom.compre_o_look` (lista de produtos), com seletor de tamanho e "adicionar" direto.
- **Barra de compra fixa**: aparece quando o botão principal sai da tela.
- Abas recolhíveis com conteúdo fixo, página ou metafield (ex.: `custom.composicao`).

### Vitrine de recomendações (descoberta contínua)

Seção **Vitrine de recomendações**, abaixo das informações da peça. Carrega mais produtos conforme a cliente rola, na ordem:

1. Produtos complementares (Search & Discovery → Recomendações → complementares)
2. Produtos relacionados (algoritmo da Shopify)
3. Até 2 coleções do produto (ignorando as listadas em "Coleções a ignorar")
4. Coleção reserva (opcional) e, por fim, todos os produtos

Sem repetições e sem os itens de "Compre o look". O carregamento é infinito, sem botão, até o limite de "Máximo de produtos" (padrão 60); depois disso o rodapé aparece. Ao abrir uma sugestão e voltar, a vitrine e a posição de rolagem são restauradas.

## Metafields a criar (Configurações → Dados personalizados → Produtos)

| Nome | Namespace e chave | Tipo |
| --- | --- | --- |
| Tamanho usado pela modelo | `custom.tamanho_modelo` | Texto em linha única |
| Medidas da modelo | `custom.medidas_modelo` | Texto em várias linhas |
| Tabela de medidas | `custom.tabela_de_medidas` | Referência de página |
| Compre o look | `custom.compre_o_look` | Lista de produtos |
| Composição e cuidados | `custom.composicao` | Texto em várias linhas |

## Formatos de imagem para a designer

| Uso | Desktop | Celular |
| --- | --- | --- |
| Banner principal | 2880 × 1400 px | 1200 × 1800 px |
| Banner de seleção (metade) | 1600 × 2000 px (4:5) | 1200 × 1500 px (4:5) |
| Banner de seleção (inteiro) | 2880 × 1234 px (21:9) | 1200 × 1500 px (4:5) |
| Banner editorial na coleção (inteiro) | 2880 × 1234 px (21:9) | 1200 × 1500 px (4:5) |
| Banner editorial na coleção (2 × 2) | 1600 × 2400 px (2:3) | 1200 × 1500 px (4:5) |
| Fotos de produto | 1600 × 2400 px (2:3), mesmo formato em todas | — |

Imagens abaixo da primeira tela carregam sob demanda e todas têm o espaço reservado (sem saltos na página).

## Desenvolvimento

```bash
shopify theme dev --store bf6def-e3.myshopify.com
shopify theme check
```
