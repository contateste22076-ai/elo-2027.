// ELO 2027 — integração online com Supabase
(() => {
  "use strict";

  const URL_DB = "https://gcvrbqemytdwdhuyawkm.supabase.co";
  const KEY = "sb_publishable_dxvP_l8-1J7OmjbtkhsFaQ_VJtcwD1Z";
  const $ = id => document.getElementById(id);
  const db = window.supabase.createClient(URL_DB, KEY);

  const form = $("student-form");
  const formPanel = $("form-panel");
  const adminPanel = $("admin-panel");
  const login = $("login-form");
  const dashboard = $("dashboard");
  let respostas = [];

  $("admin-open").addEventListener("click", () => {
    formPanel.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    login.classList.remove("hidden");
    dashboard.classList.add("hidden");
  });

  $("back-form").addEventListener("click", () => {
    adminPanel.classList.add("hidden");
    formPanel.classList.remove("hidden");
    $("login-status").textContent = "";
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const botao = $("submit-btn");
    const nomeDigitado = $("name").value.trim();
    const turmaDigitada = $("classroom").value.trim();
    const categoria = $("category").value;
    const ideia = $("idea").value.trim();
    const extra = $("extra").value.trim();

    // O banco atual tem uma coluna "suggestion"; os campos novos são organizados nela.
    const resposta = {
      student_name: nomeDigitado || `Anônimo (${Date.now()})`,
      class_name: turmaDigitada || "Não informada",
      suggestion: `Categoria: ${categoria}\n\nSugestão: ${ideia}${extra ? `\n\nInformação adicional: ${extra}` : ""}`
    };

    botao.disabled = true;
    botao.textContent = "Enviando...";
    $("form-status").textContent = "";

    try {
      const { error } = await db.from("elo_responses").insert([resposta]);
      if (error) {
        console.error(error);
        $("form-status").textContent =
          error.code === "23505"
            ? "Já existe uma resposta com esse nome e turma. Confira os dados ou envie sem nome."
            : "Não foi possível enviar. Tente novamente.";
        return;
      }
      form.reset();
      $("form-status").textContent = "Sugestão enviada com sucesso! Obrigado por participar do ELO 2027.";
    } catch (erro) {
      console.error(erro);
      $("form-status").textContent = "Erro de conexão. Verifique a internet e tente novamente.";
    } finally {
      botao.disabled = false;
      botao.textContent = "Enviar sugestão";
    }
  });

  login.addEventListener("submit", async e => {
    e.preventDefault();
    const botao = login.querySelector('button[type="submit"]');
    botao.disabled = true;
    $("login-status").textContent = "";
    try {
      const { error } = await db.auth.signInWithPassword({
        email: $("admin-email").value.trim(),
        password: $("admin-password").value
      });
      if (error) {
        $("login-status").textContent = "E-mail ou senha inválidos.";
        return;
      }
      login.classList.add("hidden");
      dashboard.classList.remove("hidden");
      await carregarRespostas();
    } catch (erro) {
      console.error(erro);
      $("login-status").textContent = "Erro ao entrar. Tente novamente.";
    } finally {
      botao.disabled = false;
    }
  });

  async function carregarRespostas() {
    const tabela = $("responses");
    tabela.innerHTML = "<tr><td colspan='4'>Carregando...</td></tr>";
    const { data, error } = await db
      .from("elo_responses")
      .select("student_name,class_name,suggestion,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      tabela.innerHTML = "<tr><td colspan='4'>Erro ao carregar. Confira as permissões da tabela no Supabase.</td></tr>";
      return;
    }

    respostas = data || [];
    $("total-count").textContent = respostas.length;
    tabela.replaceChildren();

    if (!respostas.length) {
      tabela.innerHTML = "<tr><td colspan='4'>Nenhuma resposta recebida ainda.</td></tr>";
      return;
    }

    respostas.forEach(r => {
      const tr = document.createElement("tr");
      [
        r.student_name,
        r.class_name,
        new Date(r.created_at).toLocaleString("pt-BR"),
        r.suggestion
      ].forEach(valor => {
        const td = document.createElement("td");
        td.textContent = valor || "";
        tr.appendChild(td);
      });
      tabela.appendChild(tr);
    });
    criarBotaoCSV();
  }

  function criarBotaoCSV() {
    if ($("export-csv")) return;
    const botao = document.createElement("button");
    botao.id = "export-csv";
    botao.type = "button";
    botao.textContent = "Exportar respostas CSV";
    dashboard.insertBefore(botao, dashboard.querySelector("table"));
    botao.addEventListener("click", () => {
      if (!respostas.length) return;
      const linhas = [
        ["Aluno", "Turma", "Data", "Sugestão"],
        ...respostas.map(r => [
          r.student_name, r.class_name,
          new Date(r.created_at).toLocaleString("pt-BR"), r.suggestion
        ])
      ];
      const csv = "\uFEFF" + linhas.map(linha =>
        linha.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")
      ).join("\r\n");
      const arquivo = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = "respostas-elo-2027.csv";
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  $("logout").addEventListener("click", async () => {
    await db.auth.signOut();
    dashboard.classList.add("hidden");
    login.classList.remove("hidden");
    login.reset();
  });

  db.auth.getSession().then(async ({ data, error }) => {
    if (!error && data.session) {
      formPanel.classList.add("hidden");
      adminPanel.classList.remove("hidden");
      login.classList.add("hidden");
      dashboard.classList.remove("hidden");
      await carregarRespostas();
    }
  });
})();