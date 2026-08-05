/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'vårdbemanning.ai'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Välkommen till vårdbemanning.ai — din ersättningspartner</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Heading style={h1}>
          {name ? `Välkommen, ${name}!` : 'Välkommen till vårdbemanning.ai!'}
        </Heading>
        <Text style={text}>
          Ditt konto är redo. Med vårdbemanning.ai får du tillgång till marknadsdata,
          ersättningsanalyser och förhandlingsverktyg — allt anpassat för
          vårdkonsulter.
        </Text>
        <Text style={text}>Här är vad du kan göra direkt:</Text>
        <Text style={list}>
          • Se din personliga ersättningsanalys{'\n'}
          • Jämför din lön med marknaden{'\n'}
          • Få stöd i din nästa löneförhandling
        </Text>
        <Button style={button} href="https://vardbemanning.ai/profil">
          Gå till min profil →
        </Button>
        <Text style={footer}>
          Lycka till! / Teamet på {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Välkommen till vårdbemanning.ai!',
  displayName: 'Välkomstmejl',
  previewData: { name: 'Anna' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const list = { fontSize: '15px', color: '#475569', lineHeight: '2', margin: '0 0 24px', whiteSpace: 'pre-line' as const }
const button = { backgroundColor: '#4F46E5', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
