const CATS=[
{n:'🍺 Cervejas',i:[['Cerveja Long Neck','Bem gelada · 355 ml','9,00','🍺',1],['Cerveja 600 ml','Pilsen · garrafa','14,00','🍻'],['Chopp','Copo 300 ml','8,50','🍺']]},
{n:'🍟 Porções',i:[['Batata Frita','Porção crocante com cheddar e bacon','32,00','🍟',1],['Calabresa Acebolada','Calabresa fatiada com cebola e pão','36,00','🌭'],['Frango à Passarinho','Frito na hora · serve 3 pessoas','42,00','🍗'],['Mandioca Frita','Sequinha por fora, macia por dentro','28,00','🥔']]},
{n:'🥤 Bebidas',i:[['Refrigerante Lata','Coca, Guaraná ou Fanta','6,00','🥤'],['Suco Natural','Laranja, limão ou maracujá','8,00','🍊'],['Água Mineral','Com ou sem gás','4,00','💧']]}];
const card=(x,w,h)=>`<div class="card"><div class="thumb" style="width:${w}px;min-height:${h}px">${x[3]}</div><div class="info">${x[4]?'<span class="tag">⭐ Destaque</span>':''}<b>${x[0]}</b><p>${x[1]}</p><div class="price">R$ ${x[2]}</div></div></div>`;
function menu(cols,w,h){return CATS.map(c=>`<h2 class="cat">${c.n}</h2><div class="grid" style="grid-template-columns:repeat(${cols},1fr)">${c.i.map(x=>card(x,w,h)).join('')}</div>`).join('')}
