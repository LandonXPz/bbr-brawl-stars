
(() => {
    const API_URL = "/api/ranking-ranked";
    const UPDATE_INTERVAL = 15 * 60 * 1000;

    let ranking = [];
    let loaded = false;

    const formatPoints = value =>
        Number(value).toLocaleString("pt-BR");

    function movement(player) {
        if (player.position > 15) return "";

        const previous = player.previousPosition;

        if (previous == null) return "➖";
        if (previous > player.position) return "📈";
        if (previous < player.position) return "📉";

        return "➖";
    }

    function render() {
        const tbody = document.getElementById(
            "ranked-tbody"
        );

        if (!tbody) return;

        const search = (
            document.getElementById("ranked-search")
                ?.value || ""
        ).trim().toLowerCase();

        const club = document.getElementById(
            "ranked-club-filter"
        )?.value || "";

        const filtered = ranking.filter(player => {
            const matchesSearch =
                player.name.toLowerCase().includes(search) ||
                player.tag.toLowerCase().includes(search);

            const matchesClub =
                !club || player.clubTag === club;

            return matchesSearch && matchesClub;
        });

        tbody.replaceChildren();

        if (!filtered.length) {
            const row = tbody.insertRow();
            const cell = row.insertCell();

            cell.colSpan = 4;
            cell.textContent = loaded
                ? "Nenhum jogador encontrado."
                : "Aguardando dados do ranking.";

            return;
        }

        for (const player of filtered) {
            const row = tbody.insertRow();

            if (player.position <= 15) {
                row.classList.add("ranked-top15");
            }

            const position = row.insertCell();
            const name = row.insertCell();
            const clubCell = row.insertCell();
            const points = row.insertCell();

            position.textContent =
                `#${player.position} ${movement(player)}`;

            name.textContent = player.name;
            clubCell.textContent = player.clubName;
            points.textContent = formatPoints(player.points);
        }
    }

    async function loadRanking() {
        const status = document.getElementById(
            "ranked-status"
        );

        try {
            const response = await fetch(API_URL, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Erro HTTP " + response.status);
            }

            const data = await response.json();

            if (!Array.isArray(data.players)) {
                throw new Error("Resposta inválida da API");
            }

            ranking = data.players;
            loaded = true;

            if (status) {
                const date = data.updatedAt
                    ? new Date(data.updatedAt)
                        .toLocaleString("pt-BR")
                    : "não informada";

                status.textContent =
                    `Última atualização: ${date}`;
            }

            render();
        } catch (error) {
            console.error("Ranking BBR:", error);

            if (status) {
                status.textContent =
                    "Não foi possível carregar o ranking.";
            }
        }
    }

    document.addEventListener("DOMContentLoaded", () => {
        const search = document.getElementById(
            "ranked-search"
        );

        const filter = document.getElementById(
            "ranked-club-filter"
        );

        search?.addEventListener("input", render);
        filter?.addEventListener("change", render);

        loadRanking();

        setInterval(loadRanking, UPDATE_INTERVAL);
    });
})();
