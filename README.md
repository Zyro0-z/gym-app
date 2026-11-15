# Gym (PWA)
Registro de entrenamientos + el dashboard completo de Obsidian, 100 % local en el iPhone.
Sin build: son ficheros estáticos. Publicar en GitHub Pages (rama main, carpeta raíz) y en Safari: Compartir → Añadir a pantalla de inicio.
- `src/dashboard.js` es el bloque dataviewjs original, sin tocar; `src/dvshim.js` le da la API de Dataview.
- Los datos (sesiones, plantillas, configuración) están en IndexedDB; `seed.json` los siembra la primera vez.
- Ajustes → Exportar/Importar para copias de seguridad.
- `seed.json` **no se publica** (lleva datos personales; está en `.gitignore`). En local siembra la base de datos; en el iPhone, la primera vez la app pide «Importar copia»: vale el `seed.json` o cualquier copia exportada.
- Pruebas: `cd tests && npm i && npx playwright install chromium webkit && node run.mjs`.
