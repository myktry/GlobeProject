# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Run locally (PowerShell)

Open PowerShell in the project root and run:

```powershell
cd "c:\Users\NEW PC\GlobeProject"
npm install
npm run dev
```

Notes:
- Vite defaults to port 5173; if it's busy Vite may fall back to 5174. The dev server proxy is configured to use `SERVER_PORT` (default 8000).
- You can configure ports in the provided `.env` file: `VITE_PORT` and `SERVER_PORT`.
- To run the Electron app in dev mode (starts Vite + server, then Electron):

```powershell
npm run electron-dev
```
