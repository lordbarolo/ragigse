/**
 * Landningsanimationer för vårdbemanning.ai
 *
 * Tre fristående, loopande scener portade från Claude Design-handoffen.
 * Rent presentationella: ingen datahämtning, inga externa beroenden utöver
 * React, ingen påverkan på Supabase eller routing.
 *
 * Användning:
 *   import { LonekollenAnimation } from '@/components/animationer';
 *   <LonekollenAnimation variant="site" radius={16} />
 *
 * Komponenten fyller sin containers bredd och håller 16:9. Den pausar sig själv
 * utanför viewporten och i bakgrundsflikar, och visar en stillbild vid
 * `prefers-reduced-motion: reduce`.
 */
export { default as LonekollenAnimation } from './LonekollenAnimation';
export { default as MissadeTimmarAnimation } from './MissadeTimmarAnimation';
export { default as AssistentenAnimation } from './AssistentenAnimation';

export { AnimationStage, Captions, FONT_SANS, FONT_MONO } from './AnimationStage';
export type { AnimationStageProps, CaptionItem, StageRenderArgs } from './AnimationStage';
export { ACCENT_DEFAULT, DARK, LIGHT } from './palett';
export type { DarkPalette, LightPalette, SceneProps, Variant } from './palett';
