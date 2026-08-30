import {
  Activity,
  Ambulance,
  Baby,
  Bone,
  Brain,
  BriefcaseMedical,
  ClipboardPlus,
  Dna,
  Ear,
  Eye,
  HeartPulse,
  Microscope,
  Pill,
  Scan,
  ShieldCheck,
  Stethoscope,
  Syringe,
  TestTube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Keyword → icon table so department and service cards get a medically
 * meaningful glyph without anyone hand-tagging content in the CMS.
 */
const RULES: Array<[RegExp, LucideIcon]> = [
  [/cardio|heart|vascular/i, HeartPulse],
  [/neuro|brain|stroke|spine/i, Brain],
  [/p(a)?ediatric|child|neonat|nicu/i, Baby],
  [/matern|obstet|gyn|birth|delivery/i, Baby],
  [/ortho|bone|joint|fractur|physio|rehab/i, Bone],
  [/eye|ophthalm|optic|vision/i, Eye],
  // `\bent\b`, not `ent\b`: the latter matches the tail of "Outpatient",
  // which is how every outpatient department came to be marked with an ear.
  [/\bent\b|\bear\b|nose|throat|audio|otolaryng/i, Ear],
  [/lab|patholog|blood|haemat|hemat/i, TestTube],
  [/microbio|research|genetic|dna/i, Dna],
  [/radiolog|imaging|scan|x-?ray|ultrasound|mri|ct\b/i, Scan],
  [/pharm|medicine|drug|dispens/i, Pill],
  [/surg|theatre|operat/i, Syringe],
  [/emergen|trauma|ambulance|casualty|icu|critical/i, Ambulance],
  [/dermat|skin|derma/i, Microscope],
  [/insur|cover|billing|finance/i, ShieldCheck],
  [/dental|dent|oral/i, ClipboardPlus],
  [/screen|check\s?-?up|preventive|wellness|vaccin|immun/i, ShieldCheck],
  [/outpatient|clinic|consult|general/i, Stethoscope],
  [/inpatient|ward|admission|nursing/i, BriefcaseMedical],
];

export function iconForText(...parts: Array<string | null | undefined>): LucideIcon {
  const haystack = parts.filter(Boolean).join(" ");
  for (const [pattern, icon] of RULES) {
    if (pattern.test(haystack)) return icon;
  }
  return Activity;
}
