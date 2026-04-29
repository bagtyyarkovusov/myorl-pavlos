import re

# 1. Update SiteHeaderClient.tsx
client_file = "frontend/src/components/SiteHeaderClient.tsx"
with open(client_file, "r", encoding="utf-8") as f:
    content = f.read()

# Add hover states to SiteHeaderClientProps and state
new_state = """  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0, opacity: 0 });
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const activeId = hoveredId || openMenuId;

  useEffect(() => {
    if (!activeId || !navRef.current) {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const nav = navRef.current;
    const el = nav.querySelector(`[data-id="${activeId}"]`) as HTMLElement | null;
    if (el) {
      setPillStyle({
        width: el.offsetWidth,
        left: el.offsetLeft,
        opacity: 1,
      });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeId]);"""

content = re.sub(
    r"  const \[drawerOpen, setDrawerOpen\] = useState\(false\);\n  const \[openMenuId, setOpenMenuId\] = useState<string \| null>\(null\);\n  const openButtonRef = useRef<HTMLButtonElement>\(null\);\n  const closeButtonRef = useRef<HTMLButtonElement>\(null\);",
    new_state,
    content,
    flags=re.MULTILINE
)

# Update nav to have ref and pill
nav_replacement = """            <nav className="desktop-nav" aria-label={t.primaryNavLabel} ref={navRef} onMouseLeave={() => setHoveredId(null)}>
              <div
                className="nav-magnetic-pill"
                style={{
                  width: pillStyle.width,
                  transform: `translateX(${pillStyle.left}px)`,
                  opacity: pillStyle.opacity,
                }}
                aria-hidden="true"
              />
              {navigation.map((item) => (
                <DesktopNavigationItem
                  key={item.documentId}
                  item={item}
                  isOpen={openMenuId === item.documentId}
                  onHover={() => setHoveredId(item.documentId)}
                  onActivate={() =>
                    setOpenMenuId(item.children.length > 0 ? item.documentId : null)
                  }
                  onClose={() => setOpenMenuId(null)}
                />
              ))}
            </nav>"""
content = re.sub(
    r'            <nav className="desktop-nav" aria-label=\{t\.primaryNavLabel\}>\n(?:.*\n)*?            </nav>',
    nav_replacement,
    content,
    flags=re.MULTILINE
)

# Update DesktopNavigationItem signature
item_sig = """function DesktopNavigationItem({
  item,
  isOpen,
  onActivate,
  onClose,
  onHover,
}: {
  item: NavigationNodeDTO;
  isOpen: boolean;
  onActivate: () => void;
  onClose: () => void;
  onHover: () => void;
}) {"""
content = re.sub(
    r'function DesktopNavigationItem\(\{\n  item,\n  isOpen,\n  onActivate,\n  onClose,\n\}\: \{\n  item: NavigationNodeDTO;\n  isOpen: boolean;\n  onActivate: \(\) => void;\n  onClose: \(\) => void;\n\}\) \{',
    item_sig,
    content,
    flags=re.MULTILINE
)

# Update DesktopNavigationItem rendering to include data-id
content = re.sub(
    r'<NavigationAnchor\n        className="nav-link"\n        item=\{item\}\n        onMouseEnter=\{onActivate\}\n        onFocus=\{onActivate\}\n      />',
    '<div className="nav-item" data-id={item.documentId} onMouseEnter={onHover}>\n      <NavigationAnchor\n        className="nav-link"\n        item={item}\n        onMouseEnter={onActivate}\n        onFocus={onActivate}\n      />\n    </div>',
    content,
    flags=re.MULTILINE
)
content = re.sub(
    r'<div className=\{`nav-item \$\{isOpen \? "is-open" : ""\}`\} onMouseEnter=\{onActivate\}>',
    '<div className={`nav-item ${isOpen ? "is-open" : ""}`} data-id={item.documentId} onMouseEnter={() => { onHover(); onActivate(); }}>',
    content,
    flags=re.MULTILINE
)

# Update MegaMenuContent
mega_menu_replacement = """function MegaMenuContent({ item, locale }: { item: NavigationNodeDTO; locale: Locale }) {
  const t = getHeaderStrings(locale);
  const featureBlurb = item.excerpt?.trim() || t.sectionOverviewBlurb(item.title);
  return (
    <div className="nav-panel__grid">
      <div className="nav-panel__feature">
        <p className="eyebrow">{item.title}</p>
        <h2>{item.navLabel}</h2>
        <p>{featureBlurb}</p>
        <NavigationAnchor className="nav-panel__cta" item={item}>
          {t.sectionOverviewLink}
          <span className="cta-arrow" aria-hidden="true">→</span>
        </NavigationAnchor>
      </div>
      <div className="nav-panel__links">
        {item.children.slice(0, 12).map((child, index) => {
          const meta = leafMetaLabel(child, t);
          return (
            <div key={child.documentId} className="nav-panel__link-wrapper" style={{ animationDelay: `${index * 0.03}s` }}>
              <NavigationAnchor item={child}>
                <span className="title">{child.navLabel}</span>
                {meta ? <span className="meta">{meta}</span> : null}
              </NavigationAnchor>
            </div>
          );
        })}
      </div>
    </div>
  );
}"""
content = re.sub(
    r'function MegaMenuContent\(\{ item, locale \}\: \{\s*item: NavigationNodeDTO;\s*locale: Locale\s*\}\) \{.*?(?=function leafMetaLabel)',
    mega_menu_replacement + "\n\n",
    content,
    flags=re.DOTALL
)

with open(client_file, "w", encoding="utf-8") as f:
    f.write(content)

# 2. Update globals.css
css_file = "frontend/src/app/globals.css"
with open(css_file, "r", encoding="utf-8") as f:
    css_content = f.read()

# Add CSS rules
new_css_rules = """

.nav-magnetic-pill {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 0;
  background: var(--color-trust-soft);
  border-radius: 999px;
  pointer-events: none;
  transition: transform 250ms cubic-bezier(0.2, 0, 0, 1), width 250ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease;
  z-index: 0;
}

.desktop-nav {
  position: relative;
  display: flex;
  align-items: center;
  gap: clamp(0px, 0.4vw, 8px);
}

.desktop-nav .nav-item {
  position: relative;
  z-index: 1;
}

.megamenu-panel__surface {
  border: 1px solid rgba(215, 223, 235, 0.4);
  border-radius: 12px;
  background: rgba(251, 252, 254, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: 0 16px 48px rgba(15, 42, 74, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  padding: 32px;
}

.nav-panel__cta .cta-arrow {
  display: inline-block;
  transform: translateX(2px);
  transition: transform 200ms ease;
}

.nav-panel__cta:hover .cta-arrow {
  transform: translateX(6px);
}

.nav-panel__link-wrapper {
  opacity: 0;
  transform: translateY(8px);
  animation: megaMenuReveal 350ms cubic-bezier(0.2, 0, 0, 1) forwards;
}

@keyframes megaMenuReveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nav-panel__links a {
  display: block;
  border-bottom: 1px solid var(--line);
  padding: 12px 0;
  transition: color 150ms ease, transform 200ms cubic-bezier(0.2, 0, 0, 1);
}

.nav-panel__links a:hover,
.nav-panel__links a:focus-visible {
  color: var(--accent);
  transform: translateX(4px);
  padding-left: 0;
  border-color: var(--accent-soft);
}
"""

# Remove old desktop-nav rules and megamenu-panel__surface rules to replace them cleanly
css_content = re.sub(r'\.desktop-nav\s*\{[^}]*\}', '', css_content)
css_content = re.sub(r'\.megamenu-panel__surface\s*\{[^}]*\}', '', css_content)
css_content = re.sub(r'\.nav-panel__links a\s*\{[^}]*\}', '', css_content)
css_content = re.sub(r'\.nav-panel__links a:hover,\s*\.nav-panel__links a:focus-visible\s*\{[^}]*\}', '', css_content)
css_content = re.sub(r'\.nav-item\s*\{[^}]*\}', '', css_content)

css_content += new_css_rules

with open(css_file, "w", encoding="utf-8") as f:
    f.write(css_content)

