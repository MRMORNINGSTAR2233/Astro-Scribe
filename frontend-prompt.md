## 1. Project Setup & Structure
Your goal is a codebase with a shadcn/ui structure, Tailwind CSS, and TypeScript. The best way to achieve this from scratch is by using the shadcn-ui CLI itself.

Setting Up a New Project
If you are starting a new project, follow these steps. This will create a Next.js project with TypeScript and Tailwind CSS, and then configure it for shadcn/ui.

Create a Next.js App:

Bash

npx create-next-app@latest my-nexus-app --typescript --tailwind --eslint
Initialize Shadcn/UI: Navigate into your new project directory (cd my-nexus-app) and run the init command:

Bash

npx shadcn-ui@latest init
The CLI will ask you a few questions. These are the recommended answers to establish the structure you want:

Would you like to use TypeScript (recommended)? › Yes

Which style would you like to use? › Default

Which color would you like to use as base color? › Slate (This is a good neutral dark-mode base)

Where is your global CSS file? › app/globals.css

Do you want to use CSS variables for colors? › Yes

Where is your tailwind.config.js file? › tailwind.config.ts

Configure the import alias for components:? › @/components

Configure the import alias for utils:? › @/lib

Are you using React Server Components? › Yes

Default Path for Components (/components/ui)
After running init, shadcn/ui sets up an alias @/components that points to the /components directory.

When you later add a component via the CLI (e.g., npx shadcn-ui@latest add button), it will automatically create and place that component inside /components/ui. For example, the button would be at /components/ui/button.tsx.

It is important to create and use the /components/ui folder for these types of components because:

Convention: It's the standard convention established by shadcn/ui. Following it makes your project predictable and easier for others (or yourself later) to understand.

Separation of Concerns:

/components/ui: This folder is for general-purpose, reusable, and often "dumb" UI primitives (like Button, Card, Input). Many of these will be added by the shadcn/ui CLI.

/components: The root components folder can then be used for more complex, application-specific components (e.g., ResultsDisplay, MissionPlannerForm) that are composed of the smaller UI primitives.

## 2. Updated & Merged Prompt for AI Developer
Here is the complete, robust prompt to provide to an AI developer assistant. It now includes the WebGL background, its dependencies, and instructions to make it the centerpiece of the landing page.

Prompt for AI Developer Assistant:

You are an expert frontend developer specializing in building complex, data-driven dashboards with Next.js 14+ (App Router) and TypeScript. Your task is to create the complete frontend code for a project called "Project Bio-Nexus," a web dashboard for exploring NASA bioscience research.

The application should have a futuristic, data-centric aesthetic, anchored by a dynamic WebGL shader background on its landing page. The overall color scheme of the website should complement this background.

Crucial Constraint: A backend API already exists. You are to build the frontend exclusively, which will consume this API. Do not create any Next.js API routes.

Core Technologies to Use:
Framework: Next.js 14+ (App Router)

Language: TypeScript

Styling: Tailwind CSS

UI Components: Shadcn/UI.

3D/Graphics: Three.js

Icons: lucide-react

Data Fetching/State: TanStack Query (React Query) for server state. Zustand for global client state.

Visualizations: React Flow and Recharts.

NPM Dependencies to Install:
Before starting, create the project and install the following dependencies:

Bash

npm install three @radix-ui/react-slot class-variance-authority
npm install @types/three --save-dev
File & Folder Structure:
Organize the project using the standard shadcn/ui convention:

/app
|-- /components
|   |-- /ui             // For shadcn components and primitives
|   |   |-- web-gl-shader.tsx
|   |   |-- liquid-glass-button.tsx
|   |-- /dashboard      // Components for the main explorer
|   |-- /mission-planner// Components for the risk forecaster
|-- /store              // Zustand store definition
|-- /types              // index.ts with type definitions
|-- page.tsx            // Main Landing Page
|-- /dashboard          // Route for the main application
|   |-- page.tsx
|-- layout.tsx
|-- globals.css
(Other routes like /mission-planner and /manager-view will also be created).

Implementation Plan & Code:
Step 1: Create the UI Primitives and Background

First, create the following files inside the /components/ui directory with the exact code provided.

File: /components/ui/web-gl-shader.tsx

TypeScript

"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

export function WebGLShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene | null
    camera: THREE.OrthographicCamera | null
    renderer: THREE.WebGLRenderer | null
    mesh: THREE.Mesh | null
    uniforms: any
    animationId: number | null
  }>({
    scene: null,
    camera: null,
    renderer: null,
    mesh: null,
    uniforms: null,
    animationId: null,
  })

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const { current: refs } = sceneRef

    const vertexShader = `
      attribute vec3 position;
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `

    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform float time;
      uniform float xScale;
      uniform float yScale;
      uniform float distortion;

      void main() {
        vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
        
        float d = length(p) * distortion;
        
        float rx = p.x * (1.0 + d);
        float gx = p.x;
        float bx = p.x * (1.0 - d);

        float r = 0.05 / abs(p.y + sin((rx + time) * xScale) * yScale);
        float g = 0.05 / abs(p.y + sin((gx + time) * xScale) * yScale);
        float b = 0.05 / abs(p.y + sin((bx + time) * xScale) * yScale);
        
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `

    const initScene = () => {
      refs.scene = new THREE.Scene()
      refs.renderer = new THREE.WebGLRenderer({ canvas })
      refs.renderer.setPixelRatio(window.devicePixelRatio)
      refs.renderer.setClearColor(new THREE.Color(0x000000))

      refs.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, -1)

      refs.uniforms = {
        resolution: { value: [window.innerWidth, window.innerHeight] },
        time: { value: 0.0 },
        xScale: { value: 1.0 },
        yScale: { value: 0.5 },
        distortion: { value: 0.05 },
      }

      const position = [
        -1.0, -1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0, -1.0, 0.0,
        -1.0,  1.0, 0.0,
         1.0,  1.0, 0.0,
      ]

      const positions = new THREE.BufferAttribute(new Float32Array(position), 3)
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute("position", positions)

      const material = new THREE.RawShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: refs.uniforms,
        side: THREE.DoubleSide,
      })

      refs.mesh = new THREE.Mesh(geometry, material)
      refs.scene.add(refs.mesh)

      handleResize()
    }

    const animate = () => {
      if (refs.uniforms) refs.uniforms.time.value += 0.01
      if (refs.renderer && refs.scene && refs.camera) {
        refs.renderer.render(refs.scene, refs.camera)
      }
      refs.animationId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      if (!refs.renderer || !refs.uniforms) return
      const width = window.innerWidth
      const height = window.innerHeight
      refs.renderer.setSize(width, height, false)
      refs.uniforms.resolution.value = [width, height]
    }

    initScene()
    animate()
    window.addEventListener("resize", handleResize)

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId)
      window.removeEventListener("resize", handleResize)
      if (refs.mesh) {
        refs.scene?.remove(refs.mesh)
        refs.mesh.geometry.dispose()
        if (refs.mesh.material instanceof THREE.Material) {
          refs.mesh.material.dispose()
        }
      }
      refs.renderer?.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 -z-10 w-full h-full block" // Use -z-10 to place it behind content
    />
  )
}
File: /components/ui/liquid-glass-button.tsx

TypeScript

"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const liquidbuttonVariants = cva(
  "inline-flex items-center transition-colors justify-center cursor-pointer gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:scale-105 duration-300 transition text-primary",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 text-xs gap-1.5 px-4",
        lg: "h-10 rounded-md px-6",
        xl: "h-12 rounded-md px-8",
        xxl: "h-14 rounded-md px-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "xxl",
    },
  }
)

function LiquidButton({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof liquidbuttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <>
      <Comp
        data-slot="button"
        className={cn(
          "relative",
          liquidbuttonVariants({ variant, size, className })
        )}
        {...props}
      >
        <div className="absolute top-0 left-0 z-0 h-full w-full rounded-full  
          shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(255,255,255,0.15)]  
      transition-all  
      dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(255,255,255,0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(255,255,255,0.85),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_-1px_-1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_6px_6px_rgba(255,255,255,0.12),inset_0_0_2px_2px_rgba(255,255,255,0.06),0_0_12px_rgba(0,0,0,0.15)]" />
        <div
          className="absolute top-0 left-0 isolate -z-10 h-full w-full overflow-hidden rounded-md"
          style={{ backdropFilter: 'url("#container-glass")' }}
        />

        <div className="pointer-events-none z-10 ">
          {children}
        </div>
        <GlassFilter />
      </Comp>
    </>
  )
}

function GlassFilter() {
  return (
    <svg className="hidden">
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

export { LiquidButton };
Step 2: Create the Landing Page

Now, use the components you just created to build the main landing page.

File: /app/page.tsx

TypeScript

import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from '@/components/ui/liquid-glass-button';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      <WebGLShader />
      <div className="relative border border-zinc-800 p-2 w-full mx-auto max-w-4xl backdrop-blur-sm bg-black/30 rounded-lg">
        <main className="relative border border-zinc-800 py-10 overflow-hidden rounded-md">
          <h1 className="mb-3 text-white text-center text-5xl font-extrabold tracking-tighter md:text-[clamp(2rem,8vw,7rem)]">
            Project Bio-Nexus
          </h1>
          <p className="text-white/60 px-6 text-center text-sm md:text-base lg:text-lg max-w-2xl mx-auto">
            Unlocking decades of NASA bioscience research to fuel the next era of space exploration.
          </p>
          <div className="my-8 flex items-center justify-center gap-1">
            <span className="relative flex h-3 w-3 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            <p className="text-xs text-green-500">Online & Ready for Analysis</p>
          </div>
          
          <div className="flex justify-center">
            <Link href="/dashboard">
              <LiquidButton className="text-white border rounded-full border-zinc-700" size={'xl'}>
                Enter Dashboard
              </LiquidButton>
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
Step 3: Proceed with the "Project Bio-Nexus" Dashboard Implementation

After creating the landing page, proceed with the full dashboard implementation as previously discussed. The main application will live at the /dashboard route. The rest of the prompt (API endpoints, data structures, and other component requirements for the dashboard itself) remains the same as our previous discussion

Step 3: Build the Main Application Layout (/app/layout.tsx and Nav Components)

layout.tsx: Set up the basic HTML structure, include providers for TanStack Query and Zustand, and use a clean, modern font like Inter.

Navbar.tsx: Create a top navigation bar with the project name and links to the Dashboard (/dashboard), Mission Planner (/mission-planner), and Manager View (/manager-view). It should have a slightly transparent, dark background to complement the theme.

Step 4: Build the Main Dashboard Page (/app/dashboard/page.tsx)

This is the core of the application.

page.tsx: This page should have a two-column layout: a Sidebar on the left (for filters) and the main content area on the right.

State: Manages the main search query state. Uses a useQuery hook to call the /api/search endpoint, passing the query and filter values from the Zustand store.

Content: Renders the SearchBar at the top of the main content area, followed by the ResultsDisplay component, passing the data, isLoading, and isError states from useQuery.

Sidebar & Filters (Sidebar.tsx, FilterPanel.tsx):

The Sidebar contains the FilterPanel.

FilterPanel should have controls (e.g., Shadcn Select, Slider) for "Publication Year" and "Research Subject."

Changes to these filters must update the global Zustand store, which will automatically trigger a refetch in the dashboard page's useQuery.

Search & Results (SearchBar.tsx, ResultsDisplay.tsx, PaperCard.tsx, HypothesisCard.tsx):

SearchBar: An input field with a search button and a placeholder microphone icon for the voice feature.

ResultsDisplay: Must handle the loading state (show skeleton cards) and an error state. It will map over the search results and render either a PaperCard or a HypothesisCard for each item.

PaperCard: Display paper data using a Shadcn Card. Must include a small SourceCitation component and display the consensusTag if it exists.

HypothesisCard: A distinctively styled card for displaying AI-generated hypotheses.

Step 5: Build the Special-Purpose Pages

Mission Risk Forecaster (/app/mission-planner/page.tsx):

Create a clean form (MissionPlannerForm.tsx) for mission parameters (duration, destination).

Use useMutation from TanStack Query to POST to the /api/mission-risk endpoint when the form is submitted.

Display the results in a well-structured RiskProfileDisplay.tsx component, showing ranked risks and knowledge gaps in separate sections.

Manager View (/app/manager-view/page.tsx):

Use useQuery to fetch data from /api/manager-stats.

Render two visualization components from the /visualizations folder:

A bar chart (using Recharts) for "Publications by Year."

Another bar chart for "Publications by Grant."

Step 6: Final Touches and Visual Consistency

Visualizations: Create wrapper components for Recharts and React Flow in the /components/visualizations directory to make them easy to reuse. The GraphExplorer.tsx should accept nodes and edges as props and render an interactive graph.

Theme: Ensure the dashboard's design (cards, charts, backgrounds) aligns with the dark, futuristic aesthetic of the landing page. Use dark-themed Shadcn components and semi-transparent backgrounds where appropriate.

Provide the complete, production-ready code for each file as requested. Ensure all components are functional, styled with Tailwind CSS, and use the specified libraries correctly.








