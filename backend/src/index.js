function responder(dados, status = 200) {
    return Response.json(dados, {
        status,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        }
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const caminho = url.pathname;
        const metodo = request.method;

        // Permitir requisições OPTIONS do navegador
        if (metodo === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                }
            });
        }

        try {
            // LISTAR TAREFAS
            if (caminho === "/api/tarefas" && metodo === "GET") {
                const resultado = await env.DB
                    .prepare("SELECT * FROM tarefas ORDER BY id DESC")
                    .all();

                return responder(resultado.results);
            }

            // CRIAR TAREFA
            if (caminho === "/api/tarefas" && metodo === "POST") {
                const dados = await request.json();

                if (!dados.titulo || !dados.titulo.trim()) {
                    return responder(
                        { erro: "O título é obrigatório." },
                        400
                    );
                }

                const resultado = await env.DB
                    .prepare(`
                        INSERT INTO tarefas
                        (titulo, descricao, data_inicio, dias, data_termino)
                        VALUES (?, ?, ?, ?, ?)
                    `)
                    .bind(
                        dados.titulo.trim(),
                        dados.descricao || "",
                        dados.data_inicio || null,
                        Math.max(1, Number.parseInt(dados.dias, 10) || 1),
                        dados.data_termino || null
                    )
                    .run();

                return responder(
                    {
                        mensagem: "Tarefa criada com sucesso.",
                        id: resultado.meta.last_row_id
                    },
                    201
                );
            }

            // IDENTIFICAR TAREFA PARA EDITAR OU EXCLUIR
            const correspondencia = caminho.match(/^\/api\/tarefas\/(\d+)$/);

            if (correspondencia) {
                const id = Number(correspondencia[1]);

                // ATUALIZAR TAREFA
                if (metodo === "PUT") {
                    const dados = await request.json();

                    if (!dados.titulo || !dados.titulo.trim()) {
                        return responder(
                            { erro: "O título é obrigatório." },
                            400
                        );
                    }

                    const resultado = await env.DB
                        .prepare(`
                            UPDATE tarefas
                            SET titulo = ?,
                                descricao = ?,
                                data_inicio = ?,
                                dias = ?,
                                data_termino = ?
                            WHERE id = ?
                        `)
                        .bind(
                            dados.titulo.trim(),
                            dados.descricao || "",
                            dados.data_inicio || null,
                            Math.max(1, Number.parseInt(dados.dias, 10) || 1),
                            dados.data_termino || null,
                            id
                        )
                        .run();

                    if (resultado.meta.changes === 0) {
                        return responder(
                            { erro: "Tarefa não encontrada." },
                            404
                        );
                    }

                    return responder({
                        mensagem: "Tarefa atualizada com sucesso."
                    });
                }

                // EXCLUIR TAREFA
                if (metodo === "DELETE") {
                    const resultado = await env.DB
                        .prepare("DELETE FROM tarefas WHERE id = ?")
                        .bind(id)
                        .run();

                    if (resultado.meta.changes === 0) {
                        return responder(
                            { erro: "Tarefa não encontrada." },
                            404
                        );
                    }

                    return responder({
                        mensagem: "Tarefa excluída com sucesso."
                    });
                }
            }

            return responder({ erro: "Rota não encontrada." }, 404);

        } catch (erro) {
            console.error("Erro na API:", erro);

            return responder(
                { erro: "Erro interno ao processar a solicitação." },
                500
            );
        }
    }
};

