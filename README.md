# FlowPay — Frontend (React + Vite + Tailwind)

Panel web del MVP: dashboard de cobranza, **cobros** (lo que te deben), clientes y detalle con línea de tiempo de recordatorios. No es facturación electrónica.

## Requisitos

- Node.js 20+ (recomendado)

## Instalación y desarrollo

```bash
npm install
npm run dev
```

Abre `http://127.0.0.1:5173`. El proxy de Vite reenvía `/api` al backend en `http://127.0.0.1:8080`; arranca primero la API.

## Build de producción

```bash
npm run build
npm run preview
```

## Producto

- Mensaje central: **“Te ayudamos a cobrar más rápido, automáticamente.”**
- Sin autenticación en el MVP (`company_id=1` fijo en cliente API).
- Rutas principales: `/` (dashboard), `/cobros`, `/cobros/:id`, `/clients`.
