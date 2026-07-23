# Questions for Quest on connecting the Forward Planner to TMS

Context: the planner currently runs on its own, with schedulers booking units against
sites, then "publishing" a booking to lock it once it's confirmed. Right now, "publish"
only locks the record inside the planner — it doesn't do anything with TMS yet. Before we
can build that connection, we need three things from your team.

## 1. How should a locked booking actually get into TMS?

Once a scheduler locks in a booking in the planner, how does that information need to
reach TMS so the day-to-day team can act on it? A few possibilities, roughly from most to
least automated:

- The planner sends it to TMS automatically and immediately.
- The planner and TMS sync up on a schedule (e.g. every hour, overnight).
- Someone exports a file from the planner and imports it into TMS by hand.

Which of these matches how your team already works, or is expected to work?

## 2. When you "forward" work to TMS, how much do you send at once?

The planner currently lets a scheduler select any set of bookings (a few days, a week, a
mix of units) and publish just those. Is that how your ops team actually thinks about
handing work over — a flexible selection — or do you always think in terms of a fixed
chunk, like "the whole week gets forwarded on Friday"? If it's the latter, what's that
fixed chunk?

## 3. Which comes first: getting your reference data into the planner, or sending bookings out to TMS?

Separately from publishing bookings, we also expect the planner to eventually pull its
list of units, sites, and companies from TMS automatically (instead of us keeping our own
copy up to date by hand, which is how it works today). Does that need to happen before we
build the "send bookings to TMS" side, or could it come after? Or are these unrelated to
each other from your side?
