from pathlib import Path
import re

ROOT = Path('/home/ubuntu/app-idea-hub')
FILES = list((ROOT / 'client/src/pages').glob('*.tsx')) + [ROOT / 'client/src/components/DashboardLayout.tsx']

COLOR_FAMILIES = 'violet|cyan|emerald|amber|rose|orange|pink|green|yellow|indigo|purple|teal'
COLOR_TOKEN = re.compile(r'(?P<variant>(?:hover:|focus:|active:|data-\[[^\]]+\]:)?)?(?P<kind>bg|text|border|ring|from|via|to)-(?P<family>' + COLOR_FAMILIES + r')-[^\s"`]+')
SLATE_TOKEN = re.compile(r'(?P<variant>(?:hover:|focus:|active:|data-\[[^\]]+\]:)?)?(?P<kind>bg|text|border|ring)-slate-[^\s"`]+')
WHITE_TOKEN = re.compile(r'(?P<variant>(?:hover:|focus:|active:|data-\[[^\]]+\]:)?)?(?P<kind>bg|text|border|ring)-white(?:/[^\s"`]+)?')


def normalize_color(match: re.Match[str]) -> str:
    variant = match.group('variant') or ''
    kind = match.group('kind')
    if kind in {'from', 'via', 'to'}:
        return ''
    replacement = {'bg': 'bg-card', 'text': 'text-primary', 'border': 'border-border', 'ring': 'ring-primary'}[kind]
    return variant + replacement


def normalize_slate(match: re.Match[str]) -> str:
    variant = match.group('variant') or ''
    kind = match.group('kind')
    if kind == 'bg':
        return variant + ('bg-background' if '950' in match.group(0) else 'bg-card')
    if kind == 'text':
        return variant + ('text-foreground' if '950' in match.group(0) else 'text-muted-foreground')
    if kind == 'border':
        return variant + 'border-border'
    return variant + 'ring-primary'


def normalize_white(match: re.Match[str]) -> str:
    variant = match.group('variant') or ''
    kind = match.group('kind')
    if kind == 'bg':
        return variant + 'bg-card'
    if kind == 'text':
        return variant + 'text-foreground'
    if kind == 'border':
        return variant + 'border-border'
    return variant + 'ring-border'


for path in FILES:
    source = path.read_text()
    updated = COLOR_TOKEN.sub(normalize_color, source)
    updated = SLATE_TOKEN.sub(normalize_slate, updated)
    updated = WHITE_TOKEN.sub(normalize_white, updated)
    updated = re.sub(r'\bbg-gradient-(?:to-[a-z]+)\b', '', updated)
    updated = re.sub(r'\b(?:blur-3xl|shadow-xl|shadow-lg|shadow-md)\b', '', updated)
    updated = re.sub(r' {2,}', ' ', updated)
    if updated != source:
        path.write_text(updated)
        print(path)
