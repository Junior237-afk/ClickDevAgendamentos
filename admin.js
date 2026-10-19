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
});

const formHorario = document.getElementById("formHorario");

formHorario.addEventListener("submit", async (event) => {
    event.preventDefault();

    const dataHorario = document.getElementById("dataHorario").value;
    const horaHorario = document.getElementById("horaHorario").value;

    const cliente = await obterClienteLogado();

if (!cliente) {
    alert("Não foi possível identificar o cliente.");
    return;
}

    const { data, error } = await supabaseClient
        .from("horarios")
        .insert([
            {
    data: dataHorario,
    horario: horaHorario,
    cliente_id: cliente.id
}
        ]);

    if (error) {
        console.error("Erro ao cadastrar horário:", error);
        alert("Erro ao cadastrar horário.");
        return;
    }

    alert("Horário cadastrado com sucesso!");

formHorario.reset();

// Atualiza a lista imediatamente
carregarHorarios();
});
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

    // Atualiza as reservas
    carregarReservas();

    // Atualiza também os horários do painel
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