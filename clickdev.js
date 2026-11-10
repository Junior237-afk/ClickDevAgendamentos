const SUPABASE_URL = "https://dpmzewokoxoslotijjis.supabase.co";

const SUPABASE_KEY = "sb_publishable_r4gsCdKoKzs3U3_89IBOPQ_nCI0lNR0"

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const CLIENTE_SLUG = "cliente-teste";

let clienteAtual = null;

async function obterClienteDoSite() {

    const { data, error } = await supabaseClient
        .rpc("obter_cliente_publico", {
            p_slug: CLIENTE_SLUG
        });

    if (error) {
        console.error("Erro ao identificar cliente:", error);
        return null;
    }

    if (!data || data.length === 0) {
        console.error("Cliente não encontrado.");
        return null;
    }

    clienteAtual = data[0];

    console.log("Cliente do site:", clienteAtual);

    return clienteAtual;
}


/* =========================================
   CALENDÁRIO VISUAL DE DISPONIBILIDADE
========================================= */

let mesCalendarioVisivel = new Date();
mesCalendarioVisivel = new Date(
    mesCalendarioVisivel.getFullYear(),
    mesCalendarioVisivel.getMonth(),
    1
);

let datasDisponiveisCalendario = [];
let dataSelecionadaCalendario = "";

// Formata a data local no padrão YYYY-MM-DD
function obterDataAtualISO() {

    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


// Desenha os dias do calendário
function renderizarCalendarioDisponivel() {

    const elementoDias = document.getElementById("calendarioDias");
    const tituloMes = document.getElementById("mesAnoCalendario");

    if (!elementoDias || !tituloMes) return;

    const ano = mesCalendarioVisivel.getFullYear();
    const mes = mesCalendarioVisivel.getMonth();

    const nomeMes = new Date(ano, mes, 1)
        .toLocaleDateString("pt-BR", {
            month: "long",
            year: "numeric"
        });

    tituloMes.textContent =
        nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

    elementoDias.innerHTML = "";

    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const quantidadeDias = new Date(ano, mes + 1, 0).getDate();

    // Espaços antes do primeiro dia do mês
    for (let i = 0; i < primeiroDiaSemana; i++) {

        elementoDias.innerHTML += `<span class="dia-vazio"></span>`;

    }

    // Dias do mês
    for (let dia = 1; dia <= quantidadeDias; dia++) {

        const dataISO = [
            ano,
            String(mes + 1).padStart(2, "0"),
            String(dia).padStart(2, "0")
        ].join("-");

        const estaDisponivel =
            datasDisponiveisCalendario.includes(dataISO);

        const estaSelecionado =
            dataSelecionadaCalendario === dataISO;

        if (estaDisponivel) {

            elementoDias.innerHTML += `
                <button
                    type="button"
                    class="dia-calendario disponivel ${estaSelecionado ? "selecionado" : ""}"
                    data-data="${dataISO}"
                >
                    ${dia}
                </button>
            `;

        } else {

            elementoDias.innerHTML += `
                <button
                    type="button"
                    class="dia-calendario"
                    disabled
                >
                    ${dia}
                </button>
            `;

        }
    }

    // Impede voltar para meses anteriores ao atual
    const botaoAnterior = document.getElementById("mesAnterior");

    if (botaoAnterior) {

        const hoje = new Date();

        const primeiroMesAtual = new Date(
            hoje.getFullYear(),
            hoje.getMonth(),
            1
        );

        botaoAnterior.disabled =
            mesCalendarioVisivel <= primeiroMesAtual;
    }
}


// Consulta as datas e verifica os horários livres
async function carregarDatasDisponiveis() {

    const selectData = document.getElementById("data");

    const dataHoje = obterDataAtualISO();

    const cliente = await obterClienteDoSite();

    if (!cliente) {

        selectData.innerHTML =
            `<option value="">Cliente não identificado</option>`;

        datasDisponiveisCalendario = [];
        renderizarCalendarioDisponivel();

        return;
    }

    // Busca os horários cadastrados para este cliente
    const { data: horarios, error } = await supabaseClient
        .from("horarios")
        .select("id, data")
        .eq("cliente_id", cliente.id)
        .gte("data", dataHoje)
        .order("data", { ascending: true });

    if (error) {

        console.error("Erro ao carregar horários:", error);

        selectData.innerHTML =
            `<option value="">Erro ao carregar datas</option>`;

        datasDisponiveisCalendario = [];
        renderizarCalendarioDisponivel();

        return;
    }

    // Verifica se existem horários cadastrados
    if (!horarios || horarios.length === 0) {

        datasDisponiveisCalendario = [];

        selectData.innerHTML =
            `<option value="">Nenhuma data disponível</option>`;

        renderizarCalendarioDisponivel();

        return;
    }

    // Busca os IDs dos horários cadastrados
    const idsHorarios = horarios.map(item => item.id);

    // Consulta quais desses horários já estão reservados
    const { data: horariosReservados, error: erroReservados } =
        await supabaseClient
            .from("horarios_reservados")
            .select("horario_id")
            .in("horario_id", idsHorarios);

    if (erroReservados) {

        console.error(
            "Erro ao consultar horários reservados:",
            erroReservados
        );

        selectData.innerHTML =
            `<option value="">Erro ao verificar disponibilidade</option>`;

        datasDisponiveisCalendario = [];
        renderizarCalendarioDisponivel();

        return;
    }

    // Guarda os IDs dos horários já reservados
    const idsReservados = new Set(
        horariosReservados.map(item => item.horario_id)
    );

    // Mantém somente horários que ainda estão livres
    const horariosLivres = horarios.filter(
        item => !idsReservados.has(item.id)
    );

    // Obtém todas as datas que possuem horários cadastrados
datasDisponiveisCalendario = [
    ...new Set(horarios.map(item => item.data))
];
    // Atualiza o select original
    selectData.innerHTML =
        `<option value="">Selecione uma data</option>`;

    datasDisponiveisCalendario.forEach(dataDisponivel => {

        const [ano, mes, dia] = dataDisponivel.split("-");

        selectData.innerHTML += `
            <option value="${dataDisponivel}">
                ${dia}/${mes}/${ano}
            </option>
        `;

    });

    // Limpa uma seleção que deixou de estar disponível
    if (
        dataSelecionadaCalendario &&
        !datasDisponiveisCalendario.includes(dataSelecionadaCalendario)
    ) {

        dataSelecionadaCalendario = "";
        selectData.value = "";

    }

    renderizarCalendarioDisponivel();

}


// Navegação entre meses
document.getElementById("mesAnterior").addEventListener("click", () => {

    mesCalendarioVisivel.setMonth(
        mesCalendarioVisivel.getMonth() - 1
    );

    renderizarCalendarioDisponivel();

});


document.getElementById("proximoMes").addEventListener("click", () => {

    mesCalendarioVisivel.setMonth(
        mesCalendarioVisivel.getMonth() + 1
    );

    renderizarCalendarioDisponivel();

});


// Clique em uma data disponível
document.getElementById("calendarioDias").addEventListener("click", event => {

    const botao = event.target.closest(".dia-calendario.disponivel");

    if (!botao) return;

    const dataSelecionada = botao.dataset.data;

    if (!datasDisponiveisCalendario.includes(dataSelecionada)) {
        return;
    }

    dataSelecionadaCalendario = dataSelecionada;

    // Atualiza o select original
    const selectOriginal = document.getElementById("data");

    selectOriginal.value = dataSelecionada;

    // Atualiza o calendário
    renderizarCalendarioDisponivel();

    // Aciona a lógica existente que carrega os horários
    selectOriginal.dispatchEvent(new Event("change"));

});


// Inicializa o calendário e carrega as datas
renderizarCalendarioDisponivel();
carregarDatasDisponiveis();


/* =========================================
   ATUALIZAR DATA NO RESUMO
========================================= */

document.getElementById("data").addEventListener("change", function () {

    const resumoData = document.getElementById("resumoData");

    if (!this.value) {
        resumoData.textContent = "Selecione uma data";
        return;
    }

    const dataFormatada = this.value
        .split("-")
        .reverse()
        .join("/");

    resumoData.textContent = dataFormatada;

});


/* =========================================
   CARREGAR HORÁRIOS DISPONÍVEIS
========================================= */

const selectData = document.getElementById("data");
const selectHorario = document.getElementById("horario");

const containerHorarios =
    document.getElementById("horariosDisponiveis");

selectData.addEventListener("change", async () => {

    const dataSelecionada = selectData.value;

    // Limpa a seleção anterior
    selectHorario.innerHTML =
        `<option value="">Selecione um horário</option>`;

    selectHorario.disabled = true;

    containerHorarios.innerHTML = `
        <p class="mensagem-horarios">
            Carregando horários...
        </p>
    `;

    // Limpa o resumo
    document.getElementById("resumoHorario").textContent =
        "Selecione um horário";

    if (!dataSelecionada) {

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Selecione uma data para visualizar os horários.
            </p>
        `;

        return;
    }

    const cliente = await obterClienteDoSite();

    if (!cliente) {

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Não foi possível identificar o cliente.
            </p>
        `;

        return;
    }

    // Busca os horários cadastrados para este cliente e data
    const { data: horarios, error } = await supabaseClient
        .from("horarios")
        .select("id, horario")
        .eq("cliente_id", cliente.id)
        .eq("data", dataSelecionada)
        .order("horario", { ascending: true });

    if (error) {

        console.error("Erro ao carregar horários:", error);

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Erro ao carregar os horários.
            </p>
        `;

        return;
    }

    if (!horarios || horarios.length === 0) {

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Nenhum horário cadastrado para esta data.
            </p>
        `;

        return;
    }

    // Consulta os horários já reservados
    const idsHorarios = horarios.map(item => item.id);

    const { data: horariosReservados, error: erroReservados } =
        await supabaseClient
            .from("horarios_reservados")
            .select("horario_id")
            .in("horario_id", idsHorarios);

    if (erroReservados) {

        console.error(
            "Erro ao verificar reservas:",
            erroReservados
        );

        containerHorarios.innerHTML = `
            <p class="mensagem-horarios">
                Não foi possível verificar a disponibilidade.
            </p>
        `;

        return;
    }

    // Guarda os IDs dos horários já reservados
const idsReservados = new Set(
    horariosReservados.map(item => item.horario_id)
);

// Limpa os elementos anteriores
containerHorarios.innerHTML = "";

selectHorario.innerHTML =
    `<option value="">Selecione um horário</option>`;

// Exibe todos os horários cadastrados
horarios.forEach(item => {

    const horarioFormatado = item.horario.substring(0, 5);

    const estaReservado = idsReservados.has(item.id);

    // Cria o botão visual
    const botao = document.createElement("button");

    botao.type = "button";

    botao.className = estaReservado
        ? "horario-card agendado"
        : "horario-card";

    botao.textContent = estaReservado
        ? `${horarioFormatado} — Agendado`
        : horarioFormatado;

    botao.dataset.horarioId = item.id;

    // Se estiver reservado, bloqueia o botão
    if (estaReservado) {

        botao.disabled = true;

    } else {

        // Somente horários livres entram no select
        selectHorario.innerHTML += `
            <option
                value="${item.id}"
                data-horario="${horarioFormatado}"
            >
                ${horarioFormatado}
            </option>
        `;

    }

    containerHorarios.appendChild(botao);

});

// Verifica se ainda existe algum horário livre
const existeHorarioLivre = horarios.some(
    item => !idsReservados.has(item.id)
);

if (!existeHorarioLivre) {

    const mensagem = document.createElement("p");

    mensagem.className = "mensagem-horarios";

    mensagem.textContent =
        "Todos os horários desta data já estão agendados.";

    containerHorarios.appendChild(mensagem);

}

selectHorario.disabled = !existeHorarioLivre;
});

// Selecionar horário visualmente
containerHorarios.addEventListener("click", event => {

    const botao = event.target.closest(".horario-card");

    if (!botao) return;

    // Atualiza o select original pelo ID
    selectHorario.value = botao.dataset.horarioId;

    if (!selectHorario.value) return;

    // Destaca somente o horário escolhido
    containerHorarios
        .querySelectorAll(".horario-card")
        .forEach(item => {
            item.classList.remove("selecionado");
        });

    botao.classList.add("selecionado");

    // Atualiza o resumo
    selectHorario.dispatchEvent(new Event("change"));

});


// Atualizar resumo quando o horário for escolhido
selectHorario.addEventListener("change", () => {

    const resumoHorario = document.getElementById("resumoHorario");

    const opcaoSelecionada =
        selectHorario.options[selectHorario.selectedIndex];

    if (!selectHorario.value) {

        resumoHorario.textContent = "Selecione um horário";
        return;

    }

    resumoHorario.textContent =
        opcaoSelecionada.dataset.horario;

});


const botaoAgendar = document.getElementById("btnAgendar");

botaoAgendar.addEventListener("click", async function () {

    // Pegando os valores do formulário
    const servico = document.getElementById("servico").value;

// Pegando o preço do serviço selecionado
const selectServico = document.getElementById("servico");
const opcaoServico = selectServico.options[selectServico.selectedIndex];
const valorServico = Number(opcaoServico.dataset.valor);

    const data = document.getElementById("data").value;
    const selectHorarioEscolhido = document.getElementById("horario");
const horarioId = selectHorarioEscolhido.value;
const horario = selectHorarioEscolhido.options[selectHorarioEscolhido.selectedIndex].dataset.horario;
    const nome = document.getElementById("nome").value;
    const whatsappCliente = document.getElementById("whatsapp").value;


    // Verificando se todos os campos foram preenchidos
    if (
        servico === "" ||
        data === "" ||
        horarioId === "" ||
        nome === "" ||
        whatsappCliente === ""
    ) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    // Remove tudo que não for número
const whatsappNumeros = whatsappCliente.replace(/\D/g, "");

// O WhatsApp deve ter DDD + número do celular = 11 dígitos
if (whatsappNumeros.length !== 11) {
    alert(
        "Digite seu WhatsApp com DDD.\nExemplo: (99) 99999-9999"
    );
    return;
}

    // Convertendo a data para o formato brasileiro
    const dataFormatada = data.split("-").reverse().join("/");


    // Pegando o nome bonito do serviço
const nomeServico = opcaoServico.text;

// Salvando a reserva no Supabase
const { error: erroReserva } = await supabaseClient
    .from("reservas")
    .insert([
        {
            horario_id: Number(horarioId),
            cliente_id: clienteAtual.id,
            nome: nome,
            whatsapp: whatsappNumeros,
            servico: nomeServico,
            valor_servico: valorServico,
            status: "reservado"
        }
    ]);

if (erroReserva) {
    console.error("Erro ao realizar reserva:", erroReserva);

    // Código 23505 = horário já reservado
    if (erroReserva.code === "23505") {
        alert("Este horário acabou de ser reservado por outra cliente. Escolha outro horário.");
        return;
    }

    alert("Não foi possível realizar o agendamento. Tente novamente.");
    return;
}


   let numeroEmpresa = clienteAtual.whatsapp.replace(/\D/g, "");

// Adiciona o código do Brasil caso ainda não tenha
if (!numeroEmpresa.startsWith("55")) {
    numeroEmpresa = "55" + numeroEmpresa;
}


    // Mensagem que será enviada
    const mensagem = `
 *NOVO AGENDAMENTO*

 *Nome:* ${nome}
 *Serviço:* ${nomeServico}
 *Data:* ${dataFormatada}
 *Horário:* ${horario}
 *WhatsApp da cliente:* ${whatsappCliente}

 Gostaria de confirmar este horário.
`;


    // Transformando a mensagem em formato de URL
    const mensagemCodificada = encodeURIComponent(mensagem);


    // Criando o link do WhatsApp
    const linkWhatsApp =
    `https://wa.me/${numeroEmpresa}?text=${mensagemCodificada}`;


    // Abrindo o WhatsApp
    window.open(linkWhatsApp, "_blank");

});


/* =========================================
   SELEÇÃO VISUAL DOS SERVIÇOS
========================================= */

const containerServicos = document.getElementById("servicosCards");
const selectServico = document.getElementById("servico");

const resumoServico = document.getElementById("resumoServico");
const resumoValor = document.getElementById("resumoValor");

// Atualiza o resumo do agendamento
function atualizarResumoServico() {

    const opcaoSelecionada =
        selectServico.options[selectServico.selectedIndex];

    if (!selectServico.value) {
        resumoServico.textContent = "Nenhum serviço selecionado";
        resumoValor.textContent = "R$ 0,00";
        return;
    }

    const valor = Number(opcaoSelecionada.dataset.valor);

    resumoServico.textContent = opcaoSelecionada.text.trim();

    resumoValor.textContent = valor.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// Clique nos cards
containerServicos.addEventListener("click", function (event) {

    const card = event.target.closest(".servico-card");

    if (!card) return;

    const nomeServico = card.dataset.servico;

    // Localiza o serviço no select original
    const opcao = Array.from(selectServico.options).find(
        item => item.value === nomeServico
    );

    if (!opcao) {
        console.error("Serviço não encontrado:", nomeServico);
        return;
    }

    // Atualiza o select original
    selectServico.value = nomeServico;

    // Remove a seleção dos outros cards
    document.querySelectorAll(".servico-card").forEach(item => {
        item.classList.remove("selecionado");
    });

    // Destaca o card escolhido
    card.classList.add("selecionado");

    // Atualiza o resumo
    atualizarResumoServico();

});
