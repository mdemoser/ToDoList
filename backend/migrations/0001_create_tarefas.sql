CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_inicio TEXT,
    dias INTEGER NOT NULL DEFAULT 1,
    data_termino TEXT,
    criada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
