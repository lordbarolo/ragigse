/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'CompCare'

interface DocumentShareInviteProps {
  ownerName?: string
  documentCount?: number
  inviteUrl?: string
  personalMessage?: string
}

const DocumentShareInviteEmail = ({
  ownerName,
  documentCount,
  inviteUrl,
  personalMessage,
}: DocumentShareInviteProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>
      {`${ownerName || 'En kollega'} har delat ${documentCount && documentCount > 1 ? `${documentCount} dokument` : 'ett dokument'} med dig`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Heading style={h1}>Dokument delade med dig</Heading>
        <Text style={text}>
          {ownerName || 'En kollega'} har delat{' '}
          {documentCount && documentCount > 1 ? `${documentCount} dokument` : 'ett dokument'}{' '}
          med dig via {SITE_NAME}.
        </Text>
        {personalMessage && (
          <Text style={messageStyle}>"{personalMessage}"</Text>
        )}
        <Text style={text}>
          Klicka på knappen nedan för att öppna och ladda ner dokumenten. Varje sida märks
          automatiskt med din e-postadress och tidpunkt.
        </Text>
        {inviteUrl && (
          <Button style={button} href={inviteUrl}>
            Öppna dokumenten →
          </Button>
        )}
        <Text style={footer}>
          Om du inte väntade dig detta mejl kan du ignorera det. Länken är personlig — dela den
          inte vidare.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DocumentShareInviteEmail,
  subject: (data: Record<string, any>) =>
    `${data?.ownerName || 'En kollega'} har delat dokument med dig`,
  displayName: 'Dokumentdelning',
  previewData: {
    ownerName: 'Anna Svensson',
    documentCount: 3,
    inviteUrl: 'https://compcare.se/delade-dokument/abc123',
    personalMessage: 'Hej! Här är mina handlingar inför uppdraget.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const messageStyle = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px', padding: '12px 16px', borderLeft: '3px solid #4F46E5', fontStyle: 'italic' as const }
const button = { backgroundColor: '#4F46E5', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
