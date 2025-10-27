# carderInfo-api

API simples em Node.js para validação e consulta de informações de cartões com base no BIN (Bank Identification Number).

**Aviso de Segurança:** Esta API foi projetada para fins educacionais e de demonstração. Ela **não** processa, valida ou armazena o CVV do cartão, em conformidade com as normas de segurança da indústria de pagamentos (PCI DSS).

## Funcionalidades

- **Validação Algorítmica:**
  - Valida a estrutura do número do cartão usando o **Algoritmo de Luhn**.
  - Verifica se a **data de validade** do cartão não está expirada.
- **Consulta de BIN:**
  - Utiliza a API pública `binlist.net` para obter informações detalhadas sobre o emissor do cartão.
- **Endpoint Simples:**
  - Todas as funcionalidades são acessíveis através de uma única requisição `GET`.

## Como Usar

Para usar a API, faça uma requisição GET para o seguinte endpoint:

```
/cardinfo/:bin/:card_number/:expiry_month/:expiry_year
```

### Parâmetros

- `:bin` (string): Os primeiros 6 dígitos do número do cartão.
- `:card_number` (string): O número completo do cartão (sem espaços ou hífens).
- `:expiry_month` (string): O mês de expiração do cartão (formato `MM`, ex: `08` para Agosto).
- `:expiry_year` (string): O ano de expiração do cartão (formato `YY` ou `YYYY`, ex: `28` ou `2028`).

### Exemplo de Requisição

```bash
curl https://<sua-url-exposta>/cardinfo/457173/4571736000000000/12/28
```

## Respostas

### Resposta de Sucesso (200 OK)

Quando todas as validações são bem-sucedidas e o BIN é encontrado, a API retorna um objeto JSON completo com as informações do cartão.

```json
{
  "metadata": {
    "author": "Sam",
    "contact": "t.me/samblackhat",
    "version": "1.0.1-enriched"
  },
  "request": {
    "bin": "457173",
    "cardNumber": "4571736000000000",
    "expiryMonth": "12",
    "expiryYear": "28"
  },
  "validation": {
    "luhn_valid": true,
    "expiry_valid": true
  },
  "card_info": {
    "scheme": "visa",
    "brand": "Visa Classic/Dankort",
    "type": "debit",
    "prepaid": "Não",
    "number_details": {
      "length": 16,
      "luhn_check_status": "Sim"
    },
    "country": {
      "name": "Denmark",
      "alpha2": "DK",
      "numeric": "208",
      "currency": "DKK",
      "emoji": "🇩🇰",
      "coordinates": {
        "latitude": 56,
        "longitude": 10
      }
    },
    "bank": {
      "name": "Jyske Bank A/S",
      "url": "www.jyskebank.dk",
      "phone_sac": "+4589893300",
      "city": "Hjørring"
    }
  },
  "status": "success",
  "message": "Validação e consulta concluídas com sucesso."
}
```

### Resposta de Erro (400 Bad Request)

Se a validação do número do cartão (Luhn) ou da data de expiração falhar.

```json
{
  "metadata": {
    "author": "Sam",
    "contact": "t.me/samblackhat",
    "version": "1.0.1-enriched"
  },
  "request": {
    "bin": "457173",
    "cardNumber": "4571736000000001",
    "expiryMonth": "12",
    "expiryYear": "28"
  },
  "validation": {
    "luhn_valid": false,
    "expiry_valid": true
  },
  "card_info": null,
  "status": "error",
  "message": "Falha na validação estrutural do número do cartão (Algoritmo de Luhn)."
}
```

### Resposta de Erro (404 Not Found)

Se o endpoint solicitado estiver incorreto.

