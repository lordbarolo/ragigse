/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CompCare'

interface AdminNotifyProps {
  email?: string
  name?: string
  role?: string
  region?: string
  message?: string
}

const InvoiceAdminNotifyEmail = ({ email, name, role, region, message }: AdminNotifyProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Ny intresseanmälan för fakturagranskning</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Heading style={h1}>Ny intresseanmälan — Fakturakontroll</Heading>
        <Text style={text}>
          Någon har anmält intresse för fakturagranskning via compcare.se.
        </Text>
        <Hr style={hr} />
        <Text style={label}>E-post</Text>
        <Text style={value}>{email || 'Ej angivet'}</Text>
        <Text style={label}>Namn</Text>
        <Text style={value}>{name || 'Ej angivet'}</Text>
        <Text style={label}>Roll</Text>
        <Text style={value}>{role || 'Ej angivet'}</Text>
        <Text style={label}>Region</Text>
        <Text style={value}>{region || 'Ej angivet'}</Text>
        <Text style={label}>Meddelande</Text>
        <Text style={value}>{message || 'Inget meddelande'}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Detta mail skickades automatiskt från {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceAdminNotifyEmail,
  subject: 'Ny intresseanmälan — Fakturakontroll',
  displayName: 'Admin-notis fakturakontroll',
  previewData: { email: 'anna@example.com', name: 'Anna Svensson', role: 'Sjuksköterska', region: 'Region Stockholm', message: 'Jag undrar om mina OB-tillägg stämmer.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const hr = { borderColor: '#e2e8f0', margin: '20px 0' }
const label = { fontSize: '12px', fontWeight: '600' as const, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 2px' }
const value = { fontSize: '15px', color: '#111827', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '16px 0 0' }
