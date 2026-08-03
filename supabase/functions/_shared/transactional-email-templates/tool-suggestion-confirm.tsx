/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CompCare'

interface ToolSuggestionConfirmProps {
  confirmUrl: string
  choiceLabel?: string
}

const ToolSuggestionConfirmEmail = ({ confirmUrl, choiceLabel }: ToolSuggestionConfirmProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Bekräfta ditt verktygsförslag</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Heading style={h1}>Bekräfta ditt förslag</Heading>
        <Text style={text}>
          Tack för att du berättar vilket verktyg du saknar
          {choiceLabel ? `: ${choiceLabel}` : ''}. Klicka på länken nedan för att
          bekräfta din e-postadress så registreras ditt förslag.
        </Text>
        <Button style={button} href={confirmUrl}>
          Bekräfta förslag →
        </Button>
        <Text style={footer}>
          Om du inte skickade in något förslag kan du ignorera detta mejl.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ToolSuggestionConfirmEmail,
  subject: 'Bekräfta ditt verktygsförslag',
  displayName: 'Bekräfta verktygsförslag',
  previewData: {
    confirmUrl: 'https://vardbemanning.ai/api/public/bekrafta-forslag?token=demo',
    choiceLabel: 'Optimering av ersättning/förhandling',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: '#4F46E5', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
