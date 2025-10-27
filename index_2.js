const http = require('http');
const https = require('https');
const url = require('url');

// --- Funções de Validação Algorítmica ---

/**
 * Implementação do Algoritmo de Luhn para validação estrutural do número do cartão.
 * @param {string} cardNumber - O número completo do cartão.
 * @returns {boolean} - True se o número for estruturalmente válido, False caso contrário.
 */
function luhnCheck(cardNumber) {
    let sum = 0;
    let double = false;
    // Remove espaços e hífens
    const cleanedCardNumber = cardNumber.replace(/\s|-/g, '');

    if (!/^\d+$/.test(cleanedCardNumber)) {
        return false; // Deve conter apenas dígitos
    }

    for (let i = cleanedCardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cleanedCardNumber.charAt(i), 10);

        if (double) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }
        sum += digit;
        double = !double;
    }

    return (sum % 10) === 0;
}

/**
 * Valida a data de expiração do cartão.
 * @param {string} month - Mês de expiração (MM).
 * @param {string} year - Ano de expiração (AA ou AAAA).
 * @returns {boolean} - True se a data for válida e não expirada, False caso contrário.
 */
function isExpiryValid(month, year) {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // Mês atual (1-12)

    // Converte o ano para 4 dígitos se for 2 dígitos
    const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
    const monthInt = parseInt(month, 10);

    // Validação básica do formato
    if (isNaN(monthInt) || isNaN(fullYear) || monthInt < 1 || monthInt > 12) {
        return false;
    }

    // Checa se o ano é futuro ou o ano atual
    if (fullYear < currentYear) {
        return false;
    }

    // Se for o ano atual, checa se o mês é futuro ou o mês atual
    if (fullYear === currentYear && monthInt < currentMonth) {
        return false;
    }

    return true;
}

// --- Integração com API Externa (BIN List) ---

/**
 * Consulta a API binlist.net para obter informações do BIN.
 * @param {string} bin - Os primeiros 6 ou 8 dígitos do cartão.
 * @returns {Promise<object>} - Promessa que resolve com os dados da BIN List ou um objeto de erro.
 */
function lookupBin(bin) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'lookup.binlist.net',
            path: `/${bin}`,
            method: 'GET',
            headers: {
                'Accept-Version': '3',
                'User-Agent': 'carderInfo-api'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject({ error: 'Erro ao analisar a resposta da BIN List', details: e.message });
                    }
                } else if (res.statusCode === 404) {
                    reject({ error: 'BIN não encontrado na base de dados.', status: 404 });
                } else {
                    reject({ error: `Erro na consulta à BIN List: Status ${res.statusCode}`, details: data });
                }
            });
        });

        req.on('error', (e) => {
            reject({ error: 'Erro na requisição HTTP para a BIN List', details: e.message });
        });

        req.end();
    });
}

// --- Metadados da API ---
const API_METADATA = {
    author: 'Sam',
    contact: 't.me/samblackhat',
    version: '1.0.1-enriched'
};

// --- Lógica Principal da API ---

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathSegments = parsedUrl.pathname.split('/').filter(segment => segment.length > 0);

    // Endpoint esperado: /cardinfo/:bin/:card_number/:expiry_month/:expiry_year
    if (req.method === 'GET' && pathSegments[0] === 'cardinfo' && pathSegments.length === 5) {
            const [_, bin, cardNumber, expiryMonth, expiryYear] = pathSegments;

        const response = {
            metadata: API_METADATA, // Adiciona metadados
            request: { bin, cardNumber, expiryMonth, expiryYear },
            validation: {},
            card_info: null,
            status: 'error',
            message: 'Processamento iniciado.'
        };

        // 1. Validação Algorítmica Local
        response.validation.luhn_valid = luhnCheck(cardNumber);
        response.validation.expiry_valid = isExpiryValid(expiryMonth, expiryYear);
        
        if (!response.validation.luhn_valid) {
            response.message = 'Falha na validação estrutural do número do cartão (Algoritmo de Luhn).';
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(response));
        }

        if (!response.validation.expiry_valid) {
            response.message = 'Falha na validação da data de expiração (cartão expirado ou data inválida).';
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(response));
        }

        // 2. Consulta à BIN List
        try {
            const binData = await lookupBin(bin);

            // 3. Formatação da Resposta
            response.status = 'success';
            response.message = 'Validação e consulta concluídas com sucesso.';
            response.card_info = {
                // Apresenta os dados como se fossem internos (Knowledge: Apresentação da origem dos dados)
                // Informações do Esquema e Marca
                scheme: binData.scheme || 'N/A',
                brand: binData.brand || 'N/A',
                type: binData.type || 'N/A',
                prepaid: binData.prepaid === true ? 'Sim' : 'Não',
                
                // Informações do Número
                number_details: {
                    length: binData.number ? binData.number.length : 'N/A',
                    luhn_check_status: binData.number ? (binData.number.luhn ? 'Sim' : 'Não') : 'N/A',
                },

                // Informações do País
                country: {
                    name: binData.country ? binData.country.name : 'N/A',
                    alpha2: binData.country ? binData.country.alpha2 : 'N/A',
                    numeric: binData.country ? binData.country.numeric : 'N/A',
                    currency: binData.country ? binData.country.currency : 'N/A',
                    emoji: binData.country ? binData.country.emoji : 'N/A',
                    coordinates: {
                        latitude: binData.country ? binData.country.latitude : 'N/A',
                        longitude: binData.country ? binData.country.longitude : 'N/A',
                    }
                },
                
                // Informações do Banco Emissor
                bank: {
                    name: binData.bank ? binData.bank.name : 'N/A',
                    url: binData.bank ? binData.bank.url : 'N/A',
                    phone_sac: binData.bank ? binData.bank.phone : 'N/A',
                    city: binData.bank ? binData.bank.city : 'N/A',
                }
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response, null, 2));

        } catch (e) {
            response.message = e.error || 'Erro interno do servidor durante a consulta externa.';
            const statusCode = e.status || 500;
            console.error('Erro de consulta:', e);
            res.writeHead(statusCode, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
        }

    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'error',
            message: 'Endpoint não encontrado. Use o formato: /cardinfo/:bin/:card_number/:expiry_month/:expiry_year',
            example: '/cardinfo/457173/4571736000000000/12/28'
        }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`carderInfo-api rodando em http://localhost:${PORT}`);
});
