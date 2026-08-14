import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Bot, Boxes, Database, Lightbulb, Search, Sparkles, TrendingDown, Users } from "lucide-react";
import { useLocation } from "wouter";

const categoryColors: Record<string, string> = { Tools: "bg-primary", Health: "bg-primary", Education: "bg-primary", AI: "bg-primary", Games: "bg-primary" };

function MetricCard({ label, value, helper, icon: Icon }: { label: string; value: string | number; helper: string; icon: typeof Boxes }) {
 return <Card className="overflow-hidden border border-border bg-card shadow-none">
 <CardContent className="p-5">
 <div className="flex items-start justify-between">
 <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm text-muted-foreground">{helper}</p></div>
 <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
 </div>
 </CardContent>
 </Card>;
}

export default function Home() {
 const [, setLocation] = useLocation();
 const stats = trpc.dashboard.bootstrap.useQuery(undefined, { staleTime: 60_000 });
 const ideas = trpc.ideas.list.useQuery({ competitionLevel: "Low", limit: 5, offset: 0 }, { enabled: !!stats.data });
 const data = stats.data;
 return <DashboardLayout>
 <div className="mx-auto max-w-[1500px] space-y-6">
 <section className="rounded-2xl border border-border bg-card px-6 py-8 sm:px-10 sm:py-10">
 <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
 <div className="max-w-2xl"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="h-4 w-4" /> Product intelligence workspace</div><h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">From idea backlog to a validated app thesis.</h1><p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">Explore 200 focused Android opportunities, benchmark competitors, scrape public store intelligence, and use your OpenRouter model to turn a hunch into a build plan.</p></div>
 <div className="flex flex-wrap gap-3"><Button onClick={() => setLocation("/ideas")}><Search className="mr-2 h-4 w-4" />Explore ideas</Button><Button onClick={() => setLocation("/scraper")} variant="outline"><Database className="mr-2 h-4 w-4" />Scrape an app</Button></div>
 </div>
 </section>

 <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
 <MetricCard label="Idea catalog" value={data?.ideas ?? "—"} helper="seeded opportunities" icon={Lightbulb} />
 <MetricCard label="Competitor records" value={data?.competitors ?? "—"} helper="three per opportunity" icon={Users} />
 <MetricCard label="Low competition" value={data?.lowCompetition ?? "—"} helper="best starting wedges" icon={TrendingDown} />
 <MetricCard label="Strong revenue" value={data?.highRevenue ?? "—"} helper="very strong potential" icon={Bot} />
 </section>

 <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
 <Card className="border-0 shadow-sm ring-1 ring-border/60"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Catalog mix</CardTitle><p className="mt-1 text-sm text-muted-foreground">The opportunity set by vertical.</p></div><Boxes className="h-5 w-5 text-muted-foreground" /></CardHeader><CardContent className="space-y-5">
 {(data?.categories ?? []).map(item => <div key={item.category} className="space-y-2"><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-medium"><span className={`h-2.5 w-2.5 rounded-full ${categoryColors[item.category] ?? "bg-card"}`} />{item.category}</span><span className="text-muted-foreground">{item.count} ideas</span></div><Progress value={(item.count / Math.max(data?.ideas ?? 200, 1)) * 100} className="h-2" /></div>)}
 {!data && <div className="h-32 animate-pulse rounded-xl bg-muted" />}
 </CardContent></Card>
 <Card className="border border-border bg-card shadow-none"><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />AI workspace</CardTitle><p className="text-sm leading-6 text-muted-foreground">Connect OpenRouter once, then analyze any idea with the model you choose.</p></CardHeader><CardContent><div className="rounded-xl border border-border bg-background p-4"><div className="flex items-center gap-3"><Sparkles className="h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">Model-powered product strategy</p><p className="text-xs text-muted-foreground">Validate assumptions, pricing, and differentiation.</p></div></div><Button onClick={() => setLocation("/settings")} variant="outline" className="mt-4 w-full">Configure OpenRouter <ArrowRight className="ml-2 h-4 w-4" /></Button></div></CardContent></Card>
 </div>

 <Card className="border-0 shadow-sm ring-1 ring-border/60"><CardHeader className="flex flex-row items-end justify-between"><div><CardTitle>Low-competition starting points</CardTitle><p className="mt-1 text-sm text-muted-foreground">Ideas selected for a narrower entry wedge.</p></div><Button variant="ghost" onClick={() => setLocation("/ideas")}>View all <ArrowRight className="ml-2 h-4 w-4" /></Button></CardHeader><CardContent><div className="grid gap-3 lg:grid-cols-5">{(ideas.data ?? []).map(idea => <button key={idea.id} onClick={() => setLocation(`/ideas/${idea.id}`)} className="group rounded-2xl bg-muted/50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-muted"><div className="flex items-center justify-between"><Badge variant="secondary" className="text-[10px]">{idea.category}</Badge><span className="text-xs text-primary">{idea.competitionScore}/100</span></div><p className="mt-4 line-clamp-2 text-sm font-semibold leading-5">{idea.title}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{idea.summary}</p><ArrowRight className="mt-4 h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" /></button>)}</div></CardContent></Card>
 </div>
 </DashboardLayout>;
}
