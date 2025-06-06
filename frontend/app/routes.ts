// frontend/app/routes.ts
import { type RouteConfig, index } from "@react-router/dev/routes";

export default [index("routes/gamePage.tsx")] satisfies RouteConfig;

// import { type RouteConfig, index, route } from "@react-router/dev/routes";

// export default [
//   route("game", "routes/game.tsx"),
//   route("*", "routes/_redirect-to-game.tsx"),
// ] satisfies RouteConfig;
