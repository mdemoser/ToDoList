// =====================================================
// CAMADA DE DADOS (a única parte que vai mudar no Supabase)
// Por enquanto: lista em memória + localStorage só pra
// não perder as tarefas ao recarregar a página.
// =====================================================
const CHAVE = 'tarefas';

function ler() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE)) || [];
    } catch {
        return [];
    }
}

function gravar(lista) {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
}

async function listarTarefas() {
    return ler();
}

async function criarTarefa(dados) {
    const lista = ler();
    lista.push({ id: Date.now(), criada_em: new Date().toISOString(), ...dados });
    gravar(lista);
}

async function atualizarTarefa(id, dados) {
    gravar(ler().map(t => (t.id === id ? { ...t, ...dados } : t)));
}

async function removerTarefa(id) {
    gravar(ler().filter(t => t.id !== id));
}

// =====================================================
// ELEMENTOS DO DOM
// =====================================================
const formTarefa = document.querySelector('#form-tarefa');
const inputTarefa = document.querySelector('#input-tarefa');
const formEdicao = document.querySelector('#form-edicao');
const listaTarefas = document.querySelector('#lista-tarefas');
const tituloEdicao = document.querySelector('#titulo-edicao');
const btnCancelar = document.querySelector('#btn-cancelar');
const btnSalvar = document.querySelector('#btn-salvar');
const inputDescricao = document.querySelector('#descricao');
const inputDataInicio = document.querySelector('#data-inicio');
const inputDias = document.querySelector('#dias');
const spanTermino = document.querySelector('#data-termino');
const checkUsarHoje = document.querySelector('#usar-hoje');

let tarefaEmEdicaoId = null;

// =====================================================
// HELPERS
// =====================================================
function isoParaBR(iso) {
    return iso ? iso.split('-').reverse().join('/') : '';
}

function dataParaISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function limparFormulario() {
    formEdicao.classList.add('hidden');
    formEdicao.reset();
    spanTermino.textContent = '---';
    delete spanTermino.dataset.iso;
    inputTarefa.value = '';
    tarefaEmEdicaoId = null;
}

// =====================================================
// RENDERIZAÇÃO
// =====================================================
async function carregarTarefas() {
    try {
        listaTarefas.innerHTML = '';
        const tarefas = await listarTarefas();

        tarefas.forEach((tarefa) => {
            const novoItem = document.createElement('li');
            novoItem.setAttribute('data-id', tarefa.id);

            const texto = document.createElement('div');
            const titulo = document.createElement('strong');
            const datas = document.createElement('p');
            datas.classList.add('tarefas-datas');

            titulo.textContent = tarefa.titulo;
            datas.textContent = 'Início: ' + isoParaBR(tarefa.data_inicio) +
                                ' | Término: ' + isoParaBR(tarefa.data_termino);

            texto.appendChild(titulo);
            texto.appendChild(datas);
            novoItem.appendChild(texto);

            const divBotoes = document.createElement('div');
            divBotoes.classList.add('botoes-acao');

            // Botão Editar
            const btnEditar = document.createElement('button');
            btnEditar.textContent = 'Editar';
            btnEditar.classList.add('btn-editar');
            btnEditar.addEventListener('click', function () {
                tarefaEmEdicaoId = tarefa.id;

                tituloEdicao.textContent = tarefa.titulo;
                inputDescricao.value = tarefa.descricao || '';
                inputDataInicio.value = tarefa.data_inicio || '';
                inputDias.value = tarefa.dias || 1;
                spanTermino.textContent = isoParaBR(tarefa.data_termino) || '---';
                if (tarefa.data_termino) {
                    spanTermino.dataset.iso = tarefa.data_termino;
                } else {
                    delete spanTermino.dataset.iso;
                }

                formEdicao.classList.remove('hidden');
            });

            // Botão Deletar
            const btnDeletar = document.createElement('button');
            btnDeletar.textContent = 'Deletar';
            btnDeletar.classList.add('btn-deletar');
            btnDeletar.addEventListener('click', async function () {
                await removerTarefa(tarefa.id);
                novoItem.remove();
            });

            divBotoes.appendChild(btnEditar);
            divBotoes.appendChild(btnDeletar);
            novoItem.appendChild(divBotoes);

            listaTarefas.appendChild(novoItem);
        });
    } catch (erro) {
        console.error('Erro ao carregar tarefas:', erro);
    }
}

carregarTarefas();

// =====================================================
// EVENTOS
// =====================================================

// Iniciar criação de tarefa
formTarefa.addEventListener('submit', function (evento) {
    evento.preventDefault();

    tarefaEmEdicaoId = null;
    formEdicao.reset();
    spanTermino.textContent = '---';
    delete spanTermino.dataset.iso;

    tituloEdicao.textContent = inputTarefa.value;
    formEdicao.classList.remove('hidden');
});

// Cancelar
btnCancelar.addEventListener('click', limparFormulario);

// Salvar (cria ou atualiza)
btnSalvar.addEventListener('click', async function () {
    const dadosTarefa = {
        titulo: tituloEdicao.textContent,
        descricao: inputDescricao.value,
        data_inicio: inputDataInicio.value || null,
        dias: parseInt(inputDias.value) || 1,
        data_termino: spanTermino.dataset.iso || null,
    };

    try {
        if (tarefaEmEdicaoId !== null) {
            await atualizarTarefa(tarefaEmEdicaoId, dadosTarefa);
        } else {
            await criarTarefa(dadosTarefa);
        }

        await carregarTarefas();
        limparFormulario();
    } catch (erro) {
        console.error('Erro ao salvar:', erro);
        alert('Erro ao salvar: ' + erro.message);
    }
});

// =====================================================
// CONTROLE DE DATAS
// =====================================================
checkUsarHoje.addEventListener('change', function () {
    inputDataInicio.value = checkUsarHoje.checked ? dataParaISO(new Date()) : '';
    calcularTermino();
});

function calcularTermino() {
    if (!inputDataInicio.value) {
        spanTermino.textContent = '---';
        delete spanTermino.dataset.iso;
        return;
    }

    const [ano, mes, dia] = inputDataInicio.value.split('-');
    const termino = new Date(ano, mes - 1, dia);
    termino.setDate(termino.getDate() + (parseInt(inputDias.value) || 1));

    // ISO fica guardado pro "banco"; pt-BR aparece na tela
    spanTermino.dataset.iso = dataParaISO(termino);
    spanTermino.textContent = termino.toLocaleDateString('pt-BR');
}

inputDataInicio.addEventListener('change', calcularTermino);
inputDias.addEventListener('input', calcularTermino);