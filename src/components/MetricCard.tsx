import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, cn } from './ui';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  colorClass?: string;
  key?: string | number;
}

export function MetricCard({ title, value, subtitle, colorClass }: MetricCardProps) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-wide">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold font-sans tracking-tight", colorClass || "text-slate-900")}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs font-semibold text-slate-500 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
