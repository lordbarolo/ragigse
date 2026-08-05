/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'vårdbemanning.ai'

interface InvoiceConfirmationProps {
  name?: string
}

const InvoiceConfirmationEmail = ({ name }: InvoiceConfirmationProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Tack för ditt intresse — vårdbemanning.ai</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Heading style={h1}>{name ? `Tack, ${name}!` : 'Tack för ditt intresse!'}</Heading>
        <Text style={text}>
          Vi har tagit emot din intresseanmälan för fakturagranskning.
        </Text>
        <Text style={text}>
          <strong>Vad händer nu?</strong>{'\n'}
          Vi kontaktar dig inom 48 timmar för att diskutera hur vi kan granska
          dina fakturor mot gällande ramavtal och hitta eventuella avvikelser.
        </Text>
        <Text style={text}>
          Du behöver inte göra något mer just nu.
        </Text>
        <Text style={footer}>
          Tack för ditt förtroende! / Teamet på {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceConfirmationEmail,
  subject: 'Tack för ditt intresse — fakturagranskning',
  displayName: 'Fakturakontroll-bekräftelse',
  previewData: { name: 'Anna' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px', whiteSpace: 'pre-line' as const }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
