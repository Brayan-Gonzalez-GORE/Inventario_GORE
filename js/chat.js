document.addEventListener('DOMContentLoaded', () => {
  const btnOpenChat = document.getElementById('btn-ai-chat');
  const chatPanel = document.getElementById('ai-chat-panel');
  const btnCloseChat = document.getElementById('btn-close-chat');
  const chatForm = document.getElementById('ai-chat-form');
  const chatInput = document.getElementById('ai-chat-input');
  const chatMessages = document.getElementById('ai-chat-messages');

  if(!btnOpenChat || !chatPanel) return;

  btnOpenChat.addEventListener('click', () => {
    chatPanel.classList.add('active');
    chatInput.focus();
    btnOpenChat.style.display = 'none';
  });

  btnCloseChat.addEventListener('click', () => {
    chatPanel.classList.remove('active');
    btnOpenChat.style.display = 'flex';
  });

  function appendMessage(sender, text) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-msg', sender === 'user' ? 'msg-user' : 'msg-ai');
    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    chatInput.value = '';

    // Show loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('chat-msg', 'msg-ai', 'loading');
    loadingDiv.textContent = 'Pensando...';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      // Gather context from window.inventario si existe
      let contextData = "El inventario está vacío o no se pudo cargar el contexto local.";
      if (window.inventario && Array.isArray(window.inventario)) {
        // Enviar solo un resumen o los esquemas para evitar saturar el payload
        const totalBienes = window.inventario.length;
        const totalValor = window.inventario.reduce((acc, curr) => acc + (Number(curr.valorCompra) || 0), 0);
        
        // Muestra los primeros 5 equipos para dar idea a la IA de la estructura
        const sample = window.inventario.slice(0, 5); 
        contextData = {
          total_bienes_registrados: totalBienes,
          valor_total_estimado: totalValor,
          muestra_datos: sample,
          mensaje_sistema: "Esta es una muestra parcial de la base de datos de inventario del GORE que el usuario está viendo actualmente."
        };
      }

      const systemPrompt = `Eres un asistente virtual experto en gestión de activos fijos para una entidad pública (GORE).
Tu labor es responder de forma amable, profesional y precisa basándote en el contexto del inventario que te enviaremos.
Si te preguntan por un registro específico y no está en la muestra de datos, responde explicando que solo tienes visibilidad de un subconjunto actualmente, pero que te pregunten cómo pueden buscarlo usando la interfaz del sistema.`;

      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          contextData: contextData,
          systemPrompt: systemPrompt
        })
      });

      const data = await response.json();
      chatMessages.removeChild(loadingDiv);

      if (data.success) {
        appendMessage('ai', data.reply);
      } else {
        appendMessage('ai', 'Error: ' + (data.error || 'No pude obtener una respuesta.'));
      }
    } catch (error) {
      console.error(error);
      chatMessages.removeChild(loadingDiv);
      appendMessage('ai', 'Ocurrió un error al intentar contactar al servidor. ¿Está encendido el servidor Node.js en localhost:3000?');
    }
  });
});
