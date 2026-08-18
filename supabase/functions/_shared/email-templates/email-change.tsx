/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Img,
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Bekräfta din e-poständring för vårdbemanning.ai</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://vardbemanning.ai/vardbemanning-wordmark-light.png"
          width="180"
          height="29"
          alt="vårdbemanning.ai"
          style={logo}
        />
        <Heading style={h1}>Bekräfta e-poständring</Heading>
        <Text style={text}>
          Du har begärt att ändra din e-postadress från{' '}
          <Link href={`mailto:${email}`} style={link}>{email}</Link> till{' '}
          <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
        </Text>
        <Text style={text}>Klicka på knappen nedan för att bekräfta ändringen:</Text>
        <Button style={button} href={confirmationUrl}>
          Bekräfta e-poständring →
        </Button>
        <Text style={footer}>
          Om du inte begärde denna ändring, säkra ditt konto omedelbart.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { display: 'block', width: '180px', height: 'auto', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 24px' }
const link = { color: '#4F46E5', textDecoration: 'underline' }
const button = { backgroundColor: '#4F46E5', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
