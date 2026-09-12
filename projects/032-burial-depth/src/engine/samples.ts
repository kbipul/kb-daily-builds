/**
 * Sample responses.
 *
 * All four are written for this project - they are not transcripts of any real
 * assistant. They exist so a visitor with nothing to paste can still see the
 * checker move, and so the tests have stable fixtures.
 */

export interface Sample {
  id: string;
  name: string;
  note: string;
  text: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'buried-debug',
    name: 'The buried fix',
    note: 'A correct one-line answer with four sentences of runway in front of it.',
    text: `Great question! Debugging build failures can definitely be tricky, and there are a lot of moving parts involved here.

Let me walk you through my thinking. First I'll look at what the error is telling us, then we can work backwards from there to figure out what might be going on in your configuration.

So, looking at your setup, there are a few things worth considering before we get to the actual change.

The build fails because \`vite.config.ts\` has no \`base\` set, so the bundle requests \`/assets/index.js\` while GitHub Pages serves it from \`/your-repo/assets/index.js\`.

Set it explicitly:

\`\`\`ts
export default defineConfig({ base: '/your-repo/' });
\`\`\`

Rebuild and the asset URLs will be correct.

Hope this helps! Let me know if you run into anything else.`,
  },
  {
    id: 'answer-first',
    name: 'Answer first',
    note: 'The same content, shaped the way the conventions ask for.',
    text: `Set \`base\` in \`vite.config.ts\` to your repo name:

\`\`\`ts
export default defineConfig({ base: '/your-repo/' });
\`\`\`

The build fails because \`base\` defaults to \`/\`, so the bundle requests \`/assets/index.js\` while GitHub Pages serves that file from \`/your-repo/assets/index.js\`. Every asset 404s and the page renders blank.

Rebuild with \`npm run build\` and check that \`dist/index.html\` references \`/your-repo/assets/\`. That takes about 30 seconds.`,
  },
  {
    id: 'hedged-architecture',
    name: 'The hedged recommendation',
    note: 'Nine hundred words of "it depends" that never picks anything.',
    text: `That's a great question, and honestly it's one of the more interesting architectural decisions you'll face.

It depends quite a lot on your specific situation. There are several ways to approach this, and each has trade-offs worth considering.

You may want to think about your team's existing expertise. If your team already knows one of these well, that's generally a strong signal, though of course it's worth noting that familiarity isn't everything.

You might also want to consider your scaling requirements. In some cases a managed service makes more sense, in most cases self-hosting gives you more control, but your mileage may vary depending on your operational maturity.

One option would be to run a small proof of concept. Another approach would be to look at what similar organisations in your sector have chosen, keeping in mind that their constraints may differ from yours.

It's important to note that there isn't really a universally correct answer here. That said, both options are perfectly reasonable and you'd likely be fine either way.

To summarise, it really does depend on your context, your team, and your timeline.

Let me know if you'd like me to go deeper on any of these dimensions.`,
  },
  {
    id: 'unbounded-steps',
    name: 'Steps that are not steps',
    note: 'Numbered, which looks disciplined, but each number hides three actions.',
    text: `Sure thing, I can help you get this deployed.

Here's the process:

1. Clone the repo and then install dependencies and also run the test suite to make sure everything passes before you continue.
2. Create the production environment file, then you copy the secrets in from the vault, followed by a restart of the local service so it picks them up.
3. Run the migration script and then verify the schema in the database console.
4. Deploy.

The whole thing should go fairly quickly, probably done before long if nothing unexpected comes up.

To recap, you clone, configure, migrate and deploy. Feel free to reach out if any step gives you trouble!`,
  },
];

export const DEFAULT_SAMPLE_ID = 'buried-debug';
