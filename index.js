const express = require("express");
const bodyParser = require("body-parser");
const db = require("./database");

const app = express();
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Página inicial
app.get("/", (req, res) => {
    const { periodo } = req.query;

    let query = "SELECT * FROM gastos";
    const params = [];

    if (periodo && periodo !== "todos") {
        query += " WHERE data = ?";
        params.push(periodo);
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error("Erro ao executar consulta:", err.message);
            return res.status(500).send("Erro no banco de dados.");
        }

        // Estatísticas por período
        const estatisticas = {};
        rows.forEach((gasto) => {
            if (!estatisticas[gasto.data]) {
                estatisticas[gasto.data] = { entrada: 0, saida: 0 };
            }
            if (gasto.tipo === "entrada") {
                estatisticas[gasto.data].entrada += gasto.valor;
            } else {
                estatisticas[gasto.data].saida += gasto.valor;
            }
        });

        const totalEntradas = rows
            .filter(g => g.tipo === "entrada")
            .reduce((sum, g) => sum + g.valor, 0);
        const totalSaidas = rows
            .filter(g => g.tipo === "saida")
            .reduce((sum, g) => sum + g.valor, 0);
        const saldo = totalEntradas - totalSaidas;

        // Obter todos os períodos disponíveis
        db.all("SELECT DISTINCT data FROM gastos ORDER BY data", [], (err, periodos) => {
            if (err) {
                console.error("Erro ao recuperar períodos:", err.message);
                return res.status(500).send("Erro ao recuperar períodos.");
            }
        
            res.render("index", {
                gastos: rows,
                totalEntradas,
                totalSaidas,
                saldo,
                estatisticas,
                periodos: periodos.map(p => p.data), // Envia os períodos válidos
                periodoSelecionado: periodo || "todos"
            });
        });
    });
});

// Adicionar nova despesa
app.post("/adicionar", (req, res) => {
    const { data, descricao, valor, tipo } = req.body;

    if (!data || !descricao || !valor || !tipo) {
        return res.status(400).send("Todos os campos são obrigatórios!");
    }

    db.run(
        "INSERT INTO gastos (data, descricao, valor, tipo) VALUES (?, ?, ?, ?)",
        [data, descricao, parseFloat(valor), tipo],
        (err) => {
            if (err) {
                console.error("Erro ao inserir no banco de dados:", err);
                return res.status(500).send("Erro ao adicionar despesa.");
            }
            res.redirect("/");
        }
    );
});

app.post("/deletar/:id", (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM gastos WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).send("Erro ao deletar registro.");
        res.redirect("/");
    });
});

app.post("/deletar-periodo", (req, res) => {
    const { periodo } = req.body;

    if (!periodo) {
        return res.status(400).send("Período é obrigatório!");
    }

    db.run("DELETE FROM gastos WHERE data = ?", [periodo], function (err) {
        if (err) {
            console.error("Erro ao deletar período:", err.message);
            return res.status(500).send("Erro ao deletar o período.");
        }

        console.log(`Período ${periodo} deletado com sucesso.`);
        res.redirect("/"); // Redireciona para a página principal após a deleção
    });
});

app.post("/copiar", (req, res) => {
    const { origem, destino } = req.body;

    if (!origem || !destino) {
        return res.status(400).send("Períodos de origem e destino são obrigatórios!");
    }

    // Selecionar os gastos do período de origem
    db.all("SELECT descricao, valor, tipo FROM gastos WHERE data = ?", [origem], (err, rows) => {
        if (err) {
            console.error("Erro ao copiar os gastos:", err.message);
            return res.status(500).send("Erro ao copiar os gastos.");
        }

        if (rows.length === 0) {
            return res.status(400).send("Nenhum gasto encontrado no período de origem.");
        }

        // Inserir os gastos no período de destino
        const insertQuery = "INSERT INTO gastos (data, descricao, valor, tipo) VALUES (?, ?, ?, ?)";
        const insertPromises = rows.map(gasto =>
            new Promise((resolve, reject) => {
                db.run(insertQuery, [destino, gasto.descricao, gasto.valor, gasto.tipo], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            })
        );

        Promise.all(insertPromises)
            .then(() => {
                console.log(`Gastos do período ${origem} copiados para ${destino}`);
                res.redirect("/");
            })
            .catch(err => {
                console.error("Erro ao copiar os gastos:", err.message);
                res.status(500).send("Erro ao copiar os gastos.");
            });
    });
});

// Iniciar o servidor
app.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
