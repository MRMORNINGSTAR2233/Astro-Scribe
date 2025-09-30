"use client"

import { GlowingEffect } from "@/components/ui/glowing-effect"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Rocket, Database, Brain, Microscope, BarChart3, AlertTriangle } from "lucide-react"

export default function InteractiveDemo() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">Interactive Bio-Nexus Demo</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Experience the responsive glowing borders by hovering over any card below. 
            Each element reacts to your mouse movement with smooth animations.
          </p>
          <Badge variant="secondary" className="text-sm">
            Move your mouse around to see the effects
          </Badge>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Dashboard Card */}
          <div className="relative rounded-2xl border border-border bg-background p-1">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={80}
              inactiveZone={0.05}
              borderWidth={3}
              movementDuration={1.5}
            />
            <Card className="relative border-0 bg-background/90 backdrop-blur-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Dashboard</CardTitle>
                    <CardDescription>Search & Analysis</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  RAG-powered search through 120k+ bioscience datasets with AI-generated insights and source citations.
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">120k+ Datasets</Badge>
                  <Badge variant="outline" className="text-xs">AI Search</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Manager View Card */}
          <div className="relative rounded-2xl border border-border bg-background p-1">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={80}
              inactiveZone={0.05}
              borderWidth={3}
              movementDuration={1.5}
            />
            <Card className="relative border-0 bg-background/90 backdrop-blur-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Manager View</CardTitle>
                    <CardDescription>Analytics & Metrics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Team capacity visualization, project timelines, and ROI analytics for research program management.
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">Team Analytics</Badge>
                  <Badge variant="outline" className="text-xs">ROI Tracking</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mission Planner Card */}
          <div className="relative rounded-2xl border border-border bg-background p-1">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={80}
              inactiveZone={0.05}
              borderWidth={3}
              movementDuration={1.5}
            />
            <Card className="relative border-0 bg-background/90 backdrop-blur-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Rocket className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Mission Planner</CardTitle>
                    <CardDescription>Risk Assessment</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  AI-powered mission risk forecasting with biological countermeasures and knowledge gap identification.
                </p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">Risk Analysis</Badge>
                  <Badge variant="outline" className="text-xs">Forecasting</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* AI Features Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">AI-Powered Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Hypothesis Generator */}
            <div className="relative rounded-xl border border-border bg-background/50 p-6">
              <GlowingEffect
                spread={35}
                glow={true}
                disabled={false}
                proximity={60}
                inactiveZone={0.1}
                borderWidth={2}
                movementDuration={1.3}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="text-xl font-semibold">Hypothesis Generator</h3>
                    <p className="text-sm text-muted-foreground">AI-driven research insights</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Advanced AI algorithms analyze research gaps and generate novel, testable hypotheses 
                  by connecting findings from unrelated papers.
                </p>
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <p className="text-sm font-medium text-foreground mb-2">Example Hypothesis:</p>
                  <p className="text-sm text-muted-foreground italic">
                    "Mitochondrial adaptation under prolonged microgravity increases ROS signaling, 
                    potentially providing cellular protection mechanisms for Mars missions."
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <Badge variant="secondary" className="text-xs">Confidence: 78%</Badge>
                    <span className="text-xs text-muted-foreground">Based on 47 papers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cross-Disciplinary Analysis */}
            <div className="relative rounded-xl border border-border bg-background/50 p-6">
              <GlowingEffect
                spread={35}
                glow={true}
                disabled={false}
                proximity={60}
                inactiveZone={0.1}
                borderWidth={2}
                movementDuration={1.3}
              />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <Microscope className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="text-xl font-semibold">Cross-Disciplinary Connector</h3>
                    <p className="text-sm text-muted-foreground">Hidden research connections</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Discovers non-obvious connections between different fields of space biology research, 
                  revealing insights across disciplines.
                </p>
                <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                  <p className="text-sm font-medium text-foreground mb-2">Connection Found:</p>
                  <p className="text-sm text-muted-foreground">
                    Plant cellular mechanisms in microgravity → Human bone density research
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <Badge variant="secondary" className="text-xs">Relevance: 85%</Badge>
                    <span className="text-xs text-muted-foreground">23 shared pathways</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mission Risk Example */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Mission Risk Assessment</h2>
          <div className="max-w-4xl mx-auto">
            <div className="relative rounded-2xl border border-border bg-background p-8">
              <GlowingEffect
                spread={50}
                glow={true}
                disabled={false}
                proximity={100}
                inactiveZone={0.05}
                borderWidth={3}
                movementDuration={2}
              />
              <div className="relative">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">Mars Mission Risk Profile</h3>
                  <p className="text-muted-foreground">900-day mission duration</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* High Risk */}
                  <div className="relative rounded-lg border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-900/10">
                    <GlowingEffect
                      spread={25}
                      glow={true}
                      disabled={false}
                      proximity={40}
                      inactiveZone={0.2}
                      borderWidth={1.5}
                      movementDuration={1}
                      variant="white"
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span className="font-semibold text-red-700 dark:text-red-400">High Risk</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Radiation Exposure</span>
                          <span className="text-sm font-medium">88%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Bone Density Loss</span>
                          <span className="text-sm font-medium">74%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medium Risk */}
                  <div className="relative rounded-lg border border-yellow-200 bg-yellow-50/50 p-4 dark:border-yellow-900 dark:bg-yellow-900/10">
                    <GlowingEffect
                      spread={25}
                      glow={true}
                      disabled={false}
                      proximity={40}
                      inactiveZone={0.2}
                      borderWidth={1.5}
                      movementDuration={1}
                      variant="white"
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        <span className="font-semibold text-yellow-700 dark:text-yellow-400">Medium Risk</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Immune Dysregulation</span>
                          <span className="text-sm font-medium">42%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Muscle Atrophy</span>
                          <span className="text-sm font-medium">38%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Knowledge Gaps */}
                  <div className="relative rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-900/10">
                    <GlowingEffect
                      spread={25}
                      glow={true}
                      disabled={false}
                      proximity={40}
                      inactiveZone={0.2}
                      borderWidth={1.5}
                      movementDuration={1}
                      variant="white"
                    />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-700 dark:text-blue-400">Knowledge Gaps</span>
                      </div>
                      <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                        <li>• Long-duration microbiome shifts</li>
                        <li>• Partial gravity countermeasures</li>
                        <li>• Psychological adaptation</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="relative inline-block">
            <div className="relative rounded-2xl border border-border bg-background p-8">
              <GlowingEffect
                spread={45}
                glow={true}
                disabled={false}
                proximity={80}
                inactiveZone={0.1}
                borderWidth={3}
                movementDuration={1.8}
              />
              <div className="relative">
                <h2 className="text-3xl font-bold mb-4">Ready to Explore Bio-Nexus?</h2>
                <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                  Experience the full platform with interactive glowing borders, AI-powered insights, 
                  and comprehensive space biology research tools.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button size="lg" className="relative">
                    <Rocket className="mr-2 h-5 w-5" />
                    Launch Dashboard
                  </Button>
                  <Button variant="outline" size="lg">
                    View Documentation
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}