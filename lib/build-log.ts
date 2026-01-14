export interface BuildLogEntry {
  date: string
  title: string
  description: string
}

export const buildLog: BuildLogEntry[] = [
  {
    date: "2026-01-13",
    title: "STL Monitor",
    description: "Built a real-time incident monitoring dashboard for St. Louis. Think of it like a local news feed but on a map – you can see traffic, weather, and transit alerts happening around the city. Added some analytics and replay features to make sense of patterns over time.",
  },
  {
    date: "2026-01-13",
    title: "Amer Gauntlet",
    description: "Made a daily word puzzle game with leaderboards. Similar vibes to Wordle but with scoring, streaks, and competitive rankings. Turns out building the scoring system was more fun than I expected.",
  },
  {
    date: "2026-01-13",
    title: "Color Crafter",
    description: "Created a color palette tool inspired by colorhunt. You can browse, create, and share color combinations. Sometimes you just need a good palette and don't want to think about hex codes.",
  },
  {
    date: "2026-01-13",
    title: "Football Manager Team Picker",
    description: "A simple tool for picking random teams in Football Manager. Great for when you can't decide what save to start, or when you want to do a challenge run with friends.",
  },
  {
    date: "2026-01-13",
    title: "Secret Santa",
    description: "Built a platform to organize Secret Santa exchanges. Handles the random drawing, lets people join and leave, and keeps everything organized. Much easier than trying to coordinate this stuff in a group chat.",
  },
  {
    date: "2026-01-12",
    title: "UI/UX Improvements & Build Log System",
    description: "Spent some time polishing the site – added the logo everywhere, cleaned up the build log system, and standardized the settings UI. Sometimes the boring work makes everything feel more cohesive.",
  },
  {
    date: "2026-01-12",
    title: "Pickup Soccer",
    description: "Made an app for organizing pickup soccer games. People can create games, set locations and player limits, and others can join. Simple idea but solves a real problem if you're trying to get a game together.",
  },
  {
    date: "2026-01-12",
    title: "Time Zone Converter",
    description: "Built a time zone converter for comparing times across different parts of the world. Useful when you're coordinating with people in different time zones and don't want to do mental math.",
  },
  {
    date: "2026-01-12",
    title: "Diff Checker",
    description: "Created a text comparison tool that shows differences between two files side by side. Handy for comparing code, documents, or really any text. The visual diff makes it easy to spot what changed.",
  },
  {
    date: "2026-01-12",
    title: "Encryption Platform & Firebase Integration",
    description: "Launched the first app – a collection of encoding and encryption tools. Also set up Firebase auth and database to handle user accounts and settings. The foundation for everything else that followed.",
  },
]
