/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'vårdbemanning.ai'

interface ReferenceInviteProps {
  individualName?: string
  workplace?: string
  relationship?: string
  isVerification?: boolean
  personalMessage?: string
  inviteUrl?: string
}

const ReferenceInviteEmail = ({
  individualName,
  workplace,
  relationship,
  isVerification,
  personalMessage,
  inviteUrl,
}: ReferenceInviteProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>
      {isVerification
        ? `${individualName || 'En kollega'} ber dig verifiera en referenshandling`
        : `${individualName || 'En kollega'} har bjudit in dig att lämna en referens`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Heading style={h1}>
          {isVerification ? 'Verifiera referenshandling' : 'Du har blivit inbjuden att lämna en referens'}
        </Heading>
        <Text style={text}>
          {isVerification
            ? `${individualName || 'En person'} ber dig att bekräfta att en tidigare lämnad referenshandling fortfarande gäller.`
            : `${individualName || 'En person'} har bjudit in dig att lämna en referens via vårdbemanning.ai.`}
        </Text>
        {(workplace || relationship) && (
          <Text style={detailsStyle}>
            {workplace && <>Arbetsplats: <strong>{workplace}</strong><br /></>}
            {relationship && <>Relation: <strong>{relationship}</strong></>}
          </Text>
        )}
        {personalMessage && (
          <Text style={messageStyle}>"{personalMessage}"</Text>
        )}
        <Text style={text}>
          {isVerification
            ? 'Klicka på knappen nedan för att granska handlingen och bekräfta att den fortfarande gäller.'
            : 'Klicka på knappen nedan för att lämna din referens. Det tar bara några minuter.'}
        </Text>
        {inviteUrl && (
          <Button style={button} href={inviteUrl}>
            {isVerification ? 'Verifiera referens →' : 'Lämna referens →'}
          </Button>
        )}
        <Text style={footer}>
          Om du inte känner igen denna förfrågan kan du ignorera detta mejl.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReferenceInviteEmail,
  subject: (data: Record<string, any>) =>
    data?.isVerification
      ? `${data?.individualName || 'En kollega'} ber dig verifiera en referens`
      : `${data?.individualName || 'En kollega'} vill att du lämnar en referens`,
  displayName: 'Referensinbjudan',
  previewData: {
    individualName: 'Anna Svensson',
    workplace: 'Karolinska Universitetssjukhuset',
    relationship: 'Chef',
    isVerification: false,
    personalMessage: 'Hej! Det vore jättesnällt om du kunde lämna en referens.',
    inviteUrl: 'https://vardbemanning.ai/referens/abc123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const detailsStyle = { fontSize: '14px', color: '#334155', lineHeight: '1.8', margin: '0 0 16px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px' }
const messageStyle = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px', padding: '12px 16px', borderLeft: '3px solid #4F46E5', fontStyle: 'italic' as const }
const button = { backgroundColor: '#4F46E5', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
