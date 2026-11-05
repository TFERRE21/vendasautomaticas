const RULES = [
  { terms:['iphone'], category:'iPhone e acessórios', price:[2500,8000], rate:[0.02,0.05], score:92, reason:'Busca explícita por produto de alto valor.' },
  { terms:['smartphone','celular','samsung galaxy','xiaomi','motorola'], category:'Celulares e acessórios', price:[700,5000], rate:[0.02,0.06], score:88, reason:'Produto de consumo com intenção comercial clara.' },
  { terms:['notebook','laptop','computador','pc gamer'], category:'Informática', price:[1800,7500], rate:[0.02,0.06], score:86, reason:'Produto pesquisável e comparável por preço.' },
  { terms:['air fryer','geladeira','televis','smart tv','lavadora','microondas'], category:'Eletrodomésticos', price:[250,4500], rate:[0.03,0.08], score:84, reason:'Categoria com ofertas e comparação de preços.' },
  { terms:['fone','headphone','monitor','tablet','playstation','xbox','console'], category:'Eletrônicos e games', price:[150,3500], rate:[0.03,0.08], score:82, reason:'Produtos físicos com procura em lojas online.' },
  { terms:['ferramenta','furadeira','parafusadeira'], category:'Ferramentas', price:[100,1200], rate:[0.03,0.08], score:78, reason:'Produto físico com potencial de compra direta.' },
  { terms:['ccxp'], category:'Games, colecionáveis e acessórios', price:[80,600], rate:[0.04,0.10], score:58, reason:'Evento pode gerar procura por produtos relacionados; tendência não prova intenção de compra.' }
];

const LOW_INTENT = ['brighton','graciele lacerda','strauss zelnick','sunderland','matt damon','new york times','flavio bolsonaro','bayer leverkusen','liga conferência','ciclone','eleição','acidente','morte','resultado','partida','previsão do tempo'];

const brl = value => Number(value.toFixed(2));

export function analyzeTrend(term) {
  const normalized = String(term || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const rule = RULES.find(item => item.terms.some(keyword => normalized.includes(keyword.normalize('NFD').replace(/[\u0300-\u036f]/g,''))));
  if (!rule || LOW_INTENT.some(keyword => normalized.includes(keyword.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))) {
    return {
      term, category:'Sem categoria de produto confirmada', score:5, rating:'Muito baixa',
      priceMin:0, priceMax:0, commissionMin:0, commissionMax:0,
      estimate:'Sem estimativa: não há produto identificável nesta tendência.',
      reason:'Assunto informativo, celebridade, esporte ou termo sem intenção de compra clara.'
    };
  }
  const [pMin,pMax] = rule.price;
  const [rMin,rMax] = rule.rate;
  const commissionMin = brl(pMin*rMin);
  const commissionMax = brl(pMax*rMax);
  const rating = rule.score >= 85 ? 'Alta' : rule.score >= 65 ? 'Média' : 'Baixa';
  return {
    term, category:rule.category, score:rule.score, rating,
    priceMin:pMin, priceMax:pMax, commissionMin, commissionMax,
    estimate:'R$ '+commissionMin.toFixed(2).replace('.',',')+' a R$ '+commissionMax.toFixed(2).replace('.',',')+' por venda',
    reason:rule.reason,
    assumptions:{ticketMin:pMin,ticketMax:pMax,commissionRateMin:rMin,commissionRateMax:rMax}
  };
}
