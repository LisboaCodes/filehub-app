(() => {
    // Função para escrever na área de transferência e exibir mensagem de sucesso
    async function writeToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            $("#copy_success").removeClass("hidden");
            setTimeout(() => {
                $("#copy_success").addClass("hidden");
                window.close();
            }, 5000); // 5 segundos
            return true;
        } catch (error) {
            showNotification(chrome.i18n.getMessage("copyError") + error.toString());
            return false;
        }
    }

    // Função para exibir notificações via mensagem ao background script
    function showNotification(message) {
        chrome.runtime.sendMessage({
            action: "showNotification",
            message: message
        });
    }

    // Evento de clique para copiar chave
    $("#id_filehub_copy").click(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                chrome.runtime.sendMessage({
                    action: "prepareCookieData",
                    url: tabs[0].url
                }, async (response) => {
                    if (response && response.success && response.data) {
                        await writeToClipboard(response.data);
                    } else {
                        showNotification(chrome.i18n.getMessage("copyError"));
                    }
                });
            }
        });
    });

    // Evento de clique para colar chave
    $("#id_filehub_paste").click(async () => {
        const clipboardText = await readClipboard();
        if (clipboardText) {
            chrome.runtime.sendMessage({
                action: "processPasteData",
                clipboardText: clipboardText
            }, (response) => {
                if (!response || !response.success) {
                    showNotification(chrome.i18n.getMessage("pasteError"));
                }
            });
        }
        window.close();
    });

    // Função para ler da área de transferência
    async function readClipboard() {
        try {
            return await navigator.clipboard.readText();
        } catch (error) {
            showNotification(chrome.i18n.getMessage("pasteError") + error.toString());
            return "";
        }
    }

    // Evento para carregar traduções quando o DOM estiver pronto
    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll("[data-i18n]").forEach((element) => {
            const messageKey = element.getAttribute("data-i18n");
            const message = chrome.i18n.getMessage(messageKey);
            if (message) {
                element.textContent = message;
            }
        });

        // Evento para abrir o modal "Sobre"
        $("#about_btn").click(() => {
            $("#about_modal").addClass("active");
        });

        // Evento para fechar o modal "Sobre"
        $("#close_about").click(() => {
            $("#about_modal").removeClass("active");
        });
    });
})();