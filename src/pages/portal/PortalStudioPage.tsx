import { useState } from 'react'
import { Rocket, Smartphone } from 'lucide-react'
import { PageHeader, PageBody } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { StatePill } from '@/components/admin/AdminKit'
import { PORTAL_PROFILES } from '@/lib/commercial-data'
import { cn } from '@/lib/utils'

export function PortalStudioPage() {
  const [selectedId, setSelectedId] = useState(PORTAL_PROFILES[0].id)
  const selected = PORTAL_PROFILES.find((p) => p.id === selectedId)!
  const [headline, setHeadline] = useState(selected.headline)
  const [subline, setSubline] = useState(selected.subline)
  const [accent, setAccent] = useState(selected.accent)

  function pick(id: string) {
    const p = PORTAL_PROFILES.find((x) => x.id === id)!
    setSelectedId(id)
    setHeadline(p.headline)
    setSubline(p.subline)
    setAccent(p.accent)
  }

  return (
    <>
      <PageHeader
        title="Portal Studio"
        subtitle="Design the captive portal your guests see — branding, copy and sign-in methods."
        actions={
          <>
            <Button variant="secondary" size="sm">Save draft</Button>
            <Button size="sm">
              <Rocket className="h-3.5 w-3.5" /> Publish
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_320px]">
          <Card>
            <CardHeader>
              <CardTitle>Portal profiles</CardTitle>
              <CardDescription>{PORTAL_PROFILES.length} configured</CardDescription>
            </CardHeader>
            <CardBody className="space-y-1.5 p-2">
              {PORTAL_PROFILES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pick(p.id)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                    p.id === selectedId
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-transparent hover:bg-surface-2'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[12.5px] font-medium text-foreground">{p.name}</span>
                    <StatePill state={p.status} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {p.scope} · updated {p.updated}
                  </p>
                </button>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding & content</CardTitle>
              <CardDescription>Applies to {selected.scope}</CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <Input label="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
              <Input label="Sub-headline" value={subline} onChange={(e) => setSubline(e.target.value)} />
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">Accent colour</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accent}
                    onChange={(e) => setAccent(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-hairline bg-surface p-1"
                    aria-label="Accent colour"
                  />
                  <span className="font-mono text-[12px] text-muted-foreground">{accent}</span>
                </div>
              </div>
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">Sign-in methods</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {['OTP', 'Voucher', 'RADIUS', 'Social'].map((m) => (
                    <span
                      key={m}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-[11.5px]',
                        selected.authMethods.includes(m)
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-hairline text-muted-foreground'
                      )}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <p className="rounded-lg border border-hairline bg-surface-2 p-3 text-[11.5px] text-muted-foreground">
                PM-WANI notice, terms of use and privacy links are appended automatically to every published portal.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5" /> Live preview
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="mx-auto w-[240px] overflow-hidden rounded-[26px] border-4 border-foreground/80 bg-card">
                <div className="h-5 bg-foreground/80" />
                <div className="space-y-3 p-4 text-center">
                  <div
                    className="mx-auto grid h-11 w-11 place-items-center rounded-xl text-[13px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    B
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">{headline}</p>
                  <p className="text-[11px] text-muted-foreground">{subline}</p>
                  <div className="h-8 rounded-lg border border-hairline bg-surface-2" />
                  <div
                    className="grid h-8 place-items-center rounded-lg text-[11.5px] font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    Get connected
                  </div>
                  <p className="text-[9.5px] text-muted-foreground">
                    PM-WANI compliant · Terms · Privacy
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </PageBody>
    </>
  )
}
