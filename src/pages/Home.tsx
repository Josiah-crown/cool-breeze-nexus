import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import TopTaskbar from "@/components/TopTaskbar";

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-[#1A2B1C]">
      <TopTaskbar
        title="Cmonitor"
        subtitle="Machine Monitor — by Crown Technologies"
        rightActions={
          <>
            <Button asChild variant="outline" className="btn-nav">
              <a href="https://crowntechnologies.co.za/contact-us" target="_blank" rel="noreferrer">
                Contact
              </a>
            </Button>
            {user ? (
              <Button asChild variant="outline" className="btn-nav">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="btn-nav">
                <Link to="/login?source=home">Client Login</Link>
              </Button>
            )}
          </>
        }
      />

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-14 pt-10 sm:px-6 md:grid-cols-2 md:pt-14">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#5BBF5E]/10 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[#3D9E40]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5BBF5E]" />
            Live infrastructure monitoring
          </div>

          <h1 className="mt-5 font-sans text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Know what your machines are doing.{" "}
            <span className="text-[#3D9E40]">Right now.</span>
          </h1>

          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#4A6B4D]">
            Cmonitor is Crown Technologies&apos; proprietary machine monitoring platform — giving you a live window into
            the health and performance of every HVAC unit on your site, around the clock.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-[#0D2211] text-white hover:bg-[#1A3A1E]">
              <a href="https://crowntechnologies.co.za/contact-us" target="_blank" rel="noreferrer">
                Get monitoring on your site
              </a>
            </Button>
            <Button asChild variant="outline" className="border-black/20 bg-transparent hover:border-[#5BBF5E]">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-6 border-t border-black/10 pt-6">
            <div>
              <div className="text-lg font-bold">24/7</div>
              <div className="mt-1 text-xs text-[#7A9B7D]">Live monitoring</div>
            </div>
            <div>
              <div className="text-lg font-bold">R99</div>
              <div className="mt-1 text-xs text-[#7A9B7D]">per device / month</div>
            </div>
            <div>
              <div className="text-lg font-bold">3 hours</div>
              <div className="mt-1 text-xs text-[#7A9B7D]">Response time</div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-[#5BBF5E]/25 bg-white shadow-[0_20px_56px_rgba(13,34,17,0.10),0_4px_16px_rgba(13,34,17,0.06)]">
          <div className="flex items-center gap-2 bg-[#0D2211] px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E85A5A]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#E8C23A]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#5BBF5E]" />
            </div>
            <div className="flex-1 text-center font-mono text-[10px] text-white/50">crowntechnologies.online</div>
          </div>
          <div className="bg-[#EEECEA] p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-black/10 bg-white p-4">
                <div className="text-xs font-semibold text-[#1A2B1C]">Real-time status</div>
                <div className="mt-1 text-[13px] text-[#4A6B4D]">
                  Live readings, connection state, and key health indicators per machine.
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#5BBF5E]" />
                  <span className="text-xs text-[#7A9B7D]">Connected</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#E8963A]" />
                  <span className="text-xs text-[#7A9B7D]">Threshold warnings</span>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
                <img
                  src="/Warehouse.jpg"
                  alt="On-site equipment monitoring"
                  className="h-44 w-full object-cover"
                  loading="lazy"
                />
                <div className="p-4">
                  <div className="text-xs font-semibold text-[#1A2B1C]">On-site, on the cloud</div>
                  <div className="mt-1 text-[13px] text-[#4A6B4D]">
                    Hardware installed by Crown Technologies teams. View from any device, anywhere.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="h-px bg-black/10" />
      </div>

      {/* SUPPORTED EQUIPMENT */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="font-mono text-[11px] uppercase tracking-wider text-[#3D9E40]">Supported equipment</div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Built for the machines you depend on.</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#4A6B4D]">
          Cmonitor currently supports two critical system types — with solar, water, and broader infrastructure
          monitoring on the roadmap as the platform expands toward a full Building Management System.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-7">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[#5BBF5E]/10">
              <span className="text-xl">🌬️</span>
            </div>
            <h3 className="text-lg font-semibold">Evaporative Coolers</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#4A6B4D]">
              Continuous monitoring of evaporative cooling systems — fan operation, water supply, and thermal performance
              across the full cycle.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] text-[#3D9E40]">
              {["Inlet Temp", "Outlet Temp", "Delta T", "Fan Status", "Water Level", "Cool Status"].map((t) => (
                <span key={t} className="rounded-full border border-[#5BBF5E]/20 bg-[#5BBF5E]/10 px-3 py-1">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-7">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-[#E8963A]/10">
              <span className="text-xl">🔥</span>
            </div>
            <h3 className="text-lg font-semibold">Heat Pumps</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#4A6B4D]">
              Full performance monitoring of heat pump systems — compressor health, temperature differentials, power draw,
              and setpoint adherence.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] text-[#3D9E40]">
              {["Inlet Temp", "Outlet Temp", "Compressor Temp", "Delta T", "Setpoint", "Voltage", "Amps", "Power (W)"].map(
                (t) => (
                  <span key={t} className="rounded-full border border-[#5BBF5E]/20 bg-[#5BBF5E]/10 px-3 py-1">
                    {t}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES (DARK) */}
      <section className="bg-[#0D2211]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#5BBF5E]">Platform features</div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Everything you need to stay ahead of a fault.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-white/55">
            Cmonitor gives Crown Technologies and their clients the visibility needed to act — before a breakdown becomes
            a shutdown.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Live readings",
                body: "Real-time sensor data updated continuously — temperatures, current, and status flags.",
              },
              {
                title: "Historical data",
                body: "24-hour, 7-day, 30-day, and 1-year views to spot degradation patterns early.",
              },
              {
                title: "Fault detection",
                body: "Remote monitoring by Crown Technologies. When something is wrong, we know — and we contact you.",
              },
              {
                title: "Multi-machine dashboard",
                body: "All your machines on one screen, organised by site and owner.",
              },
              {
                title: "Configurable alerts",
                body: "Set custom warning thresholds per device and choose who gets notified and when.",
              },
              {
                title: "Roadmap: full BMS",
                body: "Solar, water, and broader infrastructure monitoring as the platform expands.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-[#5BBF5E]/30 hover:bg-white/10"
              >
                <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#5BBF5E]/15">
                  <span className="text-white">✓</span>
                </div>
                <h3 className="text-base font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="font-mono text-[11px] uppercase tracking-wider text-[#3D9E40]">Getting started</div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Three steps to full visibility.</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#4A6B4D]">
          Cmonitor devices are installed and configured by Crown Technologies&apos; certified teams. You don&apos;t need
          to do anything technical.
        </p>

        <div className="mt-8 grid gap-6">
          {[
            {
              n: 1,
              title: "Crown Technologies installs your Cmonitor device",
              body: "A hardware unit is installed during commissioning or a scheduled service visit. It connects and begins transmitting immediately.",
            },
            {
              n: 2,
              title: "Your account is set up and machines appear on your dashboard",
              body: "You receive your login for the Cmonitor platform. Machines are labelled, configured, and ready to view from any device.",
            },
            {
              n: 3,
              title: "Crown Technologies monitors. You get peace of mind.",
              body: "If a fault or anomaly is detected, we contact you — and often start arranging a response before you notice anything is wrong.",
            },
          ].map((s) => (
            <div key={s.n} className="grid gap-4 rounded-2xl border border-black/10 bg-white p-6 sm:grid-cols-[64px_1fr]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#5BBF5E]/30 bg-[#5BBF5E]/10 text-lg font-bold text-[#3D9E40]">
                {s.n}
              </div>
              <div className="pt-1">
                <h3 className="text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4A6B4D]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="font-mono text-[11px] uppercase tracking-wider text-[#3D9E40]">Pricing</div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Straightforward pricing. No surprises.</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[#4A6B4D]">
          Cmonitor is available as a standalone monitoring add-on, or included at a reduced rate within a Crown
          Technologies SLA.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white p-7">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#7A9B7D]">Standalone monitoring</div>
            <div className="mt-3 text-5xl font-extrabold tracking-tight">
              <span className="align-super text-xl font-medium">R</span>99
            </div>
            <div className="mt-1 text-sm text-[#7A9B7D]">per device, per month</div>
            <ul className="mt-6 space-y-2 text-sm text-[#4A6B4D]">
              {[
                "Live dashboard access for your machines",
                "Real-time readings and historical data",
                "Fault detection and Crown Technologies notification",
                "Configurable alert thresholds per device",
                "Client account and login included",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-1 inline-block h-4 w-4 rounded-full bg-[#5BBF5E]/15" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-6 w-full border-black/20">
              <a href="https://crowntechnologies.co.za/contact-us" target="_blank" rel="noreferrer">
                Contact us to get started
              </a>
            </Button>
          </div>

          <div className="relative rounded-2xl border-2 border-[#5BBF5E] bg-white p-7">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#5BBF5E] px-4 py-1 text-[11px] font-medium text-white">
              Included in SLA
            </div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#7A9B7D]">
              Within Crown Technologies SLA
            </div>
            <div className="mt-3 text-5xl font-extrabold tracking-tight">
              <span className="align-super text-xl font-medium">R</span>50
            </div>
            <div className="mt-1 text-sm text-[#7A9B7D]">per device, per month — added to SLA fee</div>
            <ul className="mt-6 space-y-2 text-sm text-[#4A6B4D]">
              {[
                "Everything in standalone monitoring",
                "Scheduled maintenance visits",
                "15-minute support response time",
                "Breakdown and repair cover (full SLA)",
                "Priority technician response under SLA",
              ].map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-1 inline-block h-4 w-4 rounded-full bg-[#5BBF5E]/15" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full bg-[#5BBF5E] text-white hover:bg-[#3D9E40]">
              <a href="https://crowntechnologies.co.za/solar-systems-maintenance" target="_blank" rel="noreferrer">
                See SLA options
              </a>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-sm text-[#7A9B7D]">
          SLA fees vary based on equipment type and quantity and are custom-quoted for most clients. Standard service-only
          SLAs start from R120–R240 per unit per month. Contact Crown Technologies for a tailored proposal.
        </p>
      </section>

      {/* CTA */}
      <section className="bg-[#0D2211]">
        <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6">
          <div className="font-mono text-[11px] uppercase tracking-wider text-[#5BBF5E]">Ready to get started?</div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Stop finding out about problems after they happen.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-white/55">
            Contact Crown Technologies to get Cmonitor installed on your site. Our team handles everything — hardware,
            configuration, and ongoing remote monitoring.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-[#5BBF5E] text-white hover:bg-[#3D9E40]">
              <a href="https://crowntechnologies.co.za/contact-us" target="_blank" rel="noreferrer">
                Contact Crown Technologies
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:border-[#5BBF5E] hover:bg-white/5"
            >
              <Link to="/login?source=home">Client Login</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-white/30">
            086 112 7696 · info@crowntechnologies.co.za · crowntechnologies.co.za
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#071409]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-center sm:flex-row sm:text-left sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/CROWN TECHNOLOGIES LOGO White.png" alt="Crown Technologies" className="h-7 w-7 object-contain" />
            <div className="text-sm font-semibold text-white">
              <span className="text-[#5BBF5E]">C</span>monitor
            </div>
          </div>
          <div className="text-xs text-white/40">
            A proprietary platform by{" "}
            <a
              className="text-white/60 hover:text-[#5BBF5E]"
              href="https://crowntechnologies.co.za"
              target="_blank"
              rel="noreferrer"
            >
              Crown Technologies
            </a>{" "}
            · Infrastructure Independence Experts since 1999 ·{" "}
            <Link className="text-white/60 hover:text-[#5BBF5E]" to="/login?source=home">
              Client Login
            </Link>
          </div>
          <div className="text-xs text-white/30">crowntechnologies.online</div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

