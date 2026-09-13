# TikTok Multi Poster

MVP personal para:

- conectar múltiples cuentas TikTok por OAuth oficial;
- subir un MP4;
- escribir una descripción;
- seleccionar varias cuentas;
- publicar el mismo video en ellas.

## Requisitos

- Node.js 20+.
- Proyecto Supabase.
- App en TikTok for Developers con Login Kit + Content Posting API.
- `video.publish` y `user.info.basic` autorizados.

## Desarrollo local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abrí `http://localhost:3000`.

## Importante

TikTok restringe a privado las publicaciones de clientes no auditados. Para publicación pública, la app debe pasar la auditoría de TikTok.
