(() => {
    // Função para exibir mensagens na página
    function showPageMessage(message, type = "info") {
        const notification = document.createElement("div");
        notification.textContent = message;
        notification.style.position = "fixed";
        notification.style.top = "10px";
        notification.style.left = "50%";
        notification.style.transform = "translateX(-50%)";
        notification.style.zIndex = "10000";
        notification.style.padding = "10px 20px";
        notification.style.borderRadius = "5px";
        notification.style.fontSize = "14px";
        notification.style.boxShadow = "0 2px 10px rgba(0, 0, 0, 0.2)";

        // Define a cor com base no tipo de mensagem
        switch (type) {
            case "error":
                notification.style.backgroundColor = "#f44336"; // Vermelho
                notification.style.color = "white";
                break;
            case "success":
                notification.style.backgroundColor = "#4CAF50"; // Verde
                notification.style.color = "white";
                break;
            default:
                notification.style.backgroundColor = "#2196F3"; // Azul (info)
                notification.style.color = "white";
        }

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.opacity = "0";
            notification.style.transition = "opacity 0.5s";
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500); // Remove após o fade-out
        }, 3000); // Exibe por 3 segundos
    }

    // Listener para mensagens do background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "showAlert") {
            alert(message.message);
            sendResponse({ success: true });
        } else if (message.action === "showPageMessage") {
            showPageMessage(message.message, message.type);
            sendResponse({ success: true });
        } else if (message.action === "readClipboard") {
            (async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    sendResponse({ success: true, text: text });
                } catch (error) {
                    showPageMessage(chrome.i18n.getMessage("clipboardEmpty") + ": " + error.message, "error");
                    sendResponse({ success: false, text: "" });
                }
            })();
            return true; // Indica resposta assíncrona
        } else if (message.action === "writeClipboard") {
            (async () => {
                try {
                    await navigator.clipboard.writeText(message.text);
                    sendResponse({ success: true });
                } catch (error) {
                    showPageMessage(chrome.i18n.getMessage("copyError") + error.message, "error");
                    sendResponse({ success: false });
                }
            })();
            return true; // Indica resposta assíncrona
        }
        return true; // Mantém o canal de mensagem aberto por padrão
    });

    // Notifica o background que o content script está pronto
    chrome.runtime.sendMessage({
        action: "contentScriptReady",
        url: window.location.href
    });
})();