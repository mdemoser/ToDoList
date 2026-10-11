// =====================================================
// CAMADA DE DADOS — API CLOUDFLARE WORKERS + D1
// =====================================================

const API_URL = 'https://todo-list-api.mdemoser.workers.dev';

async function requisicaoAPI(caminho, opcoes = {}) {
    const resposta = await fetch(`${API_URL}${caminho}`, {
        ...opcoes,
        headers: {
            'Content-Type': 'application/json',
            ...opcoes.headers
        }
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
        throw new Error(
            resultado.erro || `Erro HTTP ${resposta.status}`
        );
    }

    return resultado;
}

async function listarTarefas() {
    return requisicaoAPI('/api/tarefas');
}

async function criarTarefa(dados) {
    return requisicaoAPI('/api/tarefas', {
        method: 'POST',
        body: JSON.stringify(dados)
    });
}

async function atualizarTarefa(id, dados) {
    return requisicaoAPI(`/api/tarefas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dados)
    });
}

async function removerTarefa(id) {
    return requisicaoAPI(`/api/tarefas/${id}`, {
        method: 'DELETE'
    });
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
// RENDERIZAÇÃO DAS TAREFAS
// =====================================================

async function carregarTarefas() {
    try {
        const tarefas = await listarTarefas();

        listaTarefas.innerHTML = '';

        tarefas.forEach((tarefa) => {
            const novoItem = document.createElement('li');
            novoItem.setAttribute('data-id', tarefa.id);

            const texto = document.createElement('div');
            const titulo = document.createElement('strong');
            const datas = document.createElement('p');

            datas.classList.add('tarefas-datas');

            titulo.textContent = tarefa.titulo;

            datas.textContent =
                'Início: ' + isoParaBR(tarefa.data_inicio) +
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

                spanTermino.textContent =
                    isoParaBR(tarefa.data_termino) || '---';

                if (tarefa.data_termino) {
                    spanTermino.dataset.iso = tarefa.data_termino;
                } else {
                    delete spanTermino.dataset.iso;
                }

                checkUsarHoje.checked = false;
                formEdicao.classList.remove('hidden');
            });

            // Botão Excluir
            const btnDeletar = document.createElement('button');

            btnDeletar.textContent = 'Deletar';
            btnDeletar.classList.add('btn-deletar');

            btnDeletar.addEventListener('click', async function () {
                try {
                    await removerTarefa(tarefa.id);
                    novoItem.remove();
                } catch (erro) {
                    console.error('Erro ao excluir tarefa:', erro);
                    alert('Não foi possível excluir: ' + erro.message);
                }
            });

            divBotoes.appendChild(btnEditar);
            divBotoes.appendChild(btnDeletar);
            novoItem.appendChild(divBotoes);

            listaTarefas.appendChild(novoItem);
        });
    } catch (erro) {
        console.error('Erro ao carregar tarefas:', erro);

        listaTarefas.innerHTML = '';

        const itemErro = document.createElement('li');
        itemErro.textContent =
            'Não foi possível carregar as tarefas. Verifique a conexão com a API.';

        listaTarefas.appendChild(itemErro);
    }
}

// Carrega as tarefas quando a página é aberta
carregarTarefas();

// =====================================================
// EVENTOS
// =====================================================

// Iniciar criação de tarefa
formTarefa.addEventListener('submit', function (evento) {
    evento.preventDefault();

    if (!inputTarefa.value.trim()) {
        alert('Digite um título para a tarefa.');
        return;
    }

    tarefaEmEdicaoId = null;

    formEdicao.reset();

    spanTermino.textContent = '---';
    delete spanTermino.dataset.iso;

    tituloEdicao.textContent = inputTarefa.value.trim();

    checkUsarHoje.checked = false;

    formEdicao.classList.remove('hidden');
});

// Cancelar
btnCancelar.addEventListener('click', limparFormulario);

// Salvar: cria ou atualiza
btnSalvar.addEventListener('click', async function (evento) {
    evento.preventDefault();

    const titulo = tituloEdicao.textContent.trim();

    if (!titulo) {
        alert('O título da tarefa é obrigatório.');
        return;
    }

    const dadosTarefa = {
        titulo: titulo,
        descricao: inputDescricao.value,
        data_inicio: inputDataInicio.value || null,
        dias: parseInt(inputDias.value, 10) || 1,
        data_termino: spanTermino.dataset.iso || null
    };

    try {
        btnSalvar.disabled = true;

        if (tarefaEmEdicaoId !== null) {
            await atualizarTarefa(tarefaEmEdicaoId, dadosTarefa);
        } else {
            await criarTarefa(dadosTarefa);
        }

        await carregarTarefas();
        limparFormulario();
    } catch (erro) {
        console.error('Erro ao salvar:', erro);
        alert('Erro ao salvar a tarefa: ' + erro.message);
    } finally {
        btnSalvar.disabled = false;
    }
});

// =====================================================
// CONTROLE DE DATAS
// =====================================================

checkUsarHoje.addEventListener('change', function () {
    inputDataInicio.value = checkUsarHoje.checked
        ? dataParaISO(new Date())
        : '';

    calcularTermino();
});

function calcularTermino() {
    if (!inputDataInicio.value) {
        spanTermino.textContent = '---';
        delete spanTermino.dataset.iso;
        return;
    }

    const [ano, mes, dia] = inputDataInicio.value.split('-');

    const termino = new Date(
        Number(ano),
        Number(mes) - 1,
        Number(dia)
    );

    termino.setDate(
        termino.getDate() + (parseInt(inputDias.value, 10) || 1)
    );

    spanTermino.dataset.iso = dataParaISO(termino);
    spanTermino.textContent = termino.toLocaleDateString('pt-BR');
}

inputDataInicio.addEventListener('change', calcularTermino);
inputDias.addEventListener('input', calcularTermino);
