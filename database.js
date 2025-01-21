const sqlite3 = require("sqlite3").verbose();

// Inicializa o banco de dados
const db = new sqlite3.Database("gastos.db", (err) => {
    if (err) {
        console.error("Erro ao abrir o banco de dados:", err.message);
    } else {
        console.log("Banco de dados conectado com sucesso!");
    }
});

// Cria a tabela `gastos` se não existir
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL, -- Formato esperado: YYYY-MM
            descricao TEXT NOT NULL,
            valor REAL NOT NULL,
            tipo TEXT CHECK(tipo IN ('entrada', 'saida')) NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error("Erro ao criar a tabela:", err.message);
        } else {
            console.log("Tabela `gastos` criada/verificada com sucesso.");
        }
    });
});

module.exports = db;
