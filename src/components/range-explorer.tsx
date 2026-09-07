"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, ChevronDown, Grid2X2, Info } from "lucide-react";
import { allHandClasses, combosForClass } from "@/domain/cards";
import { PageHeader, number } from "./ui";

const classes = allHandClasses();
const suitGlyphs: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const suitNames: Record<string, string> = { s: "Pik", h: "Herz", d: "Karo", c: "Kreuz" };
function HandCard({ card }: { card: string }) { return <span className={`combo-card suit-${card[1]}`} aria-label={`${card[0]} ${suitNames[card[1]]}`}>{card[0]}<span aria-hidden="true">{suitGlyphs[card[1]]}</span></span>; }

export function RangeExplorer() {
  const [selected, setSelected] = useState("AKs");
  const [filter, setFilter] = useState("all");
  const [focus, setFocus] = useState(false);
  const matrixRef = useRef<HTMLDivElement>(null);
  const combos = combosForClass(selected);
  const selectedIndex = classes.indexOf(selected);
  const selectedType = selected.length === 2 ? "Pocket Pair" : selected.endsWith("s") ? "Suited" : "Offsuit";
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let target = index;
    if (event.key === "ArrowRight") target = Math.min(168, index + 1);
    else if (event.key === "ArrowLeft") target = Math.max(0, index - 1);
    else if (event.key === "ArrowDown") target = Math.min(168, index + 13);
    else if (event.key === "ArrowUp") target = Math.max(0, index - 13);
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = 168;
    else return;
    event.preventDefault(); setSelected(classes[target]); matrixRef.current?.querySelectorAll<HTMLButtonElement>("button")[target]?.focus();
  }
  return <><PageHeader title="Jede Range beginnt mit einer Hand." description="NLHE / Starthände & Kombinationen" aside={<span className="neutral-chip"><Grid2X2 size={15} aria-hidden="true" />169 Handklassen</span>} /><div className="range-notice"><Info size={18} aria-hidden="true" /><p>Entdecke die Zusammensetzung deiner Starthände. Farben zeigen den <strong>Handtyp</strong> — strategische Empfehlungen sind hier nicht hinterlegt.</p></div><div className={`range-layout${focus ? " range-focus" : ""}`}><section className="range-matrix-panel panel"><div className="range-toolbar"><div className="range-filter"><label htmlFor="handtype">Handtyp</label><select id="handtype" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Alle Hände</option><option value="pair">Pocket Pairs</option><option value="suited">Suited</option><option value="offsuit">Offsuit</option></select></div><button className="text-button" aria-pressed={focus} onClick={() => setFocus(!focus)}><ArrowUpRight size={16} aria-hidden="true" />{focus ? "Standardansicht" : "Fokusansicht"}</button></div><div className="range-matrix-scroll" role="region" aria-label="Starthandmatrix, mit Pfeiltasten navigieren" tabIndex={0}><div className="range-matrix" ref={matrixRef} role="group" aria-label="169 Starthandklassen">{classes.map((hand, index) => { const type = hand.length === 2 ? "pair" : hand.endsWith("s") ? "suited" : "offsuit"; return <button type="button" key={hand} onClick={() => setSelected(hand)} onKeyDown={(event) => navigate(event, index)} tabIndex={index === selectedIndex ? 0 : -1} aria-pressed={hand === selected} aria-label={`${hand}, ${combosForClass(hand).length} Kombinationen`} className={`range-cell ${type}${selected === hand ? " selected" : ""}${filter !== "all" && filter !== type ? " dimmed" : ""}`}>{hand}</button>; })}</div></div><div className="range-legend"><span><i className="pair" />Pocket Pairs</span><span><i className="suited" />Suited</span><span><i className="offsuit" />Offsuit</span></div><p className="matrix-hint">Hand antippen oder mit den Pfeiltasten erkunden.</p></section><aside className="range-inspector panel" aria-live="polite"><div className="section-heading"><span className="subtle-label">Ausgewählte Hand</span><span className={`hand-type ${selectedType.toLowerCase().replace(" ", "-")}`}>{selectedType}</span></div><h2>{selected}</h2><p>{selected.length === 2 ? "Zwei Karten des gleichen Rangs." : selected.endsWith("s") ? "Zwei verschiedene Ränge in derselben Farbe." : "Zwei verschiedene Ränge in unterschiedlichen Farben."}</p><div className="combo-stats"><div><strong>{combos.length}</strong><span>Kombinationen</span></div><div><strong>{number((combos.length / 1326) * 100, 2)} %</strong><span>aller Starthände</span></div></div><h3>Konkrete Kombinationen</h3><div className="combo-grid">{combos.map(([first, second]) => <div className="combo-pair" key={first + second}><HandCard card={first} /><HandCard card={second} /></div>)}</div><div className="inspector-note"><Info size={15} aria-hidden="true" /><p>Ungeblockte Kombinationen aus einem vollständigen 52-Karten-Deck.</p></div></aside></div><details className="solver-details" open><summary><span>So liest du die Matrix</span><ChevronDown size={17} aria-hidden="true" /></summary><div className="matrix-explainer"><div><strong>13 Pocket Pairs</strong><p>Auf der Diagonale: jeweils 6 Kombinationen, zum Beispiel A♠A♥.</p></div><div><strong>78 Suited-Hände</strong><p>Oberhalb der Diagonale: jeweils 4 Kombinationen, zum Beispiel A♠K♠.</p></div><div><strong>78 Offsuit-Hände</strong><p>Unterhalb der Diagonale: jeweils 12 Kombinationen, zum Beispiel A♠K♥.</p></div></div></details></>;
}
