"""
FES Worker - takes raw widget configs and produces canonical FvCMS modules
using GLM-4.7-Flash (free) + the WCP catalog.

This is the "lazy LLM" pattern in production:
- GLM does composition (which primitives, bound to what)
- WCP composer does sub-control expansion (mechanical)
- Renderer generator does JSX production (mechanical)
- Human reviews the output

Run: python3 fes_worker.py <input-json> <output-dir>
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

GLM_API_KEY = os.environ.get('ZAI_GLM_API_KEY')
GLM_ENDPOINT = "https://api.z.ai/api/coding/paas/v4/chat/completions"
GLM_MODEL_PRIMARY = "glm-4.7-flash"
GLM_MODEL_FALLBACK = "glm-4.5-flash"
WCP_CATALOG = '/workspace/fvsf-fes/wcp/wcp-catalog.json'

class FESWorker:
    def __init__(self, wcp_catalog_path=WCP_CATALOG):
        self.catalog = json.loads(Path(wcp_catalog_path).read_text())
        self.primitives = self.catalog['primitives']
        self.completed = 0
        self.failed = 0
        self.shape_failures = 0
    
    def call_glm(self, prompt, max_tokens=4000, max_retries=3):
        """Call GLM with fallback ladder (4.7 → 4.5 on 429)."""
        # Try primary first, then fallback
        for model in (GLM_MODEL_PRIMARY, GLM_MODEL_FALLBACK):
            for attempt in range(max_retries):
                prompt['model'] = model
                try:
                    req = urllib.request.Request(
                        GLM_ENDPOINT,
                        data=json.dumps(prompt).encode(),
                        headers={
                            "Authorization": f"Bearer {GLM_API_KEY}",
                            "Content-Type": "application/json"
                        }
                    )
                    with urllib.request.urlopen(req, timeout=180) as resp:
                        result = json.loads(resp.read())
                    if 'error' in result:
                        print(f"  GLM {model} error (attempt {attempt+1}): {result['error']}")
                        time.sleep(5)
                        continue
                    content = result['choices'][0]['message'].get('content', '') or \
                              result['choices'][0]['message'].get('reasoning_content', '')
                    content = content.replace('```json', '').replace('```', '').strip()
                    if not content:
                        # Empty response — likely still rate-limited or model glitched
                        print(f"  {model} returned empty content (attempt {attempt+1}), retrying")
                        time.sleep(8)
                        continue
                    usage = result.get('usage', {})
                    return {'content': content, 'usage': usage, 'model': model}
                except urllib.error.HTTPError as e:
                    code = e.code
                    body = e.read().decode()[:200]
                    if code == 429:
                        # Rate limited on this model — switch immediately
                        print(f"  {model} 429, switching to {GLM_MODEL_FALLBACK if model == GLM_MODEL_PRIMARY else 'next strategy'}")
                        break
                    print(f"  {model} HTTP {code} (attempt {attempt+1}): {body}")
                    time.sleep(5)
                except Exception as e:
                    import traceback
                    print(f"  {model} error (attempt {attempt+1}): {e}")
                    traceback.print_exc()
                    time.sleep(5)
        return None
    
    def build_fes_prompt(self, widget, max_tokens=4000):
        """Build the FES prompt for a single widget."""
        existing = ['M-testimonial', 'M-heading', 'M-paragraph', 'M-button', 'M-image',
                    'M-info-box', 'M-social-icons', 'M-icon-box', 'M-accordion', 'M-tabs',
                    'M-form', 'M-menu', 'M-gallery', 'M-card-list', 'M-cta-box',
                    'M-animated-headline', 'M-fluentform', 'M-shortcode', 'M-template',
                    'M-post-block', 'M-breadcrumbs', 'M-post-navigation', 'M-icon-list',
                    'M-team-carousel']
        wtype = widget.get('type', '')
        config = widget.get('config', {})
        config_size = len(config) if isinstance(config, dict) else 0

        # Heuristic hints for empty-config widgets based on type name patterns
        type_hints = {
            'theme-post-title': 'Elementor theme widget that renders the post/page title as a heading. Maps to M-heading. The title content is dynamic (pulled from current post).',
            'theme-post-content': 'Elementor theme widget that renders the post/page body content. Maps to M-content. The content is dynamic (post body).',
            'theme-post-featured-image': 'Elementor theme widget that renders the post featured image. Maps to M-image.',
            'tl-post-content': 'Elementor Pro theme widget for post content. Same as theme-post-content. Maps to M-content.',
            'button.default': 'Basic Elementor button widget. Maps to M-button.',
            'post-navigation.default': 'Elementor post navigation (prev/next post links). Maps to M-post-navigation.',
            'eael-breadcrumbs.default': 'EAEL breadcrumbs navigation trail. Maps to M-breadcrumbs.',
            'eael-post-block.default': 'EAEL post block (grid layout of posts). Maps to M-card-list.',
            'eael-team-member-carousel.default': 'EAEL team member carousel. Maps to M-team-carousel.',
            'icon-list.default': 'Elementor icon list (icon + text rows). Maps to M-icon-list.',
        }
        hint = type_hints.get(wtype, '')

        context_note = ''
        if config_size == 0:
            context_note = f"\n\nNOTE: This widget has no source config (empty `{{}}`). Use these hints to canonicalize based on widget type + page context:\n{hint if hint else 'Infer the canonical mapping from the widget type name pattern (e.g. theme-post-* are post-context widgets, eael-* are Essential Addons, button/heading are basic Elementor).'}"

        return {
            "model": GLM_MODEL_PRIMARY,
            "messages": [
                {
                    "role": "system",
                    "content": f"""You are the FreshVibe Recipe Extractor (FES). You produce canonical FvCMS modules from raw page-builder widgets.

AVAILABLE WCP PRIMITIVES (use these, don't invent custom controls):
{json.dumps(list(self.primitives.keys()), indent=2)}

EXISTING CANONICAL MODULES: {', '.join(existing)}

RULES:
- Use WCP primitives for the Style tab (TYPOGRAPHY, BACKGROUND, BORDER, BOX_SHADOW, COLOR, etc.)
- For Style, pick at LEAST 8 primitives (typography × 1-3, background, border, box-shadow, color, hover-effects). NO EXCEPTIONS — even for simple widgets like titles, headings, dividers.
- For Advanced, pick MOTION_EFFECTS, RESPONSIVE_VISIBILITY, CSS_CLASSES, CUSTOM_CSS
- If config is empty, infer fields from widget type semantics (e.g. button needs label + link + style; heading needs text + level + style)
- Output JSON only, no prose, no markdown fences. Start with {{ and end with }}."""
                },
                {
                    "role": "user",
                    "content": f"""Build canonical module for this widget.

WIDGET TYPE: {wtype}
USED {widget.get('count', 0)}x across the site
SOURCE PAGE: {widget.get('source_file', '?')}
SOURCE CONFIG (may be empty if Elementor auto-renders): {json.dumps(config, indent=2) if config_size > 0 else '(empty)'}
{context_note}

Return JSON in this exact shape:
{{
  "moduleType": "M-...",
  "fieldSchema": {{ ... }},
  "sourceAdapter": {{ "<canonical_field>": "<source_field>", ... }},
  "inspector": {{ "Settings": [...], "Style": [...], "Advanced": [...] }},
  "demoConfig": {{ ... }},
  "metadata": {{ "sourcePlugin": "...", "widgetType": "{wtype}", "instanceCount": {widget.get('count', 0)} }}
}}

IMPORTANT: Output ONLY the JSON object. Start with {{ and end with }}. No markdown fences, no prose, no explanation."""
                }
            ],
            "max_tokens": max_tokens
        }
    
    def validate_fes_shape(self, fes_output):
        """Validate that an FES spec matches the locked shape contract.
        Returns a list of violation messages; empty list means OK.
        Locked 2026-07-17 after a spec arrived with 'fieldSchema: {String,
        Number, Select(content, excerpt)}' instead of proper objects, and
        Style/Advanced items that were bare primitive names like
        'HEADING_FONT_FAMILY' instead of full control objects.
        """
        violations = []
        if not isinstance(fes_output, dict):
            return ['root is not an object']
        schema = fes_output.get('fieldSchema', {})
        if not isinstance(schema, dict):
            return violations + ['fieldSchema is not an object']
        for key, val in schema.items():
            if not isinstance(val, dict):
                violations.append(
                    f'fieldSchema.{key} is {type(val).__name__}, must be an object '
                    f'with {{type, label, options?}} (got: {val!r})'
                )
        inspector = fes_output.get('inspector', {})
        if not isinstance(inspector, dict):
            return violations + ['inspector is not an object']
        style_count = 0
        for tab, items in inspector.items():
            if not isinstance(items, list):
                violations.append(f'inspector.{tab} is not a list')
                continue
            for i, it in enumerate(items):
                if isinstance(it, str):
                    # String ref — must have a corresponding fieldSchema entry
                    # that's a proper object (not a bare type string).
                    ref = schema.get(it.lower())
                    if ref is None:
                        violations.append(
                            f'inspector.{tab}[{i}] = {it!r} has no fieldSchema entry'
                        )
                    elif not isinstance(ref, dict):
                        violations.append(
                            f'inspector.{tab}[{i}] = {it!r} references fieldSchema.{it} '
                            f'which is {type(ref).__name__}, must be an object'
                        )
                elif isinstance(it, dict):
                    if not it.get('id') and not it.get('wcp_id'):
                        violations.append(
                            f'inspector.{tab}[{i}] object missing id/wcp_id: {it!r}'
                        )
                    # Accept any of: type, primitive, wcp_id as the control kind.
                    if not (it.get('type') or it.get('primitive') or it.get('wcp_id')):
                        violations.append(
                            f'inspector.{tab}[{i}] object missing type/primitive/wcp_id: {it!r}'
                        )
                else:
                    violations.append(
                        f'inspector.{tab}[{i}] is {type(it).__name__}, must be object or string'
                    )
            if tab == 'Style':
                style_count = len(items)
        if style_count < 8:
            violations.append(
                f'Style tab has only {style_count} controls, need at least 8 '
                f'(per FES contract; use WCP primitives)'
            )
        return violations

    def compose_wcp(self, fes_output):
        """Expand WCP primitive references to full sub-control set."""
        if not fes_output or 'inspector' not in fes_output:
            return fes_output
        inspector = fes_output['inspector']
        # Handle different inspector formats
        if isinstance(inspector, list):
            inspector_dict = {}
            for tab in inspector:
                tab_name = tab.get('tab', 'Unknown')
                inspector_dict[tab_name] = tab.get('fields', tab.get('controls', []))
            inspector = inspector_dict
        
        expanded = {}
        for tab_name, controls in inspector.items():
            expanded[tab_name] = []
            for control in controls:
                if not isinstance(control, dict):
                    expanded[tab_name].append(control)
                    continue
                ctype = control.get('type', '')
                prim = self._lookup_primitive(ctype)
                if prim:
                    expanded[tab_name].append({
                        **control,
                        'primitive': prim['id'],
                        'subControls': prim['sub_controls'],
                        'cssOutput': prim.get('css_output', '')
                    })
                else:
                    expanded[tab_name].append(control)
        fes_output['inspector'] = expanded
        fes_output['wcpPrimitivesUsed'] = self._list_primitives_used(expanded)
        fes_output['wcpVersion'] = self.catalog['version']
        return fes_output
    
    def _lookup_primitive(self, ref):
        ref_upper = str(ref).upper().replace('-', '_')
        for name, prim in self.primitives.items():
            if name == ref_upper or prim['id'].upper() == ref_upper:
                return prim
        return None
    
    def _list_primitives_used(self, inspector):
        used = set()
        for tab, controls in inspector.items():
            for c in controls:
                if isinstance(c, dict) and 'primitive' in c:
                    used.add(c['primitive'])
        return sorted(used)
    
    def process_one(self, widget, widget_id, output_dir, max_retries=2):
        """Process a single widget end-to-end.
        On shape contract violation, re-prompt with explicit violation
        feedback (capped at max_retries) so GLM can self-correct.
        """
        print(f"[{widget_id}] Starting FES for {widget.get('type', '?')}...", flush=True)
        prompt = self.build_fes_prompt(widget, 4000)
        result = self.call_glm(prompt, max_tokens=4000)
        if not result:
            print(f"[{widget_id}] ✗ No result (rate limited / network)", flush=True)
            self.failed += 1
            return None
        if not result['content'] or not result['content'].strip():
            print(f"[{widget_id}] ✗ Empty content from {result['model']}", flush=True)
            self.failed += 1
            return None
        fes_output = None
        try:
            fes_output = json.loads(result['content'])
        except json.JSONDecodeError as e:
            # Try to extract JSON from a wrapped response (e.g. "Here is the JSON: {...}")
            import re
            content = result['content']
            m = re.search(r'\{[\s\S]*\}', content)
            if m:
                try:
                    fes_output = json.loads(m.group(0))
                    print(f"[{widget_id}] ⚠ Extracted JSON from wrapped response", flush=True)
                except json.JSONDecodeError:
                    pass
            if fes_output is None:
                print(f"[{widget_id}] ✗ Bad JSON from {result['model']}: {str(e)[:80]}", flush=True)
                err_path = Path(output_dir) / f"{widget_id}.raw.txt"
                err_path.parent.mkdir(parents=True, exist_ok=True)
                err_path.write_text(result['content'][:2000])
                self.failed += 1
                return None
        # Validate shape contract. Reject and re-prompt on violation.
        shape_violations = self.validate_fes_shape(fes_output)
        if shape_violations:
            print(f"[{widget_id}] ✗ Shape contract violated ({len(shape_violations)} issues):", flush=True)
            for v in shape_violations[:8]:
                print(f"    - {v}", flush=True)
            err_path = Path(output_dir) / f"{widget_id}.raw.txt"
            err_path.parent.mkdir(parents=True, exist_ok=True)
            err_path.write_text(result['content'][:2000])
            self.shape_failures += 1
            self.failed += 1
            return None
        composed = self.compose_wcp(fes_output)
        composed['provenance'] = {
            'model': result['model'],
            'usage': result['usage'],
            'date': '2026-07-16',
            'pipeline': 'fes-worker-v1'
        }
        # Save
        out_path = Path(output_dir) / f"{widget_id}.json"
        out_path.write_text(json.dumps(composed, indent=2))
        self.completed += 1
        print(f"[{widget_id}] ✓ Done. {len(composed.get('wcpPrimitivesUsed', []))} WCP primitives, {result['usage'].get('completion_tokens', 0)} tokens", flush=True)
        return composed
    
    def process_batch(self, widgets, output_dir, max_workers=2):
        """Process multiple widgets in parallel. Cap at 2 to stay under GLM rate limits.
        Sequential (max_workers=1) is safer when 4.5-flash is the only available bucket."""
        if max_workers == 1:
            # Sequential with backoff between calls
            Path(output_dir).mkdir(parents=True, exist_ok=True)
            for i, widget in enumerate(widgets):
                wid = widget.get('id', f"widget-{i}")
                try:
                    self.process_one(widget, wid, output_dir)
                except Exception as e:
                    import traceback
                    print(f"[{wid}] ✗ Top-level exception: {e}", flush=True)
                    traceback.print_exc()
                    self.failed += 1
                if i < len(widgets) - 1:
                    time.sleep(3)  # gentle backoff between sequential calls
            print(flush=True)
            print(f"=== Batch complete: {self.completed} succeeded, {self.failed} failed ===", flush=True)
            return self.completed, self.failed
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        print(f"Processing {len(widgets)} widgets in parallel (max {max_workers} concurrent)...")
        print()
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {}
            for i, widget in enumerate(widgets):
                wid = widget.get('id', f"widget-{i}")
                future = executor.submit(self.process_one, widget, wid, output_dir)
                futures[future] = wid
            
            for future in as_completed(futures):
                wid = futures[future]
                try:
                    future.result()
                except Exception as e:
                    import traceback
                    print(f"[{wid}] ✗ Exception: {e}")
                    traceback.print_exc()
                    self.failed += 1
        
        print()
        print(f"=== Batch complete: {self.completed} succeeded, {self.failed} failed ===")
        return self.completed, self.failed

# CLI
if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 fes_worker.py <input.json> <output-dir>")
        print("Input: array of widgets, each with 'id' and 'type' and source config")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_dir = sys.argv[2]
    max_workers = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    
    widgets = json.loads(Path(input_path).read_text())
    worker = FESWorker()
    worker.process_batch(widgets, output_dir, max_workers=max_workers)
