import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, GitCompareArrows, Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

function download(format: "markdown" | "pdf", ids: number[]) {
 window.open(`/api/reports/compare/${ids.join(",")}/${format}`, "_blank", "noopener,noreferrer");
}

export default function Compare() {
 const [, setLocation] = useLocation();
 const initialIds = useMemo(() => new URLSearchParams(window.location.search).get("ids")?.split(",").map(Number).filter(Number.isInteger) ?? [], []);
 const [idInput, setIdInput] = useState(initialIds.join(", "));
 const ids = useMemo(() => Array.from(new Set(idInput.split(",").map(value => Number(value.trim())).filter(value => Number.isInteger(value) && value > 0))).slice(0, 4), [idInput]);
 const comparison = trpc.ideas.compare.useQuery({ ids }, { enabled: ids.length >= 2 });

 return <DashboardLayout><div className="mx-auto max-w-[1500px] space-y-6">
 <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
 <div><p className="text-sm font-semibold text-primary">Decision workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Compare ideas side by side.</h1><p className="mt-2 max-w-3xl text-muted-foreground">Place two to four opportunities next to each other and compare the thesis, commercial signal, MVP scope, and every competitor’s strengths, weaknesses, and differentiation wedge.</p></div>
 <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setLocation("/ideas")}><ArrowLeft className="mr-2 h-4 w-4" />Idea library</Button>{ids.length >= 2 && <><Button variant="outline" onClick={() => download("markdown", ids)}><Download className="mr-2 h-4 w-4" />Markdown</Button><Button onClick={() => download("pdf", ids)}><Download className="mr-2 h-4 w-4" />PDF</Button></>}</div>
 </div>
 <Card className="border-0 shadow-sm ring-1 ring-border/60"><CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end"><div className="flex-1"><label className="text-sm font-medium">Idea IDs</label><Input className="mt-2" value={idInput} onChange={event => setIdInput(event.target.value)} placeholder="Example: 1, 2, 7" /></div><Button variant="secondary" onClick={() => comparison.refetch()} disabled={ids.length < 2}><GitCompareArrows className="mr-2 h-4 w-4" />Refresh comparison</Button><p className="text-xs text-muted-foreground md:max-w-[240px]">Use the numeric IDs shown in the idea library. Select between two and four ideas.</p></CardContent></Card>
 {ids.length < 2 ? <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-20 text-center"><GitCompareArrows className="h-10 w-10 text-primary" /><p className="mt-4 font-medium">Add at least two idea IDs</p><p className="mt-1 text-sm text-muted-foreground">For example, enter 1, 2, and 3 above.</p></CardContent></Card> : comparison.isLoading ? <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading comparison…</div> : <>
 <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">{comparison.data?.map(idea => <Card key={idea.id} className="border-0 shadow-sm ring-1 ring-border/60"><CardHeader className="border-b bg-muted/20"><div className="flex items-center justify-between gap-2"><Badge variant="secondary">{idea.category}</Badge><span className="text-xs text-muted-foreground">#{idea.id}</span></div><CardTitle className="text-lg leading-6">{idea.title}</CardTitle></CardHeader><CardContent className="space-y-4 p-4 text-sm"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Audience</p><p className="mt-1 leading-6">{idea.targetAudience}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Revenue / competition</p><p className="mt-1 font-medium">{idea.revenuePotential} · {idea.competitionLevel} ({idea.competitionScore}/100)</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Unique value</p><p className="mt-1 leading-6">{idea.uniqueValue}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">MVP scope</p><p className="mt-1 leading-6">{idea.mvpScope}</p></div><Button className="w-full" variant="outline" onClick={() => setLocation(`/ideas/${idea.id}`)}>Open full report</Button></CardContent></Card>)}</div>
 <Card className="border-0 shadow-sm ring-1 ring-border/60"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Competitor strengths, weaknesses, and differentiation</CardTitle></CardHeader><CardContent className="space-y-6">{comparison.data?.map(idea => <section key={idea.id}><div className="mb-3 flex items-center gap-2"><h2 className="font-semibold">{idea.title}</h2><Badge variant="outline">{idea.competitors.length} competitors</Badge></div><div className="grid gap-3 lg:grid-cols-3">{idea.competitors.map(competitor => <div key={competitor.id} className="rounded-2xl border bg-muted/20 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{competitor.name}</p><p className="text-xs text-muted-foreground">{competitor.platform}</p></div><Badge variant={competitor.threatLevel === "High" ? "destructive" : "secondary"}>{competitor.threatLevel}</Badge></div><div className="mt-4 space-y-3 text-sm leading-6"><div><p className="font-medium text-primary">Strengths</p><p className="text-muted-foreground">{competitor.strengths}</p></div><div><p className="font-medium text-primary">Weaknesses</p><p className="text-muted-foreground">{competitor.weaknesses}</p></div><div><p className="font-medium text-primary">How to differentiate</p><p className="text-muted-foreground">{competitor.differentiation}</p></div></div></div>)}</div></section>)}</CardContent></Card>
 </>}
 </div></DashboardLayout>;
}
