"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartTooltip, ChartTooltipContent, ChartContainer } from "@/components/ui/chart";

const data = [
  { date: "Jan", total: Math.floor(Math.random() * 2000) + 1000 },
  { date: "Feb", total: Math.floor(Math.random() * 2000) + 1200 },
  { date: "Mar", total: Math.floor(Math.random() * 2000) + 1500 },
  { date: "Apr", total: Math.floor(Math.random() * 2000) + 1700 },
  { date: "May", total: Math.floor(Math.random() * 2000) + 2000 },
  { date: "Jun", total: Math.floor(Math.random() * 2000) + 2200 },
  { date: "Jul", total: Math.floor(Math.random() * 2000) + 2500 },
  { date: "Aug", total: Math.floor(Math.random() * 2000) + 2300 },
  { date: "Sep", total: Math.floor(Math.random() * 2000) + 2800 },
  { date: "Oct", total: Math.floor(Math.random() * 2000) + 3000 },
  { date: "Nov", total: Math.floor(Math.random() * 2000) + 3500 },
  { date: "Dec", total: Math.floor(Math.random() * 2000) + 4000 },
]

export function PerformanceChart() {
  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
        <CardDescription>Your portfolio value over the last 12 months.</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ChartContainer config={{}} className="h-full w-full">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="date"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <ChartTooltip 
              cursor={false}
              content={<ChartTooltipContent 
                formatter={(value) => `$${value.toLocaleString()}`}
                indicator="dot" 
              />}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
