/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Din verifieringskod för vårdbemanning.ai</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>vårdbemanning.ai</Text>
        <Heading style={h1}>Bekräfta din identitet</Heading>
        <Text style={text}>Använd koden nedan för att verifiera dig:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Koden är giltig en kort stund. Om du inte begärde den kan du ignorera detta mejl.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 24px' }
const codeStyle = { fontFamily: "'JetBrains Mono', Courier, monospace", fontSize: '28px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 32px', letterSpacing: '4px' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
