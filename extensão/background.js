(() => {
    "use strict";

    // Constantes
    const COOKIE_FIELDS = ["name", "domain", "value", "path", "secure", "httpOnly", "expirationDate"];
    const SESSION_PREFIX = "filehub"; // Alterado de "session_paste" para "filehub"
    const MENU_COPY_ID = "MENU_SESSION_COPY";
    const MENU_PASTE_ID = "SESSION_PARSE";
    const ENCRYPTION_KEY = "iLFB0yJSLsObtH6tNcfXMqo7L8qcEHqZ";

    // Importação de bibliotecas externas
    try {
        self.importScripts("lib/underscore.min.js", "lib/crypto-js.min.js");
    } catch (e) {}

    // Função para enviar mensagens para content scripts com retries
    async function sendMessageWithRetry(tabId, message, maxRetries = 2) {
        let attempts = 0;
        while (attempts <= maxRetries) {
            try {
                return await chrome.tabs.sendMessage(tabId, message);
            } catch (error) {
                if (error.message?.includes("Receiving end does not exist")) {
                    try {
                        await injectContentScript(tabId);
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (e) {}
                }
                attempts++;
                if (attempts > maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 200 * attempts));
            }
        }
    }

    // Injeta o content script em uma aba
    async function injectContentScript(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ["content_script.js"]
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    // Obtém e processa cookies de uma URL
    function getCookies(url, callback) {
        chrome.cookies.getAll({ url }, cookies => {
            const filteredCookies = _.map(cookies, cookie => _.pick(cookie, COOKIE_FIELDS));
            const data = JSON.stringify({ url, cookies: filteredCookies });
            const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY);
            callback(`${SESSION_PREFIX} ${encrypted}`); // Usa o novo prefixo "filehub"
        });
    }

    // Copia sessão para a área de transferência
    function copySession(url, tabId) {
        getCookies(url, async encryptedData => {
            try {
                if (!tabId) {
                    showNotification("errorTitle", "tabError");
                    return false;
                }

                try {
                    const response = await sendMessageWithRetry(tabId, {
                        action: "writeClipboard",
                        text: encryptedData
                    });
                    if (response?.success) {
                        showPageMessage(tabId, "copySuccess", "success");
                        return true;
                    }
                } catch (e) {}

                const result = await chrome.scripting.executeScript({
                    target: { tabId },
                    func: text => navigator.clipboard.writeText(text).then(() => true).catch(() => false),
                    args: [encryptedData]
                });

                if (result[0]?.result) return true;
                throw new Error("Clipboard write failed");
            } catch (e) {
                showNotification("errorTitle", `copyError${e.toString()}`);
                return false;
            }
        });
    }

    // Processa a colagem da sessão
    async function pasteSession() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                showNotification("errorTitle", "tabError");
                return false;
            }

            const clipboardText = await readClipboard(tab.id);
            return clipboardText ? processClipboardData(clipboardText) : (
                showPageMessage(tab.id, "clipboardEmpty", "error"),
                false
            );
        } catch (e) {
            showNotification("errorTitle", `pasteError${e.toString()}`);
            return false;
        }
    }

    // Lê o conteúdo da área de transferência
    async function readClipboard(tabId) {
        if (!tabId) return "";
        try {
            const response = await sendMessageWithRetry(tabId, { action: "readClipboard" });
            if (response?.success) return response.text || "";
            
            const result = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => navigator.clipboard.readText().then(text => text).catch(() => "")
            });
            return result[0]?.result || "";
        } catch (e) {
            return "";
        }
    }

    // Valida e processa dados da área de transferência
    function processClipboardData(text) {
        if (!text) {
            showNotification("errorTitle", "clipboardEmpty");
            return false;
        }
        if (text.indexOf(SESSION_PREFIX) !== 0) {
            showNotification("errorTitle", "formatError");
            return false;
        }
        processSessionData(text.substr(8)); // Alterado de 14 para 8 ("filehub " tem 8 caracteres)
        return true;
    }

    // Atualiza visibilidade do menu de contexto
    function updateContextMenu(url) {
        const isChromeInternal = url?.startsWith("chrome://");
        chrome.contextMenus.update(MENU_COPY_ID, { visible: !isChromeInternal });
        chrome.contextMenus.update(MENU_PASTE_ID, { visible: !isChromeInternal });
    }

    // Processa dados da sessão
    function processSessionData(encryptedData) {
        try {
            const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
            const data = JSON.parse(decrypted);
            
            if (!data?.cookies || !data?.url) {
                showNotification("errorTitle", "invalidDataFormat");
                return;
            }

            const promises = data.cookies.map(cookie => new Promise(resolve => {
                try {
                    const cookieData = { ...cookie, url: data.url };
                    if (!cookieData.expirationDate || cookieData.expirationDate < Date.now() / 1000) {
                        cookieData.expirationDate = Math.floor(Date.now() / 1000) + 3600;
                    }
                    chrome.cookies.set(cookieData, () => {
                        chrome.runtime.lastError;
                        resolve();
                    });
                } catch (e) {
                    resolve();
                }
            }));

            Promise.all(promises).then(() => {});
            chrome.tabs.update({ url: data.url });
        } catch (e) {
            showNotification("errorTitle", `pasteSessionError${e.toString()}`);
        }
    }

    // Atualiza sugestão na omnibox
    function updateOmniboxSuggestion(text) {
        let suggestion = chrome.i18n.getMessage("pasteSessionHere");
        if (text) {
            try {
                const data = JSON.parse(text);
                if (data?.url) {
                    suggestion = chrome.i18n.getMessage("pasteSessionForUrl", data.url);
                }
            } catch (e) {}
        }
        chrome.omnibox.setDefaultSuggestion({ description: suggestion });
    }

    // Exibe mensagem na página ou notificação
    function showPageMessage(tabId, messageKey, type = "info") {
        if (!tabId) return;
        sendMessageWithRetry(tabId, {
            action: "showPageMessage",
            message: chrome.i18n.getMessage(messageKey),
            type
        }).catch(() => {
            showNotification("generalNoticeTitle", messageKey);
        });
    }

    // Exibe notificação
    function showNotification(titleKey, messageKey) {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "filehub48.png", // Ajustado para refletir o novo nome
            title: chrome.i18n.getMessage(titleKey),
            message: chrome.i18n.getMessage(messageKey)
        });
    }

    // Listeners
    chrome.runtime.onInstalled.addListener(() => {
        chrome.contextMenus.create({
            id: MENU_COPY_ID,
            title: chrome.i18n.getMessage("menuCopySession")
        });
        chrome.contextMenus.create({
            id: MENU_PASTE_ID,
            title: chrome.i18n.getMessage("menuPasteSession")
        });
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === "complete" && tab.url) {
            updateContextMenu(tab.url);
        }
    });

    chrome.tabs.onActivated.addListener(async info => {
        try {
            const tab = await chrome.tabs.get(info.tabId);
            if (tab?.url) updateContextMenu(tab.url);
        } catch (e) {}
    });

    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (tab.url?.startsWith("chrome://")) {
            showNotification("errorTitle", "chromePageError");
            return;
        }
        switch (info.menuItemId) {
            case MENU_COPY_ID:
                copySession(info.pageUrl, tab.id);
                break;
            case MENU_PASTE_ID:
                pasteSession();
                break;
        }
    });

    chrome.omnibox.onInputEntered.addListener(processSessionData);
    updateOmniboxSuggestion();
    chrome.omnibox.onInputStarted.addListener(updateOmniboxSuggestion);
    chrome.omnibox.onInputChanged.addListener(updateOmniboxSuggestion);

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "prepareCookieData") {
            getCookies(message.url, data => sendResponse({ success: true, data }));
            return true;
        }
        if (message.action === "processPasteData") {
            const success = processClipboardData(message.clipboardText);
            sendResponse({ success });
            return true;
        }
        if (message.action === "showNotification") {
            showNotification("generalNoticeTitle", message.message);
            sendResponse({ success: true });
            return true;
        }
        if (message.action === "contentScriptReady") {
            sendResponse({ success: true });
            return true;
        }
    });
})();