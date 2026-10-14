# Formato do XML de importação de pedidos

O importador de pedidos de compra (`Importar nota fiscal (XML)`) aceita **dois formatos** de arquivo:

1. **NFe** — o XML oficial da Nota Fiscal Eletrônica, emitido pela SEFAZ. Usado sempre que o fornecedor emite nota fiscal.
2. **Pedido** — um formato próprio e simplificado, para quando o fornecedor **não fornece NFe**, só um export/carrinho do próprio site. É este segundo formato que este documento especifica.

O sistema detecta automaticamente qual dos dois foi enviado — não precisa indicar nada, só escolher o arquivo.

## Formato "Pedido" — especificação

### Estrutura geral

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <loja>
    <nome>Nome da Loja</nome>
    <cnpj>12.345.678/0001-90</cnpj>
    <telefone>(11) 4002-8922</telefone>
    <site>https://www.exemplo.com.br</site>
  </loja>
  <data>2026-08-20</data>
  <resumo>
    <totalItens>2</totalItens>
    <totalUnidades>9</totalUnidades>
    <valorTotal moeda="BRL">43.62</valorTotal>
  </resumo>
  <itens>
    <item>
      <referencia>IT-0083</referencia>
      <descricao>Nome do produto - MARCA - UND</descricao>
      <marca>MARCA</marca>
      <categoria>Categoria</categoria>
      <quantidade>6</quantidade>
      <precoUnitario>3.97</precoUnitario>
      <subtotal>23.82</subtotal>
      <url>https://www.exemplo.com.br/produto</url>
    </item>
  </itens>
</pedido>
```

### Campos de `<loja>`

| Campo | Obrigatório | Tipo | Descrição |
|---|---|---|---|
| `nome` | **Sim** | texto | Nome do fornecedor. Vira o nome sugerido ao cadastrar um fornecedor novo. |
| `cnpj` | Não | texto | Com ou sem máscara (`12.345.678/0001-90` ou `12345678000190`, tanto faz). Se informado, o sistema tenta achar um fornecedor já cadastrado com esse CNPJ automaticamente. |
| `telefone` | Não | texto | Preenche o telefone ao cadastrar um fornecedor novo. |
| `site` | Não | texto (URL) | Só informativo, não é usado pelo sistema hoje. |

### Campos de `<pedido>` (raiz)

| Campo | Obrigatório | Tipo | Descrição |
|---|---|---|---|
| `data` | Não | `AAAA-MM-DD` (ISO 8601) | Data do pedido. Se ausente, usa a data de hoje (a do momento da importação). |
| `resumo.totalItens` | Não | número | Só informativo/conferência, não afeta a importação. |
| `resumo.totalUnidades` | Não | número | Idem. |
| `resumo.valorTotal` | Não | número decimal | Valor total do pedido. Se ausente ou zerado, o sistema soma `quantidade × precoUnitario` de todos os itens automaticamente. |

### Campos de cada `<item>` dentro de `<itens>`

| Campo | Obrigatório | Tipo | Descrição |
|---|---|---|---|
| `descricao` | **Sim** | texto | Nome do produto como vai aparecer no cadastro. |
| `quantidade` | **Sim** | número inteiro | Quantidade comprada. |
| `precoUnitario` | **Sim** | número decimal | Custo unitário (sem o símbolo `R$`, sem separador de milhar). |
| `marca` | Não | texto | Marca/fabricante. Preenche o campo "Marca" do produto automaticamente. |
| `categoria` | Não | texto | Se informado, é usado como categoria sugerida do produto (em vez do sistema tentar adivinhar pelo nome). Use uma categoria que já existe no sistema quando possível. |
| `referencia` | Não | texto | Código/SKU do fornecedor. Só informativo hoje — não vira o SKU interno (que é gerado automaticamente). |
| `subtotal` | Não | número decimal | Só informativo/conferência — o sistema sempre recalcula como `quantidade × precoUnitario`. |
| `url` | Não | texto (URL) | Link do produto no site do fornecedor. Só informativo hoje. |

## Convenções de formatação

- **Codificação**: sempre `UTF-8`, com a declaração `<?xml version="1.0" encoding="UTF-8"?>` na primeira linha.
- **Indentação**: 2 espaços por nível, sem tabs.
- **Números decimais**: sempre com **ponto** (`6.60`), nunca vírgula, e sem `R$` ou separador de milhar. Ex: `925.02`, não `R$ 925,02` nem `925,02`.
- **Datas**: sempre `AAAA-MM-DD` (ISO 8601). Ex: `2026-08-20`.
- **CNPJ**: com ou sem máscara, o sistema normaliza dos dois jeitos.
- **Acentuação**: use acentos normalmente (UTF-8 suporta) — "Pasta Plástica", "Necessaire", etc.

## Exemplo completo (com todos os campos opcionais preenchidos)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<pedido>
  <loja>
    <nome>Atacado Papelândia</nome>
    <cnpj>12.345.678/0001-90</cnpj>
    <telefone>(11) 4002-8922</telefone>
    <site>https://www.atacadopapelandia.com.br</site>
  </loja>
  <data>2026-08-20</data>
  <resumo>
    <totalItens>2</totalItens>
    <totalUnidades>9</totalUnidades>
    <valorTotal moeda="BRL">43.62</valorTotal>
  </resumo>
  <itens>
    <item>
      <referencia>IT-0083</referencia>
      <descricao>Chaveiro Tendência Charm Flores</descricao>
      <marca>IMPORTADO</marca>
      <categoria>Chaveiro</categoria>
      <quantidade>6</quantidade>
      <precoUnitario>3.97</precoUnitario>
      <subtotal>23.82</subtotal>
      <url>https://www.atacadopapelandia.com.br/chaveiro-flores</url>
    </item>
    <item>
      <referencia>FR-0082</referencia>
      <descricao>Pasta Plástica Zip A4 Desenhos Felizes 25x33cm</descricao>
      <marca>FLORIE</marca>
      <categoria>Pasta</categoria>
      <quantidade>3</quantidade>
      <precoUnitario>6.60</precoUnitario>
      <subtotal>19.80</subtotal>
      <url>https://www.atacadopapelandia.com.br/pasta-desenhos-felizes</url>
    </item>
  </itens>
</pedido>
```

## O que acontece com cada campo opcional ausente

O importador é tolerante: qualquer campo marcado como "Não" na tabela acima pode ser omitido sem quebrar a importação. Nesse caso:

- Sem `marca` → fica em branco, você preenche na revisão antes de confirmar (ou depois, editando o produto).
- Sem `categoria` → o sistema tenta adivinhar pela descrição; se não conseguir, você escolhe manualmente na tela de revisão.
- Sem `cnpj` → você precisa selecionar ou cadastrar o fornecedor manualmente na revisão (em vez de vir preenchido sozinho).
- Sem `data` → usa a data de hoje.
- Sem `valorTotal`/`subtotal` → o sistema recalcula a partir de quantidade × preço unitário.

## Referência: onde isso é implementado

- Parser: [`src/lib/nfe.ts`](../src/lib/nfe.ts) — função `parsePedidoStructured`.
- Tela de revisão: [`src/components/purchase-orders/purchase-order-import-form.tsx`](../src/components/purchase-orders/purchase-order-import-form.tsx).
- Este documento deve ser atualizado junto com qualquer mudança nesses dois arquivos.
