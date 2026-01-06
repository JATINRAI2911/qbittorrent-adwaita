# libadwaita 1.10.0 → Web CSS reference

Source: `libadwaita-1.10.0/src/stylesheet/` (`_colors.scss`, `_palette.scss`, `_common.scss`, `_drawing.scss`, `widgets/*.scss`).
All SCSS variables, mixins and placeholders below are resolved to literal values. File references are given as `(file)`.

## 0. Conventions and GTK→web translation rules

- **GTK `min-width`/`min-height` apply to the content box** (padding excluded). The web CSS below uses `box-sizing: border-box` and gives the **total** size, with the GTK value shown in a comment. Example: GTK button `min-height: 24px; padding: 5px 10px` gives 34px total.
- **`background-image: image(<color>)`** (GTK) is a flat colour layer painted over `background-color`. On the web, write it as `background-image: linear-gradient(<color>, <color>)`.
- **`filter: Opacity(x)`** is the same as the web's `filter: opacity(x)`.
- **`border-spacing`** on GTK boxes means the gap between children. Use `gap`.
- **`-gtk-icon-size`** is the size of a symbolic icon. Use `width`/`height` on an `<svg>`/`<img>`.
- **`:backdrop`** means the window is unfocused. Map it to a `.backdrop` class on the root, toggled on `window` `blur`/`focus` events.
- **`currentColor` inside custom properties.** `--hover-color: color-mix(in srgb, currentColor 7%, transparent)` works as intended on the web. Unregistered custom properties are substituted as tokens, so `currentColor` resolves on the element that uses `var(--hover-color)`. Do **not** register these with `@property`.
- **`$ease-out-quad`** = `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (_common.scss).
- **Not in the stylesheet (set at runtime by AdwStyleManager / GSettings):** `--accent-bg-color`/`--accent-fg-color` values, `--monospace-font-family`, `--monospace-font-size`, `--document-font-family`, `--document-font-size`, and the base UI font. These are marked "(runtime)" below.
- **Also not in the stylesheet:** popover arrow geometry, the GtkSwitch width algorithm, AdwClamp max widths, and which style classes C/UI code puts on internal widgets (e.g. whether the AdwAlertDialog heading gets `.title-2`). These are noted wherever they matter.

---

## 1. Color tokens

### 1a. Ready-to-paste tokens (light + dark)

```css
:root {
  /* palette (_palette.scss) – only the ones Adwaita itself references */
  --blue-3:#3584e4; --green-4:#2ec27e; --green-5:#26a269; --yellow-5:#e5a50a;
  --red-3:#e01b24; --red-4:#c01c28;

  /* accent presets (_colors.scss). The active accent itself is runtime; blue is GNOME's default */
  --accent-blue:#3584e4; --accent-teal:#2190a4; --accent-green:#3a944a;
  --accent-yellow:#c88800; --accent-orange:#ed5b00; --accent-red:#e62d42;
  --accent-pink:#d56199; --accent-purple:#9141ac; --accent-slate:#6f8396;

  --accent-bg-color: var(--accent-blue);     /* (runtime) */
  --accent-fg-color: #ffffff;                /* (runtime) not defined in stylesheet */

  --standalone-color-oklab: min(l, 0.5) a b;
  --accent-color:      oklab(from var(--accent-bg-color)      var(--standalone-color-oklab));
  --destructive-bg-color:#e01b24; --destructive-fg-color:#fff;
  --destructive-color: oklab(from var(--destructive-bg-color) var(--standalone-color-oklab));
  --success-bg-color:#2ec27e; --success-fg-color:#fff;
  --success-color:     oklab(from var(--success-bg-color)     var(--standalone-color-oklab));
  --warning-bg-color:#e5a50a; --warning-fg-color:rgb(0 0 0 / 80%);
  --warning-color:     oklab(from var(--warning-bg-color)     var(--standalone-color-oklab));
  --error-bg-color:#e01b24; --error-fg-color:#fff;
  --error-color:       oklab(from var(--error-bg-color)       var(--standalone-color-oklab));

  --window-bg-color:#fafafb;  --window-fg-color:rgb(0 0 6 / 80%);
  --view-bg-color:#ffffff;    --view-fg-color:rgb(0 0 6 / 80%);
  --headerbar-bg-color:#ffffff; --headerbar-fg-color:rgb(0 0 6 / 80%);
  --headerbar-border-color:rgb(0 0 6 / 80%);
  --headerbar-backdrop-color: var(--window-bg-color);
  --headerbar-shade-color:rgb(0 0 6 / 12%);
  --headerbar-darker-shade-color:rgb(0 0 6 / 12%);
  --sidebar-bg-color:#ebebed; --sidebar-fg-color:rgb(0 0 6 / 80%);
  --sidebar-backdrop-color:#f2f2f4;
  --sidebar-shade-color:rgb(0 0 6 / 7%); --sidebar-border-color:rgb(0 0 6 / 7%);
  --secondary-sidebar-bg-color:#f3f3f5; --secondary-sidebar-fg-color:rgb(0 0 6 / 80%);
  --secondary-sidebar-backdrop-color:#f6f6fa;
  --secondary-sidebar-shade-color:rgb(0 0 6 / 7%); --secondary-sidebar-border-color:rgb(0 0 6 / 7%);
  --card-bg-color:#ffffff; --card-fg-color:rgb(0 0 6 / 80%); --card-shade-color:rgb(0 0 6 / 7%);
  --dialog-bg-color:#fafafb; --dialog-fg-color:rgb(0 0 6 / 80%);
  --popover-bg-color:#ffffff; --popover-fg-color:rgb(0 0 6 / 80%); --popover-shade-color:rgb(0 0 6 / 7%);
  --thumbnail-bg-color:#ffffff; --thumbnail-fg-color:rgb(0 0 6 / 80%);
  --shade-color:rgb(0 0 6 / 7%);
  --scrollbar-outline-color:#ffffff;
  --active-toggle-bg-color:#ffffff; --active-toggle-fg-color:rgb(0 0 6 / 80%);
  --overview-bg-color:#f3f3f5; --overview-fg-color:rgb(0 0 6 / 80%);

  /* opacities (_colors.scss) */
  --border-opacity:15%;
  --dim-opacity:55%;
  --disabled-opacity:50%;
  --border-color: color-mix(in srgb, currentColor var(--border-opacity), transparent);
  --window-radius:15px;

  /* derived colours (SCSS $vars → custom props; currentColor resolves at the use site) */
  --hover-color:          color-mix(in srgb, currentColor 7%,  transparent);
  --active-color:         color-mix(in srgb, currentColor 16%, transparent);
  --selected-color:       color-mix(in srgb, currentColor 10%, transparent);
  --selected-hover-color: color-mix(in srgb, currentColor 13%, transparent);
  --selected-active-color:color-mix(in srgb, currentColor 19%, transparent);
  --view-hover-color:     color-mix(in srgb, currentColor 4%,  transparent);
  --view-active-color:    color-mix(in srgb, currentColor 8%,  transparent);
  --view-selected-color:        color-mix(in srgb, var(--accent-bg-color) 25%, transparent);
  --view-selected-hover-color:  color-mix(in srgb, var(--accent-bg-color) 32%, transparent);
  --view-selected-active-color: color-mix(in srgb, var(--accent-bg-color) 39%, transparent);
  --trough-color:        color-mix(in srgb, currentColor 15%, transparent);
  --trough-hover-color:  color-mix(in srgb, currentColor 20%, transparent);
  --trough-active-color: color-mix(in srgb, currentColor 25%, transparent);
  --slider-color:        color-mix(in srgb, white 80%, var(--view-bg-color));
  --slider-hover-color:  white;
  --headerbar-border-mix: color-mix(in srgb, var(--headerbar-border-color) var(--border-opacity), transparent);
  --link-color: var(--accent-color);
  --link-visited-color: color-mix(in srgb, var(--accent-color) 80%, var(--view-fg-color));
  --focus-ring-color: color-mix(in srgb, var(--accent-color) 50%, transparent);
  --osd-fg-color: rgb(255 255 255 / 90%);
  --osd-bg-color: rgb(0 0 0 / 70%);
  --toast-bg-color:#505053; --toast-fg-color:#fff;
  --tooltip-border-color: rgb(255 255 255 / 10%);
  --window-outline-color: rgb(255 255 255 / 7%);
  --drop-target-color: var(--accent-bg-color);

  /* button-specific (_buttons.scss) */
  --button-color:         color-mix(in srgb, currentColor 10%, transparent);
  --button-hover-color:   color-mix(in srgb, currentColor 15%, transparent);
  --button-active-color:  color-mix(in srgb, currentColor 30%, transparent);
  --button-checked-color: color-mix(in srgb, currentColor 30%, transparent);
  --button-checked-hover-color:  color-mix(in srgb, currentColor 35%, transparent);
  --button-checked-active-color: color-mix(in srgb, currentColor 40%, transparent);
  --opaque-button-bg: color-mix(in srgb, var(--window-bg-color) 85%, var(--window-fg-color));

  --ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@media (prefers-color-scheme: dark) { :root:not(.light) {
  --standalone-color-oklab: max(l, 0.85) a b;
  --destructive-bg-color:#c01c28; --success-bg-color:#26a269;
  --warning-bg-color:#cd9309;     --error-bg-color:#c01c28;

  --window-bg-color:#222226; --window-fg-color:#fff;
  --view-bg-color:#1d1d20;   --view-fg-color:#fff;
  --headerbar-bg-color:#2e2e32; --headerbar-fg-color:#fff;
  --headerbar-border-color:#fff;
  /* --headerbar-backdrop-color stays var(--window-bg-color) → #222226 */
  --headerbar-shade-color:rgb(0 0 6 / 36%);
  --headerbar-darker-shade-color:rgb(0 0 12 / 90%);
  --sidebar-bg-color:#2e2e32; --sidebar-fg-color:#fff; --sidebar-backdrop-color:#28282c;
  --sidebar-shade-color:rgb(0 0 6 / 25%); --sidebar-border-color:rgb(0 0 6 / 36%);
  --secondary-sidebar-bg-color:#28282c; --secondary-sidebar-fg-color:#fff;
  --secondary-sidebar-backdrop-color:#252529;
  --secondary-sidebar-shade-color:rgb(0 0 6 / 25%); --secondary-sidebar-border-color:rgb(0 0 6 / 36%);
  --card-bg-color:rgb(255 255 255 / 8%); --card-fg-color:#fff; --card-shade-color:rgb(0 0 6 / 36%);
  --dialog-bg-color:#36363a; --dialog-fg-color:#fff;
  --popover-bg-color:#36363a; --popover-fg-color:#fff; --popover-shade-color:rgb(0 0 6 / 25%);
  --thumbnail-bg-color:#39393d; --thumbnail-fg-color:#fff;
  --shade-color:rgb(0 0 6 / 25%);
  --scrollbar-outline-color:rgb(0 0 12 / 95%);
  --active-toggle-bg-color:rgb(255 255 255 / 20%); --active-toggle-fg-color:#fff;
  --overview-bg-color:#28282c; --overview-fg-color:#fff;
}}
/* Duplicate the dark block under :root.dark for a manual toggle. */

@media (prefers-contrast: more) { :root {
  --border-opacity:50%; --dim-opacity:90%; --disabled-opacity:40%;
  --focus-ring-color: color-mix(in srgb, var(--accent-color) 80%, transparent);
}}

body { background: var(--window-bg-color); color: var(--window-fg-color); }
```

### 1b. Notes on colour

- **Light-mode fg is not black.** Every light-mode fg is `rgb(0 0 6 / 80%)`, a translucent near-black. The light window is `#fafafb` and the header bar is **`#ffffff`**, so the header bar is lighter than the window. In dark mode the header bar (`#2e2e32`) is also lighter than the window (`#222226`).
- **`accent_color` formula:** `oklab(from <bg> min(l, 0.5) a b)` in light and `max(l, 0.85)` in dark, applied to accent/destructive/success/warning/error. Resolved values for reference (my OKLab computation, sRGB-clipped; browsers may gamut-map slightly differently):
  - blue `#3584e4` → light `#0461be`, dark `#81d0ff`
  - teal → `#007184` / `#7bdff4`
  - green → `#15772e` / `#8de698`
  - yellow → `#905300` / `#ffc057`
  - orange → `#b62200` / `#ff9c5b`
  - red → `#c00023` / `#ff888c`
  - pink → `#a2326c` / `#ffa0d8`
  - purple → `#8939a4` / `#fba7ff`
  - slate → `#526678` / `#bbd1e5`
  - destructive (light `#e01b24`) → `#c30000`; destructive (dark `#c01c28`) → `#ff938c`
- **`--border-color`** = currentColor at 15% (50% in high contrast). It is always relative to the text colour, never a fixed grey.
- **Two selection families:**
  - "Neutral" (`--selected-*`, currentColor 10/13/19%) is used by sidebars, menus, flat buttons, tabs and flat toggle groups.
  - "View" (`--view-selected-*`, accent 25/32/39%) is used by `row:selected` in lists/listviews/columnviews, `.view:selected`, flowbox and gridview.
- **Text selection (`selection`):** `color-mix(in srgb, var(--view-fg-color) 10%, transparent)`. When the widget is focused (`:focus-within`) it is accent 30%.
- **`.dimmed`** = `opacity: var(--dim-opacity)` (55%). It is **opacity, not a colour**. `.dim-label` is a deprecated alias.
- **Disabled:** generic `filter: opacity(var(--disabled-opacity))` = 50%. Flat buttons, flat toggles and tabs use a "strong disabled" 30%. The "dimmer" 30% is used for menu arrows, entry indicators and split-button separators.
- **`.accent`** → `color: var(--accent-color)`. `.success`, `.warning` and `.error` set `color: var(--accent-color)` and remap `--accent-bg/fg/color` to that semantic colour, so any child accent usage follows it.
- **`.osd` scope** (_common.scss) applies to anything except progressbar/button/menubutton/splitbutton/inline-view-switcher:
  `--accent-bg-color: rgb(255 255 255/75%); --accent-fg-color: rgb(0 0 0/75%); --scrollbar-outline-color: rgb(0 0 0/50%); --standalone-color-oklab: max(l,0.85) a b; color: rgb(255 255 255/90%); background: rgb(0 0 0/70%); border: none;` It re-derives the `--*-color` values with the dark formula.
- **Links:** `color: var(--accent-color); text-decoration: underline`. `:visited` → `--link-visited-color`. `:hover` → `hsl(from var(--accent-color) h calc(s*1.1) calc(l*1.1))`. Disabled → currentColor mixed at `--disabled-opacity`. Inside `.osd`: link = `color-mix(accent-bg 50%, white)`, visited = 75%.
- **Drop target:** `box-shadow: inset 0 0 0 1px var(--accent-bg-color)` (2px on buttons).

---

## 2. Typography

```css
:root { font: 400 14.6667px/normal "Adwaita Sans", sans-serif; } /* (runtime) 11pt @96dpi */
html  { font-size: 14.6667px; }  /* GTK rem = default font size; needed for 0.75rem / 0.6rem below */

.title-1        { font-weight: 800; font-size: 181%; }   /* ≈26.5px */
.title-2        { font-weight: 800; font-size: 136%; }   /* ≈19.9px */
.title-3        { font-weight: 700; font-size: 136%; }   /* ≈19.9px */
.title-4        { font-weight: 700; font-size: 118%; }   /* ≈17.3px */
.heading        { font-weight: 700; }
.body           { font-weight: 400; line-height: 140%; }
.caption-heading{ font-weight: 700; font-size: 82%; }    /* ≈12.0px */
.caption        { font-weight: 400; font-size: 82%; line-height: 140%; }
.document       { font-family: var(--document-font-family); font-size: var(--document-font-size); line-height: 140%; }
.monospace      { font-family: var(--monospace-font-family); font-size: var(--monospace-font-size); }
.numeric        { font-variant-numeric: tabular-nums; }
.dimmed         { opacity: var(--dim-opacity); }
:root { --monospace-font-family: "Adwaita Mono", monospace; --monospace-font-size: 14.6667px;  /* (runtime) */
        --document-font-family: "Adwaita Sans", sans-serif; --document-font-size: 14.6667px; } /* (runtime) */
```

- The stylesheet sets **no** base font family or size. It comes from `gtk-font-name`; on GNOME 48+ the default is "Adwaita Sans 11". The four `--monospace-*`/`--document-*` variables are only *referenced* here and are injected at runtime from GSettings.
- **Buttons, toggles, menubutton labels and window titles are bold** (`font-weight: bold` = 700). Button rows use `.heading`.
- `font-size: smaller` is used for subtitles, progress text and keycaps. It maps to the web keyword `smaller`, about 12.2px at a 14.67px base.
- `.large-title` (deprecated): `font-weight: 300; font-size: 24pt`.

---

## 3. Focus ring (`@mixin focus-ring`, _drawing.scss)

Signature: `focus-ring($target:null, $width:2px, $offset:-$width, $outer:false, $focus-state:':focus:focus-visible', $transition:null)`.

```css
/* resting state: invisible, pushed outward so it "shrinks in" when focused */
.focusable {
  outline: 0 solid transparent;
  outline-offset: 4px;                 /* inner variant: offset + width + 4 = -2+2+4 */
  transition: outline-color 200ms var(--ease-out-quad),
              outline-width 200ms var(--ease-out-quad),
              outline-offset 200ms var(--ease-out-quad) /*, + widget's own transition */;
}
.focusable:focus-visible {
  outline-color: var(--focus-ring-color);   /* accent 50% (80% in HC) */
  outline-width: 2px;
  outline-offset: -2px;                      /* INNER ring (default) */
}
/* OUTER variant ($outer:true, $offset:1px): resting offset = 1+4 = 5px, focused = 1px */
.focusable.outer         { outline-offset: 5px; }
.focusable.outer:focus-visible { outline-offset: 1px; }
```

Per-widget parameters:

| Widget | Variant | Focused offset | Resting offset |
|---|---|---|---|
| button (default, flat) | inner | −2px | 4px |
| button.opaque / .suggested-action / .osd | outer | 1px | 5px |
| button.card, `.card`, boxed-list rows, entry/spin rows (`.focused`) | inner, offset −1 | −1px | 5px |
| switch | outer | 1px | 5px |
| toggle-group > toggle | outer | 0 | 4px |
| entry | inner, **`:focus-within`** | −2px | 4px |
| row, listview/columnview, checkbutton, link, flowbox/gridview child | inner | −2px | 4px |
| scale (on `> trough > slider`) | inner, offset 0 | 0 | 6px |
| bottom-sheet button | outer | 0 | 4px |
| shortcut (keycap) | outer | 4px | 8px |
| shortcut-label | outer | 1px | 5px |

- The ring takes the element's `border-radius` (outline follows radius in modern browsers).
- In a column-view cell, an `editablelabel` shows `outline: 2px solid var(--focus-ring-color)`. While editing it becomes `2px solid var(--accent-color)`.

---

## 4. Buttons (_buttons.scss, _linked.scss)

```css
.btn {
  box-sizing: border-box;
  min-height: 34px;  min-width: 36px;     /* GTK: min 24×16 content + padding 5px 10px */
  padding: 5px 10px;
  border: none; border-radius: 9px;
  font-weight: bold;
  color: inherit;
  background-color: var(--button-color);                       /* currentColor 10% */
  transition: background 200ms var(--ease-out-quad), box-shadow 200ms var(--ease-out-quad),
              outline-color 200ms var(--ease-out-quad), outline-width 200ms var(--ease-out-quad),
              outline-offset 200ms var(--ease-out-quad);
  /* + inner focus ring (§3) */
}
.btn:hover                          { background-color: var(--button-hover-color); }   /* 15% */
.btn:active                         { background-color: var(--button-active-color); }  /* 30% */
.btn.checked                        { background-color: var(--button-checked-color); } /* 30% */
.btn.checked:hover                  { background-color: var(--button-checked-hover-color); }  /* 35% */
.btn.checked:active                 { background-color: var(--button-checked-active-color); } /* 40% */
.btn:disabled                       { filter: opacity(var(--disabled-opacity)); }
@media (prefers-contrast: more) { .btn { box-shadow: inset 0 0 0 1px var(--border-color); } }

.btn.image       { min-width: 34px; padding-left: 5px; padding-right: 5px; }   /* 34×34 square */
.btn.text        { padding-left: 17px; padding-right: 17px; }
.btn.image-text  { padding-left: 9px; padding-right: 9px; gap: 4px; }  /* label gets padding 0 2px */
.btn.arrow       { padding-left: 9px; padding-right: 9px; gap: 4px; }  /* menubutton with arrow */

/* flat */
.btn.flat                 { background: transparent; box-shadow: none; }
.btn.flat:hover           { background: var(--hover-color); }            /* 7% */
.btn.flat:active          { background: var(--active-color); }           /* 16% */
.btn.flat.checked         { background: var(--selected-color); }         /* 10% */
.btn.flat.checked:hover   { background: var(--selected-hover-color); }   /* 13% */
.btn.flat.checked:active  { background: var(--selected-active-color); }  /* 19% */
.btn.flat:disabled:not(.checked) { filter: opacity(30%); }

/* suggested-action (and .opaque share the overlay logic) */
.btn.suggested-action { color: var(--accent-fg-color); background-color: var(--accent-bg-color); box-shadow: none; }
.btn.suggested-action:hover  { background-image: linear-gradient(color-mix(in srgb, currentColor 10%, transparent) 0 0); }
.btn.suggested-action:active { background-image: linear-gradient(rgb(0 0 6 / 20%) 0 0); }
.btn.suggested-action.checked        { background-image: linear-gradient(rgb(0 0 6 / 15%) 0 0); }
.btn.suggested-action.checked:hover  { background-image: linear-gradient(rgb(0 0 6 / 5%) 0 0); }
.btn.suggested-action.checked:active { background-image: linear-gradient(rgb(0 0 6 / 30%) 0 0); }
/* outer focus ring: offset 1px (resting 5px) */

.btn.opaque { color: var(--window-fg-color); background-color: var(--opaque-button-bg); /* same overlays as suggested */ }

/* destructive-action: TINTED, not solid */
.btn.destructive-action {
  --accent-bg-color: var(--destructive-bg-color);
  --accent-fg-color: var(--destructive-fg-color);
  --accent-color: var(--destructive-color);
  color: var(--accent-color);
  background-color: color-mix(in srgb, currentColor 15%, transparent);
}
.btn.destructive-action:hover   { background-color: color-mix(in srgb, currentColor 20%, transparent); }
.btn.destructive-action:active  { background-color: color-mix(in srgb, currentColor 35%, transparent); }
.btn.destructive-action.checked { background-color: color-mix(in srgb, currentColor 35%, transparent); }
.btn.destructive-action.checked:hover  { background-color: color-mix(in srgb, currentColor 40%, transparent); }
.btn.destructive-action.checked:active { background-color: color-mix(in srgb, currentColor 45%, transparent); }

.btn.pill     { padding: 10px 32px; border-radius: 9999px; }                      /* ≥ 44px tall */
.btn.circular { min-width: 34px; min-height: 34px; padding: 0; border-radius: 9999px; }

/* big OSD buttons (overlaid on media) */
.btn.osd { min-width: 42px; min-height: 42px;  /* GTK 32px content + 5px padding (image-button); text: +10px sides */
  color: rgb(255 255 255 / 90%); background-color: rgb(0 0 0 / 65%); /* outer ring, offset 1px */ }
.btn.osd:hover  { color:#fff; background-color: color-mix(in srgb, black calc(.85*65%), currentColor calc(.15*65%)); }
.btn.osd:active { color:#fff; background-color: color-mix(in srgb, black calc(.75*65%), currentColor calc(.25*65%)); }
.btn.osd.checked        { background-color: color-mix(in srgb, black calc(.8*65%),  currentColor calc(.2*65%)); }
.btn.osd.checked:hover  { background-color: color-mix(in srgb, black calc(.75*65%), currentColor calc(.25*65%)); }
.btn.osd.checked:active { background-color: color-mix(in srgb, black calc(.65*65%), currentColor calc(.35*65%)); }

/* button.card */
.btn.card { background-color: var(--card-bg-color); font-weight: inherit; padding: 0; /* focus offset -1px */ }
.btn.card:hover  { background-image: linear-gradient(var(--view-hover-color) 0 0); }
.btn.card:active { background-image: linear-gradient(var(--view-active-color) 0 0); }
.btn.card.checked { background-image: linear-gradient(var(--view-selected-color) 0 0); } /* hover/active: 32%/39% */

/* linked */
.linked { display: inline-flex; }
.linked > .btn:not(:first-child) { border-top-left-radius: 0; border-bottom-left-radius: 0; margin-left: -1px; }
.linked > .btn:not(:last-child)  { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.linked.vertical > .btn:not(:first-child) { border-top-left-radius:0; border-top-right-radius:0; margin-top:-1px; }
.linked.vertical > .btn:not(:last-child)  { border-bottom-left-radius:0; border-bottom-right-radius:0; }
```

**Menu button** (`menubutton`):
- Arrow: 16×16. The icon is `pan-down-symbolic` for `.down` and `open-menu-symbolic` for `.none` (the "hamburger").
- `menubutton.suggested-action`/`.opaque` put the background on the outer element (radius 9px, or 9999px when `.circular`/`.pill`). The inner button is transparent and uses the opaque overlays.
- `buttoncontent` (icon + label): `gap: 6px`, label bold with `padding-right: 2px`. The 2px is removed inside arrow-buttons and split buttons.

**Split button** (`splitbutton`):

```css
.split { display:inline-flex; border-radius: 9px; transition: background 200ms var(--ease-out-quad); }
.split > .btn:first-child      { border-top-right-radius:0; border-bottom-right-radius:0; margin-right:-1px; }
.split > .menu-btn             { border-top-left-radius:0;  border-bottom-left-radius:0;  margin-left:-1px;
                                 padding-left:4px; padding-right:4px; }   /* arrow: pan-down-symbolic */
.split > .sep                  { width:1px; margin: 6px 0; background: none; }          /* raised: invisible */
.split.flat > .sep             { background: color-mix(in srgb, currentColor 30%, transparent); }
.split.flat:is(:hover,:active,.checked) { background: var(--hover-color); }
.split.flat:is(:hover,:active,.checked) > .sep { background: none; }
.split.flat > .btn, .split.flat > .menu-btn { border-radius: 9px; /* + flat button rules */ }
.split.suggested-action { background: var(--accent-bg-color); color: var(--accent-fg-color); }
.split.suggested-action > .menu-btn,
.split.opaque > .menu-btn { box-shadow: inset 1px 0 color-mix(in srgb, currentColor 30%, transparent); }
```

- In a split button, `.image-text-button` uses `padding: 0 9px` with a 6px gap. Compare 4px for a plain image-text button.

**Flat-in-toolbar rule** (`%toolbar`, applied to headerbar, `.toolbar`, searchbar box and actionbar box):
- A `button.image-button`, `.image-text-button` or `.arrow-button` becomes **flat** unless it has `.raised`, `.suggested-action`, `.destructive-action` or `.opaque`.
- **Text-only buttons (`.text-button`) stay raised** (10% bg) in header bars.
- `menubutton.image-button > button` is flat. `splitbutton` (not `.raised` etc.) becomes a flat split button. `dropdown:not(.raised) > button` is flat.
- **Buttons inside `.linked` in a toolbar stay raised.** `menubutton.raised` is raised.
- Inside a `popover` within a toolbar, buttons reset to raised unless they have `.flat`.
- A `switch` in a toolbar gets `margin: 4px 0`.

**Other button notes:**
- **Linked buttons have no separator element.** The `margin-left: -1px` overlaps two translucent 10% layers, which draws a slightly darker 1px seam.
- **Raised checked (30%) is much heavier than flat checked (10%).**
- `.btn.link` (link button): transparent background in all states; label underlined; colour from the link rules in §1b.
- `windowcontrols > button`: `min-width 24px; padding 5px`, background none. The **inner image is the circle**: `background: currentColor 10%` (hover 15%, active 30%), `border-radius: 100%; padding: 4px`, which gives a 24px circle with a 16px icon. Gap between controls: 3px.

---

## 5. Header bar, AdwToolbarView, window title (_header-bar.scss, _toolbars.scss, _window.scss)

```css
.headerbar {                                     /* standalone GtkHeaderBar */
  min-height: 47px;
  padding: 6px 7px 7px 7px;                      /* on the inner box */
  background-color: var(--headerbar-bg-color);
  color: var(--headerbar-fg-color);
  box-shadow: inset 0 -1px var(--headerbar-shade-color);   /* 1px bottom line, 12% (light) / 36% (dark) */
  /* also inset ±1px side lines in --headerbar-border-mix, pushed off-canvas by margin: 0 -1px – ignore on web */
}
.headerbar .start, .headerbar .end { display:flex; gap: 6px; }
.headerbar .start { margin-right: 6px; }  .headerbar .end { margin-left: 6px; }
.backdrop .headerbar { background-color: var(--headerbar-backdrop-color); transition: background-color 200ms ease-out; }
.backdrop .headerbar > * { filter: opacity(.5); transition: filter 200ms ease-out; }

/* headerbar used as window titlebar (not in toolbarview) */
.window > .headerbar.titlebar { min-height: 46px; padding-bottom: 6px;
  box-shadow: 0 1px color-mix(in srgb, var(--headerbar-shade-color) 50%, transparent),
              0 2px 4px color-mix(in srgb, var(--headerbar-shade-color) 50%, transparent); }

/* ---- AdwToolbarView ---- */
.toolbar-view > .top-bar .headerbar,
.toolbar-view > .bottom-bar .headerbar {          /* %headerbar-inline */
  background: none; box-shadow: none; color: inherit;
  min-height: 46px; padding-bottom: 6px;          /* → padding 6px 7px 6px 7px */
}
/* inline bars do NOT dim on backdrop individually; instead: */
.backdrop .toolbar-view > :is(.top-bar,.bottom-bar) > .windowhandle { filter: opacity(.5); transition: filter 200ms ease-out; }

.toolbar-view > :is(.top-bar,.bottom-bar).raised {
  background-color: var(--headerbar-bg-color); color: var(--headerbar-fg-color); }
.backdrop .toolbar-view > :is(.top-bar,.bottom-bar).raised {
  background-color: var(--headerbar-backdrop-color); transition: background-color 200ms ease-out; }

.toolbar-view > .top-bar.raised {
  box-shadow: 0 1px color-mix(in srgb, var(--headerbar-shade-color) 50%, transparent),
              0 2px 4px color-mix(in srgb, var(--headerbar-shade-color) 50%, transparent); }
.toolbar-view > .top-bar.raised.border    { box-shadow: 0 1px var(--headerbar-darker-shade-color); }
.toolbar-view > .bottom-bar.raised {
  box-shadow: 0 -1px color-mix(in srgb, var(--headerbar-shade-color) 50%, transparent),
              0 -2px 4px color-mix(in srgb, var(--headerbar-shade-color) 50%, transparent); }
.toolbar-view > .bottom-bar.raised.border { box-shadow: 0 -1px var(--headerbar-darker-shade-color); }

/* flat style + content scrolled underneath → toolbarview gets .undershoot-top/.undershoot-bottom */
.toolbar-view.undershoot-top .scroller::before {        /* undershoot(top) */
  content:""; position:absolute; inset:0 0 auto 0; height:4px; pointer-events:none;
  box-shadow: inset 0 1px color-mix(in srgb, var(--shade-color) 75%, transparent);
  background: linear-gradient(to bottom, color-mix(in srgb, var(--shade-color) 75%, transparent), transparent 4px);
}
/* bottom: mirrored (inset 0 -1px, gradient to top). HC: inset line = var(--border-color) */

/* .collapse-spacing (bars stacked in one toolbar view) */
.toolbar-view .collapse-spacing { padding-top: 3px; padding-bottom: 3px; }
.toolbar-view .collapse-spacing .headerbar { min-height: 40px; padding-top: 3px; padding-bottom: 3px; }

/* ---- AdwWindowTitle ---- */
.window-title { margin: -6px 0; min-height: 12px; display:flex; flex-direction:column; justify-content:center; }
.window-title .title    { padding: 0 12px; font-weight: bold; }
.window-title .subtitle { padding: 0 12px; font-size: smaller; opacity: var(--dim-opacity); }
```

- **Which top-bar style is active is set in C code**, not in the stylesheet. The mapping is: no class = FLAT, `.raised` = RAISED, `.raised.border` = RAISED_BORDER. The stylesheet only reacts to the classes. In FLAT style the bar is fully transparent (window or sidebar background shows through), and a scroll "undershoot" 1px line plus a 4px gradient appears under it.
- Raised shadow values:
  - Light: `0 1px rgb(0 0 6/6%), 0 2px 4px rgb(0 0 6/6%)`.
  - Dark: 18%.
  - `.border` light: `0 1px rgb(0 0 6/12%)`. `.border` dark: `rgb(0 0 12/90%)`, a near-black hairline.
- **Devel windows:** the top bar gets `assets/devel-stripes.svg` cross-faded at 5%, repeated along x.
- `headerbar.default-decoration` (a titlebar with no content): 37px (36px as titlebar), box padding `3px 4px 4px`, window-control buttons `22px + padding 4px`.
- **Window (CSD):**
  - `border-radius: 15px` (`--window-radius`).
  - `box-shadow: 0 0 14px 5px rgb(0 0 0/15%), 0 0 5px 2px rgb(0 0 0/10%), 0 0 0 1px rgb(0 0 0/5%)`.
  - `outline: 1px solid rgb(255 255 255/7%); outline-offset: -1px`.
  - Backdrop: `0 0 14px 5px transparent, 0 0 10px 5px rgb(0 0 0/8%), 0 0 0 1px rgb(0 0 0/5%)`, 200ms ease-out.
  - Maximized, fullscreen and tiled windows have radius 0.
- **GtkSearchBar:** box padding `6px 6px 7px`, headerbar background, `inset 0 -1px var(--headerbar-shade-color)`. Its close button is 26px round (18px + padding 4px), flat, `margin-left: 10px; margin-right: 4px`. Inside a toolbar view: transparent with `padding-bottom: 6px`.
- **GtkActionBar:** box padding `7px 6px 6px`, headerbar background, `inset 0 1px var(--headerbar-shade-color)`, gap 6px. Inside a toolbar view: transparent with `padding-top: 6px`.
- **`.toolbar`:** padding 6px, gap 6px. `.toolbar.osd`: padding 12px, radius 15px.

---

## 6. Sidebars and split views (_sidebars.scss)

```css
/* pane backgrounds (AdwNavigationSplitView / AdwOverlaySplitView add these classes) */
.sidebar-pane { background: var(--sidebar-bg-color); color: var(--sidebar-fg-color);
  --shade-color: var(--sidebar-shade-color);
  box-shadow: inset -1px 0 var(--sidebar-border-color); }        /* start-side pane: line on its right */
.sidebar-pane.end { box-shadow: inset 1px 0 var(--sidebar-border-color); }
.backdrop .sidebar-pane { background: var(--sidebar-backdrop-color); transition: background-color 200ms ease-out; }
/* middle pane of a 3-pane layout (sidebar inside content or content inside sidebar) */
.content-pane .sidebar-pane, .sidebar-pane .content-pane {
  background: var(--secondary-sidebar-bg-color); color: var(--secondary-sidebar-fg-color);
  --shade-color: var(--secondary-sidebar-shade-color);
  box-shadow: inset -1px 0 var(--secondary-sidebar-border-color); }
.sidebar-pane .sidebar-pane { background: transparent; color: inherit; }
.overlay-pane { background: var(--window-bg-color); color: var(--window-fg-color); }  /* collapsed overlay sidebar */

/* .navigation-sidebar (GtkListBox/ListView) */
.navigation-sidebar { background: transparent; color: inherit; padding: 6px 0 4px; }
.navigation-sidebar > .row {
  box-sizing: border-box; min-height: 36px; padding: 0 8px;
  margin: 0 6px 2px; border-radius: 9px; }
.navigation-sidebar > .row:hover          { background: var(--hover-color); }            /* 7% */
.navigation-sidebar > .row:active         { background: var(--active-color); }           /* 16% */
.navigation-sidebar > .row.selected       { background: var(--selected-color); }         /* 10% */
.navigation-sidebar > .row.selected:hover { background: var(--selected-hover-color); }   /* 13% */
.navigation-sidebar > .row.selected:active{ background: var(--selected-active-color); }  /* 19% */
.navigation-sidebar > .row.has-open-popup { background: var(--hover-color); }
.navigation-sidebar > .separator          { margin: 6px; }
.navigation-sidebar > .header > .box      { margin: 6px; }
.navigation-sidebar > .header > .box > .heading { margin: 6px; }
.navigation-sidebar > .header.first > .box,
.navigation-sidebar > .header.first:not(.has-suffix) > .box > .heading { margin-top: 0; }
/* grid/flow variants: container padding 3px; child margin 3px; padding 8px; radius 9px */

/* AdwSidebar (sidebar > scrolledwindow > .navigation-sidebar) */
.adw-sidebar .prefix { margin: 6px 6px 0; }
.adw-sidebar .suffix { margin: 0 6px 6px; }
.adw-sidebar .navigation-sidebar > .row { padding: 0; }   /* padding moved to the child box */
.adw-sidebar .navigation-sidebar > .row > .box {
  display:flex; align-items:center; gap: 12px; min-height: 36px; padding: 3px 14px; box-sizing:border-box; }
.adw-sidebar .row > .box > .icon:disabled { opacity: var(--disabled-opacity); }
```

- **Sidebar selection is neutral grey** (currentColor 10%), **not accent**. It is the same in AdwSidebar because it reuses `.navigation-sidebar`.
- **AdwSidebar item geometry:** 36px min height (box `3px 14px` padding plus content), 6px side margin, 2px gap between rows, 12px icon-to-label gap, 9px radius. List top padding is 6px and bottom is 4px, which accounts for the last row's 2px margin.
- **AdwSidebar section headers:** outer box margin 6px, heading label margin 6px, weight 700 via `.heading`. The first header has no top margin. The stylesheet does **not** make the heading dimmed; any `.dimmed`/caption class comes from the widget's UI files (not verifiable here).
- **Suffix/count badges:** AdwSidebar has no count styling in the stylesheet. The only built-in count pill is **AdwViewSwitcherSidebar** `.indicator`:
  ```css
  .vss .indicator { background: color-mix(in srgb, currentColor 40%, transparent); border-radius: 999px;
    min-width: 1.6em; min-height: 1.6em; font-weight: bold; font-size: smaller; }
  .vss .indicator > .label { color: white; padding: 0 6px; }
  .vss .indicator.dot { min-width: 8px; min-height: 8px; }
  .vss .indicator.needs-attention { background: var(--accent-bg-color); }  /* label → accent-fg */
  ```
- A sidebar in the `.empty` state (not `.page`) uses the `.compact` status page.
- Header bars inside a sidebar pane's toolbar view are transparent (inline), so the sidebar colour runs up into the titlebar area.
- **Split views have no shadows or borders beyond the 1px `inset` line** on the sidebar pane. The line is `--sidebar-border-color`: light `rgb(0 0 6/7%)`, dark `rgb(0 0 6/36%)`.
- **Transition shadows** (navigation-view / overlay-split-view during slide or overlay):
  - `> dimming`: `background: var(--shade-color)`.
  - `> shadow`: 56px wide with two stacked gradients (direction = toward the content):
    ```css
    background-image:
      linear-gradient(to right, color-mix(in srgb,var(--shade-color) 70%,transparent),
                      color-mix(in srgb,var(--shade-color) 14%,transparent) 40px, transparent 56px),
      linear-gradient(to right, color-mix(in srgb,var(--shade-color) 40%,transparent),
                      color-mix(in srgb,var(--shade-color) 14%,transparent) 7px, transparent 24px);
    ```
- **GtkPaned separator:** 1px, `box-shadow: inset 1px 0 var(--border-color)`. `.wide`: 5px with lines on both sides. Vertical panes use `inset 0 1px`.
- `stacksidebar row`: padding `10px 4px`, label padding `0 6px`.

---

## 7. Lists, rows, preferences (_lists.scss, _preferences.scss, _misc.scss)

```css
/* base GtkListBox / GtkListView */
.list { background: var(--view-bg-color); color: var(--view-fg-color); }
.list > .row { padding: 2px; }
.list.separators > .row:not(.separator) { border-bottom: 1px solid var(--border-color); }
.list > header { font-weight: 700; padding: 18px 2px 6px; }         /* listview section headers */

.row.activatable:hover  { background-color: var(--view-hover-color); }     /* 4% */
.row.activatable:active { background-color: var(--view-active-color); }    /* 8% */
.row.selected           { background-color: var(--view-selected-color); }  /* accent 25% */
.row.selected.activatable:hover  { background-color: var(--view-selected-hover-color); }  /* 32% */
.row.selected.activatable:active { background-color: var(--view-selected-active-color); } /* 39% */
/* inside .osd, rows use the neutral set: 7/16/10/13/19% */

/* .card and .boxed-list */
.card, .boxed-list {
  background-color: var(--card-bg-color); color: var(--card-fg-color);
  border-radius: 12px;
  box-shadow: 0 0 0 1px rgb(0 0 6 / 3%), 0 1px 3px 1px rgb(0 0 6 / 7%), 0 2px 6px 2px rgb(0 0 6 / 3%);
}
.card.activatable:hover  { background-image: linear-gradient(color-mix(in srgb,currentColor 3%,transparent) 0 0); }
.card.activatable:active { background-image: linear-gradient(color-mix(in srgb,currentColor 8%,transparent) 0 0); }

.boxed-list > .row {
  border-bottom: 1px solid var(--card-shade-color);          /* 7% light / 36% dark; HC: --border-color */
  transition: background-color 200ms var(--ease-out-quad), background-image 200ms var(--ease-out-quad),
              border-radius 200ms var(--ease-out-quad);      /* + focus ring, offset -1px */
}
.boxed-list > .row:first-child { border-top-left-radius: 12px; border-top-right-radius: 12px; }
.boxed-list > .row:last-child  { border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; border-bottom-width: 0; }
.boxed-list > .row.activatable:not(.selected):hover  { background-color: color-mix(in srgb,currentColor 3%,transparent); }
.boxed-list > .row.activatable:not(.selected):active { background-color: color-mix(in srgb,currentColor 8%,transparent); }

/* .boxed-list-separate: every row is its own card */
.boxed-list-separate { background: none; color: var(--card-fg-color); }
.boxed-list-separate > .row { /* .card rules */ margin-bottom: 12px; border: none; }
.boxed-list-separate > .row:last-child { margin-bottom: 0; }
.boxed-list-separate > .row.selected { background-color: var(--view-selected-color); }
.boxed-list-separate > .row.activatable:not(.selected):hover {
  background-color: var(--card-bg-color); background-image: linear-gradient(color-mix(in srgb,currentColor 3%,transparent) 0 0); }

/* AdwActionRow (also SwitchRow, ComboRow – they are action rows) */
.row > .header { display:flex; align-items:center; gap: 6px; margin: 0 12px; min-height: 50px; }
.row > .header > .title-box { display:flex; flex-direction:column; justify-content:center;
                              gap: 3px; margin: 6px 0; font-weight: inherit; }
.row .subtitle { font-size: smaller; opacity: var(--dim-opacity); }
.row > .header > :is(.icon,.prefixes) { margin-right: 6px; }   /* → 12px to the title */
.row > .header > :is(.prefixes,.suffixes) { display:flex; gap: 6px; }

/* property row: small dim title on top, value as normal text */
.row.property .title    { font-size: smaller; opacity: var(--dim-opacity); }
.row.property .subtitle { font-size: inherit; opacity: 1; }
.row.property.monospace .subtitle { font-family: var(--monospace-font-family); font-size: var(--monospace-font-size); }

/* AdwButtonRow */
.row.button > .box { display:flex; justify-content:center; align-items:center; gap: 6px; margin: 0 12px; min-height: 40px; }
.row.button .title { font-weight: 700; }
.row.button.suggested-action { background-color: var(--accent-bg-color); color: var(--accent-fg-color); border-bottom: none; }
.row.button.suggested-action:hover  { background-image: linear-gradient(color-mix(in srgb,currentColor 10%,transparent) 0 0); }
.row.button.suggested-action:active { background-image: linear-gradient(rgb(0 0 6/20%) 0 0); }
.row.button.destructive-action { --accent-color: var(--destructive-color); color: var(--accent-color); }

/* AdwEntryRow */
.row.entry > .header { gap: 0; margin: 0 6px; }
.row.entry .editable-area { padding: 0 6px; }
.row.entry .editable-area > :is(.edit-icon,.indicator) { min-width: 34px; min-height: 34px; padding: 5px; margin-left: 6px; }
.row.entry .editable-area > .indicator { opacity: 30%; }
.row.entry .prefixes { margin-left: 6px; }  .row.entry .suffixes { margin-right: 6px; }
.row.entry.focused { outline: 2px solid var(--focus-ring-color); outline-offset: -1px; }  /* ring on focus-within */
.row.entry.focused:hover { background-color: transparent; }   /* no hover tint while editing */

/* AdwSpinRow: circular ± buttons */
.row.spin .spinbutton { background: none; box-shadow: none; gap: 6px; outline: none; }
.row.spin .spinbutton > .btn { min-width: 30px; min-height: 30px; padding: 0; border-radius: 9999px;
  margin: 10px 2px; background-color: var(--button-color); }   /* full raised button states */

/* AdwExpanderRow */
.row.expander { background: none; padding: 0; }
.row.expander .row-header { padding: 2px; }
.row.expander .nested { background-color: color-mix(in srgb, var(--card-shade-color) 50%, transparent); }
.row.expander .nested > .row { border-bottom: 1px solid var(--card-shade-color); }
.row.expander .expander-arrow { opacity: var(--dim-opacity); margin-left: 3px;
  transform: rotate(0.5turn); transition: transform 200ms var(--ease-out-quad); }
.row.expander.checked .expander-arrow { transform: rotate(0turn); opacity: 1; color: var(--accent-color); }

/* .rich-list */
.rich-list > .row { padding: 8px 12px; min-height: 48px; }   /* GTK 32px content + 16px */
.rich-list > .row > .box { gap: 12px; }
.rich-list > header { padding-left: 12px; padding-right: 12px; }

/* preferences */
.preferences-page > .clamp > .box { margin: 24px 12px; display:flex; flex-direction:column; gap: 24px; }
.preferences-group > .box { display:flex; flex-direction:column; gap: 6px; }
.preferences-group .labels { display:flex; flex-direction:column; gap: 6px; }  /* title ↔ description */
.preferences-group > .box > .header:not(.single-line) { margin-bottom: 6px; }
.preferences-group > .box > .header.single-line { min-height: 34px; }  /* title with a suffix button */
```

**Row sizing:**
- An AdwActionRow in a boxed list is **54px** tall at minimum: the header is 50px, plus the generic `list > row { padding: 2px }` above and below.
- Content inset from the card edge is 2px (row padding) + 12px (header margin) = **14px**.
- AdwButtonRow is 40 + 4 = 44px.
- AdwEntryRow insets are 2 + 6 + 6 = 14px to the text. Its floating-title behaviour is widget code.

**States:**
- **Boxed-list hover is 3% and active is 8%** (plain lists: 4%/8%). A selected row uses accent 25%.

**Not in the stylesheet:**
- AdwPreferencesGroup title/description font classes (the title is typically `.heading` and the description `.dimmed`, but these come from widget UI files).
- AdwClamp maximum width.
- AdwSwitchRow and AdwComboRow have no dedicated styling beyond this:
  - ComboRow: dropdown arrow disabled → opacity 50%; its inline listview has no background.
  - ComboRow popover: contents min-width 120px, search bar margin 6px.

**Expander row details:**
- In the last expanded row of a boxed list, the nested list's last row gets the 12px bottom radii.
- `.osd` expander arrows do not turn accent.

---

## 8. Column view / data table and views (_column-view.scss, _views.scss)

```css
.column-view { background: var(--view-bg-color); color: var(--view-fg-color); } /* usually has .view */
/* header */
.column-view > .header > .col-btn {
  box-sizing: border-box; min-height: 30px;          /* inherits button min-height 24px + 3px padding */
  padding: 3px 6px; border-radius: 0; box-shadow: none; background-color: transparent;
  line-height: 100%; border-left: 1px solid transparent; }
.column-view > .header > .col-btn:first-child { border-left-width: 0; }
.column-view > .header > .col-btn > .box {
  display:flex; gap: 6px; font-weight: 700; font-size: 82%;           /* .caption-heading */
  color: color-mix(in srgb, currentColor 40%, transparent); }           /* HC 60% */
.column-view > .header > .col-btn:hover  > .box { color: color-mix(in srgb, currentColor 70%, transparent); } /* HC 90% */
.column-view > .header > .col-btn:active > .box { color: currentColor; }
.column-view .sort-indicator { width: 16px; height: 16px; }  /* ascending pan-up, descending pan-down */

/* rows & cells */
.column-view > .listview > .row { padding: 0; }
.column-view > .listview > .row > .cell { padding: 8px 6px; }
.column-view > .listview > .row > .cell:not(:first-child) { border-left: 1px solid transparent; }
.column-view.data-table > .listview > .row > .cell { padding-top: 2px; padding-bottom: 2px; }

/* show-column-separators */
.column-view.column-separators > .listview > .row > .cell,
.column-view.column-separators > .header > .col-btn { border-left-color: var(--border-color); }
/* show-row-separators: separator on TOP of each row (not bottom) */
.column-view > .listview.separators > .row:not(.separator) { border-top: 1px solid var(--border-color); border-bottom: none; }

/* selection = generic row rules (§7) */
.column-view .row.selected { background-color: var(--view-selected-color); }   /* accent 25% */
.column-view .row.activatable:hover { background-color: var(--view-hover-color); }

/* drag-and-drop header */
.column-view .col-btn.dnd { color: var(--accent-fg-color); background-color: var(--accent-bg-color); transition: none; }

/* generic .view */
.view { color: var(--view-fg-color); background-color: var(--view-bg-color); }
.view:disabled { color: color-mix(in srgb, var(--view-fg-color) var(--disabled-opacity), transparent);
                 background-color: color-mix(in srgb, var(--window-bg-color) 60%, var(--view-bg-color)); }
.view.selected { background-color: var(--view-selected-color); border-radius: 9px; }

/* GridView / FlowBox children */
.grid-child { padding: 3px; border-radius: 9px; }
.grid-child:hover { background-color: var(--view-hover-color); }
.grid-child.selected { background-color: var(--view-selected-color); }   /* hover 32%, active 39% */
.rubberband { border: 1px solid var(--accent-color); background-color: color-mix(in srgb, var(--accent-color) 20%, transparent); }
```

**Heights:**
- Row height is not set; it is content-driven.
- With one line of 14.67px text: default ≈ line-height + 16px. `.data-table` ≈ line-height + 4px.
- Header ≈ 30px (min-height 24px inherited from `button`, plus 3px vertical padding).

**Header colour and states:**
- **The header label is 40% currentColor, caption-heading.** There is no header background and no bottom border line.
- The only header/body divider is the undershoot (`undershoot(top, $neighbor:true)`): a 1px shade-75% line plus a 4px gradient, drawn when rows scroll under the header.
- Header hover (literal reading): the rule `columnview > header > button` (specificity 0,0,3) is lower than the generic `button:hover` (0,1,1). So the generic raised hover/active background (15%/30%) technically still paints on header buttons. The stylesheet only explicitly changes the label colour. Test against a real GTK app if exact parity matters.

**`.rich-list` and separators:**
- `.rich-list > row` only matches a list's direct rows. Putting `.rich-list` on a GtkColumnView does not reach its rows (`columnview > listview > row`); the class would have to go on the internal listview.
- Row separators in column views go on **top** of each row. In plain lists they go on the bottom.

**Other:**
- `treeexpander`: gap 4px. `.navigation-sidebar` inside a treeview uses neutral selection.

---

## 9. Progress bar and level bar (_progress-bar.scss, _level-bar.scss, _scale.scss)

```css
.progress        { min-width: 150px; }
.progress > .trough {
  height: 8px; border-radius: 99px;
  background-color: var(--trough-color);                          /* currentColor 15% */
  transition: background 200ms var(--ease-out-quad), box-shadow 200ms var(--ease-out-quad); }
.progress > .trough > .fill {
  height: 8px; border-radius: 99px;
  background-color: var(--accent-bg-color); color: var(--accent-fg-color);
  transition: background 200ms var(--ease-out-quad), box-shadow 200ms var(--ease-out-quad); }
.progress > .text { font-size: smaller; opacity: var(--dim-opacity); font-variant-numeric: tabular-nums; }
.progress:disabled { filter: opacity(var(--disabled-opacity)); }
.progress.vertical > .trough { min-height: 80px; width: 8px; }
.progress .trough.empty > .fill { display: none; }                /* fraction 0 → no pill */
@media (prefers-contrast: more) { .progress > .trough {
  background-color: color-mix(in srgb, currentColor 30%, transparent); box-shadow: inset 0 0 0 1px var(--border-color); } }

/* .osd: thin 2px bar with no trough, e.g. under a header bar */
.progress.osd { min-width: 2px; min-height: 2px; }
.progress.osd > .trough { height: 2px; border-radius: 0; background: transparent; box-shadow: none; }
.progress.osd > .trough > .fill { height: 2px; border-radius: 0; }

/* level bar */
.levelbar .block        { min-height: 8px; border-radius: 99px; }
.levelbar .block.filled { background-color: var(--accent-bg-color); }   /* .high or any non-empty */
.levelbar .block.low    { background-color: var(--warning-bg-color); }
.levelbar .block.full   { background-color: var(--success-bg-color); }
.levelbar .block.empty  { background-color: var(--trough-color); }
.levelbar.discrete .block { min-width: 26px; margin-right: 2px; border-radius: 0; }
.levelbar.discrete .block:first-child { border-radius: 99px 0 0 99px; }
.levelbar.discrete .block:last-child  { border-radius: 0 99px 99px 0; margin-right: 0; }
```

- **The progress bar is 8px thick and fully rounded**, including the fill end (`99px` on every side).
- **`.osd` progress is a 2px square line** with a transparent trough, not a thin rounded pill.
- **Scale (slider)**, for reference:
  - Thumb 20×20 round, `background: var(--slider-color)`, `box-shadow: 0 0 0 1px rgb(0 0 6/10%), 0 2px 4px rgb(0 0 6/20%)`, `margin: -8px`.
  - Hovering the scale: trough 20%, thumb `#fff`, highlight overlay currentColor 10%.
  - Scale padding 12px. The trough height is not set in the stylesheet (min-height 10px is on the scale node).

---

## 10. Switch, check, radio (_switch.scss, _checks.scss)

```css
.switch {
  box-sizing: border-box; height: 26px; width: 46px;   /* GTK: padding 3px + 20px slider; width from GtkSwitch code (2×slider) */
  padding: 3px; border-radius: 14px;
  background-color: var(--trough-color);                              /* 15% */
  transition: background 200ms var(--ease-out-quad), box-shadow 200ms var(--ease-out-quad); /* + outer ring offset 1px */
}
.switch:hover  { background-color: var(--trough-hover-color); }      /* 20% */
.switch:active { background-color: var(--trough-active-color); }     /* 25% */
.switch > .slider { width: 20px; height: 20px; border-radius: 50%;
  background-color: var(--slider-color);                              /* white 80% + view-bg */
  box-shadow: 0 2px 4px rgb(0 0 6 / 20%); }
.switch:is(:hover,:active) > .slider { background: white; }
.switch.checked { color: var(--accent-fg-color); background-color: var(--accent-bg-color); }
.switch.checked:hover  { background-image: linear-gradient(color-mix(in srgb,currentColor 10%,transparent) 0 0); }
.switch.checked:active { background-image: linear-gradient(rgb(0 0 6/20%) 0 0); }
.switch.checked > .slider { background-color: white; }
.switch:disabled { filter: opacity(var(--disabled-opacity)); }
.switch:disabled > .slider { box-shadow: 0 2px 4px transparent; }
.osd .switch.checked { background-color: rgb(255 255 255 / 60%); }
/* HC: trough 30/40/50% */

/* checkbutton wrapper (check + label) */
.checkbutton { display:inline-flex; align-items:center; gap: 4px; padding: 3px; border-radius: 9px; } /* inner focus ring */
.checkbutton.text-button { padding: 4px; }
.checkbutton.grouped { border-radius: 999px; }        /* radio group */

.check, .radio {
  box-sizing: border-box; width: 20px; height: 20px;  /* GTK: 14px + padding 3px; icon 14px */
  padding: 3px;
  box-shadow: inset 0 0 0 2px var(--trough-color);            /* 2px ring, 15% */
  transition: background 200ms var(--ease-out-quad), box-shadow 200ms var(--ease-out-quad);
}
.check { border-radius: 6px; }   .radio { border-radius: 100%; }
.check:not(.checked,.indeterminate):hover  { box-shadow: inset 0 0 0 2px var(--trough-hover-color); } /* 20% */
.check:not(.checked,.indeterminate):active { background-color: var(--trough-active-color); box-shadow: none; } /* 25% fill */
.check:is(.checked,.indeterminate) { background-color: var(--accent-bg-color); color: var(--accent-fg-color); box-shadow: none; }
.check:is(.checked,.indeterminate):hover  { background-image: linear-gradient(color-mix(in srgb,currentColor 10%,transparent) 0 0); }
.check:is(.checked,.indeterminate):active { background-image: linear-gradient(rgb(0 0 6/20%) 0 0); }
.check:disabled { filter: opacity(var(--disabled-opacity)); }
/* same for .radio */
.selection-mode .check, .selection-mode .radio { padding: 7px; border-radius: 100px; }  /* 28px */
```

Glyphs (14×14 viewBox, filled with `currentColor` = accent-fg):
- **check.svg:** `M12.5996 2.1992a1 1 0 0 0-1.4004.2012L5.8906 9.4766 2.707 6.293a1 1 0 0 0-1.414 0 1 1 0 0 0 0 1.414l4 4a1.0001 1.0001 0 0 0 1.5078-.1074l6-8a1 1 0 0 0-.2012-1.4004Z`
- **bullet.svg (radio):** a circle of r=4 at the centre (7,7).
- **dash.svg (indeterminate):** `M3 5a2 2 0 0 0-2 2 2 2 0 0 0 2 2h8a2 2 0 0 0 2-2 2 2 0 0 0-2-2Z` (a 12×4 rounded bar).

- **Unchecked checks and radios have no fill.** They are a 2px inset ring at 15%; there is no white box. Pressing fills the whole box at 25%.
- In high contrast, the ring uses `--border-color` and hover uses 60%.

---

## 11. Entries, search, spin button (_entries.scss, _spin-button.scss)

```css
.entry {
  box-sizing: border-box; min-height: 34px; padding: 0 9px;
  display:flex; align-items:center; gap: 6px;
  border: none; border-radius: 9px;
  background-color: var(--button-color);                 /* currentColor 10% – same as a button */
  caret-color: currentColor;
  outline: 0 solid transparent; outline-offset: 4px;
  transition: outline-color 200ms var(--ease-out-quad), outline-width 200ms var(--ease-out-quad),
              outline-offset 200ms var(--ease-out-quad);
}
.entry:focus-within { outline: 2px solid var(--focus-ring-color); outline-offset: -2px; }  /* no bg change */
.entry::placeholder, .entry .placeholder { opacity: var(--dim-opacity); }
.entry:disabled { filter: opacity(var(--disabled-opacity)); }
.entry > .icon { opacity: 70%; }             /* HC 85% */
.entry > .icon:hover  { opacity: 100%; }
.entry > .icon:active { opacity: 80%; }      /* HC 90% */
.entry > .icon.left  { margin-right: 6px; }  .entry > .icon.right { margin-left: 6px; }
.entry.password .caps-lock-indicator { opacity: 30%; }
.entry.flat { min-height: 0; padding: 2px; background: transparent; box-shadow: none; border-radius: 0; }
@media (prefers-contrast: more) { .entry { box-shadow: inset 0 0 0 1px var(--border-color); } }
/* progress inside an entry: 2px accent underline, margin-bottom 3px */

/* spin button (horizontal) */
.spinbutton { /* .entry rules */ padding: 0; gap: 0; font-variant-numeric: tabular-nums; }
.spinbutton > .text { min-width: 40px; padding: 6px; }             /* GTK 28px + 6px padding */
.spinbutton > .btn { min-height: 16px; min-width: 22px; padding-top: 0; padding-bottom: 0; margin: 0;
  border-radius: 0; border: 0 solid color-mix(in srgb, currentColor 10%, transparent); border-left-width: 1px;
  /* + flat button states: hover 7%, active 16% */ }
.spinbutton > .btn:last-child { border-radius: 0 9px 9px 0; }
/* vertical: text 30×30 min; buttons stacked with 1px top/bottom borders, radii 9px 9px 0 0 / 0 0 9px 9px */
```

- **There is no `.search`-specific entry styling** in 1.10. A search entry is a plain `entry` (34px, 10% background, 9px radius) with its icons at 70% opacity.
- **Entries have no border and no white background.** Their fill is the same currentColor 10% as raised buttons, and focus only adds the 2px accent-50% inner ring.
- The block cursor is `var(--view-fg-color)` on `var(--view-bg-color)`.

---

## 12. Popovers and menus (_popovers.scss, _menus.scss)

```css
.popover { background: transparent; }
.popover > .contents {
  padding: 8px; border-radius: 15px;                                    /* $menu_radius + 6 */
  background-color: var(--popover-bg-color); color: var(--popover-fg-color);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 5%), 0 1px 5px 1px rgb(0 0 0 / 9%), 0 2px 14px 3px rgb(0 0 0 / 5%);
  --shade-color: var(--popover-shade-color);
}
.popover > .arrow { background-color: var(--popover-bg-color); border: 1px solid transparent; } /* HC: --border-color */
.popover > .contents > :is(.list,.view,.toolbar) { border-style: none; background-color: transparent; }
.osd .popover > .contents { background: rgb(0 0 0/70%); color: rgb(255 255 255/90%); box-shadow: 0 0 1px rgb(255 255 255/10%); }

/* popover.menu */
.menu > .contents { min-width: 120px; padding: 0; }
.menu > .contents > .stack > .box { padding: 6px; }            /* the actual inner inset */
.menu-item {                                                   /* modelbutton */
  box-sizing: border-box; min-height: 32px; min-width: 64px;   /* GTK min-width 40px + 12px padding ×2 */
  padding: 0 12px; border-radius: 9px; background-color: transparent;
  display:flex; align-items:center; }
.menu-item:is(:hover,.selected) { background-color: var(--selected-color); }        /* 10% */
.menu-item:active               { background-color: var(--selected-active-color); } /* 19% */
.menu .separator { margin: 6px 0; }
.menu .accelerator { margin-left: 12px; color: color-mix(in srgb, currentColor var(--dim-opacity), transparent); }
.menu .section-title { font-weight: bold; padding: 4px 32px; }   /* label.title: 12px + 20px */

/* check/radio indicators in menus: glyph only, no box */
.menu :is(.check,.radio) { width: 18px; height: 18px; padding: 2px; background: none; box-shadow: none; color: inherit; }
.menu .radio { padding: 1px; border: 1px solid color-mix(in srgb, currentColor 30%, transparent); }  /* radios keep a ring */
.menu :is(.check,.radio,.arrow).left  { margin-left: -2px; margin-right: 6px; }
.menu :is(.check,.radio,.arrow).right { margin-left: 6px;  margin-right: -2px; }
/* submenu arrow */
.menu-item .arrow { width: 16px; height: 16px; opacity: 30%; }   /* go-next-symbolic / go-previous-symbolic */

/* inline icon-button rows in menus (e.g. zoom − 100% +) */
.menu .inline-buttons { padding: 0 12px; }
.menu .inline-buttons .btn { min-width: 32px; min-height: 32px; padding: 0; /* flat */ transition: none; }
.menu .circular-buttons { padding: 12px 12px 6px; }
.menu .circular-buttons .btn { padding: 11px; box-shadow: inset 0 0 0 1px var(--border-color); /* flat, round */ }

/* list-based menus (dropdown popovers) */
.menu .list > .row { border-radius: 9px; padding: 0 12px; min-height: 32px; min-width: 40px; }
.menu .contents > .list { padding: 6px 0; }
.menu .contents > .list > .row { margin: 0 6px; padding: 9px 12px; min-height: 0; }
.menu .list > .row:hover  { background-color: var(--selected-color); }
.menu .list > .row:active { background-color: var(--selected-active-color); }
.menu .list > .row.selected { background: none; }       /* selection is shown by a check icon, not a fill */
```

- **Menu hover is currentColor 10%** (the `selected` token), not the 7% used for flat buttons. Pressed is 19%.
- **The menu inset is 6px (menu margin) with 9px item radius inside a 15px popover radius.** Regular (non-menu) popovers use 8px contents padding.
- **Menu checks have no box at all.** Radios keep a 1px ring at 30%. The glyph is `currentColor`, not accent.
- Popover arrow shape and size are drawn by GTK code and are not in the stylesheet.
- Dropdown popovers: `padding-top: 6px`, search bar padding 6px.
- `dropdown > button` box gap is 6px, with a `pan-down-symbolic` arrow at 16px.
- **Menubar:** `box-shadow: inset 0 -1px var(--border-color); padding-bottom: 1px`. Items `min-height: 16px; padding: 4px 8px; border-radius: 9px`, selected → 10%.

---

## 13. Dialogs (_dialogs.scss, _message-dialog.scss, _bottom-sheet.scss)

```css
/* AdwDialog floating */
.dialog-backdrop { background-color: rgb(from var(--shade-color) r g b / calc(alpha * 2)); }
/* → light rgb(0 0 6/14%), dark rgb(0 0 6/50%) */
.dialog {
  border-radius: 15px;                                                  /* $dialog_radius */
  background-color: var(--window-bg-color); color: var(--window-fg-color);
  box-shadow: 0 0 14px 2px rgb(0 0 6 / 3%), 0 0 5px 2px rgb(0 0 6 / 10%), 0 0 0 1px rgb(0 0 0 / 5%);
  outline: 1px solid rgb(255 255 255 / 7%); outline-offset: -1px;       /* HC: 30% */
}

/* AdwAlertDialog */
.alert { background-color: var(--dialog-bg-color); color: var(--dialog-fg-color); border-radius: 18px; }
.alert .message-area { padding: 32px 0 9px; display:flex; flex-direction:column; gap: 24px; }
.alert .message-area.has-heading.has-body { gap: 10px; }
.alert .message-area.has-heading.has-body > .child { margin-top: 8px; }
.alert .message-area > :is(.heading-bin,.body,.child) { padding: 0 24px; }
.alert .response-area { padding: 12px 24px 24px; display:flex; gap: 12px; }
.alert .response-area > .btn { min-height: 44px; min-width: 100px;  /* GTK 24/60 content + padding 10px 20px */
                               padding: 10px 20px; border-radius: 12px; }
/* .short (narrow width) */
.alert.short .message-area { padding-top: 24px; gap: 18px; }
.alert.short .message-area > * { padding: 0 18px; }
.alert.short .message-area.has-heading.has-body { gap: 6px; }
.alert.short .response-area { padding: 9px 18px 18px; }
.alert.short .response-area > .btn { min-width: 0; padding: 8px 16px; }

/* bottom sheet (narrow/mobile AdwDialog) */
.bottom-sheet { border-top-left-radius: 15px; border-top-right-radius: 15px;
  box-shadow: 0 0 14px 2px rgb(0 0 6/3%), 0 0 5px 2px rgb(0 0 6/10%), 0 0 0 1px rgb(0 0 0/5%);
  transition: border-radius 100ms ease-out, box-shadow 250ms ease; }
.bottom-sheet .drag-handle { width: 54px; height: 6px; margin: 15px; border-radius: 99px;
  background-color: color-mix(in srgb, currentColor 25%, transparent); }
/* outline: inset 1px left/right/top rgb(255 255 255/7%) */
```

- Alert **response buttons use a 12px radius** (not 9px) and 10px×20px padding, so they are about 44px tall.
- The response buttons' layout (equal-width row, or stacked vertically when too narrow) is widget logic, not CSS.
- **AdwAlertDialog heading/body font classes are not in the stylesheet.** Only GtkMessageDialog's `label.title` is mapped to `.title-2` here. The AdwAlertDialog heading's class comes from its UI file; `.title-2` is the usual choice, but verify it.
- The alert body scroll area has an 18px top radius, and its scrollbar has `padding-top: 6px`.
- In a non-narrow bottom sheet, the sheet has `margin: 0 30px`.
- **AdwPreferencesDialog:** no dedicated rules. It uses preferencespage/preferencesgroup (§7) inside a floating sheet at 15px radius.
- `dialog.shortcuts` (AdwShortcutsDialog):
  - Page gap 18px.
  - Rows `padding: 9px 12px; min-height: 36px`; subtitle uses `.caption` + dimmed.
  - Keycaps: `background: currentColor 10%; box-shadow: inset 0 -2px var(--card-shade-color); border-radius: 6px; padding: 6px; min-width: 20px`.
- `.dialog-action-area` (legacy GtkDialog): margin 6px, gap 6px.
- `window.dialog.message` (GtkMessageDialog) radius is 18px. Its action area is `padding: 21px 24px 24px`, gap 12px, buttons `10px 20px`, radius 12px.

---

## 14. Toggle group and view switchers (_toggle-group.scss, _view-switcher.scss)

```css
.toggle-group {
  --group-padding: 3px;
  display:inline-flex; padding: var(--group-padding);
  background: var(--button-color); border-radius: 9px; }                /* 10% track */
.toggle-group > .toggle {
  box-sizing: border-box; min-width: 34px; min-height: 28px;           /* 34 - 2×3 */
  border-radius: 6px;                                                   /* 9 - 3 */
  font-weight: bold; background: transparent;
  transition: color 200ms var(--ease-out-quad), background 200ms var(--ease-out-quad),
              box-shadow 200ms var(--ease-out-quad);                     /* + outer focus ring, offset 0 */
}
.toggle-group > .toggle.text-button       { min-width: 40px; padding: 0 8px; }   /* GTK 24px + 8px×2 */
.toggle-group > .toggle.image-text-button { min-width: 32px; padding: 0 8px; }
.toggle-group > .toggle:hover  { background-color: var(--hover-color); }         /* 7% */
.toggle-group > .toggle:active { background-color: var(--active-color); }        /* 16% */
.toggle-group > .toggle.checked {
  background-color: var(--active-toggle-bg-color);     /* #fff light, rgb(255 255 255/20%) dark */
  color: var(--active-toggle-fg-color);
  box-shadow: 0 1px 3px 1px rgb(0 0 6 / 7%), 0 2px 6px 2px rgb(0 0 6 / 3%); }
.toggle-group > .toggle.checked:disabled {
  background-color: color-mix(in srgb, var(--active-toggle-bg-color) var(--disabled-opacity), transparent); box-shadow: none; }
.toggle-group > .toggle:disabled > * { filter: opacity(30%); }
.toggle-group:disabled { background-color: color-mix(in srgb, var(--button-color) var(--disabled-opacity), transparent); }
.toggle-group > .separator { margin: 3px 1px; transition: opacity 200ms var(--ease-out-quad); } /* 6 - pad */
.toggle-group > .separator.hidden { opacity: 0; }        /* hidden next to the checked toggle */
.toggle-group.vertical > .toggle:not(.text-button,.image-text-button) { min-width: 28px; }

.toggle-group.round { border-radius: 17px; }
.toggle-group.round > .toggle { border-radius: 14px; }
.toggle-group.round > .toggle:is(.text-button,.image-text-button) { padding: 0 12px; }
.toggle-group.round > .separator { margin: 6px 1px; }

.toggle-group.flat { --group-padding: 0px; background: none; box-shadow: none; }
.toggle-group.flat > .toggle.checked { background-color: var(--selected-color); color: inherit; box-shadow: none; }
.toggle-group.flat > .toggle.checked:hover  { background-color: var(--selected-hover-color); }
.toggle-group.flat > .toggle.checked:active { background-color: var(--selected-active-color); }
.toggle-group.flat > .separator { background: none; }    /* flat: inner focus ring */

/* .osd toggle group: checked = white pill, fg rgb(0 0 0/80%); inner accent remapped to rgb(0 0 0/75%) */
```

**AdwInlineViewSwitcher** is a `toggle-group` inside `inline-view-switcher`. Its layouts are `.icons`, `.labels` and `.both`:
- `.icons` toggles: min-width 34px.
- `.labels`: min-width 24px. The inner indicator bin has `padding: 0 8px` and the label `padding: 0 6px`. The badge/dot is shifted `translateY(2px)`.
- `.both`: min-width 16px. The inner box has `padding: 0 12px`, gap 6px.

**AdwViewSwitcher (header-bar tabs):**
```css
.view-switcher { display:flex; gap: 3px; min-height: 34px; }
.view-switcher > .btn.toggle { padding: 0; /* rest of button rules apply */ }
.view-switcher .wide   { display:flex; align-items:center; gap: 6px; padding: 2px 12px; }   /* icon + label side by side */
.view-switcher .narrow { font-size: 0.75rem; padding-top: 4px; }                           /* icon over label, 11px text */
.view-switcher .narrow > .label { min-height: 18px; padding: 0 3px 2px; }
.view-switcher.narrow { margin: -3px 0; min-height: 6px; }
/* AdwViewSwitcherBar (bottom): actionbar box padding 7px 0 6px (6px top when collapsed) */
/* AdwViewSwitcherTitle: margin -6px 0; switcher margin 0 12px; wide 6px / narrow 3px vertical margin */
```

- Whether the view-switcher toggle buttons carry `.flat` is decided in widget code, not the stylesheet. With the button rules above, a checked non-flat toggle would be 30% and a flat one 10%. Verify against a running app before choosing.

**AdwIndicatorBin badges:**
- Dot: 6×6, `margin: 2px`, `border-radius: 100px`, `background: currentColor 40%`. `.needs-attention` → `var(--accent-color)`.
- `.badge`: min-height 13px. The label is `font-size: 0.6rem` (≈8.8px), bold, `padding: 0 4px`, white. With `.needs-attention` the badge uses `accent-bg` with an `accent-fg` label.
- The mask adds a 2px black knockout ring (`padding: 2px`).
- Stack-switcher "needs attention" dot: a 6px accent radial gradient positioned `right 3px`, animated in over 150ms ease-in.

---

## 15. Toasts, banners, status page, spinner (_misc.scss, _toolbars.scss)

```css
.toast {
  display:flex; align-items:center; gap: 6px;
  margin: 12px 12px 24px; padding: 6px 6px 6px 12px;
  border-radius: 150px;              /* full pill */
  background: #505053; color: #fff;  /* same in light AND dark */
  box-shadow: 0 1px 3px 1px rgb(0 0 6 / 7%), 0 2px 6px 2px rgb(0 0 6 / 3%);
  --standalone-color-oklab: max(l, 0.85) a b;    /* accent-color re-derived light */
  --accent-color: oklab(from var(--accent-bg-color) var(--standalone-color-oklab));
}
.toast > .widget { margin: 0 6px; }                  /* title label wrapper */
@media (prefers-contrast: more) { .toast { box-shadow: 0 0 0 1px var(--border-color); } }

.banner { --banner-color: #7d7d83; }
.banner > .inner { padding: 6px;
  background-color: color-mix(in srgb, var(--banner-color) 30%, var(--window-bg-color)); color: var(--window-fg-color); }
.backdrop .banner > .inner { background-color: color-mix(in srgb, var(--banner-color) 15%, var(--window-bg-color)); }
.backdrop .banner > .inner > :is(.label,.btn) { filter: opacity(.5); }
/* inside .sidebar-pane, mix with --sidebar-bg-color instead of window bg */

.status-page > .box { margin: 36px 12px; display:flex; flex-direction:column; align-items:center; gap: 36px; }
.status-page .icon  { width: 128px; height: 128px;
  color: color-mix(in srgb, currentColor var(--dim-opacity), transparent); }   /* icon weight 134 */
.status-page .text  { display:flex; flex-direction:column; gap: 12px; }
.status-page .title { font-weight: 800; font-size: 181%; }                       /* .title-1 */
.status-page.compact > .box { margin: 24px 12px; gap: 24px; }
.status-page.compact .icon  { width: 96px; height: 96px; }
.status-page.compact .title { font-weight: 800; font-size: 136%; }             /* .title-2 */
.status-page.spinner > .box { margin: 24px 12px; gap: 24px; }
.status-page.spinner .icon  { width: 64px; height: 64px; }                      /* weight 267 */
```

- **The toast background is the fixed grey `#505053` in both themes**, with a 150px radius (a pill), not the old rounded rectangle.
- Toast buttons have no special rules in the stylesheet, so they get the generic button rules (translucent white 10% raised, or flat if the widget adds `.flat`).
- The status-page description has no styling in the stylesheet beyond the 12px gap. Any `.body`/`.dimmed` class comes from widget code.
- The status page icon is `currentColor` at 55%, rendered via colour rather than opacity. Disabled → opacity 50%.
- **Spinner:** only `:disabled { opacity: var(--disabled-opacity) }`. Its size, colour and animation are drawn in code (AdwSpinner).
- **No `.tag`/pill-label class exists.**
  - The closest built-ins are the AdwIndicatorBin badge and the AdwViewSwitcherSidebar `.indicator` (§6, §14).
  - The About dialog `.app-version` is `padding: 3px 18px; color: var(--accent-color); border-radius: 999px; margin-top: 3px`, with no background of its own in 1.10.
- **Frames:** `border: 1px solid var(--border-color); border-radius: 12px`.
- **Separators:** 1px, `var(--border-color)`. `.spacer` is transparent (12px).
- **GtkInfoBar** (deprecated): box padding `6px 6px 7px`, background mix 30% (accent/warning/error) with window bg.

---

## 16. Tooltips, scrollbars, tab bar (_tooltip.scss, _scrolling.scss, _tab-view.scss)

```css
.tooltip { padding: 6px 10px; border-radius: 9px;
  background-color: rgb(0 0 6 / 80%); border: 1px solid rgb(255 255 255 / 10%); color: #fff;
  background-clip: padding-box; box-shadow: none; }
.tooltip > .box { gap: 6px; }

/* scrollbar (classic, always visible) */
.scrollbar .trough { margin: 9px 8px; border-radius: 99px; transition: all 200ms linear; }   /* vertical: 8px L/R */
.scrollbar .slider { min-width: 8px; min-height: 40px; border-radius: 99px;
  background-color: color-mix(in srgb, currentColor 20%, transparent); transition: all 200ms linear; }
.scrollbar .slider:hover  { background-color: color-mix(in srgb, currentColor 40%, transparent); }
.scrollbar .slider:active { background-color: color-mix(in srgb, currentColor 60%, transparent); }

/* overlay scrollbar (GNOME default) – web translation */
.overlay-scroll .thumb {
  width: 3px; margin-right: 4px;                       /* idle: 3px pill, 4px from the edge */
  min-height: 40px; border-radius: 99px;
  background-color: color-mix(in srgb, currentColor 20%, transparent);
  outline: 1px solid color-mix(in srgb, var(--scrollbar-outline-color) 35%, transparent);
  transition: all 200ms linear; }
.overlay-scroll.hovering .thumb { width: 8px; margin-right: 8px;
  outline-color: color-mix(in srgb, var(--scrollbar-outline-color) 60%, transparent); }
.overlay-scroll.hovering .track { background-color: color-mix(in srgb, currentColor 10%, transparent);
  border-radius: 99px; width: 8px; margin: 9px 8px; }
/* fine-tune (dragging with modifier): thumb = accent-color 60% */
```

**Scrollbar geometry (GTK):**
- The slider is `min-width: 8px; border: 8px solid transparent; margin: -8px; background-clip: padding-box`. This makes the grab area 24px while the visible pill is 8px.
- Trough margin is 9px along the scroll axis and 8px across it. When not hovering, the overlay trough margin across is 4px and the slider is 3px wide.

**Scrollbar outline:**
- `--scrollbar-outline-color` (white in light, `rgb(0 0 12/95%)` in dark) is drawn as a 1px outline around the thumb at 35% idle / 60% hover. This keeps the thumb visible on any content.

**Tab bar (AdwTabBar), brief:**
```css
.tabbar > .box { background: var(--headerbar-bg-color); color: var(--headerbar-fg-color);
  box-shadow: inset 0 -1px var(--headerbar-shade-color); padding: 0 1px 1px; }
.tabbar .tabbox { padding: 6px 0; min-height: 46px; }                   /* GTK 34 + 12 */
.tab { min-height: 34px; padding: 4px; border-radius: 9px;               /* GTK 26 + 8 */
  transition: background 150ms ease-in-out; }
.tab:hover  { background-color: var(--hover-color); }                    /* 7% */
.tab:active { background-color: var(--active-color); }                   /* 16% */
.tab.selected { background-color: var(--selected-color); }               /* 10%; hover 13%, active 19% */
.tabbox.single-tab .tab { background: none; }
.tab .close-btn { width: 24px; height: 24px; padding: 0; margin: 0; border-radius: 99px; }
.tab .indicator { height: 2px; border-radius: 2px; transform: translateY(4px);
  background: color-mix(in srgb, var(--accent-color) 50%, transparent); }   /* playing/attention */
.tabbox > .separator { margin: 3px 0; transition: opacity 150ms ease-in-out; }  /* .hidden → opacity 0 */
.tabbar .start-action, .tabbar .end-action { padding: 6px 5px; }
/* inside toolbar view: .box transparent, no shadow, padding-bottom 0 */
```

- Drag-and-drop tab: headerbar background plus `selected-active` overlay (19%), card-like shadow, `margin: 25px`.
- Tab overview background: `--overview-bg-color`. Thumbnails have a 16px radius.
- The deprecated GtkNotebook uses a 4px bottom inset underline: hover `--border-color`, checked `--accent-bg-color`.

---

## 17. Transitions and easing

| Use | Value (source) |
|---|---|
| Easing `$ease-out-quad` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` |
| Buttons, switch, check/radio, scale trough/highlight, split button | `background 200ms ease-out-quad, box-shadow 200ms ease-out-quad` |
| Focus ring (all) | `outline-color/outline-width/outline-offset 200ms ease-out-quad` (resting: 0 width, offset +6px vs focused for inner rings, +4px for outer) |
| Rows (boxed list, entry/spin rows) | `background-color, background-image, border-radius 200ms ease-out-quad` |
| Toggle group toggles | `color, background, box-shadow 200ms ease-out-quad`; separators `opacity 200ms ease-out-quad` |
| Backdrop (window unfocus) | `200ms ease-out` on `background-color` and the `filter: opacity(.5)` of bar contents; window shadow too |
| Expander-row arrow rotate | `-gtk-icon-transform 200ms ease-out-quad` (use `transform`) |
| Scrollbars | `all 200ms linear` |
| Tabs, tab separators | `background 150ms ease-in-out`, `opacity 150ms ease-in-out` |
| Needs-attention dot | keyframe `150ms ease-in` (radial gradient grows 0% → 95%) |
| Bottom sheet | `border-radius 100ms ease-out, box-shadow 250ms ease` |
| Tab thumbnail drop | `box-shadow 200ms ease-out-quad` |

- **Hover and active changes animate** (200ms), including row background and radius.
- There is no `transform`/scale press effect anywhere in the stylesheet.
- **Backdrop dims bar contents** (`filter: opacity(.5)` on the header bar's windowhandle, search/action bar children and tab bar). It does not dim the main content.

---

### Radius cheat sheet

| Token | Value |
|---|---|
| Button, entry, menu item, sidebar row, tab, tooltip, toggle-group track | 9px |
| Toggle inside group | 6px (round: 17px track, 14px toggle) |
| Check | 6px |
| Checkbutton focus area | 9px |
| Card, boxed list, frame, alert response button | 12px |
| Popover, window, AdwDialog, bottom sheet top, `.toolbar.osd` | 15px |
| AdwAlertDialog | 18px |
| Switch | 14px |
| Pills (pill button, progress, level bar, scrollbar, toast 150px) | 99–9999px |
