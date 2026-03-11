# Portfolio — Gautham Raju

A futuristic developer portfolio with a sci-fi console aesthetic, built with React, Three.js, and WebGL.

## Stack

- **React** + **Vite**
- **Three.js** / **React Three Fiber** / **Drei**
- **Framer Motion** — page transitions & animations
- **Tailwind CSS** — utility-first styling
- **React Router** — client-side routing

## Features

- Minimalist black & red interface with glow/neon effects
- Full-screen WebGL particle background
- 4 interactive interest cards with 3D tilt & embedded particles
- Dedicated project pages with unique WebGL scenes per specialization
- Custom themed cursor
- Smooth page transitions
- Responsive layout with 12-column grid system

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Production build
npm run build
```

## Project Structure

```
src/
├── App.jsx                  # Router + animated transitions
├── main.jsx                 # Entry point (BrowserRouter)
├── index.css                # Tailwind + sci-fi theme
├── components/
│   ├── Hero.jsx             # Name header + red underline
│   ├── InterestCard.jsx     # 3D tilt cards with WebGL particles
│   ├── Sidebar.jsx          # Contacts + profile summary
│   └── WebGLBackground.jsx  # Animated particle grid
├── pages/
│   ├── Home.jsx             # Homepage layout
│   └── ProjectPage.jsx      # Dynamic project scene shell
└── scenes/
    ├── cvScene.jsx           # Computer Vision scene
    ├── fpvScene.jsx          # FPV Drones scene
    ├── embeddedScene.jsx     # Embedded Systems scene
    └── roboticsScene.jsx     # Robotics scene
```

## License

MIT
