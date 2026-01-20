import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const tools = [
  {
    title: "Flower Planting Calendar",
    href: "/tools/flower-calendar",
    image: "/images/Flower planting calculator.png",
    color: "border-blue-200"
  },
  {
    title: "Pot Size Calculator",
    href: "/tools/pot-calculator",
    image: "/images/pot size calculator.png",
    color: "border-green-200"
  },
  {
    title: "Bloom Time Calculator",
    href: "/tools/bloom-calculator",
    image: "/images/bloom time calender.png",
    color: "border-purple-200"
  },
  {
    title: "Budget Planner",
    href: "/tools/budget-planner",
    image: "/images/budget planner.png",
    color: "border-orange-200"
  }
];

export function ToolsSection() {
  const imageVersion = "v2";
  return (
    <section id="tools" className="py-12 md:py-16 relative overflow-hidden z-10">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: "radial-gradient(ellipse 50% 30% at 50% 50%, hsl(142 76% 36% / 0.08) 0%, transparent 70%)"
        }}
      />
      
      <div className="w-full mx-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-6 xl:px-8 2xl:px-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
            Gardening Tools & Calculators
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Practical tools to help you plan, calculate, and optimize your gardening activities for better results.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-8">
          {tools.map((tool) => (
            <Card
              key={tool.title}
              className={cn(
                "group overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                tool.color
              )}
            >
              <Link to={tool.href} className="block h-full">
                <div className="w-full aspect-square overflow-hidden bg-muted p-2 flex items-center justify-center">
                  <img
                    src={`${tool.image}?${imageVersion}`}
                    alt={tool.title}
                    className="w-full h-full object-contain block"
                    loading="lazy"
                  />
                </div>
                <div className="px-2 py-2 text-center">
                  <span className="text-sm font-medium text-foreground">{tool.title}</span>
                </div>
              </Link>
            </Card>
          ))}
        </div>

        {/* Explore More CTA */}
        <div className="text-center">
          <Button asChild variant="outline" size="lg" className="group">
            <Link to="/tools" className="flex items-center">
              Explore All Tools
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
