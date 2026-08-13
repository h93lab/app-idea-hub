import DashboardLayout from "@/components/DashboardLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function Settings() {
  const settings = trpc.ai.settings.useQuery();
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [showKey, setShowKey] = useState(false);
  const modelsInput = useMemo(() => apiKey.trim().length >= 10 ? { apiKey: apiKey.trim() } : undefined, [apiKey]);
  const models = trpc.ai.models.useQuery(modelsInput, { enabled: apiKey.trim().length >= 10 || !!settings.data?.configured, staleTime: 60_000 });
  const save = trpc.ai.saveSettings.useMutation({ onSuccess: () => { void settings.refetch(); setApiKey(""); } });
  useEffect(() => { if (settings.data?.selectedModel && !selectedModel) setSelectedModel(settings.data.selectedModel); }, [settings.data, selectedModel]);
  return <DashboardLayout><div className="mx-auto max-w-5xl space-y-6">
    <div><p className="text-sm font-semibold text-violet-600">Workspace configuration</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">OpenRouter settings</h1><p className="mt-2 max-w-2xl text-muted-foreground">Bring your own OpenRouter key, load the available model catalog, and choose which model powers analysis across the platform.</p></div>
    <Alert className="border-cyan-200 bg-cyan-50"><ShieldCheck className="h-4 w-4 text-cyan-700" /><AlertTitle>Key handling</AlertTitle><AlertDescription className="text-cyan-900">The key is sent to the server over the authenticated app session and is never returned in full to the browser. Use a restricted OpenRouter key and rotate it if you share access.</AlertDescription></Alert>
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"><Card className="border-0 shadow-sm ring-1 ring-border/60"><CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-violet-600" />Provider connection</CardTitle></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label htmlFor="apiKey">OpenRouter API key</Label><div className="relative"><Input id="apiKey" type={showKey ? "text" : "password"} value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={settings.data?.configured ? settings.data.maskedApiKey : "sk-or-v1-…"} className="pr-10" /><button type="button" onClick={() => setShowKey(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><p className="text-xs text-muted-foreground">Leave blank only if you are refreshing the model catalog with an existing saved key.</p></div><div className="space-y-2"><div className="flex items-center justify-between"><Label>Available models</Label>{models.isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}</div><Select value={selectedModel} onValueChange={setSelectedModel}><SelectTrigger><SelectValue placeholder={models.data?.length ? "Choose a model" : "Enter a key to load models"} /></SelectTrigger><SelectContent>{models.data?.map(model => <SelectItem key={model.id} value={model.id}>{model.name || model.id}</SelectItem>)}</SelectContent></Select>{models.error && <p className="text-xs text-rose-600">{models.error.message}</p>}</div><Button onClick={() => save.mutate({ apiKey: apiKey.trim() || undefined, selectedModel })} disabled={!selectedModel || (!apiKey.trim() && !settings.data?.configured) || save.isPending} className="w-full">{save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Save model selection</Button></CardContent></Card>
    <Card className="border-0 bg-slate-950 text-white shadow-xl"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-cyan-300" />Current runtime</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">Status</p><div className="mt-2 flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${settings.data?.configured ? "bg-emerald-400" : "bg-amber-400"}`} /><span className="font-medium">{settings.data?.configured ? "Connected" : "Not configured"}</span></div></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs uppercase tracking-wider text-slate-400">Selected model</p><p className="mt-2 break-all text-sm font-medium">{settings.data?.selectedModel || "No model selected"}</p></div><Button variant="outline" onClick={() => void settings.refetch()} className="w-full border-slate-700 bg-transparent text-white hover:bg-slate-800"><RefreshCw className="mr-2 h-4 w-4" />Refresh status</Button></CardContent></Card></div>
  </div></DashboardLayout>;
}
