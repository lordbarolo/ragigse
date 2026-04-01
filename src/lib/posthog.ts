import posthog from "posthog-js";

posthog.init("phc_GiBn5CBOm72IrzgsdQRuUcK2mujk5Q0ZeI6hs8ixvwv", {
  api_host: "https://eu.i.posthog.com",
  capture_pageview: true,
});

console.log("PostHog loaded:", posthog.get_distinct_id());

export default posthog;
