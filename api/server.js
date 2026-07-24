require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Inicializamos el cliente de Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { message, contextData, systemPrompt } = req.body;

    if (!message) {
      return res.status(400).json({ error: "El mensaje es requerido." });
    }

    // Usaremos el modelo 'gemini-2.5-flash' para respuestas rápidas
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt ? systemPrompt + '\n\n' : ''}Contexto del Inventario (Resumen o Esquema):\n${JSON.stringify(contextData)}\n\nUsuario: ${message}` }]
        }
      ]
    });

    return res.json({ 
      success: true, 
      reply: response.text 
    });

  } catch (error) {
    console.error("Error en el chatbot:", error);
    res.status(500).json({ error: "Error interno del servidor al consultar la IA." });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Asistente IA Backend corriendo en http://localhost:${PORT}`);
  console.log(`Asegúrate de haber configurado tu GEMINI_API_KEY en el archivo .env`);
});
