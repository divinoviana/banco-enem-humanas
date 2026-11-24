/* Atividades adaptadas e PEI — usa o motor (motor.js) carregado sob demanda.
   Nada do que o professor digita é enviado ou salvo: tudo fica na memória desta página. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const strongMd = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');

  let M = null;            // motor
  let modo = 'atividades'; // 'atividades' | 'pei'
  let atividade = null, peiAtual = null, semente = null, gabaritoVisivel = true;

  // ---------- carga do motor ----------
  let carregando = null;
  function carregarMotor() {
    if (window.Motor) return Promise.resolve(window.Motor);
    return carregando ||= new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'motor.js?v=1';
      s.onload = () => window.Motor ? res(window.Motor) : rej(new Error('motor'));
      s.onerror = () => { carregando = null; rej(new Error('motor')) };
      document.head.appendChild(s);
    });
  }

  // ---------- montagem do formulário ----------
  function montarFormulario() {
    $('#tPerfis').innerHTML = M.PERFIS.map(p =>
      `<label class="chkline"><input type="checkbox" name="perfil" value="${p.id}"><span>${esc(p.nome)}</span></label>`).join('');
    $('#tNivel').innerHTML = M.NIVEIS_ALFABETIZACAO.map(n => `<option value="${n.id}">${esc(n.nome)}</option>`).join('');
    $('#tNivel').value = 'le_textos_curtos';
    $('#tSuporte').innerHTML = M.NIVEIS_SUPORTE.map(n => `<option value="${n.id}">${esc(n.nome)}</option>`).join('');
    $('#tSuporte').value = 'moderado';
    const comp = M.AREAS.map(a => `<optgroup label="${esc(a.nome)}">${a.componentes.map(c => `<option>${esc(c)}</option>`).join('')}</optgroup>`).join('');
    $('#aComp').innerHTML = comp; $('#pComp').innerHTML = comp;
    $('#aComp').value = 'Filosofia'; $('#pComp').value = 'Filosofia';
    $('#temasLista').innerHTML = M.BANCO_TEMAS.map(t => `<option value="${esc(t.titulo)}">`).join('');
    $('#pEquipe').value = M.EQUIPE_COLABORACAO_PADRAO;
    atualizarNivel(); atualizarFormatos(); atualizarTemaInfo();
  }

  function areaAtual() { return (M.areaDoComponente($('#aComp').value) || M.AREAS[0]).id }
  function atualizarNivel() {
    const n = M.NIVEIS_ALFABETIZACAO.find(x => x.id === $('#tNivel').value);
    $('#tNivelDesc').textContent = n ? n.descricao : '';
  }
  function atualizarFormatos() {
    const atual = $('#aFormato').value;
    const recs = M.formatosRecomendados($('#tNivel').value, areaAtual());
    const outros = M.FORMATOS.filter(f => !recs.includes(f));
    $('#aFormato').innerHTML =
      `<optgroup label="Recomendados para este nível de leitura">${recs.map(f => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</optgroup>` +
      (outros.length ? `<optgroup label="Outros formatos">${outros.map(f => `<option value="${f.id}">${esc(f.nome)}</option>`).join('')}</optgroup>` : '');
    if ([...$('#aFormato').options].some(o => o.value === atual)) $('#aFormato').value = atual;
    atualizarFormatoDesc();
  }
  function atualizarFormatoDesc() {
    const f = M.formatoPorId($('#aFormato').value);
    $('#aFormatoDesc').textContent = f ? f.descricao : '';
  }
  function atualizarTemaInfo() {
    const tema = $('#aTema').value.trim();
    const t = tema && M.buscarTema(tema, areaAtual());
    $('#aTemaInfo').textContent = t
      ? `Tema encontrado no banco interno (${t.conceitos.length} conceitos prontos). Se quiser, escreva seus próprios conceitos abaixo.`
      : 'Escreva pelo menos 3 conceitos-chave do tema, um por linha, no formato TERMO: definição curta.';
  }

  const linhas = (s) => s.split(/\n|;/).map(x => x.trim()).filter(Boolean);
  const virgulas = (s) => s.split(/[,;\n]/).map(x => x.trim()).filter(Boolean);

  function lerEstudante() {
    const perfis = $$('input[name=perfil]:checked').map(i => i.value);
    const outra = $('#tOutra').value.trim();
    const descr = $('#pCondicao').value.trim();
    return {
      id: 'site', nome: $('#tNome').value.trim() || 'Estudante', turma: $('#tTurma').value.trim() || '____', serie: $('#tSerie').value, turno: '',
      perfis, cid: $('#pCid').value.trim() || null, documento: $('#pDoc').value.trim() || null,
      necessita_adaptacao: true, necessita_pei: true,
      profissional_apoio: $('#tApoio').value.trim() || null,
      nivel_alfabetizacao: $('#tNivel').value, nivel_suporte: $('#tSuporte').value,
      historico_clinico: $('#pHistorico').value.trim() || null,
      descricao_condicao: descr || (outra ? `${perfis.map(p => M.perfilPorId(p)?.nome).filter(Boolean).join('; ')}${perfis.length ? '. ' : ''}${outra}` : null),
      habilidades: $('#tHabilidades').value.trim() || null,
      barreiras: $('#tBarreiras').value.trim() || null,
      interesses: virgulas($('#tInteresses').value),
      gatilhos_sensoriais: virgulas($('#tGatilhos').value),
      adaptacoes_recomendadas: linhas($('#tAdaptacoes').value),
      observacoes: outra || null, ativo: true,
    };
  }

  function definirEscola() {
    M.definirEscola({ nome: $('#eNome').value.trim().toUpperCase(), inep: $('#eInep').value.trim(), endereco: $('#eEndereco').value.trim().toUpperCase() });
  }

  function validar() {
    const msg = $('#toolMsg');
    if (!$$('input[name=perfil]:checked').length) {
      msg.textContent = 'Marque pelo menos uma neurodivergência ou deficiência. Se a condição não estiver na lista, marque a mais próxima e descreva em "Outra condição ou detalhe do diagnóstico".';
      $('#tPerfis').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (modo === 'atividades' && !$('#aTema').value.trim()) { msg.textContent = 'Informe o tema ou conteúdo da aula.'; $('#aTema').focus(); return false }
    msg.textContent = ''; return true;
  }

  // ---------- atividade ----------
  function gerarAtividade(nova = false) {
    if (!validar()) return;
    definirEscola();
    if (nova || semente == null) semente = Math.floor(Math.random() * 1e9);
    const est = lerEstudante();
    atividade = M.gerarAtividadeEstruturada({
      estudante: est, componente: $('#aComp').value, area: areaAtual(), tema: $('#aTema').value.trim(),
      formato: $('#aFormato').value, motor: 'estruturado',
      habilidadeTurma: $('#aHabilidade').value.trim() || undefined,
      observacoesProfessor: $('#aObs').value.trim() || undefined,
      conceitos: linhas($('#aConceitos').value), semente,
    });
    gabaritoVisivel = true;
    renderAtividade();
  }

  function svg(html) { return `<div class="svgwrap">${html}</div>` }
  function bloco(b) {
    switch (b.tipo) {
      case 'titulo': return `<h3 class="f-titulo">${esc(b.texto)}</h3>`;
      case 'subtitulo': return `<p class="f-sub">${esc(b.texto)}</p>`;
      case 'instrucao': return `<div class="f-instr">${esc(b.texto)}</div>`;
      case 'texto': return `<p class="f-texto">${esc(b.texto)}</p>`;
      case 'texto_base': return `<div class="f-base">${b.titulo ? `<h4>${esc(b.titulo)}</h4>` : ''}<p>${esc(b.texto)}</p></div>`;
      case 'lista': return `<${b.ordenada ? 'ol' : 'ul'} class="f-lista">${b.itens.map(i => `<li>${esc(i)}</li>`).join('')}</${b.ordenada ? 'ol' : 'ul'}>`;
      case 'questoes': return `<ol class="f-questoes">${b.itens.map(q => `<li><p>${esc(q.enunciado)}</p>${q.alternativas?.length ? `<ul>${q.alternativas.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : '<div class="f-linhas"><i></i><i></i></div>'}${q.resposta ? `<p class="f-gab">Resposta: ${esc(q.resposta)}</p>` : ''}</li>`).join('')}</ol>`;
      case 'pareamento': return `<div class="f-par"><ol>${b.colunaA.map((a, i) => `<li><span class="f-num">${i + 1}</span>${esc(a)}</li>`).join('')}</ol><ol>${b.colunaB.map((x, i) => `<li><span class="f-box">${gabaritoVisivel ? '<em class="f-gabin">' + (b.gabarito[i] ?? '') + '</em>' : ''}</span>${esc(x)}</li>`).join('')}</ol></div>`;
      case 'caca_palavras': return `<div class="f-grade"><table>${b.grade.map(l => `<tr>${l.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div><div class="f-apoio"><b>Palavras para encontrar:</b> ${b.palavras.map(p => `<span>☐ ${esc(p)}</span>`).join(' ')}</div><p class="f-gab">Gabarito (linha, coluna, direção): ${b.posicoes.map(p => `${esc(p.palavra)} (${p.linha + 1},${p.coluna + 1},${p.direcao})`).join(' · ')}</p>`;
      case 'cruzadinha': return `<div class="f-grade"><table class="f-cruz">${b.grade.map(l => `<tr>${l.map(c => c.letra === null ? '<td class="vazio"></td>' : `<td>${c.numero ? `<sup>${c.numero}</sup>` : ''}<em class="f-gabin">${esc(c.letra)}</em></td>`).join('')}</tr>`).join('')}</table></div><div class="f-dicas">${['horizontal', 'vertical'].map(d => `<div><b>${d === 'horizontal' ? 'Horizontais →' : 'Verticais ↓'}</b><ul>${b.dicas.filter(x => x.direcao === d).map(x => `<li><b>${x.numero}.</b> ${esc(x.dica)} <em class="f-gabin">(${esc(x.resposta)})</em></li>`).join('')}</ul></div>`).join('')}</div>`;
      case 'cartoes': return `${b.legenda ? `<p class="f-sub">✂ ${esc(b.legenda)}</p>` : ''}<div class="f-cartoes">${b.cartoes.map(c => `<div><b>${esc(c.frente)}</b><small>${esc(c.verso)}</small></div>`).join('')}</div>`;
      case 'dominó': return `<div class="f-domino">${b.pecas.map(p => `<div><span>${esc(p.esquerda)}</span><b>${esc(p.direita)}</b></div>`).join('')}</div>`;
      case 'bingo': return `<div class="f-bingo">${b.cartelas.map((c, i) => `<div><p>Cartela ${i + 1}</p><table>${c.map(l => `<tr>${l.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table></div>`).join('')}</div><div class="f-apoio"><b>Lista de chamada (professor):</b> ${b.chamada.map(esc).join(' · ')}</div>`;
      case 'grafico': return svg(b.formato === 'pizza' ? M.svgGraficoPizza(b.titulo, b.dados) : M.svgGraficoBarras(b.titulo, b.dados));
      case 'mapa_mental': return svg(M.svgMapaMental(b.centro, b.ramos));
      case 'linha_tempo': return svg(M.svgLinhaTempo(b.marcos));
      case 'sequencia': return `<div class="f-seq">${b.embaralhadas.map((e, i) => `<div><span class="f-box"><em class="f-gabin">${b.gabarito[i]}</em></span>${esc(e)}</div>`).join('')}</div>`;
      case 'espaco_resposta': return `<div>${b.rotulo ? `<p class="f-texto"><b>${esc(b.rotulo)}</b></p>` : ''}<div class="f-linhas">${'<i></i>'.repeat(b.linhas)}</div></div>`;
      case 'quadro_desenho': return `<div><p class="f-texto"><b>${esc(b.rotulo)}</b></p><div class="f-quadro" style="height:${Math.round((b.altura ?? 200) * 0.8)}px"></div></div>`;
      case 'caixa_apoio': return `<div class="f-apoio"><b>${esc(b.titulo)}</b><ul>${b.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
      case 'gabarito': return `<div class="f-gab f-gabbox"><b>Gabarito (professor)</b><ul>${b.itens.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
      default: return '';
    }
  }

  function renderAtividade() {
    const est = lerEstudante();
    const a = atividade;
    const lista = (t, it) => it?.length ? `<h5>${t}</h5><ul>${it.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
    $('#toolOut').innerHTML = `
      <div class="out-bar">
        <button class="btn primary" data-t="atvPdf">Baixar PDF completo</button>
        <button class="btn" data-t="atvPdfAluno">PDF só do estudante</button>
        <button class="btn" data-t="atvDocx">Word (.docx)</button>
        <button class="btn ghost" data-t="atvNova">Gerar outra versão</button>
        <button class="btn ghost" data-t="atvGab" aria-pressed="true">Ocultar gabarito</button>
      </div>
      <p class="msg" id="outMsg" aria-live="polite"></p>
      <div class="folha ${gabaritoVisivel ? 'com-gab' : ''}" id="folha">
        <div class="f-cab">${esc('ESTADO DO TOCANTINS / SECRETARIA DA EDUCAÇÃO')}<br><b>${esc($('#eNome').value.trim().toUpperCase() || 'UNIDADE ESCOLAR: ______________________')}</b></div>
        <div class="f-id"><span><b>Estudante:</b> ${esc(est.nome)}</span><span><b>Turma:</b> ${esc(est.turma)}</span><span><b>Data:</b> ____/____/______</span><span><b>Duração:</b> ${esc(a.duracao_estimada)}</span></div>
        ${a.blocos.map(bloco).join('')}
      </div>
      <div class="folha folha-prof">
        <h4>Folha do professor</h4>
        <h5>Objetivo</h5><p>${esc(a.objetivo)}</p>
        <h5>Habilidade (BNCC/DCT)</h5><p>${esc(a.habilidade_bncc)}</p>
        ${lista('Materiais', a.materiais)}${lista('Orientações de aplicação', a.orientacoes_professor)}${lista('Critérios de avaliação', a.criterios_avaliacao)}${lista('Adaptações aplicadas', a.adaptacoes_aplicadas)}
        <p><b>Registro de apoio:</b> ( ) não realizou ( ) apoio total ( ) apoio parcial ( ) com autonomia</p>
      </div>
      ${blocoIA('atv')}`;
  }

  // ---------- PEI ----------
  const CAMPOS_PEI = [
    ['EQUIPE DOCENTE', [['professor_regente', 'Professor Regente'], ['equipe_colaboracao', 'Equipe de Colaboração']]],
    ['ESPECIFICIDADES DO ESTUDANTE', [['historico_clinico', 'Breve histórico clínico e familiar do estudante'], ['descricao_condicao', 'Breve descrição da condição específica do estudante'], ['habilidades_afinidades', 'Conhecimentos, habilidades e afinidades do estudante'], ['barreiras', 'Principais barreiras a serem superadas pelo estudante']]],
    ['HABILIDADES E OBJETO DO CONHECIMENTO (BNCC/DCT)', [['habilidades_turma', 'Habilidades da turma (BNCC/DCT)'], ['habilidades_adaptadas', 'Habilidades da turma (Adaptação e Flexibilização para o estudante)'], ['objeto_conhecimento', 'Objeto do Conhecimento (BNCC/DCT)'], ['objeto_conhecimento_adaptado', 'Objeto do Conhecimento (Adaptação e Flexibilização para o estudante)']]],
    ['OBJETIVOS DO PEI', [['objetivos', 'Objetivos do PEI para o estudante']]],
    ['METODOLOGIAS', [['metodologias', 'Metodologias (Recursos e Estratégias utilizadas)']]],
    ['AVALIAÇÃO', [['avaliacao', 'Avaliação (onde estava; o quanto avançou; o que precisa ser retomado)']]],
  ];

  function gerarPEI() {
    if (!validar()) return;
    definirEscola();
    const est = lerEstudante();
    peiAtual = M.construirPEI(est, {
      componente: $('#pComp').value,
      professorRegente: $('#pProf').value.trim() || '______________________________',
      periodo: $('#pPeriodo').value, periodicidade: $('#pPeriodicidade').value.trim() || 'Definida pelo Professor',
      periodoExecucao: $('#pExecucao').value.trim() || $('#pPeriodo').value,
      equipeColaboracao: $('#pEquipe').value.trim() || M.EQUIPE_COLABORACAO_PADRAO,
      habilidadesTurma: $('#pHabTurma').value.trim(), objetoConhecimento: $('#pObjeto').value.trim(),
    });
    // o SGE recebe texto simples
    for (const k of Object.keys(peiAtual)) if (typeof peiAtual[k] === 'string') peiAtual[k] = peiAtual[k].replace(/\*\*/g, '');
    renderPEI();
  }

  function renderPEI() {
    const est = lerEstudante(), p = peiAtual;
    $('#toolOut').innerHTML = `
      <div class="out-bar">
        <button class="btn primary" data-t="peiPdf">Baixar PDF</button>
        <button class="btn" data-t="peiDocx">Word (.docx)</button>
        <button class="btn ghost" data-t="peiCopiarTudo">Copiar tudo</button>
      </div>
      <p class="msg" id="outMsg" aria-live="polite"></p>
      <div class="pei-dica"><b>Como lançar no SGE:</b> os campos abaixo seguem a ordem e os nomes do formulário de PEI do SGE. Revise e ajuste o texto aqui mesmo, depois use <b>Copiar</b> em cada campo e cole no campo de mesmo nome no sistema.</div>
      <div class="pei-id"><span><b>Estudante:</b> ${esc(est.nome)}</span><span><b>Turma:</b> ${esc(p.turma)}</span><span><b>Componente:</b> ${esc(p.componente)}</span><span><b>Período:</b> ${esc(p.periodo)}</span><span><b>Periodicidade:</b> ${esc(p.periodicidade)}</span><span><b>Execução:</b> ${esc(p.periodo_execucao)}</span></div>
      ${CAMPOS_PEI.map(([sec, campos]) => `<section class="pei-sec"><h4>${sec}</h4>${campos.map(([k, rot]) => `
        <div class="pei-campo"><div class="pei-rot"><label for="pei_${k}">${esc(rot)}</label><button class="btn mini" data-copiar="${k}">Copiar</button></div>
        <textarea id="pei_${k}" data-campo="${k}" rows="3">${esc(p[k] ?? '')}</textarea></div>`).join('')}</section>`).join('')}
      ${blocoIA('pei')}`;
    $$('#toolOut textarea[data-campo]').forEach(autoAltura);
  }
  function autoAltura(t) { t.style.height = 'auto'; t.style.height = Math.min(600, t.scrollHeight + 4) + 'px' }

  // ---------- IA opcional (modo prompt) ----------
  function blocoIA(tipo) {
    return `<details class="ia"><summary>Melhorar o texto com uma IA (opcional, gratuito)</summary>
      <p>Copie o pedido pronto, cole no ChatGPT, Gemini, Claude ou outra IA que você usa, e cole a resposta aqui embaixo. O site aplica o resultado${tipo === 'pei' ? ' nos campos do PEI' : ' mantendo a formatação e os jogos'}.</p>
      <div class="out-bar"><button class="btn" data-t="${tipo}Prompt">Copiar pedido para a IA</button></div>
      <textarea id="iaResp" rows="5" placeholder="Cole aqui a resposta completa da IA"></textarea>
      <div class="out-bar"><button class="btn" data-t="${tipo}Aplicar">Aplicar resposta</button></div></details>`;
  }

  async function copiar(texto, msgEl) {
    try { await navigator.clipboard.writeText(texto); msgEl.textContent = 'Copiado.' }
    catch { msgEl.textContent = 'Não foi possível copiar automaticamente. Selecione o texto e use Ctrl+C.' }
  }

  function lerPEIEditado() {
    const p = { ...peiAtual };
    $$('#toolOut textarea[data-campo]').forEach(t => p[t.dataset.campo] = t.value);
    return p;
  }

  // ---------- eventos ----------
  async function acao(t, btn) {
    const msg = $('#outMsg');
    const est = lerEstudante();
    const id = { nome: est.nome, turma: est.turma };
    try {
      switch (t) {
        case 'atvPdf': M.baixarAtividadePdf(atividade, id, { incluirGabarito: true, incluirFolhaProfessor: true }); msg.textContent = 'PDF baixado.'; break;
        case 'atvPdfAluno': M.baixarAtividadePdf({ ...atividade, blocos: atividade.blocos.filter(b => b.tipo !== 'gabarito') }, id, { incluirGabarito: false, incluirFolhaProfessor: false }); msg.textContent = 'PDF do estudante baixado (sem gabarito e sem folha do professor).'; break;
        case 'atvDocx': await M.baixarAtividadeDocx(atividade, id, { incluirGabarito: true, incluirFolhaProfessor: true }); msg.textContent = 'Arquivo Word baixado.'; break;
        case 'atvNova': gerarAtividade(true); break;
        case 'atvGab': gabaritoVisivel = !gabaritoVisivel; $('#folha').classList.toggle('com-gab', gabaritoVisivel); btn.textContent = gabaritoVisivel ? 'Ocultar gabarito' : 'Mostrar gabarito'; btn.setAttribute('aria-pressed', gabaritoVisivel); break;
        case 'atvPrompt': await copiar(M.construirPrompt({ estudante: { ...est, nome: 'o estudante' }, componente: $('#aComp').value, area: areaAtual(), tema: $('#aTema').value.trim(), formato: $('#aFormato').value, motor: 'copiloto', habilidadeTurma: $('#aHabilidade').value.trim() || undefined, observacoesProfessor: $('#aObs').value.trim() || undefined, conceitos: linhas($('#aConceitos').value) }, { copiloto: true, hibrido: true, esqueleto: atividade }), msg); break;
        case 'atvAplicar': {
          const j = M.extrairJson($('#iaResp').value);
          if (!j || !Array.isArray(j.blocos)) { msg.textContent = 'Não encontrei uma atividade válida na resposta. Cole a resposta completa, incluindo o bloco de código JSON.'; break }
          atividade = { ...atividade, ...j }; renderAtividade(); $('#outMsg').textContent = 'Resposta da IA aplicada.'; break;
        }
        case 'peiPdf': M.baixarPeiPdf(lerPEIEditado(), id); msg.textContent = 'PDF baixado.'; break;
        case 'peiDocx': await M.baixarPeiDocx(lerPEIEditado(), id); msg.textContent = 'Arquivo Word baixado.'; break;
        case 'peiCopiarTudo': {
          const p = lerPEIEditado();
          await copiar(CAMPOS_PEI.map(([sec, cs]) => `${sec}\n` + cs.map(([k, r]) => `${r}:\n${p[k] ?? ''}`).join('\n\n')).join('\n\n'), msg); break;
        }
        case 'peiPrompt': await copiar(M.construirPromptPEI({ ...est, nome: 'o estudante' }, { componente: $('#pComp').value, turma: est.turma, periodo: $('#pPeriodo').value, habilidadeTurma: $('#pHabTurma').value.trim() || undefined, objetoConhecimento: $('#pObjeto').value.trim() || undefined }, true), msg); break;
        case 'peiAplicar': {
          const j = M.extrairJson($('#iaResp').value);
          if (!j || typeof j !== 'object') { msg.textContent = 'Não encontrei os campos do PEI na resposta. Cole a resposta completa, incluindo o bloco de código JSON.'; break }
          peiAtual = lerPEIEditado();
          for (const k of Object.keys(j)) if (k in peiAtual && typeof j[k] === 'string') peiAtual[k] = j[k].replace(/\*\*/g, '');
          renderPEI(); $('#outMsg').textContent = 'Resposta da IA aplicada nos campos do PEI.'; break;
        }
      }
    } catch (e) { console.error(e); msg.textContent = 'Algo deu errado ao gerar o arquivo. Tente de novo.' }
  }

  function trocarModo(m) {
    modo = m;
    $('#toolTitle').textContent = m === 'pei' ? 'PEI no padrão do SGE' : 'Atividades adaptadas';
    $('#toolLead').textContent = m === 'pei'
      ? 'Informe a neurodivergência e os detalhes do estudante. O site monta o Plano de Ensino Individualizado com os mesmos campos do formulário de PEI do SGE, pronto para revisar, copiar e colar.'
      : 'Informe a neurodivergência, o nível de leitura e o tema da aula. O site monta uma atividade A4 adaptada, com jogos e recursos visuais, gabarito e folha do professor.';
    $('#fsAtv').hidden = m !== 'atividades'; $('#fsPei').hidden = m !== 'pei';
    $('#btnGerar').textContent = m === 'pei' ? 'Gerar PEI' : 'Gerar atividade';
    const temSaida = m === 'pei' ? peiAtual : atividade;
    if (temSaida) (m === 'pei' ? renderPEI : renderAtividade)();
    else $('#toolOut').innerHTML = `<div class="out-vazio"><b>${m === 'pei' ? 'O PEI aparece aqui.' : 'A atividade aparece aqui.'}</b><p>${m === 'pei' ? 'Preencha o estudante e o componente e clique em Gerar PEI. Você poderá editar cada campo antes de copiar para o SGE ou baixar em PDF e Word.' : 'Preencha o estudante e a aula e clique em Gerar atividade. Você verá a folha pronta, com opção de baixar em PDF ou Word, e pode gerar outras versões.'}</p></div>`;
  }

  // ---------- listas do DCT-TO (Ciências Humanas) ----------
  let DCT = null, carregandoDCT = null;
  const SIGLA = { 'Filosofia': 'FIL', 'Sociologia': 'SOC', 'História': 'HIS', 'Geografia': 'GEO' };
  function carregarDCT() {
    if (DCT) return Promise.resolve(DCT);
    return carregandoDCT ||= fetch('dct-chsa.json?v=1').then(r => { if (!r.ok) throw new Error(); return r.json() }).then(j => (DCT = j)).catch(() => { carregandoDCT = null; return null });
  }
  const curto = (t, n = 110) => t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t;
  function itensObjeto(o) {
    const partes = o.split(/;\s*/).map(x => x.trim().replace(/\.$/, '')).filter(x => x.length > 2);
    return partes.length > 1 ? partes : o.split(/\.\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).map(x => x.trim().replace(/\.$/, '')).filter(x => x.length > 2);
  }
  async function atualizarListasDCT() {
    const sig = SIGLA[$('#pComp').value];
    const hab = $('#pHabLista'), obj = $('#pObjLista');
    if (!sig) {
      hab.innerHTML = '<option value="">Lista disponível só para Filosofia, Sociologia, História e Geografia</option>'; hab.disabled = true;
      obj.innerHTML = '<option value="">—</option>'; obj.disabled = true; return;
    }
    const d = await carregarDCT();
    if (!d) { hab.innerHTML = '<option value="">Não foi possível carregar a lista. Escreva a habilidade abaixo.</option>'; hab.disabled = true; return }
    const ents = d.entradas.filter(e => e.k === sig);
    hab.disabled = false;
    hab.innerHTML = '<option value="">Escolha na lista do DCT-TO…</option>' + ents.map((e, i) =>
      `<option value="${i}">${esc(e.c)} — ${esc(curto(d.bncc[e.c] || e.d))}</option>`).join('');
    hab._ents = ents;
    obj.disabled = true; obj.innerHTML = '<option value="">Escolha primeiro a habilidade</option>';
  }
  function anexar(el, texto) {
    const atual = el.value.trim();
    if (atual.includes(texto)) return;
    el.value = atual ? atual + '\n' + texto : texto;
    el.dispatchEvent(new Event('input'));
  }
  function escolherHabilidade() {
    const hab = $('#pHabLista'), obj = $('#pObjLista');
    const e = hab._ents && hab._ents[hab.value];
    if (!e) return;
    const comp = $('#pComp').value;
    anexar($('#pHabTurma'), `(${e.c}) ${DCT.bncc[e.c] || ''}${e.d ? ` DCT-TO (${comp}): ${e.d}` : ''}`.trim());
    const itens = e.o ? itensObjeto(e.o) : [e.d];
    obj.disabled = false;
    obj.innerHTML = `<option value="">Escolha o objeto do conhecimento (${esc(e.c)})…</option>` +
      (itens.length > 1 ? `<option value="__todos">Todos os objetos desta habilidade</option>` : '') +
      itens.map((t, i) => `<option value="${i}">${esc(curto(t, 120))}</option>`).join('');
    obj._itens = itens; obj._todos = e.o || e.d;
    hab.value = '';
  }
  function escolherObjeto() {
    const obj = $('#pObjLista');
    if (obj.value === '') return;
    anexar($('#pObjeto'), obj.value === '__todos' ? obj._todos : obj._itens[obj.value]);
    obj.value = '';
  }

  let iniciado = false;
  window.Ferramentas = {
    async abrir(m) {
      $('#toolsLoading').hidden = false;
      try { M = await carregarMotor() } catch { $('#toolsLoading').textContent = 'Não foi possível carregar o gerador. Verifique a conexão e recarregue a página.'; return }
      $('#toolsLoading').hidden = true; $('#toolForm').hidden = false;
      if (!iniciado) {
        iniciado = true; montarFormulario();
        $('#tNivel').addEventListener('change', () => { atualizarNivel(); atualizarFormatos() });
        $('#aComp').addEventListener('change', () => { atualizarFormatos(); atualizarTemaInfo() });
        $('#aFormato').addEventListener('change', atualizarFormatoDesc);
        $('#aTema').addEventListener('input', atualizarTemaInfo);
        $('#pComp').addEventListener('change', atualizarListasDCT);
        $('#pHabLista').addEventListener('change', escolherHabilidade);
        $('#pObjLista').addEventListener('change', escolherObjeto);
        atualizarListasDCT();
        $('#toolForm').addEventListener('submit', e => { e.preventDefault(); modo === 'pei' ? gerarPEI() : gerarAtividade(true) });
        $('#toolOut').addEventListener('click', e => {
          const b = e.target.closest('button'); if (!b) return;
          if (b.dataset.t) acao(b.dataset.t, b);
          if (b.dataset.copiar) copiar($('#pei_' + b.dataset.copiar).value, $('#outMsg'));
        });
        $('#toolOut').addEventListener('input', e => { if (e.target.matches('textarea[data-campo]')) autoAltura(e.target) });
      }
      trocarModo(m);
    },
  };
})();
