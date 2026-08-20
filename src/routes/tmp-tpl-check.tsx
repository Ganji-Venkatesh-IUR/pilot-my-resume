import { createFileRoute } from "@tanstack/react-router";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { StyleControls } from "@/components/resume/StyleControls";
import { useState } from "react";
import { TEMPLATES, defaultLayout, defaultStyle, normalizeResume } from "@/lib/resume-schema";
export const Route = createFileRoute("/tmp-tpl-check")({ component: C });
function C() {
  const [style, setStyle] = useState(defaultStyle);
  const r = normalizeResume({ layout: defaultLayout, style, name: "Alex Morgan", headline: "Senior Backend Engineer", email: "a@x.com", phone: "+1 555", location: "Berlin", links: ["github.com/a"], summary: "Backend engineer with 8 years building payment services.", skills: ["Go","Postgres","K8s"], experience: [{role:"Engineer",company:"Northwind",period:"2022—now",bullets:["Cut p99 62%","Migrated 40 services"]}], projects:[{name:"ledgerkit",description:"Ledger lib"}], education:[{school:"TUM",degree:"BSc CS",period:"2017"}], certifications:["AWS SA"] });
  return (<div className="p-6 space-y-6"><StyleControls style={style} onChange={setStyle} />{TEMPLATES.map(t => <div key={t.id}><p className="font-bold">{t.name}</p><ResumePreview resume={{...r, style}} template={t.id} /></div>)}</div>);
}
