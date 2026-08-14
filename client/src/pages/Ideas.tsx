import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Filter, GitCompareArrows, Lightbulb, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const categories = ["all", "Tools", "Health", "Education", "AI", "Games"] as const;
const models = ["all", "Subscription", "One-time", "Freemium", "Ads", "Usage-based", "Marketplace"] as const;
const levels = ["all", "Low", "Medium", "High"] as const;

function competitionClass(level: string) {
 return level === "Low" ? "text-primary bg-card" : level === "Medium" ? "text-primary bg-card" : "text-primary bg-card";
}

export default function Ideas() {
 const [, setLocation] = useLocation();
 const [search, setSearch] = useState("");
 const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]>("all");
 const [selectedModel, setSelectedModel] = useState<(typeof models)[number]>("all");
 const [selectedLevel, setSelectedLevel] = useState<(typeof levels)[number]>("all");
 const [selectedIds, setSelectedIds] = useState<number[]>([]);
 const filters = useMemo(() => ({ search: search || undefined, category: selectedCategory === "all" ? undefined : selectedCategory, monetizationModel: selectedModel === "all" ? undefined : selectedModel, competitionLevel: selectedLevel === "all" ? undefined : selectedLevel, limit: 100, offset: 0 }), [search, selectedCategory, selectedModel, selectedLevel]);
 const ideas = trpc.ideas.list.useQuery(filters);
 const toggleIdea = (id: number) => setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 4 ? [...current, id] : current);
 return <DashboardLayout><div className="mx-auto max-w-[1500px] space-y-6">
 <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold text-primary">Opportunity library</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">200 ideas, one focused wedge at a time.</h1><p className="mt-2 max-w-2xl text-muted-foreground">Filter the catalog by market shape, monetization, and competition score. Every card links to a full product thesis and competitor map.</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => setLocation("/scraper")} variant="outline"><Filter className="mr-2 h-4 w-4" />Add competitor data</Button>{selectedIds.length >= 2 && <Button onClick={() => setLocation(`/compare?ids=${selectedIds.join(",")}`)}><GitCompareArrows className="mr-2 h-4 w-4" />Compare {selectedIds.length}</Button>}</div></div>
 <Card className="border-0 shadow-sm ring-1 ring-border/60"><CardContent className="flex flex-col gap-3 p-4 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search titles, audiences, and categories…" className="pl-9" /></div><Select value={selectedCategory} onValueChange={value => setSelectedCategory(value as typeof selectedCategory)}><SelectTrigger className="w-full lg:w-[170px]"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent>{categories.map(value => <SelectItem key={value} value={value}>{value === "all" ? "All categories" : value}</SelectItem>)}</SelectContent></Select><Select value={selectedModel} onValueChange={value => setSelectedModel(value as typeof selectedModel)}><SelectTrigger className="w-full lg:w-[180px]"><SelectValue placeholder="Monetization" /></SelectTrigger><SelectContent>{models.map(value => <SelectItem key={value} value={value}>{value === "all" ? "All models" : value}</SelectItem>)}</SelectContent></Select><Select value={selectedLevel} onValueChange={value => setSelectedLevel(value as typeof selectedLevel)}><SelectTrigger className="w-full lg:w-[170px]"><SelectValue placeholder="Competition" /></SelectTrigger><SelectContent>{levels.map(value => <SelectItem key={value} value={value}>{value === "all" ? "All competition" : value}</SelectItem>)}</SelectContent></Select></CardContent></Card>
 <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">{ideas.data?.length ?? 0}</span> ideas match your filters</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" />{selectedIds.length ? `${selectedIds.length}/4 selected` : "Select up to four to compare"}</div></div>
 {ideas.isLoading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />)}</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ideas.data?.map(idea => <Card key={idea.id} className="group border-0 shadow-sm ring-1 ring-border/60 transition hover:-translate-y-1 hover:"><CardContent className="flex h-full flex-col p-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Checkbox checked={selectedIds.includes(idea.id)} onCheckedChange={() => toggleIdea(idea.id)} aria-label={`Select ${idea.title} for comparison`} /><Badge variant="secondary">#{idea.id} · {idea.category}</Badge></div><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${competitionClass(idea.competitionLevel)}`}>{idea.competitionLevel} competition</span></div><h2 className="mt-5 text-lg font-semibold tracking-tight">{idea.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{idea.summary}</p><div className="mt-5 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-muted/60 p-3"><p className="text-muted-foreground">Revenue</p><p className="mt-1 font-semibold">{idea.revenuePotential}</p></div><div className="rounded-xl bg-muted/60 p-3"><p className="text-muted-foreground">Model</p><p className="mt-1 font-semibold">{idea.monetizationModel}</p></div></div><div className="mt-auto flex items-center justify-between pt-5"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lightbulb className="h-3.5 w-3.5 text-primary" />Signal {idea.competitionScore}/100</span><Button size="sm" variant="ghost" onClick={() => setLocation(`/ideas/${idea.id}`)}>Open <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition group-hover:translate-x-1" /></Button></div></CardContent></Card>)}</div>}
 {!ideas.isLoading && !ideas.data?.length && <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><Search className="h-8 w-8 text-muted-foreground" /><p className="mt-4 font-medium">No ideas found</p><p className="mt-1 text-sm text-muted-foreground">Try removing a filter or using a broader search term.</p></CardContent></Card>}
 </div></DashboardLayout>;
}
