# Whiskana

Una app para tomar notas de cata durante un roadtrip de whisky.

## ¿Qué es Whiskana?

Whiskana es una aplicación web diseñada para los amantes del whisky que quieren registrar sus experiencias de cata mientras viajan de destilería en destilería. Toma notas detalladas de cada dram, guarda el recuerdo de cada visita y construye tu propio diario de whisky en ruta.

## Características

- **Notas de cata** — Registra nariz, boca, final, puntuación y observaciones de cada whisky.
- **Audio y transcripción** — Puedes subir o grabar audio y usar IA para rellenar la ficha de forma tentativa.
- **Mapa** — Guarda ubicaciones y visualiza tus catas en un mapa.
- **Persistencia en base de datos** — Las catas se guardan en MongoDB Atlas.
- **Resumen y exportación** — Puedes ver un resumen, exportar CSV/JSON y volver a cargar datos de demostración.

## Cómo usar

1. Abre la app en el navegador.
2. Pulsa “Nueva cata” para crear una entrada.
3. Completa los campos de la cata o usa el flujo de audio/transcripción.
4. Guarda la cata y visualiza los resultados en la lista, el mapa o el resumen.
5. Usa el botón de recarga demo si quieres volver a cargar los datos de ejemplo.

## Variables de entorno

La aplicación espera dos archivos de entorno en la raíz del proyecto:

- [openai-apikey.env](../openai-apikey.env): contiene la API key de OpenAI.
- [atlas-credentials.env](../atlas-credentials.env): contiene la URI de MongoDB Atlas.

Ejemplo de contenido:

```env
# openai-apikey.env
OPENAI_API_KEY=tu_api_key_aqui
```

```env
# atlas-credentials.env
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/whiskana?retryWrites=true&w=majority
PORT=3000
```

### Variables necesarias

- `OPENAI_API_KEY`: clave para transcribir audio y generar sugerencias con OpenAI.
- `MONGODB_URI`: cadena de conexión a MongoDB Atlas.
- `PORT`: puerto donde se ejecutará el servidor (por defecto `3000`).

## Ejecución local

Instala las dependencias:

```bash
npm install
```

Inicia el servidor:

```bash
npm start
```

La app quedará disponible en:

```text
http://localhost:3000
```

## Despliegue

### Opción 1: Render / Railway / Fly.io / similar

1. Sube el proyecto a un repositorio Git.
2. Crea un servicio nuevo en la plataforma elegida.
3. Configura las variables de entorno `OPENAI_API_KEY`, `MONGODB_URI` y `PORT`.
4. Indica que el comando de arranque es:

```bash
npm start
```

5. Despliega el servicio.

### Opción 2: VPS o servidor propio

1. Instala Node.js y npm.
2. Clona el repositorio y entra en la carpeta.
3. Instala dependencias con `npm install`.
4. Añade los archivos de entorno correspondientes.
5. Inicia la app con `npm start` o usa un gestor de procesos como PM2.

### Recomendación de producción

- Usa un proceso gestor como PM2 para mantener el servicio activo.
- Protege las credenciales de OpenAI y MongoDB con variables de entorno o un gestor de secretos.
- Usa HTTPS y un dominio propio si vas a exponer la app públicamente.

## Estructura del proyecto

```text
whiskana/
  public/        # Frontend estático (HTML, CSS y JS)
  server/        # Backend Express y rutas de API
  scripts/       # Scripts auxiliares como el seed de datos
```

## Tecnologías

- Node.js + Express
- MongoDB Atlas + Mongoose
- OpenAI API para transcripción y parsing
- Leaflet para el mapa

## Licencia

MIT
