const RULES = [
  { terms:['iphone'], category:'iPhone e acessórios', score:94, reason:'Nome de produto específico; permite buscar modelos, preço e ofertas.' },
  { terms:['air fryer','airfryer'], category:'Eletrodomésticos', score:91, reason:'Categoria de produto de varejo com comparação direta de modelos e preços.' },
  { terms:['notebook','laptop','pc gamer'], category:'Informática', score:90, reason:'Produto específico e comparável por configuração e preço.' },
  { terms:['smart tv','televisão','televis','tv 4k'], category:'TVs e eletrônicos', score:89, reason:'Produto físico com modelos e faixas de preço comparáveis.' },
  { terms:['smartphone','celular','samsung galaxy','xiaomi','motorola'], category:'Celulares e acessórios', score:88, reason:'Produto de consumo com modelos pesquisáveis.' },
  { terms:['playstation','ps5','xbox','nintendo switch','console'], category:'Games e consoles', score:87, reason:'Produto identificável com catálogo de lojas.' },
  { terms:['geladeira','lavadora','máquina de lavar','microondas','micro-ondas'], category:'Eletrodomésticos', score:86, reason:'Produto físico de maior valor e comparação de modelos.' },
  { terms:['fone bluetooth','headphone','smartwatch','tablet','monitor'], category:'Eletrônicos', score:83, reason:'Produto identificável e disponível em marketplaces.' },
  { terms:['furadeira','parafusadeira','serra circular'], category:'Ferramentas', score:82, reason:'Produto de varejo com especificações e preços comparáveis.' },
  { terms:['ar condicionado','ar-condicionado','ventilador','aspirador de pó'], category:'Casa e eletrodomésticos', score:82, reason:'Produto físico com procura comercial possível.' },
  { terms:['perfume','fralda','cafeteira','liquidificador','escova secadora'], category:'Casa, beleza e cuidados', score:80, reason:'Categoria de consumo com produtos pesquisáveis.' },
  { terms:['tênis','tenis','mochila','cadeira gamer','colchão','colchao','ração','racao'], category:'Moda, casa e pets', score:77, reason:'Produto de varejo; precisa validar oferta, preço e procura.' }
];

const NON_PRODUCT = [
  'brighton','graciele lacerda','strauss zelnick','sunderland','matt damon',
  'new york times','flavio bolsonaro','bayer leverkusen','liga conferência',
  'ciclone','eleição','acidente','morte','resultado','partida','previsão do tempo',
  'ccxp','campeonato','jogo de hoje','notícia','noticia'
];

const normalize = value => String(value || '').toLocaleLowerCase('pt-BR')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();

export function analyzeTrend(term) {
  const text = normalize(term);
  const excluded = NON_PRODUCT.some(word => text.includes(normalize(word)));
  const rule = RULES.find(item => item.terms.some(keyword => text.includes(normalize(keyword))));

  if (excluded || !rule) {
    return {
      term,
      category:'Não é uma busca de produto',
      score:0,
      rating:'Descartada',
      estimate:null,
      commissionMin:null,
      commissionMax:null,
      reason:'Tendência genérica, notícia, pessoa, esporte ou evento. Não será tratada como oportunidade de afiliado.'
    };
  }

  return {
    term,
    category:rule.category,
    score:rule.score,
    rating:rule.score >= 85 ? 'Aderência alta' : 'Aderência média',
    estimate:null,
    commissionMin:null,
    commissionMax:null,
    reason:rule.reason + ' A pontuação mede aderência ao varejo, não probabilidade de venda.',
    commissionStatus:'Aguardando produto, link e taxa reais do programa de afiliados.'
  };
}
