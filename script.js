const SUPABASE_URL = "https://dpmzewokoxoslotijjis.supabase.co";

const SUPABASE_KEY = "sb_publishable_r4gsCdKoKzs3U3_89IBOPQ_nCI0lNR0";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const CLIENTE_SLUG = "welly-reis";

let clienteAtual = null;

async function obterClienteDoSite() {

    const { data: cliente, error } = await supabaseClient
        .from("clientes")
        .select("id, nome, slug, whatsapp")
        .eq("slug", CLIENTE_SLUG)
        .eq("ativo", true)
        .single();

    if (error) {
        console.error("Erro ao identificar cliente:", error);
        return null;
    }

    clienteAtual = cliente;

    console.log("Cliente do site:", clienteAtual);

    return clienteAtual;
}

async function carregarDatasDisponiveis() {

    const selectData = document.getElementById("data");

    // Data de hoje no formato YYYY-MM-DD
    const hoje = new Date();

    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    const dataHoje = `${ano}-${mes}-${dia}`;

   const cliente = await obterClienteDoSite();

if (!cliente) {
    selectData.innerHTML = `
        <option value="">
            Cliente não identificado
        </option>
    `;
    return;
}

const { data, error } = await supabaseClient
    .from("horarios")
    .select("data")
    .eq("cliente_id", cliente.id)
    .gte("data", dataHoje)
    .order("data", { ascending: true });

    if (error) {
        console.error("Erro ao carregar datas:", error);

        selectData.innerHTML = `
            <option value="">
                Erro ao carregar datas
            </option>
        `;

        return;
    }

    // Remove datas repetidas
    const datasUnicas = [...new Set(
        data.map(item => item.data)
    )];

    selectData.innerHTML = `
        <option value="">
            Selecione uma data
        </option>
    `;

    datasUnicas.forEach(dataDisponivel => {

        const [ano, mes, dia] = dataDisponivel.split("-");

        const dataFormatada = `${dia}/${mes}/${ano}`;

        selectData.innerHTML += `
            <option value="${dataDisponivel}">
                ${dataFormatada}
            </option>
        `;
    });
}
carregarDatasDisponiveis();

const selectData = document.getElementById("data");
const selectHorario = document.getElementById("horario");

selectData.addEventListener("change", async () => {

    const dataSelecionada = selectData.value;

    // Se nenhuma data estiver selecionada
    if (!dataSelecionada) {
        selectHorario.innerHTML = `
            <option value="">
                Primeiro selecione uma data
            </option>
        `;

        selectHorario.disabled = true;
        return;
    }

// Enquanto busca os horários
selectHorario.innerHTML = `
    <option value="">
        Carregando horários...
    </option>
`;

selectHorario.disabled = true;

// Busca os horários da data escolhida
const cliente = await obterClienteDoSite();

if (!cliente) {
    selectHorario.innerHTML = `
        <option value="">
            Cliente não identificado
        </option>
    `;
    return;
}

const { data, error } = await supabaseClient
    .from("horarios")
    .select("id, horario")
    .eq("cliente_id", cliente.id)
    .eq("data", dataSelecionada)
    .order("horario", { ascending: true });
// Busca os horários que já foram reservados
const { data: horariosReservados, error: erroReservados } =
    await supabaseClient
        .from("horarios_reservados")
        .select("horario_id");

if (erroReservados) {
    console.error(
        "Erro ao verificar horários reservados:",
        erroReservados
    );

    return;
}


// Guarda somente os IDs que já estão reservados
const idsReservados = horariosReservados.map(
    item => item.horario_id
);


// Limpa o select
selectHorario.innerHTML = `
    <option value="">
        Selecione um horário
    </option>
`;


// Mostra TODOS os horários
data.forEach(item => {

    const horarioFormatado = item.horario.substring(0, 5);

    const estaReservado = idsReservados.includes(item.id);

    if (estaReservado) {

        // Mostra o horário, mas impede a cliente de selecionar
        selectHorario.innerHTML += `
            <option disabled>
                ${horarioFormatado} — RESERVADO
            </option>
        `;

    } else {

        // Horário disponível normalmente
        selectHorario.innerHTML += `
            <option
                value="${item.id}"
                data-horario="${horarioFormatado}"
            >
                ${horarioFormatado}
            </option>
        `;
    }

});

selectHorario.disabled = false;
});

const botaoAgendar = document.getElementById("btnAgendar");

botaoAgendar.addEventListener("click", async function () {

    // Pegando os valores do formulário
    const servico = document.getElementById("servico").value;
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
   const selectServico = document.getElementById("servico");

const nomeServico =
    selectServico.options[selectServico.selectedIndex].text;

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


    // Número do WhatsApp da Rafaela
    const numeroRafaela = "5599984180845";


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
        `https://wa.me/${numeroRafaela}?text=${mensagemCodificada}`;


    // Abrindo o WhatsApp
    window.open(linkWhatsApp, "_blank");

});