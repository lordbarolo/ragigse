/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CompCare'

interface InvoiceConfirmationProps {
  fileCount?: number
}

const InvoiceConfirmationEmail = ({ fileCount }: InvoiceConfirmationProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Vi har tagit emot dina fakturor — CompCare</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Heading style={h1}>Fakturor mottagna</Heading>
        <Text style={text}>
          Vi har tagit emot {fileCount ? `${fileCount} faktura${fileCount > 1 ? 'r' : ''}` : 'dina fakturor'} för
          granskning. Vi analyserar om du har debiterats korrekt för jour, beredskap
          och OB-tillägg.
        </Text>
        <Text style={text}>
          <strong>Vad händer nu?</strong>{'\n'}
          Vi återkommer inom 48 timmar med resultatet. Om vi hittar avvikelser
          som ger rätt till tilläggsfakturering kontaktar vi dig med en detaljerad
          sammanställning.
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
  subject: 'Vi har tagit emot dina fakturor',
  displayName: 'Fakturakontroll-bekräftelse',
  previewData: { fileCount: 3 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px', whiteSpace: 'pre-line' as const }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
