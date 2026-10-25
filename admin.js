const SUPABASE_URL = "https://dpmzewokoxoslotijjis.supabase.co";

const SUPABASE_KEY = "sb_publishable_r4gsCdKoKzs3U3_89IBOPQ_nCI0lNR0"

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Supabase conectado:", supabaseClient);

async function obterClienteLogado() {

    const { data: { user }, error: erroUsuario } =
        await supabaseClient.auth.getUser();

    if (erroUsuario || !user) {
        console.error("Usuário não encontrado:", erroUsuario);
        return null;
    }

    const { data: cliente, error: erroCliente } =
        await supabaseClient
            .from("clientes")
            .select("id, nome")
            .eq("usuario_id", user.id)
            .single();

    if (erroCliente) {
        console.error("Cliente não encontrado:", erroCliente);
        return null;
    }

    const usuarioLogado = document.getElementById("usuarioLogado");

if (usuarioLogado && cliente) {
   usuarioLogado.innerHTML = `Olá, <span>${cliente.nome}</span>`;
}
    return cliente;
}

function definirDataAtual() {

    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    const dataAtual = `${ano}-${mes}-${dia}`;

    document.getElementById("filtroDataHorarios").value = dataAtual;
    document.getElementById("filtroDataReservas").value = dataAtual;
}

definirDataAtual();

async function verificarSessao() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        // Já está logada
        document.querySelector(".login-container").style.display = "none";
        document.getElementById("painelAdmin").style.display = "block";

       carregarHorarios();
       carregarReservas();
       carregarDashboard();
    } else {
        // Não está logada
        document.querySelector(".login-container").style.display = "flex";
        document.getElementById("painelAdmin").style.display = "none";
    }
}

verificarSessao();

const formLogin = document.getElementById("formLogin");
const mensagemLogin = document.getElementById("mensagemLogin");

formLogin.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    mensagemLogin.textContent = "Entrando...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        console.error(error);
        mensagemLogin.textContent = "E-mail ou senha incorretos.";
        return;
    }

    // Esconde a tela de login
document.querySelector(".login-container").style.display = "none";

// Mostra o painel administrativo
document.getElementById("painelAdmin").style.display = "block";

carregarHorarios();
carregarReservas();
carregarDashboard();
});

const btnCadastrarHorarios = document.getElementById("btnCadastrarHorarios");

if (btnCadastrarHorarios) {
    btnCadastrarHorarios.addEventListener("click", async () => {
        const dataSelecionadaTexto =
            document.getElementById("dataSelecionadaTexto");

        if (!dataSelecionadaTexto) {
            alert("Não foi possível identificar a data selecionada.");
            return;
        }

        // A data real precisa ser armazenada no formato AAAA-MM-DD.
        const dataHorario = window.dataHorarioSelecionado;

        const horariosSelecionados = Array.from(
            document.querySelectorAll(".horario-selecao.ativo")
        ).map(botao => botao.textContent.trim());

        if (!dataHorario) {
            alert("Selecione uma data no calendário.");
            return;
        }

        if (horariosSelecionados.length === 0) {
            alert("Selecione pelo menos um horário.");
            return;
        }

        const cliente = await obterClienteLogado();

        if (!cliente) {
            alert("Não foi possível identificar o cliente.");
            return;
        }

        const registros = horariosSelecionados.map(horario => ({
            data: dataHorario,
            horario: horario,
            cliente_id: cliente.id
        }));

        const { error } = await supabaseClient
            .from("horarios")
            .insert(registros);

        if (error) {
            console.error("Erro ao cadastrar horários:", error);
            alert("Erro ao cadastrar horários. Verifique o console.");
            return;
        }

        alert("Horários cadastrados com sucesso!");

        document.querySelectorAll(".horario-selecao.ativo")
            .forEach(botao => botao.classList.remove("ativo"));

        atualizarQuantidadeHorarios();

        carregarHorarios();
        carregarDashboard();
    });
}

async function carregarHorarios() {

    const listaHorarios = document.getElementById("listaHorarios");
    const filtroData = document.getElementById("filtroDataHorarios");

    const dataSelecionada = filtroData.value;

    // Descobre qual cliente está logado
    const cliente = await obterClienteLogado();

    if (!cliente) {
        listaHorarios.innerHTML = "<p>Cliente não identificado.</p>";
        return;
    }

    // Busca somente os horários deste cliente
    let consulta = supabaseClient
        .from("horarios")
        .select("*")
        .eq("cliente_id", cliente.id);
    // Se uma data foi escolhida, busca somente os horários daquele dia
    if (dataSelecionada) {
        consulta = consulta.eq("data", dataSelecionada);
    }

    const { data, error } = await consulta
        .order("data", { ascending: true })
        .order("horario", { ascending: true });

        const filtroDataHorarios =
    document.getElementById("filtroDataHorarios");

filtroDataHorarios.addEventListener("change", () => {
    carregarHorarios();
});

    if (error) {
        console.error("Erro ao carregar horários:", error);
        listaHorarios.innerHTML = "<p>Erro ao carregar horários.</p>";
        return;
    }

    if (data.length === 0) {
        listaHorarios.innerHTML = "<p>Nenhum horário cadastrado.</p>";
        return;
    }

    listaHorarios.innerHTML = "";

    data.forEach((item) => {
    const dataFormatada = item.data.split("-").reverse().join("/");
    const horarioFormatado = item.horario.substring(0, 5);

    listaHorarios.innerHTML += `
        <div class="horario-item">
            <span>${dataFormatada} - ${horarioFormatado}</span>

            <button
                type="button"
                class="btn-excluir"
                onclick="excluirHorario(${item.id})"
            >
                Excluir
            </button>
        </div>
    `;
});
}

async function carregarReservas() {

    const listaReservas = document.getElementById("listaReservas");

    listaReservas.innerHTML = "<p>Carregando reservas...</p>";
const filtroDataReservas =
    document.getElementById("filtroDataReservas");

const dataSelecionada = filtroDataReservas.value;

const cliente = await obterClienteLogado();

if (!cliente) {
    listaReservas.innerHTML = "<p>Cliente não identificado.</p>";
    return;
}

let consulta = supabaseClient
    .from("reservas")
    .select(`
        id,
        nome,
        whatsapp,
        servico,
        status,
        created_at,
        cliente_id,
        horarios!inner (
            data,
            horario
        )
    `)
    .eq("cliente_id", cliente.id);

// Se uma data foi escolhida, mostra somente as reservas daquele dia
if (dataSelecionada) {
    consulta = consulta.eq(
        "horarios.data",
        dataSelecionada
    );
}

const { data, error } = await consulta
    .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao carregar reservas:", error);

        listaReservas.innerHTML =
            "<p>Erro ao carregar reservas.</p>";

        return;
    }

    if (data.length === 0) {
        listaReservas.innerHTML =
            "<p>Nenhuma reserva encontrada.</p>";

        return;
    }

    listaReservas.innerHTML = "";

    data.forEach((reserva) => {

        const dataFormatada =
            reserva.horarios.data
                .split("-")
                .reverse()
                .join("/");

        const horarioFormatado =
            reserva.horarios.horario.substring(0, 5);

        listaReservas.innerHTML += `
            <div class="reserva-item">

                <strong>${reserva.nome}</strong>

                <p>
                    Serviço: ${reserva.servico}
                </p>

                <p>
                    Data: ${dataFormatada}
                </p>

                <p>
                    Horário: ${horarioFormatado}
                </p>

                <p>
                    WhatsApp: ${reserva.whatsapp}
                </p>

                <p>
    Status: ${reserva.status}
</p>

<button
    type="button"
    class="btn-whatsapp-reserva"
    onclick="abrirWhatsApp('${reserva.whatsapp}')"
>
    Chamar no WhatsApp
</button>

<button
    type="button"
    class="btn-cancelar-reserva"
    onclick="cancelarReserva(${reserva.id})"
>
    Cancelar reserva
</button>

</div>
        `;
    });
}

const filtroDataReservas =
    document.getElementById("filtroDataReservas");

filtroDataReservas.addEventListener("change", () => {
    carregarReservas();
});

function abrirWhatsApp(numero) {

    // Remove espaços, traços, parênteses etc.
    let numeroLimpo = numero.replace(/\D/g, "");

    // Se foi digitado apenas DDD + número, adiciona o Brasil (+55)
    if (!numeroLimpo.startsWith("55")) {
        numeroLimpo = "55" + numeroLimpo;
    }

    const linkWhatsApp = `https://wa.me/${numeroLimpo}`;

    window.open(linkWhatsApp, "_blank");
}

async function cancelarReserva(id) {

    const confirmar = confirm(
        "Tem certeza que deseja cancelar esta reserva? O horário ficará disponível novamente."
    );

    if (!confirmar) {
        return;
    }

    // Busca os dados da reserva antes de excluir
    const { data: reserva, error: erroBusca } = await supabaseClient
        .from("reservas")
        .select(`
            id,
            nome,
            whatsapp,
            servico,
            horarios (
                data,
                horario
            )
        `)
        .eq("id", id)
        .single();

    if (erroBusca || !reserva) {
        console.error("Erro ao buscar reserva:", erroBusca);
        alert("Não foi possível localizar os dados da reserva.");
        return;
    }

    // Cancela a reserva
    const { error } = await supabaseClient
        .from("reservas")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Erro ao cancelar reserva:", error);
        alert("Não foi possível cancelar a reserva.");
        return;
    }

    alert("Reserva cancelada com sucesso!");

    // Monta a mensagem para o cliente
    const data = reserva.horarios?.data;
    const horario = reserva.horarios?.horario;

    const dataFormatada = data
        ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR")
        : "";

    const horarioFormatado = horario
        ? horario.slice(0, 5)
        : "";

    const cliente = await obterClienteLogado();

const nomeProfissional = cliente?.nome || "Equipe";

const mensagem =
    `Olá, ${reserva.nome}! Informamos que seu agendamento para o dia ${dataFormatada} às ${horarioFormatado} precisou ser cancelado. Pedimos desculpas pelo imprevisto. Entre em contato para reagendarmos.\n\n— ${nomeProfissional}`;
    // Limpa o número deixando somente números
    let numeroWhatsapp = reserva.whatsapp.replace(/\D/g, "");

    // Adiciona o código do Brasil caso ainda não exista
    if (!numeroWhatsapp.startsWith("55")) {
        numeroWhatsapp = "55" + numeroWhatsapp;
    }

    // Abre o WhatsApp com a mensagem pronta
    const linkWhatsapp =
        `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagem)}`;

    window.open(linkWhatsapp, "_blank");

    // Atualiza painel
    carregarReservas();
    carregarHorarios();
}

async function excluirHorario(id) {

    const confirmar = confirm(
        "Tem certeza que deseja excluir este horário?"
    );

    if (!confirmar) {
        return;
    }

    const { error } = await supabaseClient
        .from("horarios")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Erro ao excluir horário:", error);
        alert("Não foi possível excluir o horário.");
        return;
    }

    alert("Horário excluído com sucesso!");

    carregarHorarios();
}

const btnSair = document.getElementById("btnSair");

btnSair.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
        console.error("Erro ao sair:", error);
        alert("Não foi possível sair.");
        return;
    }

    // Esconde o painel
    document.getElementById("painelAdmin").style.display = "none";

    // Mostra novamente o login
    document.querySelector(".login-container").style.display = "flex";

    // Limpa os campos
    formLogin.reset();

    mensagemLogin.textContent = "";
});

/* =========================================
   DASHBOARD
========================================= */

async function carregarDashboard() {

    const cliente = await obterClienteLogado();

    if (!cliente) {
        console.error("Cliente não identificado no Dashboard.");
        return;
    }

    // Data de hoje no formato YYYY-MM-DD
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    const dataHoje = `${ano}-${mes}-${dia}`;


    /* ==============================
       BUSCAR HORÁRIOS DE HOJE
    ============================== */

    const { data: horarios, error: erroHorarios } =
        await supabaseClient
            .from("horarios")
            .select("id, data, horario")
            .eq("cliente_id", cliente.id)
            .eq("data", dataHoje)
            .order("horario", { ascending: true });


    if (erroHorarios) {
        console.error(
            "Erro ao carregar horários do Dashboard:",
            erroHorarios
        );

        return;
    }


    /* ==============================
       BUSCAR RESERVAS DE HOJE
    ============================== */

    const { data: reservas, error: erroReservas } =
        await supabaseClient
            .from("reservas")
            .select(`
                id,
                nome,
                servico,
                whatsapp,
                horario_id,
                status,
                horarios!inner (
                    data,
                    horario
                )
            `)
            .eq("cliente_id", cliente.id)
            .eq("horarios.data", dataHoje);


    if (erroReservas) {
        console.error(
            "Erro ao carregar reservas do Dashboard:",
            erroReservas
        );

        return;
    }


    /* ==============================
       CALCULAR INFORMAÇÕES
    ============================== */

    const total = horarios.length;

    const reservados = reservas.length;

    const livres = Math.max(
        total - reservados,
        0
    );


    /* ==============================
       MOSTRAR NÚMEROS
    ============================== */

    const totalElemento =
        document.getElementById("dashboardTotal");

        const totalLegendaElemento =
    document.getElementById("dashboardTotalLegenda");

    const reservadosElemento =
        document.getElementById("dashboardReservados");

    const livresElemento =
        document.getElementById("dashboardLivres");

    const centroElemento =
        document.getElementById("dashboardCentro");


    if (totalElemento) {
        totalElemento.textContent = total;
    }

    if (totalLegendaElemento) {
    totalLegendaElemento.textContent = total;
}

    if (reservadosElemento) {
        reservadosElemento.textContent = reservados;
    }

    if (livresElemento) {
        livresElemento.textContent = livres;
    }

    if (centroElemento) {
        centroElemento.textContent = total;
    }


  /* ==============================
   ATUALIZAR GRÁFICO
================================ */

const grafico =
    document.getElementById("graficoHorarios");
if (grafico) {

    let porcentagemReservados = 0;

    if (total > 0) {
        porcentagemReservados =
            (reservados / total) * 100;
    }

    if (total === 0) {

        grafico.style.background = "#183027";

    } else {

        grafico.style.background =
            `conic-gradient(
                #3b82f6 0% ${porcentagemReservados}%,
                #00e676 ${porcentagemReservados}% 100%
            )`;
    }
}


    /* ==============================
       PRÓXIMO ATENDIMENTO
    ============================== */

    carregarProximoAtendimento(
        reservas,
        dataHoje
    );
}


/* =========================================
   PRÓXIMO ATENDIMENTO
========================================= */

function carregarProximoAtendimento(
    reservas,
    dataHoje
) {

    const container =
        document.getElementById("proximoAtendimento");


    if (!container) {
        return;
    }


    const agora = new Date();


    const reservasFuturas =
        reservas
            .filter((reserva) => {

                if (!reserva.horarios) {
                    return false;
                }

                const horario =
                    reserva.horarios.horario;

                const dataHora =
                    new Date(
                        `${dataHoje}T${horario}`
                    );


                return dataHora >= agora;

            })
            .sort((a, b) => {

                return a.horarios.horario
                    .localeCompare(
                        b.horarios.horario
                    );

            });


    if (reservasFuturas.length === 0) {

        container.innerHTML = `
            <div class="proximo-vazio">
                Nenhum atendimento próximo.
            </div>
        `;

        return;
    }


    const proxima =
        reservasFuturas[0];


    const horario =
        proxima.horarios.horario
            .substring(0, 5);


    container.innerHTML = `

        <div class="reserva-item">

            <strong>
                ${proxima.nome}
            </strong>

            <p>
                Horário: ${horario}
            </p>

            <p>
                Serviço: ${proxima.servico}
            </p>

            <button
                type="button"
                class="btn-whatsapp-reserva"
                onclick="abrirWhatsApp('${proxima.whatsapp}')"
            >
                Chamar no WhatsApp
            </button>

        </div>

    `;
}

/* =========================================
   NAVEGAÇÃO DO PAINEL
========================================= */

const botoesMenu = document.querySelectorAll(".menu-item");
const telasSistema = document.querySelectorAll(".tela-sistema");

botoesMenu.forEach((botao) => {

    botao.addEventListener("click", () => {

        const telaDestino = botao.dataset.tela;

        // Remove ativo de todos os botões
        botoesMenu.forEach((item) => {
            item.classList.remove("ativo");
        });

        // Esconde todas as telas
        telasSistema.forEach((tela) => {
            tela.classList.remove("ativa");
        });

        // Ativa botão clicado
        botao.classList.add("ativo");

        // Abre a tela correspondente
        const tela = document.getElementById(telaDestino);

        if (tela) {
            tela.classList.add("ativa");
        } else {
            console.error(
                "Tela não encontrada:",
                telaDestino
            );
        }

    });

});

/* =========================================
   SELEÇÃO DE HORÁRIOS
========================================= */

const botoesHorariosCadastro =
    document.querySelectorAll(".horario-selecao");

const quantidadeHorariosSelecionados =
    document.getElementById("quantidadeHorariosSelecionados");


function atualizarQuantidadeHorarios() {

    const horariosSelecionados =
        document.querySelectorAll(".horario-selecao.ativo");

    const quantidade = horariosSelecionados.length;

    quantidadeHorariosSelecionados.textContent = quantidade;


    // Libera o botão somente quando existir
    // pelo menos um horário selecionado
    if (quantidade > 0) {

        btnCadastrarHorarios.disabled = false;

    } else {

        btnCadastrarHorarios.disabled = true;

    }
}


botoesHorariosCadastro.forEach((botao) => {

    botao.addEventListener("click", () => {

        // Seleciona ou desmarca o horário
        botao.classList.toggle("ativo");

        // Atualiza o contador
        atualizarQuantidadeHorarios();

    });

});


/* =========================================
   CALENDÁRIO DE SELEÇÃO DE DATAS
========================================= */

(function iniciarCalendarioClickDev() {
    const listaDias = document.getElementById("listaDias");
    const tituloMes = document.getElementById("tituloMes");
    const btnMesAnterior = document.getElementById("mesAnterior");
    const btnProximoMes = document.getElementById("proximoMes");
    const dataTexto = document.getElementById("dataSelecionadaTexto");

    if (
        !listaDias ||
        !tituloMes ||
        !btnMesAnterior ||
        !btnProximoMes ||
        !dataTexto
    ) {
        console.error("Elementos do calendário não encontrados no HTML.");
        return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let anoCalendario = hoje.getFullYear();
    let mesCalendario = hoje.getMonth();

    function formatarDataISO(data) {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");

        return `${ano}-${mes}-${dia}`;
    }

    function formatarDataBR(data) {
        return data.toLocaleDateString("pt-BR");
    }

    function renderizarCalendario() {
        listaDias.innerHTML = "";

        const primeiroDia = new Date(
            anoCalendario,
            mesCalendario,
            1
        );

        const ultimoDia = new Date(
            anoCalendario,
            mesCalendario + 1,
            0
        );

        tituloMes.textContent = primeiroDia.toLocaleDateString(
            "pt-BR",
            { month: "long", year: "numeric" }
        );

        tituloMes.textContent =
            tituloMes.textContent.charAt(0).toUpperCase() +
            tituloMes.textContent.slice(1);

        for (let numeroDia = 1; numeroDia <= ultimoDia.getDate(); numeroDia++) {
            const data = new Date(
                anoCalendario,
                mesCalendario,
                numeroDia
            );

            data.setHours(0, 0, 0, 0);

            const diaPassado = data < hoje;

            const botao = document.createElement("button");
            botao.type = "button";
            botao.className = "dia-item";

            const diaSemana = data.toLocaleDateString(
                "pt-BR",
                { weekday: "short" }
            ).replace(".", "").toUpperCase();

            botao.innerHTML = `
                <small>${diaSemana}</small>
                <strong>${numeroDia}</strong>
            `;

            botao.disabled = diaPassado;

            if (diaPassado) {
                botao.classList.add("indisponivel");
            }

            if (window.dataHorarioSelecionado === formatarDataISO(data)) {
                botao.classList.add("ativo");
            }

            botao.addEventListener("click", () => {
                if (diaPassado) return;

                window.dataHorarioSelecionado = formatarDataISO(data);
                dataTexto.textContent = formatarDataBR(data);

                renderizarCalendario();
            });

            listaDias.appendChild(botao);
        }

        const primeiroDiaDoMes = new Date(
            hoje.getFullYear(),
            hoje.getMonth(),
            1
        );

        btnMesAnterior.disabled =
            primeiroDia.getTime() <= primeiroDiaDoMes.getTime();
    }

    btnMesAnterior.addEventListener("click", () => {
        if (mesCalendario === 0) {
            anoCalendario--;
            mesCalendario = 11;
        } else {
            mesCalendario--;
        }

        renderizarCalendario();
    });

    btnProximoMes.addEventListener("click", () => {
        if (mesCalendario === 11) {
            anoCalendario++;
            mesCalendario = 0;
        } else {
            mesCalendario++;
        }

        renderizarCalendario();
    });

    window.dataHorarioSelecionado = formatarDataISO(hoje);
    dataTexto.textContent = formatarDataBR(hoje);

    renderizarCalendario();
})();


/* =====================================
   MENU LATERAL PARA CELULAR
===================================== */

document.addEventListener("DOMContentLoaded", () => {
    const menuLateral = document.getElementById("menuLateral");
    const menuOverlay = document.getElementById("menuOverlay");
    const btnMenu = document.getElementById("btnMenu");

    if (!menuLateral || !menuOverlay || !btnMenu) {
        console.error("Menu mobile: elemento não encontrado.", {
            menuLateral,
            menuOverlay,
            btnMenu
        });
        return;
    }

    function abrirMenu() {
        menuLateral.classList.add("aberto");
        menuOverlay.classList.add("ativo");
    }

    function fecharMenu() {
        menuLateral.classList.remove("aberto");
        menuOverlay.classList.remove("ativo");
    }

    btnMenu.addEventListener("click", () => {
        if (menuLateral.classList.contains("aberto")) {
            fecharMenu();
        } else {
            abrirMenu();
        }
    });

    menuOverlay.addEventListener("click", fecharMenu);

    menuLateral.querySelectorAll(".menu-item").forEach((item) => {
        item.addEventListener("click", fecharMenu);
    });
});

