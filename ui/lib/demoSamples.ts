import type { FullAnalysis, Platform } from "./analyze";

export interface DemoSample {
  id: string;
  title: string;
  category: string;
  platform: Platform;
  script: string;
  analysis: FullAnalysis;
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: "ai-productivity",
    title: "AI Email Workflow",
    category: "Tech & Productivity",
    platform: "YouTube Shorts",
    script:
      "Hey guys, welcome back to my channel! Today I want to talk about productivity tools. Most people spend 3 hours a day answering emails and organizing their calendar. But there is a brand new AI workflow that automates this completely in 30 seconds. First, connect your inbox. Second, set your priority rules. If you want my exact prompt template, comment TEMPLATE below and follow for more tech hacks!",
    analysis: {
      score: 54,
      metrics: {
        hook: 38,
        pacing: 56,
        emotion: 62,
        value: 70,
        cta: 50,
      },
      dropoffPrediction: {
        second: 4,
        reason: "Opening greeting ('Hey guys, welcome back') delays value delivery past the 3-second scroll threshold.",
      },
      dropOffRisks: [
        {
          line: "Hey guys, welcome back to my channel!",
          risk: "High",
          reason: "Channel intros and conversational greetings cause immediate swipe-away on short-form feeds.",
          fix: "Cut intro completely. Start directly with the friction: 'You're spending 3 hours on email every day for no reason.'",
        },
        {
          line: "Today I want to talk about productivity tools.",
          risk: "High",
          reason: "Meta-announcements tell viewers what you will do instead of delivering immediate proof.",
          fix: "Replace with high-contrast payoff: 'This 30-second AI workflow clears 50 unread emails instantly.'",
        },
        {
          line: "Most people spend 3 hours a day answering emails and organizing their calendar.",
          risk: "Medium",
          reason: "Good pain point, but arrives 5 seconds too late after the weak intro.",
          fix: "Move this sentence to the opening 0–2 second mark as the hook.",
        },
      ],
      retentionTimeline: [
        { second: 0, retention: 100 },
        { second: 3, retention: 68 },
        { second: 6, retention: 52 },
        { second: 9, retention: 44 },
        { second: 12, retention: 39 },
        { second: 15, retention: 35 },
        { second: 18, retention: 32 },
        { second: 21, retention: 29 },
        { second: 24, retention: 27 },
        { second: 27, retention: 25 },
        { second: 30, retention: 23 },
      ],
      rewrites: [
        {
          type: "Curiosity Hook",
          script:
            "You are spending 3 hours on email every day for no reason.\n\nA new AI automation clears your entire inbox and organizes your calendar in 30 seconds.\n\nHere is how to set it up:\n1. Connect your inbox.\n2. Add your priority triage rules.\n\nComment 'TEMPLATE' below and I'll send you the exact prompt.",
        },
        {
          type: "Fast-Paced Retention",
          script:
            "Stop answering emails manually.\n\nThis 30-second AI workflow automates triage, calendar booking, and drafting replies while you sleep.\n\nStep 1: Link your inbox.\nStep 2: Trigger custom priority filters.\n\nDrop a comment with 'TEMPLATE' to grab the free setup prompt.",
        },
        {
          type: "Emotional Storytelling",
          script:
            "I used to drown in 80 emails before 9 AM until I tested this AI system.\n\nInstead of losing 3 hours every morning, one workflow categorizes, archives, and drafts replies in under 30 seconds.\n\nConnect your inbox, set 2 rules, and claim your mornings back.\n\nComment 'TEMPLATE' and I will send the prompt.",
        },
      ],
      improvedScript:
        "You are spending 3 hours on email every day for no reason.\n\nA new AI automation clears your entire inbox and organizes your calendar in 30 seconds.\n\nHere is how to set it up:\n1. Connect your inbox.\n2. Add your priority triage rules.\n\nComment 'TEMPLATE' below and I'll send you the exact prompt.",
      viralTitleSuggestions: [
        "The 30-Second AI Inbox Workflow",
        "Stop Answering Emails Manually",
        "Why 90% of Creators Waste 3 Hours Daily",
      ],
    },
  },
  {
    id: "fitness-nutrition",
    title: "Fat Loss Myth Busting",
    category: "Fitness & Health",
    platform: "TikTok",
    script:
      "Stop doing cardio for 45 minutes if your goal is losing body fat. In this video, we are going to look at why that does not work. Cardio burns calories while you run, but progressive resistance training increases your metabolic rate for 36 hours. If you cut 300 calories and lift 3 times a week, you keep muscle and burn fat twice as fast. Drop a like and share this with your gym partner.",
    analysis: {
      score: 68,
      metrics: {
        hook: 82,
        pacing: 65,
        emotion: 60,
        value: 78,
        cta: 52,
      },
      dropoffPrediction: {
        second: 5,
        reason: "Meta-announcement ('In this video, we are going to look at why') slows early momentum after a strong hook.",
      },
      dropOffRisks: [
        {
          line: "In this video, we are going to look at why that does not work.",
          risk: "High",
          reason: "Filler bridge sentence kills the curiosity generated by the first sentence.",
          fix: "Cut the bridge. Jump immediately into the biological reason: 'Here's the problem: cardio only burns calories while moving.'",
        },
        {
          line: "Drop a like and share this with your gym partner.",
          risk: "Medium",
          reason: "Generic CTA reduces engagement conversion.",
          fix: "Tie the share directly to the benefit: 'Send this to your gym partner before your next workout.'",
        },
      ],
      retentionTimeline: [
        { second: 0, retention: 100 },
        { second: 3, retention: 84 },
        { second: 6, retention: 71 },
        { second: 9, retention: 65 },
        { second: 12, retention: 58 },
        { second: 15, retention: 53 },
        { second: 18, retention: 49 },
        { second: 21, retention: 46 },
        { second: 24, retention: 43 },
        { second: 27, retention: 40 },
        { second: 30, retention: 38 },
      ],
      rewrites: [
        {
          type: "Curiosity Hook",
          script:
            "45 minutes of cardio is the slowest way to lose body fat.\n\nCardio only burns calories while you run. But heavy resistance training elevates your resting metabolic rate for 36 hours straight.\n\nCut 300 calories, lift 3 times weekly, and burn fat twice as fast without losing muscle.\n\nSend this to your gym partner before your next session.",
        },
        {
          type: "Fast-Paced Retention",
          script:
            "Stop doing steady-state cardio for fat loss.\n\nRunning burns calories for 45 minutes. Lifting burns calories for 36 hours.\n\nThe real fat-loss formula:\n• 300 calorie deficit\n• 3 heavy lifts per week\n• 1g protein per pound\n\nSave this for your next workout plan.",
        },
        {
          type: "Emotional Storytelling",
          script:
            "I ran on the treadmill 5 days a week for 6 months and lost almost zero belly fat.\n\nThe second I swapped cardio for 3 weekly lifting sessions and a small 300-calorie deficit, my body composition transformed in 8 weeks.\n\nCardio burns fuel; muscle burns fat 24/7.\n\nShare this with anyone stuck on the treadmill.",
        },
      ],
      improvedScript:
        "45 minutes of cardio is the slowest way to lose body fat.\n\nCardio only burns calories while you run. But heavy resistance training elevates your resting metabolic rate for 36 hours straight.\n\nCut 300 calories, lift 3 times weekly, and burn fat twice as fast without losing muscle.\n\nSend this to your gym partner before your next session.",
      viralTitleSuggestions: [
        "Why Cardio Is Keeping You Soft",
        "The 36-Hour Fat Loss Secret",
        "Stop Running 45 Minutes For Fat Loss",
      ],
    },
  },
  {
    id: "finance-investing",
    title: "Emergency Fund Trap",
    category: "Personal Finance",
    platform: "Instagram Reels",
    script:
      "Keeping your emergency fund in a traditional savings account is losing you money every single day. Let me explain how banks work. When inflation is 6 percent and your bank pays 0.5 percent, your savings are actively melting. Move 6 months of living expenses into a High-Yield Savings Account paying 5 percent APY. Save this reel so you remember to switch accounts this weekend.",
    analysis: {
      score: 72,
      metrics: {
        hook: 84,
        pacing: 70,
        emotion: 68,
        value: 80,
        cta: 65,
      },
      dropoffPrediction: {
        second: 6,
        reason: "Preachy transition ('Let me explain how banks work') introduces a lecture tone.",
      },
      dropOffRisks: [
        {
          line: "Let me explain how banks work.",
          risk: "Medium",
          reason: "Sounds academic and slows the emotional shock of the opening hook.",
          fix: "Replace with direct contrast: 'Your bank is making 5% lending your cash while giving you 0.5%.'",
        },
      ],
      retentionTimeline: [
        { second: 0, retention: 100 },
        { second: 3, retention: 86 },
        { second: 6, retention: 76 },
        { second: 9, retention: 70 },
        { second: 12, retention: 64 },
        { second: 15, retention: 59 },
        { second: 18, retention: 55 },
        { second: 21, retention: 52 },
        { second: 24, retention: 49 },
        { second: 27, retention: 47 },
        { second: 30, retention: 45 },
      ],
      rewrites: [
        {
          type: "Curiosity Hook",
          script:
            "Your traditional savings account is quietly stealing your emergency fund.\n\nWith inflation at 6% and standard banks paying 0.5%, you lose purchasing power every week.\n\nMove 6 months of expenses into an FDIC-insured High-Yield Savings Account at 5.0% APY to earn $2,500/year risk-free on a $50k fund.\n\nSave this reel and open one before Monday.",
        },
        {
          type: "Fast-Paced Retention",
          script:
            "Your bank pays you 0.5% on savings, then lends your money out for 7%.\n\nFix this in 5 minutes:\n1. Open a High-Yield Savings Account (HYSA).\n2. Lock in 4.5% to 5.2% APY.\n3. Keep 100% liquidity with FDIC protection.\n\nBookmark this video so you make the switch this weekend.",
        },
        {
          type: "Emotional Storytelling",
          script:
            "My friend left $30,000 sitting in a standard checking account for 4 years and lost over $4,000 to inflation.\n\nA simple switch to a High-Yield Savings Account pays $125 every month in passive interest with zero stock market risk.\n\nStop letting banks profit off your emergency fund.\n\nSave this reel to switch accounts today.",
        },
      ],
      improvedScript:
        "Your traditional savings account is quietly stealing your emergency fund.\n\nWith inflation at 6% and standard banks paying 0.5%, you lose purchasing power every week.\n\nMove 6 months of expenses into an FDIC-insured High-Yield Savings Account at 5.0% APY to earn $2,500/year risk-free on a $50k fund.\n\nSave this reel and open one before Monday.",
      viralTitleSuggestions: [
        "The Emergency Fund Mistake Costing You $2,000",
        "Why Your Bank Loves Your Savings Account",
        "Switch to High-Yield Savings Before Monday",
      ],
    },
  },
];
