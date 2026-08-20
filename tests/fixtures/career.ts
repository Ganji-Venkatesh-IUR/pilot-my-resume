/**
 * Deterministic test data shared by unit, integration and e2e suites.
 * Keep this the single source of fake data so assertions stay readable.
 */
import type { CareerProfile } from "@/lib/career-schema";
import type { ResumeContent } from "@/lib/resume-schema";

export const testUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "ada@example.com",
  password: "Str0ng-Passw0rd!",
  fullName: "Ada Lovelace",
};

export const fullProfile: CareerProfile = {
  personal: {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+1 555 0100",
    headline: "Senior Frontend Engineer",
    jobTitle: "Senior Frontend Engineer",
    location: "London, UK",
    summary: "Frontend engineer with 8 years building accessible design systems.",
    githubUrl: "https://github.com/ada",
    linkedinUrl: "https://linkedin.com/in/ada",
    websiteUrl: "https://ada.dev",
  },
  entries: [
    {
      id: "e1",
      kind: "experience",
      title: "Senior Frontend Engineer",
      subtitle: "Analytical Engines Ltd",
      organization: "Analytical Engines Ltd",
      location: "London",
      startDate: "2021",
      endDate: "",
      isCurrent: true,
      description: "Owned the design system.",
      bullets: ["Cut bundle size by 38%", "Led migration of 40 screens to React 19"],
      tags: ["React", "TypeScript"],
      level: "",
      url: "",
      position: 0,
      metadata: {},
    },
    {
      id: "e2",
      kind: "education",
      title: "BSc Computer Science",
      subtitle: "University of London",
      organization: "University of London",
      location: "London",
      startDate: "2013",
      endDate: "2017",
      isCurrent: false,
      description: "",
      bullets: [],
      tags: [],
      level: "",
      url: "",
      position: 0,
      metadata: {},
    },
    ...["React", "TypeScript", "GraphQL", "Testing", "Accessibility"].map((skill, i) => ({
      id: `s${i}`,
      kind: "skill" as const,
      title: skill,
      subtitle: "",
      organization: "",
      location: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      bullets: [],
      tags: [],
      level: "advanced",
      url: "",
      position: i,
      metadata: {},
    })),
    {
      id: "p1",
      kind: "project",
      title: "Loom UI",
      subtitle: "Open-source component library",
      organization: "",
      location: "",
      startDate: "2022",
      endDate: "",
      isCurrent: false,
      description: "Headless components with 2k stars.",
      bullets: ["Adopted by 30 teams"],
      tags: ["OSS"],
      level: "",
      url: "https://github.com/ada/loom",
      position: 0,
      metadata: {},
    },
    {
      id: "c1",
      kind: "certification",
      title: "AWS Solutions Architect",
      subtitle: "Amazon",
      organization: "Amazon",
      location: "",
      startDate: "2023",
      endDate: "",
      isCurrent: false,
      description: "",
      bullets: [],
      tags: [],
      level: "",
      url: "",
      position: 0,
      metadata: {},
    },
  ],
};

export const emptyProfile: CareerProfile = {
  personal: {
    fullName: "",
    email: "",
    phone: "",
    headline: "",
    jobTitle: "",
    location: "",
    summary: "",
    githubUrl: "",
    linkedinUrl: "",
    websiteUrl: "",
  },
  entries: [],
};

/** A realistic, ATS-friendly resume document. */
export const sampleResume: Partial<ResumeContent> = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+1 555 0100",
  location: "London, UK",
  title: "Senior Frontend Engineer",
  summary:
    "Senior frontend engineer with eight years of experience shipping accessible, high-performance React applications for analytics products.",
  skills: ["React", "TypeScript", "GraphQL", "Testing", "Accessibility"],
  experience: [
    {
      role: "Senior Frontend Engineer",
      company: "Analytical Engines Ltd",
      location: "London",
      start: "2021",
      end: "Present",
      bullets: ["Cut bundle size by 38%", "Led migration of 40 screens to React 19"],
    },
  ],
};

export const sampleJobDescription = `Senior Frontend Engineer — Northwind
We are looking for a frontend engineer strong in React, TypeScript and GraphQL.
You will own accessibility, performance budgets and design-system work.
Nice to have: Kubernetes, Rust.`;
