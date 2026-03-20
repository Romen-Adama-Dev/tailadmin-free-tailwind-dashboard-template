# Dielca Kiosko Backoffice

Backoffice visual local del kiosko Dielca, construido sobre el fork de TailAdmin sin rehacer el proyecto desde cero.

## Stack

- HTML multipage con includes HTML
- Alpine.js
- Tailwind CSS v4
- Webpack
- Node.js + Express para servir el build y exponer una API local segura
- Supabase como fuente de datos de pedidos historicos
- Docker / Docker Compose para despliegue local en Ubuntu

## Vistas preparadas

- `index.html`: resumen operativo
- `orders.html`: listado de pedidos con filtros
- `order-detail.html`: detalle de pedido
- `sites.html`: sedes

## Variables de entorno

Copia `.env.example` a `.env` y rellena lo necesario.

Variables principales:

- `APP_NAME`: nombre mostrado por el servidor
- `HOST`: host de escucha, recomendado `0.0.0.0`
- `PORT`: puerto de la app
- `DOCKER_BIND_HOST`: interfaz de publicacion en Docker, recomendado `0.0.0.0` para acceso desde la LAN privada
- `LOCAL_TIME_ZONE`: zona horaria local
- `CURRENCY`: moneda de visualizacion, por defecto `EUR`
- `DATA_SOURCE`: `supabase` o `empty`
- `SUPABASE_URL`: URL del proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: clave server-side para leer pedidos sin exponer secretos en frontend
- `SUPABASE_ORDERS_TABLE`: tabla o vista de pedidos
- `SUPABASE_CREATED_AT_COLUMN`: columna de ordenacion temporal
- `SUPABASE_FETCH_LIMIT`: maximo de pedidos que se cargan por consulta
- `DATA_CACHE_TTL_MS`: cache corta en milisegundos para aliviar lecturas repetidas
- `SITES_JSON`: opcional, para sobreescribir el catalogo de sedes

## Uso local sin Docker

```bash
npm install
npm run build
npm run serve
```

La app quedara disponible en `http://IP_LOCAL:PUERTO`.

## Uso con Docker

```bash
docker compose up --build -d
```

Con `HOST=0.0.0.0` y `DOCKER_BIND_HOST=0.0.0.0`, el panel queda accesible desde otros equipos de la misma red privada usando la IP del host, por ejemplo `http://192.168.102.xxx:3000`.

## Notas de arquitectura

- El frontend nunca consulta Supabase con claves sensibles.
- La app cliente habla con `/api/*` en el servidor local Express.
- El servidor local es quien consulta Supabase con `SUPABASE_SERVICE_ROLE_KEY`.
- Si faltan credenciales, el panel queda en modo vacio honesto para no mostrar demo irrelevante.
