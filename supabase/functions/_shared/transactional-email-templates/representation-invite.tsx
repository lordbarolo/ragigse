/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CompCare'

interface RepresentationInviteProps {
  agencyName?: string
  region?: string
  unit?: string | null
  consultantName?: string | null
  competence?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  responseDeadline?: string | null
  signingUrl?: string
}

const formatDate = (d?: string | null) => {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return d
  }
}

const RepresentationInviteEmail = ({
  agencyName,
  region,
  unit,
  consultantName,
  competence,
  periodStart,
  periodEnd,
  responseDeadline,
  signingUrl,
}: RepresentationInviteProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>
      {`${agencyName || 'Ett bemanningsföretag'} ber dig bekräfta representation för uppdrag i ${region || 'en region'}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Heading style={h1}>Bekräfta representation</Heading>
        <Text style={text}>
          {consultantName ? <>Hej <strong>{consultantName}</strong>,<br /></> : null}
          <strong>{agencyName || 'Ett bemanningsföretag'}</strong> har skapat ett representationsintyg
          som ger dem exklusiv rätt att förmedla nedanstående uppdrag åt dig. Granska och bekräfta — det
          tar mindre än en minut.
        </Text>

        <div style={detailsStyle}>
          <Text style={detailRow}>
            <span style={detailLabel}>Region</span>
            <strong>{region || '—'}</strong>
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>Enhet</span>
            <strong>{unit || '—'}</strong>
          </Text>
          {competence && (
            <Text style={detailRow}>
              <span style={detailLabel}>Kompetens</span>
              <strong>{competence}</strong>
            </Text>
          )}
          <Text style={detailRow}>
            <span style={detailLabel}>Period</span>
            <strong>{formatDate(periodStart)} – {formatDate(periodEnd)}</strong>
          </Text>
          <Text style={detailRow}>
            <span style={detailLabel}>Svara senast</span>
            <strong>{formatDate(responseDeadline)}</strong>
          </Text>
        </div>

        <Text style={text}>
          När du bekräftat skapas ett digitalt representationsbevis som byrån kan visa för
          uppdragsgivaren. Du behöver inte skapa något konto.
        </Text>

        {signingUrl && (
          <Button style={button} href={signingUrl}>
            Granska & bekräfta →
          </Button>
        )}

        <Text style={footer}>
          Om du inte väntar dig denna förfrågan kan du ignorera mejlet — inget händer
          om du inte bekräftar.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RepresentationInviteEmail,
  subject: (data: Record<string, any>) =>
    `${data?.agencyName || 'Ett bemanningsföretag'} ber dig bekräfta representation`,
  displayName: 'Representationsinbjudan',
  previewData: {
    agencyName: 'Medhelp AB',
    region: 'Region Stockholm',
    unit: 'Vårdcentralen Liljeholmen',
    consultantName: 'Anna Andersson',
    competence: 'Specialistläkare allmänmedicin',
    periodStart: '2026-05-04',
    periodEnd: '2026-06-15',
    responseDeadline: '2026-04-28',
    signingUrl: 'https://compcare.se/sign/abc123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const detailsStyle = { padding: '16px 18px', backgroundColor: '#f8fafc', borderRadius: '10px', margin: '0 0 20px', border: '1px solid #e2e8f0' }
const detailRow = { fontSize: '14px', color: '#334155', margin: '0 0 6px', display: 'flex' as const, justifyContent: 'space-between' as const }
const detailLabel = { color: '#64748b', marginRight: '12px' }
const button = { backgroundColor: '#4F46E5', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
