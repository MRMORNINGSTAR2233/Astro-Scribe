import Link from "next/link"
import { LiquidGlassButton } from "@/components/ui/liquid-glass-button"

export function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:py-16">
      {/* Features Section */}
      <div className="mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Powerful Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Advanced AI-powered tools for analyzing NASA bioscience research and accelerating space exploration
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Core Features */}
          <div className="rounded-xl border border-border/60 bg-background/50 p-6 backdrop-blur">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-primary text-xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">RAG-Powered Q&A</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Ask complex questions in natural language and get accurate, source-cited answers from 120k+ datasets.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-6 backdrop-blur">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-primary text-xl">🔬</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Hypothesis Generator</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              AI identifies research gaps and suggests novel, testable hypotheses for future scientific investigation.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-6 backdrop-blur">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-primary text-xl">🚀</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Mission Risk Forecaster</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate comprehensive risk profiles for future missions with biological countermeasures and research gaps.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-6 backdrop-blur">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-primary text-xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Data Visualization Suite</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Interactive timelines, trend charts, and knowledge graph explorer for comprehensive data analysis.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-6 backdrop-blur">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-primary text-xl">🔗</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Cross-Disciplinary Connector</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Discover non-obvious connections between different fields of study within the bioscience dataset.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-background/50 p-6 backdrop-blur">
            <div className="mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <span className="text-primary text-xl">✅</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground">Explainable AI</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Every AI-generated insight includes direct citations and links to original source documents.
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Built with Modern Technology</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powered by cutting-edge technologies for performance, scalability, and user experience
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <div className="flex flex-col items-center p-4 rounded-lg border border-border/60 bg-background/50 backdrop-blur">
            <div className="text-2xl mb-2">⚛️</div>
            <span className="text-sm font-medium text-foreground">React 18</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg border border-border/60 bg-background/50 backdrop-blur">
            <div className="text-2xl mb-2">▲</div>
            <span className="text-sm font-medium text-foreground">Next.js 14</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg border border-border/60 bg-background/50 backdrop-blur">
            <div className="text-2xl mb-2">🎨</div>
            <span className="text-sm font-medium text-foreground">Tailwind CSS</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg border border-border/60 bg-background/50 backdrop-blur">
            <div className="text-2xl mb-2">📊</div>
            <span className="text-sm font-medium text-foreground">Recharts</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg border border-border/60 bg-background/50 backdrop-blur">
            <div className="text-2xl mb-2">🔄</div>
            <span className="text-sm font-medium text-foreground">React Query</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg border border-border/60 bg-background/50 backdrop-blur">
            <div className="text-2xl mb-2">🎯</div>
            <span className="text-sm font-medium text-foreground">TypeScript</span>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/50 p-6 text-center backdrop-blur md:flex-row md:text-left mb-16">
        <div>
          <h3 className="text-xl font-semibold text-foreground md:text-2xl">Ready to explore the future of space biology?</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Access 120k+ datasets, generate AI-powered insights, and accelerate space exploration research.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <LiquidGlassButton>Open Dashboard</LiquidGlassButton>
          </Link>
          <Link href="/manager">
            <LiquidGlassButton>Manager View</LiquidGlassButton>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/60 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-foreground mb-4">Project Bio-Nexus</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Unlocking decades of NASA bioscience research to fuel the next era of space exploration. 
              Powered by AI to accelerate scientific discovery and mission planning.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              System Online & Ready
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
              <li><Link href="/manager" className="hover:text-foreground transition-colors">Manager View</Link></li>
              <li><Link href="/mission-planner" className="hover:text-foreground transition-colors">Mission Planner</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="https://osdr.nasa.gov/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">NASA OSDR</a></li>
              <li><a href="https://taskbook.nasaprs.com/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">NASA Task Book</a></li>
              <li><a href="https://www.nasa.gov/biological-physical/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">NASA BPS</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border/60 pt-6 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>&copy; 2025 Project Bio-Nexus. Built for NASA Space Apps Challenge.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span>Built with pnpm</span>
            <span>•</span>
            <span>Powered by AI</span>
            <span>•</span>
            <span>Open Source Ready</span>
          </div>
        </div>
      </footer>
    </section>
  )
}
