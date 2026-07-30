import LandingV2 from "./LandingV2";
import AnthropicScope from "@/components/demo/AnthropicScope";

/**
 * Anthropic-inspirerad typografi och layout ovanpå LandingV2.
 * Wrapper för startsidan (/) och /demo. SEO/Helmet hanteras av LandingV2.
 */
export default function DemoAnthropic() {
  return (
    <AnthropicScope roomySections>
      <LandingV2 />
    </AnthropicScope>
  );
}
