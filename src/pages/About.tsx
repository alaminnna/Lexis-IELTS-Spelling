import { Link } from "react-router-dom"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { useEffect } from "react"

const links = [
  { label: "Website", href: "https://alaminnna.ami.bd", sub: "alaminnna.ami.bd" },
  { label: "GitHub", href: "https://github.com/alaminnna", sub: "github.com/alaminnna" },
  { label: "LinkedIn", href: "https://linkedin.com/in/alaminnna", sub: "linkedin.com/in/alaminnna" },
  { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61578789046935", sub: "facebook.com/Al A Min" },
  { label: "Instagram", href: "https://www.instagram.com/alaminnna", sub: "instagram.com/alaminnna" },
  { label: "YouTube", href: "https://youtube.com/@alaminnna", sub: "@alaminnna" },
  { label: "X / Twitter", href: "https://x.com/alaminnna", sub: "@alaminnna" },
  { label: "Email", href: "mailto:ikalamin0@gmail.com", sub: "ikalamin0@gmail.com" },
]

export default function About() {
  useEffect(() => {
    document.title = "About — Al A Min • Alaminnna"
  }, [])

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Header */}
      <div className="border-b bg-[hsl(var(--surface-2))]">
        <div className="max-w-[960px] mx-auto px-4 lg:px-6 py-10">
          <Badge className="border bg-card">About the Builder</Badge>
          <div className="mt-4 flex flex-col lg:flex-row gap-8 items-start">
            <img
              src="/assets/images/profile/alaminnna.jpg"
              alt="Al A Min — alaminnna"
              className="h-28 w-28 rounded-2xl object-cover border bg-card shadow-sm"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-[30px] lg:text-[40px] font-semibold tracking-[-0.04em] leading-none">AL AMIN</h1>
              <p className="mt-2 text-sm text-muted-foreground">AI-Powered Full Stack Developer • Dhaka, Bangladesh • Founder — <span className="font-medium text-foreground">Alaminnna</span></p>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground max-w-[560px]">
                I build modern, AI-powered web experiences from Dhaka. Founder of <span className="font-medium text-foreground">Alaminnna</span> — a brand for AI products, SaaS platforms, developer tools and open-source. I love clean code, premium UX and automation that actually ships.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href="https://alaminnna.ami.bd" target="_blank" rel="noreferrer"><Button className="rounded-full h-9">Visit alaminnna.ami.bd</Button></a>
                <a href="https://github.com/alaminnna" target="_blank" rel="noreferrer"><Button variant="outline" className="rounded-full h-9">GitHub</Button></a>
                <a href="https://www.instagram.com/alaminnna" target="_blank" rel="noreferrer"><Button variant="outline" className="rounded-full h-9">Instagram</Button></a>
                <a href="https://www.facebook.com/profile.php?id=61578789046935" target="_blank" rel="noreferrer"><Button variant="outline" className="rounded-full h-9">Facebook</Button></a>
                <Link to="/dashboard"><Button variant="ghost" className="rounded-full h-9 border">Open Lexis →</Button></Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[960px] mx-auto px-4 lg:px-6 py-8 space-y-6">
        {/* Intro */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-[13px] tracking-[0.14em] uppercase text-muted-foreground">Who I am</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Assalamu Alaikum — I'm <span className="font-medium text-foreground">Al A Min</span> (alaminnna). AI developer, full-stack engineer, and independent builder based in Dhaka, Bangladesh. I craft scalable web apps with <span className="font-medium">React / Next.js / Node / Python</span> and ship AI features with OpenAI API, automation and thoughtful design. Lexis — this IELTS Spelling Trainer — is one of my learning-focused products built local-first, private and offline-capable.
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Brand: <span className="font-medium text-foreground">Alaminnna</span> — future company for AI-driven software, developer tools, digital products and education. Every project is a chance to learn, experiment and push limits.
            </p>
          </CardContent>
        </Card>

        {/* What I do */}
        <div className="grid lg:grid-cols-3 gap-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="font-semibold tracking-tight">What I build</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
                <li>AI-powered full-stack apps (React, Next.js, Node, Express, MongoDB, Firebase/Supabase)</li>
                <li>SaaS platforms & automation systems</li>
                <li>Open-source tools on <a className="underline" href="https://github.com/alaminnna" target="_blank" rel="noreferrer">github.com/alaminnna</a> & npm <code>~alaminnna</code></li>
                <li>Premium, fast UX — Tailwind, Framer Motion, GSAP</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold tracking-tight">Stack</h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {["TypeScript","React","Next.js","Node.js","Express","Python","Tailwind","MongoDB","Firebase","Supabase","Vercel","Figma","OpenAI API"].map(s => (
                  <span key={s} className="px-2 py-1 rounded-full border bg-muted text-xs">{s}</span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Featured projects */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold tracking-tight">Featured — Alaminnna</h3>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <a href="https://alaminnna.ami.bd/works" target="_blank" rel="noreferrer" className="rounded-xl border bg-card p-4 hover:bg-muted/50 transition">
                <div className="text-sm font-medium">Boomber & Portfolio</div>
                <div className="mt-1 text-xs text-muted-foreground">Selected works — web experiences, AI tools. See all at alaminnna.ami.bd/works</div>
              </a>
              <div className="rounded-xl border bg-[hsl(var(--surface-2))] p-4">
                <div className="text-sm font-medium">Lexis — IELTS Spelling Trainer</div>
                <div className="mt-1 text-xs text-muted-foreground">This app — local-first, adaptive, mistake-aware. Built for real IELTS listening pressure.</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Links */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold tracking-tight">Find me</h3>
            <p className="mt-1 text-xs text-muted-foreground">Tap any link — long-press to copy. Source: alaminnna.ami.bd</p>
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              {links.map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 hover:bg-muted/50 transition">
                  <div>
                    <div className="text-sm font-medium">{l.label}</div>
                    <div className="text-xs text-muted-foreground">{l.sub}</div>
                  </div>
                  <span className="text-xs">↗</span>
                </a>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5 text-xs">
              {[
                ["Facebook","https://www.facebook.com/profile.php?id=61578789046935"],
                ["Instagram","https://www.instagram.com/alaminnna"],
                ["Medium","https://medium.com/@Alaminnna"],
                ["DEV","https://dev.to/alaminnna"],
                ["Hashnode","https://alaminnna.hashnode.dev"],
                ["Product Hunt","https://producthunt.com/@alaminnna"],
                ["StackOverflow","https://stackoverflow.com/users/33006113/alaminnna"],
                ["Bluesky","https://bsky.app/profile/alaminnna.bsky.social"],
              ].map(([k,href]) => (
                <a key={k} href={href} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-full border bg-card hover:bg-muted">{k}</a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card className="border-foreground/10">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold tracking-tight">Available for freelance worldwide</h3>
              <p className="text-sm text-muted-foreground">Let&apos;s build something amazing together.</p>
            </div>
            <a href="mailto:ikalamin0@gmail.com"><Button className="rounded-full">ikalamin0@gmail.com</Button></a>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground">© {new Date().getFullYear()} Al A Min • Alaminnna • Dhaka, Bangladesh • alaminnna.ami.bd</p>
      </div>
    </div>
  )
}
