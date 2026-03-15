"use client";

import { useState } from "react";
import { marketSnapshotSummary } from "@/ai/flows/market-snapshot-summary";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Wand2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export function MarketSnapshot() {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    setSummary("");
    try {
      const result = await marketSnapshotSummary({ userPreferences: "Focus on tech and renewable energy sectors." });
      setSummary(result.summary);
    } catch (error) {
      console.error("Failed to generate market summary:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate market summary. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full shadow-md flex flex-col">
      <CardHeader>
        <CardTitle>AI Market Snapshot</CardTitle>
        <CardDescription>
          Get a quick, AI-powered summary of market trends.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : summary ? (
          <p className="text-sm text-muted-foreground">{summary}</p>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">
            Click the button to generate your personalized market summary.
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerateSummary} disabled={isLoading} className="w-full bg-accent hover:bg-accent/90">
          <Wand2 className="mr-2 h-4 w-4" />
          {isLoading ? "Generating..." : "Generate Snapshot"}
        </Button>
      </CardFooter>
    </Card>
  );
}
