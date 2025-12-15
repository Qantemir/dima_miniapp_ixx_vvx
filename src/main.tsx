import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

// Безопасная инициализация приложения
function initApp() {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    console.error("Root element not found. Make sure <div id='root'></div> exists in index.html");
    // Создаем элемент, если его нет (fallback)
    const newRoot = document.createElement("div");
    newRoot.id = "root";
    document.body.appendChild(newRoot);
    return newRoot;
  }
  return rootElement;
}

try {
  const rootElement = initApp();
  const root = createRoot(rootElement);
  
  root.render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
} catch (error) {
  console.error("Failed to initialize React app:", error);
  // Показываем сообщение об ошибке пользователю
  const rootElement = document.getElementById("root") || document.body;
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; font-family: system-ui;">
      <div>
        <h1 style="color: #ef4444; margin-bottom: 16px;">Ошибка загрузки приложения</h1>
        <p style="color: #6b7280; margin-bottom: 16px;">${error instanceof Error ? error.message : 'Неизвестная ошибка'}</p>
        <button onclick="window.location.reload()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
          Перезагрузить
        </button>
      </div>
    </div>
  `;
}
