"use client";

import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function GlowingShowcase() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Interactive Bio-Nexus Cards</h2>
        <p className="text-muted-foreground">
          Hover over the cards to see the glowing border effect in action
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dataset Stats Card */}
        <div className="relative rounded-2xl border border-border bg-background p-1">
          <GlowingEffect
            spread={45}
            glow={true}
            disabled={false}
            proximity={72}
            inactiveZone={0.05}
            borderWidth={3}
            movementDuration={1.8}
          />
          <Card className="relative border-0 bg-background/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Active Research
                </Badge>
                <span className="text-3xl">🧬</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">120,000+</h3>
              <p className="text-muted-foreground text-sm">
                Bioscience datasets from decades of NASA research missions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* AI Analysis Card */}
        <div className="relative rounded-2xl border border-border bg-background p-1">
          <GlowingEffect
            spread={45}
            glow={true}
            disabled={false}
            proximity={72}
            inactiveZone={0.05}
            borderWidth={3}
            movementDuration={1.8}
          />
          <Card className="relative border-0 bg-background/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  AI Powered
                </Badge>
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Smart Analysis</h3>
              <p className="text-muted-foreground text-sm">
                Advanced AI algorithms for hypothesis generation and risk assessment
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mission Planning Card */}
        <div className="relative rounded-2xl border border-border bg-background p-1">
          <GlowingEffect
            spread={45}
            glow={true}
            disabled={false}
            proximity={72}
            inactiveZone={0.05}
            borderWidth={3}
            movementDuration={1.8}
          />
          <Card className="relative border-0 bg-background/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Mission Ready
                </Badge>
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Risk Forecasting</h3>
              <p className="text-muted-foreground text-sm">
                Predict and mitigate biological risks for future space missions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Research Insights Card */}
        <div className="relative rounded-2xl border border-border bg-background p-1">
          <GlowingEffect
            spread={45}
            glow={true}
            disabled={false}
            proximity={72}
            inactiveZone={0.05}
            borderWidth={3}
            movementDuration={1.8}
          />
          <Card className="relative border-0 bg-background/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  Research Insights
                </Badge>
                <span className="text-3xl">🔬</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Deep Connections</h3>
              <p className="text-muted-foreground text-sm">
                Cross-disciplinary analysis revealing hidden research patterns
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}